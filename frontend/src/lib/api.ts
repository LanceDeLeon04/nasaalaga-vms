const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

function getToken() {
  return sessionStorage.getItem('nasaalaga_token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  signup: (data: any) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),

  sendOtp: (email: string, phone?: string) =>
    request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email, phone }) }),

  verifyOtp: (email: string, otp: string, phone?: string) =>
    request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, phone, otp }) }),

  // ── Barangays ─────────────────────────────────────────────────────────
  getBarangays: () => request('/barangays'),

  // ── Pets ──────────────────────────────────────────────────────────────
  getPets: (ownerId?: string) =>
    request(`/pets${ownerId ? `?ownerId=${ownerId}` : ''}`),

  createPet: (data: any) =>
    request('/pets', { method: 'POST', body: JSON.stringify(data) }),

  updatePet: (id: string, data: any) =>
    request(`/pets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  preRegisterPet: (data: any) =>
    request('/pets/pre-register', { method: 'POST', body: JSON.stringify(data) }),

  getPreRegistrations: (status?: string) =>
    request(`/pets/pre-registered${status ? `?status=${status}` : ''}`),

  updatePreRegistration: (preRegNumber: string, data: any) =>
    request(`/pets/pre-registered/${preRegNumber}`, { method: 'PUT', body: JSON.stringify(data) }),

  validatePreRegistration: (preRegNumber: string, data: any) =>
    request(`/pets/validate/${preRegNumber}`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Livestock ─────────────────────────────────────────────────────────
  getLivestock: (ownerId?: string) =>
    request(`/livestock${ownerId ? `?ownerId=${ownerId}` : ''}`),

  createLivestock: (data: any) =>
    request('/livestock', { method: 'POST', body: JSON.stringify(data) }),

  updateLivestock: (id: string, data: any) =>
    request(`/livestock/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Lost & Found ──────────────────────────────────────────────────────
  getLostFound: (type?: string, ownerId?: string) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (ownerId) params.set('ownerId', ownerId);
    return request(`/lost-found?${params.toString()}`);
  },

  createLostFound: (data: any) =>
    request('/lost-found', { method: 'POST', body: JSON.stringify(data) }),

  updateLostFound: (id: string, data: any) =>
    request(`/lost-found/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Schedules ─────────────────────────────────────────────────────────
  getSchedules: () => request('/schedules'),

  createSchedule: (data: any) =>
    request('/schedules', { method: 'POST', body: JSON.stringify(data) }),

  // ── Statistics ────────────────────────────────────────────────────────
  getLivestockStats: () => request('/statistics/livestock-by-barangay'),
  updateLivestockStats: (data: any) =>
    request('/statistics/livestock-by-barangay', { method: 'PUT', body: JSON.stringify(data) }),

  getVaccinationTrends: () => request('/statistics/vaccination-trends'),
  getBudget: () => request('/statistics/budget'),

  getDiseaseAlerts: () => request('/statistics/disease-alerts'),
  createDiseaseAlert: (data: any) =>
    request('/statistics/disease-alerts', { method: 'POST', body: JSON.stringify(data) }),

  getOutbreakData: () => request('/statistics/outbreak-data'),
  createOutbreakData: (data: any) =>
    request('/statistics/outbreak-data', { method: 'POST', body: JSON.stringify(data) }),

  // ── Users (admin) ─────────────────────────────────────────────────────
  getUsers: () => request('/users'),

  // ── Health ────────────────────────────────────────────────────────────
  health: () => request('/health'),
};

export default api;
