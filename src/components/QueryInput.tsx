
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Pause, Edit } from 'lucide-react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSubmitQuery(query.trim());
      setQuery('');
    }
  };

  return (
    <div className="border-t bg-card p-4">
      <div className="flex items-center space-x-2 mb-2">
        {isResearchRunning && (
          <>
            {isPaused ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onResumeResearch}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onPauseResearch}
                className="flex items-center gap-2"
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
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Plan
            </Button>
          </>
        )}
        {isResearchRunning && (
          <div className="text-sm text-muted-foreground ml-auto">
            Current query: <span className="font-medium">{currentQuery}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your research query..."
          disabled={isResearchRunning && !isPaused}
          className="flex-1"
        />
        <Button 
          type="submit" 
          disabled={isResearchRunning && !isPaused}
          className="bg-research-accent hover:bg-research-accent/90 text-white"
        >
          Research
        </Button>
      </form>
    </div>
  );
};

export default QueryInput;
