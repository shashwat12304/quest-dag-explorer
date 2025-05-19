import { useState, useEffect, useRef, useCallback } from 'react';
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
import useWebSocket, { WebSocketMessage, DagStructure, NodeStatusUpdate, ResearchCompleted } from '@/hooks/useWebSocket';

// API URLs
const API_BASE_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';
const API_ENDPOINTS = {
  research: `${API_BASE_URL}/research`,
  status: (id: string) => `${API_BASE_URL}/status/${id}`,
  dag: `${API_BASE_URL}/dag`,
  report: `${API_BASE_URL}/report`,
};

// Convert API DAG data to our frontend format
const convertApiDagToFrontendFormat = (dagData: any, query: string): ResearchPlan => {
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
      nodeId: node.node_id,
      description: node.description,
      assigned_agent: node.assigned_agent
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
    query,
    timestamp: new Date().toISOString(),
    status: 'running',
    nodes,
    edges,
  };
};

// Find a node in the research plan by node_id
const findNodeByApiId = (research: ResearchPlan, nodeId: number): ResearchNode | undefined => {
  return research.nodes.find(node => node.data?.nodeId === nodeId);
};

const updateNodeStatus = (research: ResearchPlan, nodeId: number, status: string, outputSummary?: string): ResearchPlan => {
  const updatedNodes = research.nodes.map(node => {
    if (node.data?.nodeId === nodeId) {
      return {
        ...node,
        status: status as any, // Fix type issue
        output: outputSummary,
      };
    }
    return node;
  });
  
  return {
    ...research,
    nodes: updatedNodes,
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
  const [report, setReport] = useState<string | null>(null);
  const [reportTitle, setReportTitle] = useState<string | null>(null);
  
  // Use this to track if we need to show the animation 
  // (only true on first load of a new DAG)
  const dagAnimationRef = useRef(new Map<string, boolean>());
  
  // Add WebSocket connection status tracking
  const [wsConnected, setWsConnected] = useState(false);
  
  // Add status polling as fallback if WebSocket fails
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const stopStatusPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);
  
  // Improve node status update handling
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log("WebSocket message received:", message);
    
    try {
      switch (message.type) {
        case 'status_update':
          setStatusMessage(message.message);
          
          // Update status based on message
          if (message.status === 'researching' || message.status === 'loading') {
            setIsProcessing(true);
          } else if (message.status === 'error') {
            setIsProcessing(false);
            toast.error(message.message);
          } else if (message.status === 'complete') {
            setIsProcessing(false);
            toast.success('Research completed successfully');
            // Set report content if available
            if (message.data?.report) {
              setReport(message.data.report);
            }
            // Stop polling if it's active
            stopStatusPolling();
          } else if (message.status === 'dag_generated') {
            // DAG was generated
            setIsProcessing(false);
            toast.success('Research DAG generated');
          }
          break;
          
        case 'dag_structure':
          // New DAG structure received
          const dagData = message as DagStructure;
          console.log("DAG structure received:", dagData);
          
          // Convert to frontend format
          const newResearch = convertApiDagToFrontendFormat({
            nodes: dagData.nodes,
            adjacency_matrix: dagData.edges.reduce((matrix: number[][], edge) => {
              // Initialize matrix if needed
              if (!matrix.length) {
                const maxNodeId = Math.max(...dagData.nodes.map(n => n.node_id));
                matrix = Array(maxNodeId).fill(0).map(() => Array(maxNodeId).fill(0));
              }
              
              // Fill in edge
              matrix[edge.from - 1][edge.to - 1] = 1;
              return matrix;
            }, []),
            dependency_reasons: dagData.edges.map(edge => ({
              from_node: edge.from,
              to_node: edge.to,
              reason: 'Dependency relationship'
            }))
          }, query);
          
          // Mark for animation
          dagAnimationRef.current.set(newResearch.id, true);
          
          // Add to history and set as current
          setResearchHistory(prev => [...prev, newResearch]);
          setCurrentResearch(newResearch);
          setSelectedNode(undefined);
          setShowDagAnimation(true);
          break;
          
        case 'node_status_update':
          // Node status update received
          const nodeUpdate = message as NodeStatusUpdate;
          console.log("Node status update received:", nodeUpdate);
          
          if (currentResearch) {
            // Map API status to frontend status
            let frontendStatus: 'waiting' | 'active' | 'completed' | 'error' = 'waiting';
            
            // Improved status mapping with better logging
            console.log(`Mapping backend status '${nodeUpdate.status}' for node ${nodeUpdate.node_id}`);
            
            switch (nodeUpdate.status) {
              case 'running':
                frontendStatus = 'active';
                console.log(`Node ${nodeUpdate.node_id} status mapped to 'active'`);
                break;
              case 'completed':
                frontendStatus = 'completed';
                console.log(`Node ${nodeUpdate.node_id} status mapped to 'completed'`);
                break;
              case 'error':
                frontendStatus = 'error';
                console.log(`Node ${nodeUpdate.node_id} status mapped to 'error'`);
                break;
              default:
                console.warn(`Unknown node status: ${nodeUpdate.status}`);
                frontendStatus = 'waiting';
            }
            
            // Find the node to update using the API node ID
            const nodeToUpdate = findNodeByApiId(currentResearch, nodeUpdate.node_id);
            
            if (nodeToUpdate) {
              console.log(`Found node to update: ${nodeToUpdate.id}, current status: ${nodeToUpdate.status}, new status: ${frontendStatus}`);
            } else {
              console.warn(`Could not find node with API ID ${nodeUpdate.node_id} in the current research plan`);
            }
            
            // Update the research plan with the new node status
            const updatedResearch = updateNodeStatus(
              currentResearch, 
              nodeUpdate.node_id, 
              frontendStatus, 
              nodeUpdate.output_summary
            );
            
            // Update state
            setCurrentResearch(updatedResearch);
            setResearchHistory(prev => 
              prev.map(r => r.id === updatedResearch.id ? updatedResearch : r)
            );
            
            // If the selected node was updated, refresh the selection
            if (selectedNode && selectedNode.data?.nodeId === nodeUpdate.node_id) {
              const updatedNode = findNodeByApiId(updatedResearch, nodeUpdate.node_id);
              setSelectedNode(updatedNode);
            }
            
            // Show toast for node status change
            if (frontendStatus === 'active') {
              toast.info(`Node ${nodeUpdate.node_id} (${nodeUpdate.title}) started execution`);
            } else if (frontendStatus === 'completed') {
              toast.success(`Node ${nodeUpdate.node_id} (${nodeUpdate.title}) completed`);
            } else if (frontendStatus === 'error') {
              toast.error(`Node ${nodeUpdate.node_id} (${nodeUpdate.title}) failed: ${nodeUpdate.output_summary || 'Unknown error'}`);
            }
          } else {
            console.warn("Received node status update but no current research plan is loaded.");
          }
          break;
          
        case 'research_completed':
          // Research completed
          const researchComplete = message as ResearchCompleted;
          console.log("Research completed:", researchComplete);
          
          setIsProcessing(false);
          setReportTitle(researchComplete.title);
          stopStatusPolling(); // Stop any active polling
          
          if (currentResearch) {
            // Mark research as completed
            const completedResearch = {
              ...currentResearch,
              status: 'completed' as const,
              title: researchComplete.title
            };
            
            setCurrentResearch(completedResearch);
            setResearchHistory(prev => 
              prev.map(r => r.id === completedResearch.id ? completedResearch : r)
            );
            
            // Show completion toast
            toast.success(`Research completed: ${researchComplete.title}`, {
              description: 'The full report is now available'
            });
          }
          break;
          
        default:
          console.log(`Unhandled WebSocket message type: ${message.type}`);
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  }, [currentResearch, query, selectedNode, stopStatusPolling]);
  
  // Update the WebSocket hook with onStatusChange
  const { status: wsStatus, sendMessage, isConnected } = useWebSocket({
    url: WS_URL,
    autoConnect: true,
    onMessage: handleWebSocketMessage,
    onStatusChange: (status) => {
      setWsConnected(status === 'connected');
      if (status === 'connected') {
        toast.success("WebSocket connected. Real-time updates are active.");
      } else if (status === 'disconnected' || status === 'error') {
        // Only show a toast if we had a connection before
        if (wsConnected) {
          toast.error("WebSocket disconnected. Reconnecting...");
        }
      }
    }
  });
  
  const startStatusPolling = useCallback((id: string) => {
    // Cancel any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    setIsPolling(true);
    console.log(`Starting status polling for task ${id}`);
    
    const poll = async () => {
      if (!isConnected) {
        try {
          const response = await axios.get(API_ENDPOINTS.status(id));
          console.log("Status polling response:", response.data);
          
          // Update status based on response
          if (response.data.status === 'completed') {
            // Research is complete, fetch final results
            try {
              const reportResponse = await axios.get(API_ENDPOINTS.report);
              if (reportResponse.data && reportResponse.data.report) {
                setReport(reportResponse.data.report);
                setIsProcessing(false);
                toast.success("Research completed");
                stopStatusPolling();
              }
            } catch (error) {
              console.error("Error fetching report:", error);
            }
          } else if (response.data.status === 'error') {
            setIsProcessing(false);
            toast.error(response.data.message || "Research process failed");
            stopStatusPolling();
          }
        } catch (error) {
          console.error("Error polling status:", error);
        }
      } else {
        // WebSocket is connected, we can stop polling
        console.log("WebSocket connected, stopping polling");
        stopStatusPolling();
      }
    };
    
    // Poll immediately
    poll();
    
    // Set up interval polling (every 5 seconds)
    pollingIntervalRef.current = setInterval(poll, 5000);
  }, [isConnected, stopStatusPolling]);
  
  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);
  
  // Handlers
  const handleSubmitQuery = async (query: string) => {
    // Check if WebSocket is connected or connecting
    if (!isConnected) {
      console.log("WebSocket not connected, attempting to connect before research...");
      // Show a toast to the user about the WebSocket connection
      toast.info("Connecting to real-time updates service...");
      
      // Give a brief delay to let WebSocket connect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If still not connected, warn the user but continue
      if (!isConnected) {
        toast.warning("Real-time updates may be delayed. Will retry connection.");
      }
    }
    
    setIsProcessing(true);
    setStatusMessage("Starting research process...");
    setQuery(query);
    setReport(null);
    setReportTitle(null);
    
    try {
      // Send the query to the API to start the research process
      console.log("Submitting research query:", query);
      const response = await axios.post(API_ENDPOINTS.research, { query });
      console.log("Research API response:", response.data);
      
      if (response.data) {
        toast.success("Research process started", { 
          description: "You'll see updates in real-time as the research progresses." 
        });
        
        // Store task ID if provided
        if (response.data.data?.task_id) {
          setTaskId(response.data.data.task_id);
          
          // Start polling for status in case WebSocket fails
          startStatusPolling(response.data.data.task_id);
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
                          Researching
                        </h3>
                        <p className="text-muted-foreground">
                          {statusMessage || "Generating research DAG..."}
                        </p>
                      </motion.div>
                    </motion.div>
                  </motion.div>
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
