
import { ResearchNode } from '@/types/dag';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface ResearchDetailsProps {
  selectedNode?: ResearchNode;
}

const ResearchDetails = ({ selectedNode }: ResearchDetailsProps) => {
  if (!selectedNode) {
    return (
      <div className="p-4 h-full flex flex-col justify-center items-center text-center text-muted-foreground">
        <div className="w-16 h-16 border-4 rounded-full border-dashed border-muted-foreground/30 mb-4 animate-spin-slow"></div>
        <p className="max-w-xs">Select a node to see research details</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="outline" className="bg-amber-500/20 text-amber-500 border-amber-300/50">Waiting</Badge>;
      case 'active':
        return <Badge className="bg-blue-500 animate-pulse">Active</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <ScrollArea className="h-full">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-medium">{selectedNode.label}</h3>
            {getStatusBadge(selectedNode.status)}
          </div>
          
          {selectedNode.description && (
            <div className="rounded-md bg-card p-4 border shadow-sm">
              <p className="text-sm leading-relaxed">
                {selectedNode.description}
              </p>
            </div>
          )}

          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Node Information</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/30 p-2 rounded">
                <span className="block text-muted-foreground">ID</span>
                <span className="font-mono">{selectedNode.id}</span>
              </div>
              <div className="bg-muted/30 p-2 rounded">
                <span className="block text-muted-foreground">Status</span>
                <span>{selectedNode.status}</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
};

export default ResearchDetails;
