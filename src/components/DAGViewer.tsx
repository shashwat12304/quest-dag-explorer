import { useCallback, useEffect, useMemo, memo } from 'react';
import { 
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  NodeProps,
  Handle,
  Position,
  ControlButton
} from '@xyflow/react';
import { ResearchNode, ResearchEdge } from '@/types/dag';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

import '@xyflow/react/dist/style.css';
import './dagviewer-overrides.css';
import { cn } from '@/lib/utils';

// Enhanced styling for visual cues
const statusColorMap = {
  waiting: 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700',
  active: 'bg-blue-50 dark:bg-blue-950 border-blue-400 dark:border-blue-600 shadow-blue-100 dark:shadow-blue-900',
  completed: 'bg-green-50 dark:bg-green-950 border-green-400 dark:border-green-600',
  error: 'bg-red-50 dark:bg-red-950 border-red-400 dark:border-red-600'
};

// Enhanced node component with better status visualization
const ResearchNodeComponent = memo(({ data, isConnectable }: NodeProps) => {
  // Get label from data with fallbacks
  const label = typeof data?.label === 'string' ? data.label : 'Research Task';
  const fullTitle = typeof data?.fullTitle === 'string' ? data.fullTitle : label;
  const status = data?.status || 'waiting';
  
  return (
    <div 
      className={cn(
        "px-4 py-3 rounded-lg shadow-md text-center node-content border-2 transition-all duration-300",
        statusColorMap[status as keyof typeof statusColorMap], 
        status === 'active' && "animate-pulse"
      )}
      title={`${fullTitle} - Status: ${status}`}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        isConnectable={isConnectable} 
        className={cn(
          "w-3 h-3 border border-white", 
          status === 'active' ? 'bg-blue-500' : 
          status === 'completed' ? 'bg-green-500' : 
          status === 'error' ? 'bg-red-500' : 'bg-gray-300'
        )}
        style={{ left: -7 }}
      />
      
      {/* Status indicator dot */}
      <div className="absolute -top-2 -right-2 transform translate-x-2 -translate-y-2">
        <div 
          className={cn(
            "w-4 h-4 rounded-full border border-white shadow-sm",
            status === 'active' ? 'bg-blue-500 animate-ping' : 
            status === 'completed' ? 'bg-green-500' : 
            status === 'error' ? 'bg-red-500' : 'bg-gray-300'
          )}
        />
      </div>
      
      <div className="font-bold text-sm text-wrap node-title">
        {label}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable} 
        className={cn(
          "w-3 h-3 border border-white", 
          status === 'active' ? 'bg-blue-500' : 
          status === 'completed' ? 'bg-green-500' : 
          status === 'error' ? 'bg-red-500' : 'bg-gray-300'
        )}
        style={{ right: -7 }}
      />
    </div>
  );
});

ResearchNodeComponent.displayName = 'ResearchNodeComponent';

// Define the node types
const nodeTypes = {
  researchNode: ResearchNodeComponent,
};

interface DAGViewerProps {
  nodes: ResearchNode[];
  edges: ResearchEdge[];
  onNodeClick?: (node: ResearchNode) => void;
  isEditable?: boolean;
}

const DAGViewer = ({ nodes, edges, onNodeClick, isEditable = false }: DAGViewerProps) => {
  // Function to determine edge color based on connected node statuses - memoized for performance
  const getEdgeColor = useCallback((edge: ResearchEdge, nodes: ResearchNode[]): string => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode?.status === 'active' || targetNode?.status === 'active') {
      return '#4F46E5'; // Active edge - vibrant purple
    } else if (sourceNode?.status === 'completed' && targetNode?.status === 'completed') {
      return '#4ADE80'; // Completed edge - green
    } else if (sourceNode?.status === 'error' || targetNode?.status === 'error') {
      return '#EF4444'; // Error edge - red
    } else {
      return '#3b82f6'; // Default edge - brighter blue for better visibility
    }
  }, []);
  
  // Function to determine edge status class based on connected nodes - memoized for performance
  const getEdgeStatusClass = useCallback((edge: ResearchEdge, nodes: ResearchNode[]): string => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode?.status === 'active' || targetNode?.status === 'active') {
      return 'research-edge-active';
    } else if (sourceNode?.status === 'completed' && targetNode?.status === 'completed') {
      return 'research-edge-completed';
    } else if (sourceNode?.status === 'error' || targetNode?.status === 'error') {
      return 'research-edge-error';
    } else {
      return '';
    }
  }, []);

  // Function to determine node class based on status - memoized for performance
  const getNodeClass = useCallback((status: string): string => {
    const baseClass = "p-3 border rounded-md shadow-sm transition-all duration-300";
    
    switch (status) {
      case 'waiting':
        return `${baseClass} research-node-waiting`;
      case 'active':
        return `${baseClass} research-node-active`;
      case 'completed':
        return `${baseClass} research-node-completed`;
      case 'error':
        return `${baseClass} research-node-error`;
      default:
        return baseClass;
    }
  }, []);

  // Helper function to get a node's label by ID - memoized for performance
  const getNodeLabel = useCallback((nodeId: string, nodes: ResearchNode[]): string => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.label || 'Unknown Node';
  }, []);
  
  // Create initial nodes - memoized to prevent recreating on every render
  const initialNodes: Node[] = useMemo(() => nodes.map((node) => {
    // Get node title with truncation for display
    const nodeTitle = node.label || (node.data && node.data.title) || "Research Task";
    const truncatedLabel = nodeTitle.length > 30 ? nodeTitle.substring(0, 27) + '...' : nodeTitle;
    
    return {
      id: node.id,
      type: 'researchNode', // Use our custom node component
      data: { 
        label: truncatedLabel,
        fullTitle: nodeTitle, // Store full title for tooltip
        status: node.status, // Pass status to the node component
        nodeId: node.data?.nodeId,
      },
      position: { x: 0, y: 0 }, // Will be auto-layouted
      className: getNodeClass(node.status),
    };
  }), [nodes, getNodeClass]);

  // Create initial edges - memoized to prevent recreating on every render
  const initialEdges: Edge[] = useMemo(() => edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: edge.source === nodes.find(n => n.status === 'active')?.id,
    type: 'smoothstep', // Use smoothstep for better horizontal connections
    style: { 
      stroke: getEdgeColor(edge, nodes), 
      strokeWidth: 2.5, 
      strokeOpacity: 0.9
    },
    className: `transition-all duration-300 dag-edge ${getEdgeStatusClass(edge, nodes)}`,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 15,
      height: 15,
      color: getEdgeColor(edge, nodes)
    },
    data: edge.data,
    // Add a title attribute for tooltip on hover
    ariaLabel: `Connection from ${getNodeLabel(edge.source, nodes)} to ${getNodeLabel(edge.target, nodes)}`,
  })), [edges, nodes, getEdgeColor, getEdgeStatusClass, getNodeLabel]);

  const [reactNodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [reactEdges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Auto-layout nodes in useEffect
  useEffect(() => {
    // Performance optimization: only run this effect when nodes or edges change
    console.time('DAG layout calculation');
    
    // Simple yet effective DAG layout algorithm
    // Step 1: Create a map to store node data
    const nodeMap = new Map();
    nodes.forEach(node => {
      nodeMap.set(node.id, { 
        ...node, 
        level: 0,  // Horizontal position (column)
        position: 0, // Vertical position within level (row)
        children: [],
        parents: []
      });
    });
    
    // Step 2: Build the graph structure - identify parents and children
    edges.forEach(edge => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (source && target) {
        source.children.push(target.id);
        target.parents.push(source.id);
      }
    });
    
    // Step 3: Find root nodes (nodes with no parents)
    const rootNodes = Array.from(nodeMap.values()).filter(node => node.parents.length === 0);
    
    // Step 4: Assign levels using a topological approach (breadth-first)
    const assignLevels = () => {
      const queue = [...rootNodes];
      
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;
        
        // Process all children
        for (const childId of current.children) {
          const child = nodeMap.get(childId);
          if (child) {
            // Child's level is at least one more than parent's level
            child.level = Math.max(child.level, current.level + 1);
            
            // Only queue a node after we've processed all its parents
            const allParentsProcessed = child.parents.every(parentId => {
              const parent = nodeMap.get(parentId);
              return parent && parent.level < child.level;
            });
            
            if (allParentsProcessed && !queue.includes(child)) {
              queue.push(child);
            }
          }
        }
      }
    };
    
    assignLevels();
    
    // Step 5: Determine the maximum level to know the number of columns
    const maxLevel = Math.max(...Array.from(nodeMap.values()).map(node => node.level));
    
    // Step 6: Count nodes at each level for vertical positioning
    const levelCounts = {};
    const levelPositions = {};
    
    Array.from(nodeMap.values()).forEach(node => {
      levelCounts[node.level] = (levelCounts[node.level] || 0) + 1;
      levelPositions[node.level] = levelPositions[node.level] || 0;
    });
    
    // Calculate optimal horizontal gap based on graph breadth and depth
    const totalNodes = nodes.length;
    const maxNodesInAnyLevel = Math.max(...Object.values(levelCounts).map(count => Number(count)));
    
    // Estimate average node label length
    const avgTitleLength = Math.max(
      20,
      nodes.reduce((sum, node) => sum + ((node.label || 
        (node.data && node.data.title) || 
        "Research Task").length), 0) / totalNodes
    );
    
    // Adjust spacing based on graph structure and content
    const isComplex = maxLevel >= 4 || maxNodesInAnyLevel >= 4 || avgTitleLength > 30;
    
    // Step 7: Position nodes with fixed spacing
    const horizontalGap = Math.max(
      400, 
      250 + (50 * maxLevel) + (isComplex ? 100 : 0)
    ); // Dynamic horizontal gap based on graph complexity
    
    const verticalGap = Math.max(
      130, 
      100 + (15 * maxNodesInAnyLevel) + (isComplex ? 20 : 0)
    ); // Dynamic vertical gap based on level density
    
    const startX = 180;        // Left margin (slightly increased)
    const startY = 80;         // Top margin
    
    // Create React Flow nodes with the calculated positions
    const updatedNodes = nodes.map(node => {
      const nodeData = nodeMap.get(node.id);
      if (!nodeData) return null;
      
      // Calculate positions with slight offset for better distribution
      // Use node level for offset calculation with greater staggering for complex graphs
      const levelOffset = (nodeData.level % 2 === 0) ? 0 : verticalGap / (isComplex ? 3 : 4);
      const positionOffset = (nodeData.position % 2 === 0) ? 0 : horizontalGap / 20; // Slight horizontal offset
      
      const x = startX + (nodeData.level * horizontalGap) + positionOffset;
      const y = startY + (levelPositions[nodeData.level]++ * verticalGap) + levelOffset;
      
      return {
        id: node.id,
        type: 'researchNode',
        position: { x, y },
        className: getNodeClass(node.status),
        style: { 
          zIndex: 10,
          background: 'white',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          padding: '10px',
        },
        data: { 
          label: node.label || 
                 (node.data && node.data.title) || 
                 "Research Task",
          fullTitle: node.label || (node.data && node.data.title) || "Research Task"
        }
      };
    }).filter(Boolean) as Node[];
    
    console.timeEnd('DAG layout calculation');
    
    // Update the nodes state
    setNodes(updatedNodes);
    
  }, [nodes, edges, setNodes, getNodeClass]); // Added getNodeClass to dependencies

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );
  
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        const researchNode = nodes.find(n => n.id === node.id);
        if (researchNode) {
          onNodeClick(researchNode);
        }
      }
    },
    [nodes, onNodeClick]
  );

  return (
    <div className="w-full h-full bg-gradient-to-br from-background to-card/80 p-8 rounded-lg shadow-inner dag-container">
      <ReactFlow
        nodes={reactNodes}
        edges={reactEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.5,
          includeHiddenNodes: true,
          maxZoom: 2.0, // Increased max zoom for better detail viewing
        }}
        defaultEdgeOptions={{
          style: { strokeWidth: 4 },
          type: 'bezier',
        }}
        attributionPosition="bottom-right"
        nodesDraggable={isEditable}
        nodesConnectable={isEditable}
        elementsSelectable={isEditable}
        className="rounded-lg border border-border shadow-lg bg-white/80 dark:bg-gray-900/80"
        minZoom={0.1} // Allow further zooming out for large graphs
        maxZoom={3} // Allow more zoom in for detailed view
        proOptions={{ hideAttribution: true }} // Hide the ReactFlow attribution
      >
        <Controls className="bg-card border shadow-md rounded-md">
          <ControlButton 
            onClick={() => {
              // Custom zoom in button with better zoom factor
              const zoomIn = () => {
                const flowInstance = document.querySelector('.react-flow__renderer');
                const zoomEvent = new WheelEvent('wheel', { 
                  bubbles: true, 
                  cancelable: true,
                  deltaY: -100 
                });
                flowInstance?.dispatchEvent(zoomEvent);
              };
              zoomIn();
            }}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </ControlButton>
          <ControlButton 
            onClick={() => {
              // Custom zoom out button with better zoom factor
              const zoomOut = () => {
                const flowInstance = document.querySelector('.react-flow__renderer');
                const zoomEvent = new WheelEvent('wheel', { 
                  bubbles: true, 
                  cancelable: true,
                  deltaY: 100 
                });
                flowInstance?.dispatchEvent(zoomEvent);
              };
              zoomOut();
            }}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </ControlButton>
          <ControlButton 
            onClick={() => {
              // Custom fit view button
              const flowInstance = document.querySelector('div[data-reactflow-id]');
              // @ts-ignore - fitView exists on the instance and will work
              if (flowInstance?.__reactFlowInstance) {
                // @ts-ignore
                flowInstance.__reactFlowInstance.fitView({ padding: 0.8 });
              }
            }}
            title="Fit view"
          >
            <Maximize className="h-4 w-4" />
          </ControlButton>
        </Controls>
        <MiniMap 
          className="bg-card border shadow-md rounded-md !bottom-14 !right-2"
          nodeBorderRadius={8}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <Background 
          gap={16} 
          size={1} 
          color="currentColor" 
          className="text-border/30"
        />
      </ReactFlow>
    </div>
  );
};

export default DAGViewer;
