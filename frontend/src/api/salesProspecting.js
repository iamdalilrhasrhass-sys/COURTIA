import api from './index'

export const salesApi = {
  me: () => api.get('/sales/me'),
  dashboard: () => api.get('/sales/dashboard'),
  listCabinets: (params = {}) => api.get('/sales/cabinets', { params }),
  searchConflicts: (q) => api.get('/sales/cabinets/search', { params: { q } }),
  nextCabinet: () => api.get('/sales/cabinets/next'),
  getCabinet: (id) => api.get(`/sales/cabinets/${id}`),
  createCabinet: (payload) => api.post('/sales/cabinets', payload),
  updateCabinet: (id, payload) => api.put(`/sales/cabinets/${id}`, payload),
  changeStatus: (id, payload) => api.patch(`/sales/cabinets/${id}/status`, payload),
  assign: (payload) => api.post('/sales/cabinets/assign', payload),
  autoAssign: (payload) => api.post('/sales/cabinets/auto-assign', payload),
  startCall: (id) => api.post(`/sales/cabinets/${id}/calls/start`),
  completeCall: (id, payload) => api.post(`/sales/calls/${id}/complete`, payload),
  releaseLock: (id) => api.delete(`/sales/cabinets/${id}/lock`),
  addNote: (id, payload) => api.post(`/sales/cabinets/${id}/notes`, payload),
  createFollowup: (id, payload) => api.post(`/sales/cabinets/${id}/followups`, payload),
  createAppointment: (id, payload) => api.post(`/sales/cabinets/${id}/appointments`, payload),
  updateAppointment: (id, payload) => api.patch(`/sales/appointments/${id}`, payload),
  createProposal: (id, payload) => api.post(`/sales/cabinets/${id}/proposals`, payload),
  updateProposal: (id, payload) => api.patch(`/sales/proposals/${id}`, payload),
  calendar: (params = {}) => api.get('/sales/calendar', { params }),
  users: () => api.get('/sales/users'),
  inviteUser: (payload) => api.post('/sales/users/invite', payload),
  setUserStatus: (id, payload) => api.patch(`/sales/users/${id}/status`, payload),
  previewImport: (file, source = 'csv') => {
    const form = new FormData()
    form.append('file', file)
    form.append('source', source)
    return api.post('/sales/imports/preview', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 })
  },
  commitImport: (id, mode = 'upsert') => api.post(`/sales/imports/${id}/commit`, { mode }, { timeout: 120000 }),
  rollbackImport: (id) => api.post(`/sales/imports/${id}/rollback`, {}, { timeout: 120000 }),
  imports: () => api.get('/sales/imports'),
  audit: (params = {}) => api.get('/sales/audit', { params }),
  verifyAudit: () => api.get('/sales/audit/verify'),
}
