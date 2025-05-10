
export interface ResearchNode {
  id: string;
  label: string;
  status: 'waiting' | 'active' | 'completed' | 'error';
  description?: string;
}

export interface ResearchEdge {
  id: string;
  source: string;
  target: string;
}

export interface ResearchPlan {
  id: string;
  query: string;
  timestamp: string;
  status: 'running' | 'paused' | 'completed' | 'error';
  nodes: ResearchNode[];
  edges: ResearchEdge[];
}

export type ResearchHistory = ResearchPlan[];
