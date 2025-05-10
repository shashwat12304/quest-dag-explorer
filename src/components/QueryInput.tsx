
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Pause, Edit, ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface QueryInputProps {
  onSubmitQuery: (query: string) => void;
  onPauseResearch: () => void;
  onResumeResearch: () => void;
  onEditResearch: () => void;
  isResearchRunning: boolean;
  isPaused: boolean;
  currentQuery?: string;
}

const QueryInput = ({
  onSubmitQuery,
  onPauseResearch,
  onResumeResearch,
  onEditResearch,
  isResearchRunning,
  isPaused,
  currentQuery = '',
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
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="font-medium text-sm">Research Query</div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleMinimize} 
          className="h-6 w-6"
        >
          {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      <motion.div 
        className="overflow-hidden"
        initial={{ height: 'auto' }}
        animate={{ height: isMinimized ? 0 : 'auto' }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-4">
          {isResearchRunning && (
            <div className="flex items-center space-x-2 mb-4">
              {isPaused ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onResumeResearch}
                  className="flex items-center gap-2 border-research-secondary text-research-secondary hover:bg-research-secondary/10"
                >
                  <Play className="h-4 w-4" />
                  Resume
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onPauseResearch}
                  className="flex items-center gap-2 border-amber-500 text-amber-500 hover:bg-amber-500/10"
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
                  "flex items-center gap-2",
                  !isPaused ? "opacity-50" : "border-blue-500 text-blue-500 hover:bg-blue-500/10"
                )}
              >
                <Edit className="h-4 w-4" />
                Edit Plan
              </Button>
              
              {isResearchRunning && currentQuery && (
                <div className="text-sm text-muted-foreground ml-auto">
                  Current: <span className="font-medium">{currentQuery}</span>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your research query..."
              disabled={isResearchRunning && !isPaused}
              className="flex-1 focus-visible:ring-research-primary"
            />
            <Button 
              type="submit" 
              disabled={isResearchRunning && !isPaused}
              className="bg-gradient-to-r from-research-primary to-research-accent hover:opacity-90 transition-opacity text-white"
            >
              Research
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

// Utility function to conditionally join class names
const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

export default QueryInput;
