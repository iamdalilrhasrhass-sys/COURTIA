import create from 'zustand';
import { buildApiUrl, clearStoredSession, getAuthToken } from '../api/sessionPolicy';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const authStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: getAuthToken() || null,
  isAuthenticated: !!getAuthToken(),
  loading: false,
  error: null,
  
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(buildApiUrl('/auth/login', API_URL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) throw new Error('Login failed');
      
      const data = await response.json();
      localStorage.setItem('courtia_token', data.token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.user) localStorage.setItem('courtia_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, loading: false });
      return data;
    } catch (error) {
      console.error('Login error:', error);
      set({ loading: false, error: "Impossible de vous connecter. Vérifiez vos identifiants." });
      throw error;
    }
  },
  
  register: async (email, password, firstName, lastName) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(buildApiUrl('/auth/register', API_URL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      
      if (!response.ok) throw new Error('Registration failed');
      
      const data = await response.json();
      localStorage.setItem('courtia_token', data.token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.user) localStorage.setItem('courtia_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, loading: false });
      return data;
    } catch (error) {
      console.error('Register error:', error);
      set({ loading: false, error: "Impossible de créer votre compte pour le moment." });
      throw error;
    }
  },
  
  logout: () => {
    clearStoredSession();
    set({ user: null, token: null, isAuthenticated: false, loading: false, error: null });
  },
  
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token, isAuthenticated: !!token }),
}));

export const useAuthStore = authStore;
export default authStore;
