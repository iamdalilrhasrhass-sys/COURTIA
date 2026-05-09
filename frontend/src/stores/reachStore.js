import { create } from 'zustand';
import api from '../api';

const useReachStore = create((set, get) => ({
  // State
  dashboard: null,
  prospects: [],
  campaigns: [],
  replies: [],
  searchMeta: null,
  prospectDetail: null,
  analysis: null,
  loading: false,
  error: null,

  // Fetch dashboard
  fetchDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/reach/dashboard');
      if (data.success) set({ dashboard: data.data });
    } catch (_err) {
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
      if (data.success) {
        const payload = data.data || {};
        const rows = Array.isArray(payload)
          ? payload
          : [...(payload.items || []), ...(payload.suggestions || [])];
        set({ prospects: rows, searchMeta: Array.isArray(payload) ? null : payload });
      }
      return data;
    } catch (_err) {
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
    } catch (_err) {
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
    } catch (_err) {
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
    } catch (_err) {
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
    } catch (_err) {
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
    } catch (_err) {
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
    } catch (_err) {
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
    } catch (_err) {
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
    } catch (_err) {
      return { success: false, error: "Impossible de convertir ce prospect en client." };
    }
  },

  // Create task
  createTask: async (id, payload) => {
    try {
      const { data } = await api.post(`/reach/prospects/${id}/create-task`, payload);
      return data;
    } catch (_err) {
      return { success: false, error: "Impossible de créer cette tâche." };
    }
  },

  // Update prospect status
  updateProspectStatus: async (id, status) => {
    try {
      const { data } = await api.patch(`/reach/prospects/${id}/status`, { status });
      return data;
    } catch (_err) {
      return { success: false, error: "Impossible de mettre à jour le statut du prospect." };
    }
  },

  // Handle reply (mark read, archive)
  handleReply: async (id, action) => {
    try {
      const { data } = await api.post(`/reach/replies/${id}/handle`, { action });
      return data;
    } catch (_err) {
      return { success: false, error: "Impossible de traiter cette réponse." };
    }
  },

  // Update campaign status
  updateCampaignStatus: async (id, status) => {
    try {
      const { data } = await api.patch(`/reach/campaigns/${id}/status`, { status });
      return data;
    } catch (_err) {
      return { success: false, error: "Impossible de mettre à jour la campagne." };
    }
  },

  // Create campaign from template
  createCampaignFromTemplate: async (payload) => {
    try {
      const { data } = await api.post('/reach/campaigns/from-template', payload);
      return data;
    } catch (_err) {
      return { success: false, error: "Impossible de créer la campagne depuis le template." };
    }
  },

  // Fetch reporting
  fetchReporting: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/reach/reporting');
      if (data.success) set({ dashboard: { ...get().dashboard, ...data.data } });
      return data;
    } catch (_err) {
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },

  // Fetch map data
  fetchMapData: async (category) => {
    try {
      const { data } = await api.get(`/reach/map?category=${category || ''}`);
      return data;
    } catch (_err) {
      return { success: false };
    }
  },

  // Clear
  clearError: () => set({ error: null }),
}));

export default useReachStore;
