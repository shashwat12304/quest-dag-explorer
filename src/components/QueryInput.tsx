import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Pause, Edit, ChevronUp, ChevronDown, Search, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface QueryInputProps {
  onSubmitQuery: (query: string) => void;
  onPauseResearch: () => void;
  onResumeResearch: () => void;
  onEditResearch: () => void;
  isResearchRunning: boolean;
  isPaused: boolean;
  currentQuery?: string;
  isProcessing?: boolean;
}

const QueryInput = ({
  onSubmitQuery,
  onPauseResearch,
  onResumeResearch,
  onEditResearch,
  isResearchRunning,
  isPaused,
  currentQuery = '',
  isProcessing = false,
}: QueryInputProps) => {
  const [query, setQuery] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSubmitQuery(query.trim());
      setQuery('');
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <div className="border-t bg-card shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b">
        <div className="font-medium text-sm">Research Query</div>
      </div>
      <div className="px-3 sm:px-6 py-3 sm:py-4">
        {isResearchRunning && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {isPaused ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onResumeResearch}
                className="flex items-center gap-2 border-research-secondary text-white bg-research-secondary hover:bg-research-secondary/80 focus-visible:ring-2 focus-visible:ring-research-secondary shadow-md font-semibold"
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onPauseResearch}
                className="flex items-center gap-2 border-amber-500 text-white bg-amber-500 hover:bg-amber-600 focus-visible:ring-2 focus-visible:ring-amber-500 shadow-md font-semibold"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEditResearch}
              disabled={!isPaused}
              className={cn(
                "flex items-center gap-2 border-blue-500 text-white bg-blue-500 hover:bg-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 shadow-md font-semibold",
                !isPaused ? "opacity-50 cursor-not-allowed" : ""
              )}
            >
              <Edit className="h-4 w-4" />
              Edit Plan
            </Button>
            {isResearchRunning && currentQuery && (
              <div className="w-full sm:w-auto text-sm text-muted-foreground sm:ml-auto mt-2 sm:mt-0">
                Current: <span className="font-medium truncate inline-block max-w-[16rem] align-bottom">{currentQuery}</span>
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Enter a research question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 py-2"
            disabled={isProcessing || isResearchRunning}
          />
          <Button 
            type="submit" 
            disabled={!query.trim() || isProcessing || isResearchRunning}
            className="bg-research-primary hover:bg-research-primary/80 px-5 w-full sm:w-auto"
          >
            {isProcessing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  <Loader2 className="h-4 w-4" />
                </motion.div>
                Processing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Research
              </>
            )}
          </Button>
        </form>
        
        {isProcessing && (
          <div className="mt-4 p-3 bg-research-primary/10 border border-research-primary/30 rounded-md">
            <div className="text-sm text-research-primary font-medium flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="h-4 w-4" />
              </motion.div>
              <span className="line-clamp-2">Generating research DAG. This may take a few moments...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Utility function to conditionally join class names
const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

export default QueryInput;
