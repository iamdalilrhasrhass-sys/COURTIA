import { create } from 'zustand';
import api from '../api';

const useReachStore = create((set, get) => ({
  // State
  dashboard: null,
  prospects: [],
  campaigns: [],
  replies: [],
  prospectDetail: null,
  analysis: null,
  settings: null,
  mapData: [],
  reporting: null,
  playbooks: [],
  arkRouterStatus: null,
  mockMode: true,
  loading: false,
  error: null,

  // Fetch dashboard
  fetchDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/reach/dashboard');
      if (data.success) set({ dashboard: data.data });
    } catch (err) {
      set({ error: 'Erreur dashboard' });
    } finally {
      set({ loading: false });
    }
  },

  // Search prospects
  searchProspects: async ({ category, city, radius, niche, limit }) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/reach/search', { category, city, radius, niche, limit: limit || 15 });
      if (data.success) set({ prospects: data.data });
      return data;
    } catch (err) {
      set({ error: 'Erreur recherche' });
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  // Fetch prospects list
  fetchProspects: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams(filters);
      const { data } = await api.get(`/reach/prospects?${params}`);
      if (data.success) set({ prospects: data.data });
      return data;
    } catch (err) {
      set({ error: 'Erreur chargement prospects' });
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  // Get prospect detail
  fetchProspectDetail: async (id) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get(`/reach/prospects/${id}`);
      if (data.success) set({ prospectDetail: data.data });
      return data;
    } catch (err) {
      set({ error: 'Erreur chargement prospect' });
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  // Analyze prospect
  analyzeProspect: async (id, prospect) => {
    set({ loading: true });
    try {
      const { data } = await api.post(`/reach/prospects/${id}/analyze`, { prospect });
      if (data.success) set({ analysis: data.data });
      return data;
    } catch (err) {
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  // Fetch campaigns
  fetchCampaigns: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/reach/campaigns');
      if (data.success) set({ campaigns: data.data });
      return data;
    } catch (err) {
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  // Create campaign
  createCampaign: async (payload) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/reach/campaigns', payload);
      if (data.success) {
        set(s => ({ campaigns: [...s.campaigns, data.data] }));
      }
      return data;
    } catch (err) {
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  // Generate message
  generateMessage: async (prospect, analysis, channel) => {
    try {
      const { data } = await api.post('/reach/messages/generate', { prospect, analysis, channel });
      return data;
    } catch (err) {
      return { success: false };
    }
  },

  // Fetch replies
  fetchReplies: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/reach/replies');
      if (data.success) set({ replies: data.data });
      return data;
    } catch (err) {
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  // Convert to client
  convertToClient: async (prospect) => {
    try {
      const { data } = await api.post('/reach/convert-to-client', { prospect });
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Create task
  createTask: async (id, payload) => {
    try {
      const { data } = await api.post(`/reach/prospects/${id}/create-task`, payload);
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Update prospect status
  updateProspectStatus: async (id, status) => {
    try {
      const { data } = await api.patch(`/reach/prospects/${id}/status`, { status });
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Handle reply (mark read, archive)
  handleReply: async (id, action) => {
    try {
      const { data } = await api.post(`/reach/replies/${id}/handle`, { action });
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Update campaign status
  updateCampaignStatus: async (id, status) => {
    try {
      const { data } = await api.patch(`/reach/campaigns/${id}/status`, { status });
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Create campaign from template
  createCampaignFromTemplate: async (payload) => {
    try {
      const { data } = await api.post('/reach/campaigns/from-template', payload);
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Fetch reporting
  fetchReporting: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/reach/reporting');
      if (data.success) {
        set({ reporting: data.data, dashboard: { ...get().dashboard, ...data.data } });
      }
      return data;
    } catch (err) {
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  // Fetch map data
  fetchMapData: async (category) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/reach/map?category=${category || ''}`);
      if (data.success) set({ mapData: data.data });
      return data;
    } catch (err) {
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  // Fetch settings
  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/reach/settings');
      if (data.success) set({ settings: data.data });
      return data;
    } catch (err) {
      set({ error: 'Erreur chargement paramètres' });
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  // Update settings
  updateSettings: async (payload) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.patch('/reach/settings', payload);
      if (data.success) set({ settings: data.data });
      return data;
    } catch (err) {
      set({ error: 'Erreur mise à jour paramètres' });
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  // Fetch playbooks
  fetchPlaybooks: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/reach/playbooks');
      if (data.success) set({ playbooks: data.data });
      return data;
    } catch (err) {
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  // Fetch ARK Router status
  fetchArkRouterStatus: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/reach/ark-router/status');
      if (data.success) set({ arkRouterStatus: data.data });
      return data;
    } catch (err) {
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  // Add prospect to campaign
  addProspectToCampaign: async (campaignId, prospectIds) => {
    set({ loading: true });
    try {
      const { data } = await api.post(`/reach/campaigns/${campaignId}/prospects`, { prospectIds });
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      set({ loading: false });
    }
  },

  // Generate reply
  generateReply: async (replyId, context) => {
    set({ loading: true });
    try {
      const { data } = await api.post(`/reach/replies/${replyId}/generate-response`, { context });
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      set({ loading: false });
    }
  },

  // Opt-out prospect
  optOut: async (prospectId, reason) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/reach/opt-out', { prospectId, reason });
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      set({ loading: false });
    }
  },

  // Clear
  clearError: () => set({ error: null }),
}));

export default useReachStore;
