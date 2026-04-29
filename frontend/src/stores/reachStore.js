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

  // Clear
  clearError: () => set({ error: null }),
}));

export default useReachStore;
