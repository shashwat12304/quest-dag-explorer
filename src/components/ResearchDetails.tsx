
import { ResearchNode } from '@/types/dag';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ResearchDetailsProps {
  selectedNode?: ResearchNode;
}

const ResearchDetails = ({ selectedNode }: ResearchDetailsProps) => {
  if (!selectedNode) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Select a node to see details</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">Waiting</Badge>;
      case 'active':
        return <Badge className="bg-blue-500">Active</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-medium">{selectedNode.label}</h3>
          {getStatusBadge(selectedNode.status)}
        </div>
        
        {selectedNode.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {selectedNode.description}
          </p>
        )}
      </div>
    </ScrollArea>
  );
};

export default ResearchDetails;
