import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.courtiark.fr';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Error reading auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired - clear auth
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('user_data');
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authService = {
  googleLogin: async (idToken: string) => {
    const response = await api.post('/api/auth/google', { idToken });
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/api/auth/profile');
    return response.data;
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user_data');
  },
};

// Clients endpoints
export const clientsService = {
  getAll: async (params?: { search?: string; limit?: number; offset?: number }) => {
    const response = await api.get('/api/clients', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/api/clients/${id}`);
    return response.data;
  },
  getArkScore: async (id: string) => {
    const response = await api.get(`/api/clients/${id}/ark-score`);
    return response.data;
  },
};

// Dashboard endpoints
export const dashboardService = {
  getKPIs: async () => {
    const response = await api.get('/api/dashboard/kpis');
    return response.data;
  },
  getMorningBrief: async () => {
    const response = await api.get('/api/ark/morning-brief');
    return response.data;
  },
  getTodayActions: async () => {
    const response = await api.get('/api/dashboard/today-actions');
    return response.data;
  },
};

// ARK Watch endpoints
export const arkWatchService = {
  getSignals: async (params?: { type?: string; status?: string }) => {
    const response = await api.get('/api/ark/signals', { params });
    return response.data;
  },
  getOpportunities: async () => {
    const response = await api.get('/api/ark/opportunities');
    return response.data;
  },
  dismissSignal: async (id: string) => {
    const response = await api.post(`/api/ark/signals/${id}/dismiss`);
    return response.data;
  },
};

// Sinistres endpoints
export const sinistresService = {
  getAll: async (params?: { status?: string }) => {
    const response = await api.get('/api/sinistres', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/api/sinistres/${id}`);
    return response.data;
  },
  updateStatus: async (id: string, status: string) => {
    const response = await api.patch(`/api/sinistres/${id}`, { status });
    return response.data;
  },
};

// User/Profile endpoints
export const profileService = {
  get: async () => {
    const response = await api.get('/api/users/me');
    return response.data;
  },
  update: async (data: Partial<{ name: string; phone: string; avatar: string }>) => {
    const response = await api.patch('/api/users/me', data);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/api/users/me/stats');
    return response.data;
  },
};

export default api;