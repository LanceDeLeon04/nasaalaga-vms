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
  // Livestock pre-registration
  getLivestockPreRegistrations: (params?: { status?: string; barangay?: string }) => {
    const p = new URLSearchParams();
    if (params?.status)    p.set('status',    params.status);
    if (params?.barangay)  p.set('barangay',  params.barangay);
    return request('/livestock-pre-registrations?' + p.toString());
  },
  createLivestockPreRegistration: (data: any) =>
    request('/livestock-pre-registrations', { method: 'POST', body: JSON.stringify(data) }),
  updateLivestockPreRegistration: (id: string, data: any) =>
    request('/livestock-pre-registrations/' + id, { method: 'PUT', body: JSON.stringify(data) }),
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
  getOutbreaks: () => request('/outbreaks'),
  createOutbreak: (data: any) =>
    request('/outbreaks', { method: 'POST', body: JSON.stringify(data) }),
  updateOutbreak: (id: string, data: any) =>
    request('/outbreaks/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  getInterventions: () => request('/interventions'),
  getAlertDetail: (type: string, sourceId?: string, barangay?: string) => {
    const p = new URLSearchParams({ type });
    if (sourceId) p.set('sourceId', sourceId);
    if (barangay) p.set('barangay', barangay);
    return request('/alerts/detail?' + p.toString());
  },
  createIntervention: (data: any) =>
    request('/interventions', { method: 'POST', body: JSON.stringify(data) }),
  updateIntervention: (id: string, data: any) =>
    request('/interventions/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIntervention: (id: string) =>
    request('/interventions/' + id, { method: 'DELETE' }),
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
  updateSchedule: (id: string, data: any) => request('/schedules/' + id, { method: 'PUT', body: JSON.stringify(data) }),
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
  createAdmin: (data: { username: string; email: string; password: string; barangay?: string }) =>
    request('/users/create-admin', { method: 'POST', body: JSON.stringify(data) }),
  createBahw: (data: { username: string; email: string; password: string; barangay: string; role?: string }) =>
    request('/users/create-bahw', { method: 'POST', body: JSON.stringify(data) }),
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
  getInventoryTransactions: (params?: { item_id?: string; limit?: number }) => {
    const p = new URLSearchParams();
    if (params?.item_id) p.set('item_id', params.item_id);
    if (params?.limit) p.set('limit', String(params.limit));
    return request('/inventory/transactions?' + p.toString());
  },
  inventoryMovement: (data: any) => request('/inventory/movement', { method: 'POST', body: JSON.stringify(data) }),
  outbreakDispatch: (data: any) => request('/inventory/outbreak-dispatch', { method: 'POST', body: JSON.stringify(data) }),
  lookupVaccineBarcode: (barcode: string) => request('/inventory/lookup-barcode/' + encodeURIComponent(barcode)),
  getPetById: (id: string) => request('/pets/lookup/' + id),
  getVaccinationHistory: (petId: string) => request('/vaccination-history/' + petId),
  recordVaccination: (data: any) => request('/vaccination-history', { method: 'POST', body: JSON.stringify(data) }),
  getPetOldRecords: (petId: string) => request('/pets/' + petId + '/old-records'),
  addPetOldRecord: (petId: string, data: any) => request('/pets/' + petId + '/old-records', { method: 'POST', body: JSON.stringify(data) }),
  getAuditLogs: (params?: { action?: string; search?: string; limit?: number }) => {
    const p = new URLSearchParams();
    if (params?.action) p.set('action', params.action);
    if (params?.search) p.set('search', params.search);
    if (params?.limit) p.set('limit', String(params.limit));
    return request('/audit-logs?' + p.toString());
  },
  getAuditLogStats: () => request('/audit-logs/stats'),
  logAudit: (data: any) =>
    request('/audit-logs', { method: 'POST', body: JSON.stringify(data) }),
  getFeedback: () => request('/feedback'),
  createFeedback: (data: any) =>
    request('/feedback', { method: 'POST', body: JSON.stringify(data) }),
  updateFeedback: (id: number, data: any) =>
    request('/feedback/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  getCVOForms: () => request('/cvo-forms'),
  createCVOForm: (data: any) => request('/cvo-forms', { method: 'POST', body: JSON.stringify(data) }),
  updateCVOForm: (id: string, data: any) => request('/cvo-forms/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCVOForm: (id: string) => request('/cvo-forms/' + id, { method: 'DELETE' }),
  respondToFeedback: (id: number, data: any) => request('/feedback/' + id + '/respond', { method: 'PUT', body: JSON.stringify(data) }),
  getReportsSummary: (params?: { startDate?: string; endDate?: string; barangay?: string }) => {
    const p = new URLSearchParams();
    if (params?.startDate) p.set('startDate', params.startDate);
    if (params?.endDate) p.set('endDate', params.endDate);
    if (params?.barangay) p.set('barangay', params.barangay);
    return request('/reports/summary?' + p.toString());
  },
  getVaccinationCoverageReport: () => request('/reports/vaccination-coverage'),
  getMedicineMovementReport: () => request('/reports/medicine-movement'),
  getDashboardMedicineIntel: () => request('/dashboard/medicine-intel'),
  getDashboardMedicineUsageAnalytics: (days = 90) => request(`/dashboard/medicine-usage-analytics?days=${days}`),
  getDashboardAnimalPopulation: () => request('/dashboard/animal-population'),
  getDashboardDiseaseIntel: () => request('/dashboard/disease-intel'),
  // ── Budget Utilization Module ──────────────────────────────────────────
  getBudgetPrograms: (fy?: number) => request(fy ? `/budget/programs?fiscal_year=${fy}` : '/budget/programs'),
  getBudgetContext: (fy = 2025) => request(`/budget/context?fiscal_year=${fy}`),
  createBudgetProgram: (data: any) => request('/budget/programs', { method: 'POST', body: JSON.stringify(data) }),
  updateBudgetProgram: (id: string, data: any) => request(`/budget/programs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBudgetProgram: (id: string) => request(`/budget/programs/${id}`, { method: 'DELETE' }),
  createBudgetLineItem: (data: any) => request('/budget/line-items', { method: 'POST', body: JSON.stringify(data) }),
  updateBudgetLineItem: (id: string, data: any) => request(`/budget/line-items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBudgetLineItem: (id: string) => request(`/budget/line-items/${id}`, { method: 'DELETE' }),
  getBudgetExpenditures: (lineItemId: string) => request(`/budget/expenditures/${lineItemId}`),
  addBudgetExpenditure: (data: any) => request('/budget/expenditures', { method: 'POST', body: JSON.stringify(data) }),
  deleteBudgetExpenditure: (id: number) => request(`/budget/expenditures/${id}`, { method: 'DELETE' }),
  saveBudgetAIRecs: (data: any) => request('/budget/ai-recommendations', { method: 'POST', body: JSON.stringify(data) }),
  getBudgetAIRecs: (fy = 2025) => request(`/budget/ai-recommendations?fiscal_year=${fy}`),
  updateBudgetRecStatus: (id: string, status: string) => request(`/budget/ai-recommendations/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  budgetAIAnalyze: (data: any) => request('/budget/ai-analyze', { method: 'POST', body: JSON.stringify(data) }),
  getUnlinkedInventory: () => request('/budget/unlinked-inventory'),
  linkInventoryToBudget: (data: any) => request('/budget/link-inventory', { method: 'POST', body: JSON.stringify(data) }),
  unlinkInventoryFromBudget: (itemId: string, data: any) => request(`/budget/unlink-inventory/${itemId}`, { method: 'DELETE', body: JSON.stringify(data) }),

  // Profile
  getMyProfile: () => request('/profile/me'),
  updateMyProfile: (data: any) => request('/profile/me', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request('/profile/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Suppliers
  getSuppliers: () => request('/inventory/suppliers'),
  createSupplier: (data: any) => request('/inventory/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) => request(`/inventory/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => request(`/inventory/suppliers/${id}`, { method: 'DELETE' }),

  // Office Supplies
  getOfficeSupplies: () => request('/inventory/office-supplies'),
  createOfficeSupply: (data: any) => request('/inventory/office-supplies', { method: 'POST', body: JSON.stringify(data) }),
  updateOfficeSupply: (id: string, data: any) => request(`/inventory/office-supplies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOfficeSupply: (id: string) => request(`/inventory/office-supplies/${id}`, { method: 'DELETE' }),

  // Pending Orders
  getPendingOrders: () => request('/inventory/pending-orders'),
  createPendingOrder: (data: any) => request('/inventory/pending-orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePendingOrder: (id: string, data: any) => request(`/inventory/pending-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePendingOrder: (id: string) => request(`/inventory/pending-orders/${id}`, { method: 'DELETE' }),
  receivePendingOrder: (id: string, data: any) => request(`/inventory/pending-orders/${id}/receive`, { method: 'POST', body: JSON.stringify(data) }),
  addOldStock: (data: any) => request('/inventory/old-stocks', { method: 'POST', body: JSON.stringify(data) }),
  barcodeInventoryLookup: (barcode: string) => request(`/inventory/barcode-lookup/${encodeURIComponent(barcode)}`),

  // AI proxy — routes through backend to avoid CORS
  aiAnalyze: (prompt: string) =>
    request('/ai/analyze', { method: 'POST', body: JSON.stringify({ prompt }) }),

  // Appointment Schedules (new full-featured scheduling system)
  getAppointmentSchedules: (params?: { requestedBy?: string; status?: string; type?: string }) => {
    const p = new URLSearchParams();
    if (params?.requestedBy) p.set('requestedBy', params.requestedBy);
    if (params?.status)      p.set('status',      params.status);
    if (params?.type)        p.set('type',         params.type);
    const qs = p.toString();
    return request('/appointment-schedules' + (qs ? '?' + qs : ''));
  },
  createAppointmentSchedule: (data: any) =>
    request('/appointment-schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointmentSchedule: (id: string, data: any) =>
    request('/appointment-schedules/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAppointmentSchedule: (id: string) =>
    request('/appointment-schedules/' + id, { method: 'DELETE' }),

  // Unavailable blocks
  getUnavailableBlocks: () => request('/unavailable-blocks'),
  createUnavailableBlock: (data: any) =>
    request('/unavailable-blocks', { method: 'POST', body: JSON.stringify(data) }),
  deleteUnavailableBlock: (id: string) =>
    request('/unavailable-blocks/' + id, { method: 'DELETE' }),
};

export default api;
