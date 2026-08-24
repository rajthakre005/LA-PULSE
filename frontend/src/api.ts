const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let authToken: string | null = localStorage.getItem('lapulse_token');

export function setToken(token: string) {
  authToken = token;
  localStorage.setItem('lapulse_token', token);
}

export function clearToken() {
  authToken = null;
  localStorage.removeItem('lapulse_token');
}

export function getToken() { return authToken; }

async function request(path: string, opts: RequestInit = {}) {
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string,string> || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    if (res.status === 401) { clearToken(); window.location.href = '/login'; }
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export const api = {
  login: (username: string, password: string) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getProjects: (params?: Record<string,any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/projects${q}`);
  },
  getProject: (id: string) => request(`/projects/${id}`),
  getProjectRisk: (id: string) => request(`/projects/${id}/risk`),
  getProjectTimeline: (id: string) => request(`/projects/${id}/timeline`),
  getExplainability: (id: string) => request(`/projects/${id}/explainability`),
  getInterventions: (id: string) => request(`/projects/${id}/interventions`),
  simulate: (id: string, body: any) => request(`/projects/${id}/simulate`, { method: 'POST', body: JSON.stringify(body) }),
  createIntervention: (id: string, body: any) => request(`/projects/${id}/intervention`, { method: 'POST', body: JSON.stringify(body) }),
  getMapData: (id: string) => request(`/projects/${id}/map`),
  getAlerts: (params?: Record<string,any>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/alerts${q}`);
  },
  ackAlert: (id: string) => request(`/alerts/${id}/acknowledge`, { method: 'POST' }),
  getNational: () => request('/analytics/national'),
  getState: (state: string) => request(`/analytics/states/${encodeURIComponent(state)}`),
  getDistrict: (state: string, district: string) => request(`/analytics/districts/${encodeURIComponent(state)}/${encodeURIComponent(district)}`),
  getModelMetrics: () => request('/model/metrics'),
  getAudit: () => request('/audit'),
  simulateLiveUpdate: () => request('/demo/simulate-update', { method: 'POST' }),
  health: () => request('/health'),
};
