
import { useState, useEffect } from 'react';
import { ResearchHistory, ResearchPlan, ResearchNode } from '@/types/dag';
import { SidebarProvider, Sidebar, SidebarContent, useSidebar } from '@/components/ui/sidebar';
import ResearchHistoryComponent from '@/components/ResearchHistory';
import DAGViewer from '@/components/DAGViewer';
import QueryInput from '@/components/QueryInput';
import ResearchDetails from '@/components/ResearchDetails';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Moon, Sun, PanelLeftClose, PanelLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

// Mock data generator function for demo purposes
const generateMockResearch = (query: string): ResearchPlan => {
  const id = `research-${Date.now()}`;
  const nodeCount = Math.floor(Math.random() * 5) + 3; // 3-7 nodes
  
  const nodes: ResearchNode[] = [];
  
  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = `${id}-node-${i}`;
    let status: ResearchNode['status'] = 'waiting';
    
    if (i === 0) status = 'completed';
    else if (i === 1) status = 'active';
    
    nodes.push({
      id: nodeId,
      label: `Research Task ${i + 1}`,
      status,
      description: `This is a research task to investigate part of the query: "${query}".`,
    });
  }
  
  // Create edges (simple linear path for demo)
  const edges = [];
  for (let i = 0; i < nodeCount - 1; i++) {
    edges.push({
      id: `${id}-edge-${i}`,
      source: nodes[i].id,
      target: nodes[i + 1].id,
    });
  }
  
  return {
    id,
    query,
    timestamp: new Date().toISOString(),
    status: 'running',
    nodes,
    edges,
  };
};

const ResearchLayout = () => {
  // State
  const [researchHistory, setResearchHistory] = useState<ResearchHistory>([]);
  const [currentResearch, setCurrentResearch] = useState<ResearchPlan | null>(null);
  const [selectedNode, setSelectedNode] = useState<ResearchNode | undefined>();
  const [isEditable, setIsEditable] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Handlers
  const handleSubmitQuery = (query: string) => {
    const newResearch = generateMockResearch(query);
    setResearchHistory(prev => [newResearch, ...prev]);
    setCurrentResearch(newResearch);
    toast.success("Research started", {
      description: `Analyzing: ${query}`,
    });
  };
  
  const handlePauseResearch = () => {
    if (currentResearch) {
      const pausedResearch = {
        ...currentResearch,
        status: 'paused' as const,
      };
      setCurrentResearch(pausedResearch);
      setResearchHistory(prev => 
        prev.map(r => r.id === pausedResearch.id ? pausedResearch : r)
      );
      toast.info("Research paused", {
        description: "You can now edit the research plan",
      });
    }
  };
  
  const handleResumeResearch = () => {
    if (currentResearch) {
      const resumedResearch = {
        ...currentResearch,
        status: 'running' as const,
      };
      setCurrentResearch(resumedResearch);
      setResearchHistory(prev => 
        prev.map(r => r.id === resumedResearch.id ? resumedResearch : r)
      );
      setIsEditable(false);
      toast.success("Research resumed");
    }
  };
  
  const handleEditResearch = () => {
    setIsEditable(true);
    toast.info("Edit mode enabled", {
      description: "You can now modify the research plan",
    });
  };
  
  const handleSelectResearch = (research: ResearchPlan) => {
    setCurrentResearch(research);
    setSelectedNode(undefined);
  };
  
  const handleNodeClick = (node: ResearchNode) => {
    setSelectedNode(node);
  };

  const handleSaveEdits = () => {
    setIsEditable(false);
    toast.success("Research plan updated");
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground transition-colors duration-300">
        <Sidebar collapsible="icon">
          <SidebarContent className="w-80">
            <ResearchHistoryComponent 
              history={researchHistory}
              onSelectResearch={handleSelectResearch}
              currentResearchId={currentResearch?.id}
            />
          </SidebarContent>
        </Sidebar>
        
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center bg-card/50 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="md:hidden"
              >
                {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
              <h1 className="text-xl font-semibold">Deep Research Assistant</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
          
          {currentResearch ? (
            <>
              <div className="p-4 border-b bg-card/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{currentResearch.query}</h2>
                  {isEditable && (
                    <Button onClick={handleSaveEdits} variant="default" className="bg-research-accent hover:bg-research-accent/80 text-white transition-colors">
                      Save Edits
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Status: {currentResearch.status.charAt(0).toUpperCase() + currentResearch.status.slice(1)}
                </p>
              </div>
              
              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-hidden">
                  <DAGViewer 
                    nodes={currentResearch.nodes}
                    edges={currentResearch.edges}
                    onNodeClick={handleNodeClick}
                    isEditable={isEditable}
                  />
                </div>
                
                <div className="w-80 border-l overflow-y-auto bg-card/30 backdrop-blur-sm">
                  <ResearchDetails selectedNode={selectedNode} />
                </div>
              </div>
              
              <QueryInput
                onSubmitQuery={handleSubmitQuery}
                onPauseResearch={handlePauseResearch}
                onResumeResearch={handleResumeResearch}
                onEditResearch={handleEditResearch}
                isResearchRunning={!!currentResearch}
                isPaused={currentResearch.status === 'paused'}
                currentQuery={currentResearch.query}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col p-4">
              <div className="max-w-md text-center p-8 rounded-xl bg-card shadow-lg border border-border/50">
                <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-research-primary to-research-accent bg-clip-text text-transparent">Deep Research Assistant</h1>
                <p className="text-muted-foreground mb-6">
                  Enter a research question below to start a deep research process using a 
                  Directed Acyclic Graph (DAG) approach.
                </p>
                
                <QueryInput
                  onSubmitQuery={handleSubmitQuery}
                  onPauseResearch={() => {}}
                  onResumeResearch={() => {}}
                  onEditResearch={() => {}}
                  isResearchRunning={false}
                  isPaused={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ResearchLayout;
