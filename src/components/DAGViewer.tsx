
import { useCallback, useEffect } from 'react';
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
} from '@xyflow/react';
import { ResearchNode, ResearchEdge } from '@/types/dag';

import '@xyflow/react/dist/style.css';

interface DAGViewerProps {
  nodes: ResearchNode[];
  edges: ResearchEdge[];
  onNodeClick?: (node: ResearchNode) => void;
  isEditable?: boolean;
}

const DAGViewer = ({ nodes, edges, onNodeClick, isEditable = false }: DAGViewerProps) => {
  // Convert our research nodes to ReactFlow nodes
  const initialNodes: Node[] = nodes.map((node) => ({
    id: node.id,
    data: { 
      label: node.label,
      status: node.status,
      description: node.description,
    },
    position: { x: 0, y: 0 }, // Will be auto-layouted
    className: getNodeClass(node.status),
  }));

  // Convert our research edges to ReactFlow edges
  const initialEdges: Edge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: edge.source === nodes.find(n => n.status === 'active')?.id,
    style: { stroke: getEdgeColor(edge, nodes), strokeWidth: 2 },
    className: 'transition-all duration-300',
  }));

  const [reactNodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [reactEdges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Function to determine edge color based on connected node statuses
  function getEdgeColor(edge: ResearchEdge, nodes: ResearchNode[]): string {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode?.status === 'active' || targetNode?.status === 'active') {
      return '#4F46E5'; // Active edge - vibrant purple
    } else if (sourceNode?.status === 'completed' && targetNode?.status === 'completed') {
      return '#4ADE80'; // Completed edge - green
    } else if (sourceNode?.status === 'error' || targetNode?.status === 'error') {
      return '#EF4444'; // Error edge - red
    } else {
      return '#A5B4FC'; // Default edge - light purple
    }
  }
  
  // Function to determine node class based on status
  function getNodeClass(status: string): string {
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
  }

  // Auto-layout nodes in useEffect
  useEffect(() => {
    // Simple layout algorithm - this could be replaced with a more sophisticated one
    const nodeMap = new Map(nodes.map((node, index) => [
      node.id, 
      { ...node, level: 0, position: { x: 0, y: index * 100 } }
    ]));
    
    // Calculate node levels
    edges.forEach(edge => {
      const targetNode = nodeMap.get(edge.target);
      const sourceNode = nodeMap.get(edge.source);
      
      if (targetNode && sourceNode) {
        targetNode.level = Math.max(targetNode.level, sourceNode.level + 1);
      }
    });
    
    // Position nodes based on levels
    const levelCounts = new Map<number, number>();
    const levelWidths = new Map<number, number>();
    const nodeWidth = 200;
    const nodeHeight = 80;
    const horizontalSpacing = 250;
    const verticalSpacing = 100;
    
    // Count nodes per level
    nodeMap.forEach(node => {
      const count = levelCounts.get(node.level) || 0;
      levelCounts.set(node.level, count + 1);
    });
    
    // Calculate width per level
    levelCounts.forEach((count, level) => {
      levelWidths.set(level, count * (nodeWidth + 20));
    });
    
    // Position nodes
    const levelPositions = new Map<number, number>();
    
    const updatedNodes = nodes.map(node => {
      const nodeWithPos = nodeMap.get(node.id);
      if (!nodeWithPos) return null;
      
      const level = nodeWithPos.level;
      let levelPosition = levelPositions.get(level) || 0;
      
      const x = level * horizontalSpacing;
      const y = levelPosition;
      
      levelPosition += verticalSpacing;
      levelPositions.set(level, levelPosition);
      
      return {
        id: node.id,
        data: { 
          label: node.label,
          status: node.status,
          description: node.description,
        },
        position: { x, y },
        className: getNodeClass(node.status),
      };
    }).filter(Boolean) as Node[];
    
    setNodes(updatedNodes);
  }, [nodes, edges, setNodes]);

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
    <div className="w-full h-full bg-gradient-to-br from-background to-background/50">
      <ReactFlow
        nodes={reactNodes}
        edges={reactEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        fitView
        attributionPosition="bottom-right"
        nodesDraggable={isEditable}
        nodesConnectable={isEditable}
        elementsSelectable={isEditable}
      >
        <Controls className="bg-card border shadow-md rounded-md" />
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
