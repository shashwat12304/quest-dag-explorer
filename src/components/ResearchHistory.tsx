import { useState } from 'react';
import { ResearchHistory as History, ResearchPlan } from '@/types/dag';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Clock, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
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

  // State for expanded/collapsed edits
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  // Recursive render function for tree
  const renderHistoryItem = (item: ResearchPlan, level = 0) => {
    const hasEdits = item.edits && item.edits.length > 0;
    const isExpanded = expanded[item.id];
    if (level > 0) {
      // Subhistory: show only feedback
      return item.feedback ? (
        <div key={item.id} className="mb-1 ml-6 border-l-2 border-muted/30 pl-3">
          <div className="text-xs text-blue-400 bg-blue-900/10 rounded px-2 py-1 border border-blue-400/30">
            <span className="font-semibold">Feedback:</span> {item.feedback}
          </div>
          {hasEdits && isExpanded && (
            <div className="mt-1">
              {item.edits!.map(edit => renderHistoryItem(edit, level + 1))}
            </div>
          )}
        </div>
      ) : null;
    }
    // Main history (level 0)
    return (
      <div key={item.id} className={cn('mb-1', level > 0 && 'ml-6 border-l-2 border-muted/30 pl-3')}> 
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'flex items-center w-full text-left p-3 rounded-lg transition-all duration-200 hover:scale-[1.01]',
            'border dark:bg-sidebar-accent/30 backdrop-blur-sm',
            currentResearchId === item.id ?
              'border-research-primary dark:bg-sidebar-accent/50 shadow-md' :
              'border-border hover:border-research-primary/50'
          )}
        >
          {hasEdits && (
            <button
              onClick={() => toggleExpand(item.id)}
              className="mr-2 p-1 rounded hover:bg-muted/30 focus:outline-none"
              aria-label={isExpanded ? 'Collapse edits' : 'Expand edits'}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          <div className="flex-1 cursor-pointer" onClick={() => onSelectResearch(item)}>
            <div className="flex items-center justify-between">
              <span className="font-medium truncate">{item.query}</span>
              <span>{getStatusIndicator(item.status)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(item.timestamp).toLocaleString()}
            </p>
          </div>
        </motion.div>
        {hasEdits && isExpanded && (
          <div className="mt-1">
            {item.edits!.map(edit => renderHistoryItem(edit, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-sidebar-background border-r border-sidebar-border shadow-lg">
      <div className="p-4 border-b border-sidebar-border bg-sidebar-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-research-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Research History</h2>
          </div>
        </div>
        <div className="relative mt-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Search history..."
            className="pl-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-research-primary focus:border-research-primary shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 animate-pulse">
              <Clock className="h-14 w-14 text-research-primary/30 mb-3" />
              <p className="text-base font-medium text-muted-foreground mb-1">No research yet</p>
              <p className="text-xs text-muted-foreground">Your research history will appear here</p>
            </div>
          ) : (
            filteredHistory.map(item => renderHistoryItem(item))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ResearchHistory;
