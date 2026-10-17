export interface Alert {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  source_event_id?: string;
  timestamp: string;
  description?: string;
  _label?: string;
}

export interface GraphNode {
  id: string;
  _label?: string;
  [key: string]: unknown;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  key?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  depth?: number;
}

export interface AgentStep {
  step: number;
  tool: string;
  arguments: Record<string, unknown>;
  result_summary: string;
  timestamp: string;
}

export interface InvestigationReport {
  investigation_id: string;
  alert_id: string;
  status: string;
  summary: string;
  findings: string[];
  evidence: Record<string, unknown>[];
  contradictions: string[];
  missing_information: string[];
  uncertainty_notes: string[];
  priority_rationale: string;
  recommended_action: string;
  attack_path?: { source: string; target: string; relationship: string }[];
  agent_steps: AgentStep[];
  graph_data?: GraphData;
  full_report_text?: string;
  created_at: string;
  completed_at?: string;
}

export interface Investigation {
  id: string;
  alert_id: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  report?: InvestigationReport;
  outcome?: string;
  outcome_reason?: string;
}

export interface HealthStatus {
  status: string;
  services: {
    api: { status: string };
    falkordb: { status: string; graph?: string; message?: string };
  };
  timestamp: string;
}
