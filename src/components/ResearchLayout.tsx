import { useState, useEffect, useRef } from 'react';
import { ResearchHistory, ResearchPlan, ResearchNode } from '@/types/dag';
import { SidebarProvider, Sidebar, SidebarContent, useSidebar } from '@/components/ui/sidebar';
import ResearchHistoryComponent from '@/components/ResearchHistory';
import DAGViewer from '@/components/DAGViewer';
import QueryInput from '@/components/QueryInput';
import ResearchDetails from '@/components/ResearchDetails';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Moon, Sun, PanelLeftClose, PanelLeft, Loader2, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import { motion } from 'framer-motion';

// API URLs
const API_BASE_URL = 'http://localhost:8000';
const API_ENDPOINTS = {
  research: `${API_BASE_URL}/research`,
  status: (id: string) => `${API_BASE_URL}/status/${id}`,
  dag: `${API_BASE_URL}/dag`,
  report: `${API_BASE_URL}/report`,
};

// WebSocket connection for real-time updates
let websocket: WebSocket | null = null;

// Convert API DAG data to our frontend format
const convertApiDagToFrontendFormat = (dagData: any): ResearchPlan => {
  const id = `research-${Date.now()}`;
  
  // Create nodes - simplified for clarity
  const nodes: ResearchNode[] = dagData.nodes.map((node: any) => ({
    id: `${id}-node-${node.node_id}`,
    label: node.title,
    status: 'waiting',
    description: node.description,
    // Simplified data structure
    data: {
      title: node.title,
      nodeId: node.node_id
    }
  }));
  
  // Create edges
  const edges: any[] = [];
  dagData.adjacency_matrix.forEach((row: number[], fromIdx: number) => {
    row.forEach((cell: number, toIdx: number) => {
      if (cell === 1) {
        edges.push({
          id: `${id}-edge-${fromIdx}-${toIdx}`,
          source: `${id}-node-${fromIdx + 1}`,
          target: `${id}-node-${toIdx + 1}`,
          data: {
            reason: dagData.dependency_reasons.find(
              (reason: any) => reason.from_node === fromIdx + 1 && reason.to_node === toIdx + 1
            )?.reason || 'Dependency'
          }
        });
      }
    });
  });
  
  return {
    id,
    query: "Research Query", // Will be updated with actual query
    timestamp: new Date().toISOString(),
    status: 'running',
    nodes,
    edges,
  };
};

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
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showDagAnimation, setShowDagAnimation] = useState(true);
  
  // Use this to track if we need to show the animation 
  // (only true on first load of a new DAG)
  const dagAnimationRef = useRef(new Map<string, boolean>());
  
  // Handlers
  const handleSubmitQuery = async (query: string) => {
    setIsProcessing(true);
    setStatusMessage("Starting research process...");
    
    try {
      // Send the query to the API to start the research process
      const response = await axios.post(API_ENDPOINTS.research, { query });
      
      if (response.data && response.data.success) {
        // Store the query for WebSocket updates
        setQuery(query);
        
        // Let the WebSocket handle the DAG generation and updates
        toast.success("Research process started", { 
          description: "WebSocket connection established. You'll see updates in real-time." 
        });
        
        // Ensure WebSocket is connected
        if (websocket && websocket.readyState !== WebSocket.OPEN) {
          console.warn("WebSocket not open, reconnecting...");
          // Reinitialize WebSocket
          websocket = new WebSocket(`ws://localhost:8000/ws`);
          websocket.onopen = () => {
            console.log('WebSocket reconnected');
            // Send a message to identify this client
            websocket.send(JSON.stringify({
              type: 'connect',
              data: { query }
            }));
          };
        }
      } else {
        throw new Error("Failed to start research process");
      }
    } catch (error) {
      console.error('Error submitting query:', error);
      toast.error('Failed to start research. Please try again.');
      setIsProcessing(false);
    }
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
    setShowFeedbackInput(true);
    toast.info("Edit mode enabled", {
      description: "You can now modify the research plan",
    });
  };
  
  const handleSelectResearch = (research: ResearchPlan) => {
    // Check if this DAG should be animated (first view only)
    const shouldAnimate = dagAnimationRef.current.get(research.id) === true;
    setShowDagAnimation(shouldAnimate);
    
    // Mark this DAG as viewed
    if (shouldAnimate) {
      dagAnimationRef.current.set(research.id, false);
    }
    
    setCurrentResearch(research);
    setSelectedNode(undefined);
    if (research.id.includes('snapshot')) {
      setReadOnly(true);
    } else {
      setReadOnly(false);
    }
  };
  
  const handleNodeClick = (node: ResearchNode) => {
    setSelectedNode(node);
  };

  const handleSaveEdits = () => {
    setIsEditable(false);
    setShowFeedbackInput(false);
    if (currentResearch) {
      setIsAnimating(true);
      // 1.5s animation to simulate DAG execution
      setTimeout(() => {
        // 1. Save a snapshot of the current DAG as a subhistory (with feedback)
        const snapshot: ResearchPlan = {
          ...currentResearch,
          id: `${currentResearch.id}-snapshot-${Date.now()}`,
          timestamp: new Date().toISOString(),
          status: 'paused',
          feedback: feedback.trim() ? feedback.trim() : undefined,
        };
        // 2. Apply the edit to the DAG (simulate by generating a new DAG)
        const editedResearch: ResearchPlan = {
          ...currentResearch,
          id: `${currentResearch.id}-edit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          status: 'running',
          feedback: undefined, // The new active DAG does not have feedback
        };
        setResearchHistory(prev =>
          prev.map(r => {
            if (r.id === currentResearch.id.split('-edit-')[0].split('-snapshot-')[0]) {
              return {
                ...r,
                edits: r.edits ? [snapshot, ...r.edits] : [snapshot],
              };
            }
            return r;
          })
        );
        setCurrentResearch(editedResearch);
        setFeedback('');
        setReadOnly(false);
        setIsAnimating(false);
        toast.success("Research plan updated (as edit)");
      }, 1500);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  // WebSocket setup with error handling and reconnection
  useEffect(() => {
    const setupWebSocket = () => {
      // Close previous connection if exists
      if (websocket) {
        websocket.close();
      }

      // Create new WebSocket connection
      websocket = new WebSocket(`ws://localhost:8000/ws`);
      
      websocket.onopen = () => {
        console.log('WebSocket connection established');
        toast.success("Connected to research server");
        
        // Send a message to identify this client if there's an active query
        if (query) {
          websocket.send(JSON.stringify({
            type: 'connect',
            data: { query }
          }));
        }
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data);
          
          // Update status message regardless of status type
          if (data.message) {
            setStatusMessage(data.message);
          }
          
          switch (data.status) {
            case 'loading':
              toast.info(data.message || 'Loading agent registry...', { id: 'research-status' });
              break;
              
            case 'researching':
              toast.info(data.message || 'Performing web research...', { id: 'research-status' });
              break;
              
            case 'dag_generated':
              if (data.data?.dag) {
                toast.success('DAG generated!', { id: 'research-status' });
                
                // Convert API DAG to frontend format
                const formattedDag = convertApiDagToFrontendFormat(data.data.dag);
                // Update the query
                formattedDag.query = query;
                
                // Enable animation for this new DAG
                setShowDagAnimation(true);
                dagAnimationRef.current.set(formattedDag.id, true);
                
                // Update the research history and current research
                setResearchHistory(prev => [formattedDag, ...prev]);
                setCurrentResearch(formattedDag);
                setIsProcessing(false);
              }
              break;
              
            case 'executing':
              toast.info(data.message || 'Executing research nodes...', { id: 'research-status' });
              break;
              
            case 'node_start':
              // Update node status to 'active'
              if (currentResearch && data.data?.node_id) {
                setCurrentResearch(prev => {
                  if (!prev) return null;
                  
                  const nodeId = `${prev.id}-node-${data.data.node_id}`;
                  return {
                    ...prev,
                    nodes: prev.nodes.map(node => 
                      node.id === nodeId ? { ...node, status: 'active' } : node
                    )
                  };
                });
              }
              break;
              
            case 'node_complete':
              // Update node status to 'completed'
              if (currentResearch && data.data?.node_id) {
                setCurrentResearch(prev => {
                  if (!prev) return null;
                  
                  const nodeId = `${prev.id}-node-${data.data.node_id}`;
                  return {
                    ...prev,
                    nodes: prev.nodes.map(node => 
                      node.id === nodeId ? { ...node, status: 'completed', result: data.data.result } : node
                    )
                  };
                });
              }
              break;
              
            case 'complete':
              toast.success('Research complete!', { id: 'research-status' });
              // Update research status
              if (currentResearch) {
                const completedResearch = {
                  ...currentResearch,
                  status: 'completed' as const,
                  report: data.data?.report
                };
                setCurrentResearch(completedResearch);
                setResearchHistory(prev => 
                  prev.map(r => r.id === completedResearch.id ? completedResearch : r)
                );
              }
              break;
              
            case 'error':
              setIsProcessing(false);
              toast.error(`Error: ${data.message}`, { id: 'research-status' });
              break;
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection to research server failed. Reconnecting...');
        
        // Try to reconnect after a short delay
        setTimeout(setupWebSocket, 3000);
      };
      
      websocket.onclose = (event) => {
        console.log('WebSocket connection closed', event.code, event.reason);
        
        // If this wasn't a normal closure, try to reconnect
        if (event.code !== 1000) {
          toast.error('Connection to research server lost. Reconnecting...');
          setTimeout(setupWebSocket, 3000);
        }
      };
    };
    
    // Initialize WebSocket
    setupWebSocket();
    
    return () => {
      if (websocket) {
        // Use clean closure code to indicate intentional disconnect
        websocket.close(1000, 'Component unmounted');
      }
    };
  }, []); // Empty dependency array to run only once on mount
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground transition-colors duration-300">
        {isAnimating && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="flex flex-col items-center gap-6 p-10 bg-card rounded-xl shadow-xl border border-research-primary/30"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, type: "spring" }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative"
              >
                <div className="absolute inset-0 bg-research-primary/20 rounded-full blur-xl"></div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <Loader2 className="h-16 w-16 text-research-primary" />
                </motion.div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-research-primary to-research-accent bg-clip-text text-transparent">
                  Building Research Graph
                </h3>
                <p className="text-muted-foreground">
                  Creating your Directed Acyclic Graph for comprehensive research...
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
        {/* Sidebar */}
        <div className={sidebarCollapsed ? "w-14 transition-all duration-300 flex flex-col border-r border-sidebar-border bg-sidebar-background shadow-lg" : "w-80 transition-all duration-300 flex flex-col border-r border-sidebar-border bg-sidebar-background shadow-lg"}>
          {/* Collapse/Expand Button */}
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center h-12 w-full border-b border-sidebar-border bg-sidebar-background/80 hover:bg-sidebar-background/60 transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeft className="h-5 w-5 text-muted-foreground" /> : <PanelLeftClose className="h-5 w-5 text-muted-foreground" />}
          </button>
          {/* Sidebar Content */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto">
              <ResearchHistoryComponent 
                history={researchHistory}
                onSelectResearch={handleSelectResearch}
                currentResearchId={currentResearch?.id}
              />
            </div>
          )}
        </div>
        {/* Main Content */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center bg-card/50 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">Deep Research Assistant</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
          {currentResearch ? (
            <>
              {readOnly && (
                <div className="bg-yellow-100 text-yellow-800 px-4 py-2 text-center font-semibold border-b border-yellow-300">
                  Viewing a previous snapshot (read-only)
                </div>
              )}
              <div className="p-4 border-b bg-card/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{currentResearch.query}</h2>
                  {isEditable && !readOnly && (
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
                    isEditable={isEditable && !readOnly}
                    animate={showDagAnimation}
                  />
                </div>
                <div className="w-80 border-l overflow-y-auto bg-card/30 backdrop-blur-sm">
                  <ResearchDetails selectedNode={selectedNode} />
                </div>
              </div>
              {/* Only show control buttons during active research, but not the full input */}
              <QueryInput
                onSubmitQuery={() => {}}
                onPauseResearch={handlePauseResearch}
                onResumeResearch={handleResumeResearch}
                onEditResearch={handleEditResearch}
                isResearchRunning={!!currentResearch && !readOnly}
                isPaused={currentResearch.status === 'paused'}
                currentQuery={currentResearch.query}
              />
              {/* Bottom feedback input bar for edits */}
              {showFeedbackInput && isEditable && !readOnly && (
                <div className="w-full border-t bg-card shadow-lg transition-all duration-300 p-4 flex items-center gap-2 fixed bottom-0 left-0 z-30">
                  <input
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Enter feedback about this edit..."
                    className="flex-1 pl-4 pr-4 py-3 rounded-lg border border-input bg-background text-base md:text-lg shadow focus-visible:ring-2 focus-visible:ring-research-primary focus:border-research-primary transition-all"
                  />
                  <Button
                    onClick={handleSaveEdits}
                    className="rounded-lg bg-gradient-to-r from-research-primary to-research-accent hover:opacity-90 transition-opacity text-white h-12 px-7 shadow-lg flex items-center gap-2 text-base font-semibold"
                  >
                    Save Edits
                  </Button>
                </div>
              )}
            </>
          ) :
            <div className="flex-1 flex items-center justify-center flex-col p-4">
              <div className="max-w-md text-center p-8 rounded-xl bg-card shadow-lg border border-border/50">
                <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-research-primary to-research-accent bg-clip-text text-transparent">Deep Research Assistant</h1>
                <p className="text-muted-foreground mb-6">
                  Enter a research question below to start a deep research process using a 
                  Directed Acyclic Graph (DAG) approach.
                </p>
                
                {isProcessing && (
                  <div className="mb-4 p-4 bg-research-primary/10 border border-research-primary/30 rounded-md">
                    <div className="text-sm text-research-primary font-medium flex items-center gap-2 justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="h-4 w-4" />
                      </motion.div>
                      {statusMessage || "Generating research DAG..."}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-2 mt-4">
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Enter your research query..."
                    className="flex-1 pl-4 pr-4 py-3 rounded-lg border border-input bg-background text-base md:text-lg shadow focus-visible:ring-2 focus-visible:ring-research-primary focus:border-research-primary transition-all"
                    disabled={isProcessing}
                  />
                  <Button
                    onClick={() => handleSubmitQuery(query)}
                    className="rounded-lg bg-gradient-to-r from-research-primary to-research-accent hover:opacity-90 transition-opacity text-white h-12 px-7 shadow-lg flex items-center gap-2 text-base font-semibold"
                    disabled={isProcessing || !query.trim()}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Search className="h-5 w-5 mr-1" />
                    )}
                    {isProcessing ? "Processing..." : "Research"}
                  </Button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ResearchLayout;
