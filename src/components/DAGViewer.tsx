import { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeProps,
  Handle,
  Position,
  useReactFlow
} from '@xyflow/react';
import { ResearchNode, ResearchEdge } from '@/types/dag';
import { cn } from '@/lib/utils';

import '@xyflow/react/dist/style.css';

// Node styling based on status
const NodeComponent = ({ data }: NodeProps) => {
  // Ensure proper typing for the data object
  const nodeData = data as {
    label: string;
    status: string;
    description?: string;
  };
  
  const status = nodeData?.status || 'waiting';
  
  // Map status to color classes
  const getBgClass = () => {
    switch (status) {
      case 'completed': return 'bg-white dark:bg-gray-800 border-research-node-completed';
      case 'active': return 'bg-white dark:bg-gray-800 border-research-node-active';
      case 'error': return 'bg-white dark:bg-gray-800 border-research-node-error';
      default: return 'bg-white dark:bg-gray-800 border-research-node-waiting';
    }
  };

  // Get status indicator color
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'bg-research-node-completed';
      case 'active': return 'bg-research-node-active';
      case 'error': return 'bg-research-node-error';
      default: return 'bg-research-node-waiting';
    }
  };

  return (
    <div className={cn(
      "p-3 sm:p-4 rounded-lg shadow-md border-2 min-w-[150px] sm:min-w-[180px] md:min-w-[200px] max-w-[180px] sm:max-w-[220px] md:max-w-[250px]",
      getBgClass(),
      status === 'active' && "animate-pulse-light"
    )}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-2 h-2 sm:w-3 sm:h-3 border border-white bg-gray-400"
      />
      
      {/* Status indicator */}
      <div className="absolute -top-1 -right-1">
        <div className={cn(
          "w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-white shadow-sm",
          getStatusColor()
        )} />
      </div>
      
      <div className="flex flex-col gap-1 sm:gap-2">
        <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          {nodeData.label}
        </div>
        
        <div className={cn(
          "text-xs px-2 py-0.5 sm:py-1 rounded-full inline-block self-start",
          status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
          status === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
          status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        )}>
          {status}
        </div>
        
        {nodeData.description && (
          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 sm:line-clamp-3 mt-1">
            {nodeData.description}
          </p>
        )}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-2 h-2 sm:w-3 sm:h-3 border border-white bg-gray-400"
      />
    </div>
  );
};

// Node types mapping
const nodeTypes = {
  researchNode: NodeComponent,
};

interface DAGViewerProps {
  nodes: ResearchNode[];
  edges: ResearchEdge[];
  onNodeClick?: (node: ResearchNode) => void;
  isEditable?: boolean;
}

// Hook to use window size
const useWindowSize = () => {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return size;
};

const DAGViewer = ({ nodes, edges, onNodeClick, isEditable = false }: DAGViewerProps) => {
  const { width } = useWindowSize();
  
  // Responsive node spacing based on screen size
  const getNodeSpacing = () => {
    // Mobile-first responsive spacing
    if (width < 640) {
      return { x: 200, y: 150, offsetX: 50, offsetY: 50 };
    } else if (width < 768) {
      return { x: 250, y: 180, offsetX: 70, offsetY: 70 };
    } else if (width < 1024) {
      return { x: 300, y: 200, offsetX: 80, offsetY: 80 };
    } else {
      return { x: 350, y: 250, offsetX: 100, offsetY: 100 };
    }
  };
  
  // Calculate node position based on ID and total node count
  function calculateNodePosition(id: string, totalNodes: number) {
    // Extract node number from ID to determine position
    const nodeId = id.split('-').pop();
    const nodeNumber = nodeId ? parseInt(nodeId, 10) : 0;
    
    // Responsive spacing
    const spacing = getNodeSpacing();
    
    // Simple grid layout calculation
    const columns = Math.ceil(Math.sqrt(totalNodes));
    const row = Math.floor((nodeNumber - 1) / columns);
    const column = (nodeNumber - 1) % columns;
    
    return { 
      x: column * spacing.x + spacing.offsetX, 
      y: row * spacing.y + spacing.offsetY 
    };
  }
  
  // Create initial nodes with proper layout positions
  const initialNodes = useMemo(() => 
    nodes.map((node, index) => ({
      id: node.id,
      type: 'researchNode',
      position: calculateNodePosition(node.id, nodes.length),
      data: {
        ...node.data,
        label: node.label,
        status: node.status,
        description: node.description
      }
    })), 
  [nodes, width]);  // Add width dependency to recalculate on resize

  // Create edges with proper styling
  const initialEdges = useMemo(() =>
    edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: edge.source === nodes.find(n => n.status === 'active')?.id,
      style: { stroke: '#5D5FEF', strokeWidth: width < 640 ? 1 : 2 },
      data: edge.data
    })),
  [edges, nodes, width]);

  const [reactNodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [reactEdges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Update nodes and edges when props change or screen size changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [nodes, edges, setNodes, setEdges, initialNodes, initialEdges, width]);

  // Handle node click
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
    <div className="w-full h-full bg-background/50">
      <ReactFlow
        nodes={reactNodes}
        edges={reactEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, includeHiddenNodes: false }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-background"
        nodesDraggable={isEditable}
        nodesConnectable={isEditable}
        defaultViewport={{ x: 0, y: 0, zoom: width < 640 ? 0.6 : 0.8 }}
      >
        <Controls className="bg-card shadow-md rounded-md m-2 sm:m-4" showInteractive={width >= 640} />
        {width >= 640 && (
          <MiniMap 
            nodeColor="#5D5FEF" 
            className="bg-card shadow-md rounded-md m-2 sm:m-4"
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        )}
        <Background gap={12} size={1} className="bg-card/10" />
      </ReactFlow>
    </div>
  );
};

export default DAGViewer;
