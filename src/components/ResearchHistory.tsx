
import { useState } from 'react';
import { ResearchHistory as History, ResearchPlan } from '@/types/dag';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';

interface ResearchHistoryProps {
  history: History;
  onSelectResearch: (research: ResearchPlan) => void;
  currentResearchId?: string;
}

const ResearchHistory = ({ 
  history, 
  onSelectResearch, 
  currentResearchId 
}: ResearchHistoryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredHistory = history.filter(item => 
    item.query.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'running':
        return <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse-light" />;
      case 'paused':
        return <div className="h-2 w-2 rounded-full bg-amber-500" />;
      case 'completed':
        return <div className="h-2 w-2 rounded-full bg-green-500" />;
      case 'error':
        return <div className="h-2 w-2 rounded-full bg-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-medium">Research History</h2>
        <div className="relative mt-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search history..."
            className="pl-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No research history found</p>
          ) : (
            filteredHistory.map((item) => (
              <button
                key={item.id}
                className={cn(
                  "w-full text-left p-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                  "border border-border",
                  currentResearchId === item.id && "bg-accent text-accent-foreground"
                )}
                onClick={() => onSelectResearch(item)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{item.query}</span>
                  <span>{getStatusIndicator(item.status)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(item.timestamp).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ResearchHistory;
