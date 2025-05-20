import { ResearchNode } from '@/types/dag';
import { cn } from '@/lib/utils';

interface ResearchDetailsProps {
  selectedNode?: ResearchNode;
}

const ResearchDetails = ({ selectedNode }: ResearchDetailsProps) => {
  if (!selectedNode) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Select a node to view details</p>
        </div>
      </div>
    );
  }

  // Get status-specific styling
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: // waiting
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    }
  };

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Node Information</h3>
          <div className="text-sm text-muted-foreground">ID: {selectedNode.id}</div>
          
          <div className="mt-2">
            <span className={cn(
              "text-xs font-medium rounded-full px-2.5 py-1",
              getStatusBadgeClass(selectedNode.status)
            )}>
              {selectedNode.status}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Title</h4>
          <div className="bg-card p-3 rounded border text-sm">
            {selectedNode.label}
          </div>
        </div>

        {selectedNode.description && (
          <div className="space-y-2">
            <h4 className="font-medium">Description</h4>
            <div className="bg-card p-3 rounded border text-sm">
              {selectedNode.description}
            </div>
          </div>
        )}

        {selectedNode.data && selectedNode.data.assigned_agent && (
          <div className="space-y-2">
            <h4 className="font-medium">Assigned Agent</h4>
            <div className="bg-card p-3 rounded border text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-research-primary"></span>
              {selectedNode.data.assigned_agent}
            </div>
          </div>
        )}

        {selectedNode.data && selectedNode.data.output && (
          <div className="space-y-2">
            <h4 className="font-medium">Output</h4>
            <div className="bg-card p-3 rounded border text-sm max-h-64 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {selectedNode.data.output}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchDetails;
