export interface ResearchNode {
  id: string;
  label: string;
  status: 'waiting' | 'active' | 'completed' | 'error';
  description?: string;
  data?: Record<string, any>;
}

export interface ResearchEdge {
  id: string;
  source: string;
  target: string;
  data?: Record<string, any>;
}

export interface ResearchPlan {
  id: string;
  query: string;
  timestamp: string;
  status: 'running' | 'paused' | 'completed' | 'error';
  nodes: ResearchNode[];
  edges: ResearchEdge[];
  edits?: ResearchPlan[]; // Sub-edits/children
  feedback?: string; // Feedback for this edit (if any)
}

export type ResearchHistory = ResearchPlan[];
