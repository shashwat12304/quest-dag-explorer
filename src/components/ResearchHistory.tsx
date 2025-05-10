
import { useState } from 'react';
import { ResearchHistory as History, ResearchPlan } from '@/types/dag';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Clock, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-research-primary" />
            <h2 className="text-lg font-medium">Research History</h2>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Search history..."
            className="pl-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Your research history will appear here
              </p>
            </div>
          ) : (
            filteredHistory.map((item, index) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  "w-full text-left p-3 rounded-md transition-all duration-200 hover:scale-[1.01]",
                  "border dark:bg-sidebar-accent/30 backdrop-blur-sm",
                  currentResearchId === item.id ? 
                    "border-research-primary dark:bg-sidebar-accent/50 shadow-md" : 
                    "border-border hover:border-research-primary/50"
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
              </motion.button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ResearchHistory;
