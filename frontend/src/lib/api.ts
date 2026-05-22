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
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (data: any) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  sendOtp: (email: string, phone?: string) =>
    request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email, phone }) }),
  verifyOtp: (email: string, otp: string, phone?: string) =>
    request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, phone, otp }) }),
  verifyBarcode: (pendingToken: string, barcode: string) =>
    request('/auth/verify-barcode', { method: 'POST', body: JSON.stringify({ pendingToken, barcode }) }),
  health: () => request('/health'),
  getDashboardSummary: () => request('/dashboard/summary'),
  checkMaintenance: () => request('/system/maintenance'),
  setMaintenance: (enabled: boolean) =>
    request('/system/maintenance', { method: 'PUT', body: JSON.stringify({ enabled }) }),
  getBarangays: () => request('/barangays'),
  getPets: (ownerId?: string) =>
    request('/pets' + (ownerId ? '?ownerId=' + ownerId : '')),
  createPet: (data: any) =>
    request('/pets', { method: 'POST', body: JSON.stringify(data) }),
  updatePet: (id: string, data: any) =>
    request('/pets/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deletePet: (id: string) =>
    request('/pets/' + id, { method: 'DELETE' }),
  preRegisterPet: (data: any) =>
    request('/pets/pre-register', { method: 'POST', body: JSON.stringify(data) }),
  getPreRegistrations: (status?: string) =>
    request('/pets/pre-registered' + (status ? '?status=' + status : '')),
  updatePreRegistration: (preRegNumber: string, data: any) =>
    request('/pets/pre-registered/' + preRegNumber, { method: 'PUT', body: JSON.stringify(data) }),
  validatePreRegistration: (preRegNumber: string, data: any) =>
    request('/pets/validate/' + preRegNumber, { method: 'POST', body: JSON.stringify(data) }),
  getPetSurveyData: () => request('/pets/survey-data'),
  getLivestock: (params?: { ownerId?: string; barangay?: string; type?: string; status?: string }) => {
    const p = new URLSearchParams();
    if (params?.ownerId)  p.set('ownerId',  params.ownerId);
    if (params?.barangay) p.set('barangay', params.barangay);
    if (params?.type)     p.set('type',     params.type);
    if (params?.status)   p.set('status',   params.status);
    const qs = p.toString();
    return request('/livestock' + (qs ? '?' + qs : ''));
  },
  getLivestockSummary: () => request('/livestock/summary'),
  createLivestock: (data: any) =>
    request('/livestock', { method: 'POST', body: JSON.stringify(data) }),
  updateLivestock: (id: string, data: any) =>
    request('/livestock/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLivestock: (id: string) =>
    request('/livestock/' + id, { method: 'DELETE' }),
  getHealthRecords: (livestockId: string) =>
    request('/livestock/' + livestockId + '/health-records'),
  addHealthRecord: (livestockId: string, data: any) =>
    request('/livestock/' + livestockId + '/health-records', { method: 'POST', body: JSON.stringify(data) }),
  getMortality: () => request('/livestock/mortality/all'),
  addMortality: (data: any) =>
    request('/livestock/mortality', { method: 'POST', body: JSON.stringify(data) }),
  getDiseaseEvents: () => request('/livestock/disease-events/all'),
  addDiseaseEvent: (data: any) =>
    request('/livestock/disease-events', { method: 'POST', body: JSON.stringify(data) }),
  updateDiseaseEvent: (id: string, data: any) =>
    request('/livestock/disease-events/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  getLostFound: (type?: string, ownerId?: string) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (ownerId) params.set('ownerId', ownerId);
    return request('/lost-found?' + params.toString());
  },
  createLostFound: (data: any) =>
    request('/lost-found', { method: 'POST', body: JSON.stringify(data) }),
  updateLostFound: (id: string, data: any) =>
    request('/lost-found/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  getSchedules: () => request('/schedules'),
  createSchedule: (data: any) =>
    request('/schedules', { method: 'POST', body: JSON.stringify(data) }),
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
  getUsers: () => request('/users'),
  updateUser: (id: string, data: any) =>
    request('/users/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    request('/users/' + id, { method: 'DELETE' }),
  getAdminSettings: () => request('/admin/settings'),
  updateAdminSettings: (data: any) =>
    request('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getThresholds: () => request('/admin/thresholds'),
  updateThresholds: (data: any) =>
    request('/admin/thresholds', { method: 'PUT', body: JSON.stringify(data) }),
  getRecommendations: () => request('/admin/recommendations'),
  createRecommendation: (data: any) =>
    request('/admin/recommendations', { method: 'POST', body: JSON.stringify(data) }),
  updateRecommendation: (id: string, data: any) =>
    request('/admin/recommendations/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecommendation: (id: string) =>
    request('/admin/recommendations/' + id, { method: 'DELETE' }),
  getRules: () => request('/rules'),
  evaluateRules: () => request('/rules/evaluate', { method: 'POST' }),
  updateRule: (ruleId: string, data: any) =>
    request('/rules/' + ruleId, { method: 'PUT', body: JSON.stringify(data) }),
  getDeployments: () => request('/deployments'),
  createDeployment: (data: any) =>
    request('/deployments', { method: 'POST', body: JSON.stringify(data) }),
  updateDeployment: (id: string, data: any) =>
    request('/deployments/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDeployment: (id: string) =>
    request('/deployments/' + id, { method: 'DELETE' }),
  clearRecords: (type: 'pets' | 'livestock' | 'all') =>
    request('/superadmin/clear-records', { method: 'DELETE', body: JSON.stringify({ type }) }),
  getMedicines: () => request('/inventory/medicines'),
  createMedicine: (data: any) =>
    request('/inventory/medicines', { method: 'POST', body: JSON.stringify(data) }),
  updateMedicine: (id: string, data: any) =>
    request('/inventory/medicines/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMedicine: (id: string) =>
    request('/inventory/medicines/' + id, { method: 'DELETE' }),
  getSupplies: () => request('/inventory/supplies'),
  createSupply: (data: any) =>
    request('/inventory/supplies', { method: 'POST', body: JSON.stringify(data) }),
  updateSupply: (id: string, data: any) =>
    request('/inventory/supplies/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupply: (id: string) =>
    request('/inventory/supplies/' + id, { method: 'DELETE' }),
  getInventoryTransactions: () => request('/inventory/transactions'),
  getAuditLogs: () => request('/audit-logs'),
  logAudit: (data: any) =>
    request('/audit-logs', { method: 'POST', body: JSON.stringify(data) }),
  getFeedback: () => request('/feedback'),
  createFeedback: (data: any) =>
    request('/feedback', { method: 'POST', body: JSON.stringify(data) }),
  updateFeedback: (id: number, data: any) =>
    request('/feedback/' + id, { method: 'PUT', body: JSON.stringify(data) }),
};

export default api;
