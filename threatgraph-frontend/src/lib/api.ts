const API_BASE = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Health
  health: () => request<any>('/api/health'),

  // Alerts
  getAlerts: (status?: string, limit = 20) =>
    request<{ alerts: any[]; total: number }>(
      `/api/alerts?${status ? `status=${status}&` : ''}limit=${limit}`
    ),
  getAlert: (id: string) => request<any>(`/api/alerts/${id}`),

  // Investigations
  startInvestigation: (alertId: string, description?: string) =>
    request<any>('/api/investigations', {
      method: 'POST',
      body: JSON.stringify({ alert_id: alertId, description }),
    }),
  getInvestigations: (status?: string) =>
    request<{ investigations: any[]; total: number }>(
      `/api/investigations${status ? `?status=${status}` : ''}`
    ),
  getInvestigation: (id: string) => request<any>(`/api/investigations/${id}`),
  recordOutcome: (id: string, outcome: string, reason: string, action?: string) =>
    request<any>(`/api/investigations/${id}/outcome`, {
      method: 'POST',
      body: JSON.stringify({ outcome, reason, recommended_action: action }),
    }),

  // Graph
  getEntity: (type: string, id: string) =>
    request<any>(`/api/graph/entity/${type}/${id}`),
  getEntityById: (id: string) =>
    request<any>(`/api/graph/entities/${id}`),
  getEntities: () =>
    request<{ entities: any[]; total: number }>('/api/graph/entities'),
  getNeighbors: (type: string, id: string) =>
    request<any>(`/api/graph/neighbors/${type}/${id}`),
  traverseGraph: (type: string, id: string, depth = 3) =>
    request<any>(`/api/graph/traverse/${type}/${id}?depth=${depth}`),
  getTimeline: (type: string, id: string) =>
    request<any>(`/api/graph/timeline/${type}/${id}`),
  getSharedIndicators: (type: string, id: string) =>
    request<any>(`/api/graph/shared-indicators/${type}/${id}`),
  getGraphStats: () => request<any>('/api/graph/stats'),
  getAllGraphData: () => request<any>('/api/graph/all'),
  getPaths: () => request<any>('/api/graph/paths'),
  runCypherQuery: (query: string) =>
    request<any>('/api/graph/query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  // Reports & Evidence
  getReports: () => request<{ reports: any[]; total: number }>('/api/reports'),
  getReport: (id: string) => request<any>(`/api/reports/${id}`),
  exportReport: (id: string, format = 'markdown') =>
    request<any>(`/api/reports/${id}/export?format=${format}`),
  getInvestigationTimeline: (id: string) =>
    request<any>(`/api/investigations/${id}/timeline`),
  getInvestigationEvidence: (id: string) =>
    request<any>(`/api/investigations/${id}/evidence`),
  recordDecision: (id: string, outcome: string, reason: string, action?: string) =>
    request<any>(`/api/investigations/${id}/decisions`, {
      method: 'POST',
      body: JSON.stringify({ outcome, reason, recommended_action: action }),
    }),
};
