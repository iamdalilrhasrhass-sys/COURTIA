import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authService, clientsService, dashboardService, arkWatchService, sinistresService } from '../services/api';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  cabinet?: string;
}

interface Client {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  arkScore?: number;
  contratsCount?: number;
  lastActivity?: string;
}

interface Signal {
  id: string;
  type: 'hamon' | 'chatel' | 'resiliation' | 'renouvellement' | 'opportunite';
  clientId: string;
  clientName: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  status: 'pending' | 'done' | 'dismissed';
}

interface Sinistre {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  description: string;
  status: 'ouvert' | 'en_cours' | 'clos';
  dateDeclaration: string;
  montant?: number;
}

interface KPIs {
  totalClients: number;
  totalContrats: number;
  caAnnuel: number;
  tauxRetention: number;
  signalsCount: number;
}

interface MorningBrief {
  date: string;
  greeting: string;
  priorityActions: string[];
  opportunities: string[];
  alerts: string[];
}

// Store state
interface StoreState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  
  // Data
  clients: Client[];
  signals: Signal[];
  sinistres: Sinistre[];
  kpis: KPIs | null;
  morningBrief: MorningBrief | null;
  
  // Actions - Auth
  initializeAuth: () => Promise<void>;
  login: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setHasCompletedOnboarding: (value: boolean) => void;
  
  // Actions - Data
  fetchClients: (search?: string) => Promise<void>;
  fetchSignals: () => Promise<void>;
  fetchSinistres: () => Promise<void>;
  fetchKPIs: () => Promise<void>;
  fetchMorningBrief: () => Promise<void>;
  dismissSignal: (id: string) => Promise<void>;
  updateSinistreStatus: (id: string, status: string) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: true,
  hasCompletedOnboarding: false,
  clients: [],
  signals: [],
  sinistres: [],
  kpis: null,
  morningBrief: null,

  // Initialize auth from secure storage
  initializeAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userData = await SecureStore.getItemAsync('user_data');
      const onboarding = await SecureStore.getItemAsync('onboarding_completed');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        set({ 
          user, 
          isAuthenticated: true, 
          hasCompletedOnboarding: onboarding === 'true',
          isLoading: false 
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoading: false });
    }
  },

  // Login with Google
  login: async (idToken: string) => {
    try {
      set({ isLoading: true });
      const response = await authService.googleLogin(idToken);
      
      await SecureStore.setItemAsync('auth_token', response.token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(response.user));
      
      set({ 
        user: response.user, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      await authService.logout();
      set({ 
        user: null, 
        isAuthenticated: false,
        clients: [],
        signals: [],
        sinistres: [],
        kpis: null,
        morningBrief: null,
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  },

  setHasCompletedOnboarding: async (value: boolean) => {
    await SecureStore.setItemAsync('onboarding_completed', value ? 'true' : 'false');
    set({ hasCompletedOnboarding: value });
  },

  // Fetch clients
  fetchClients: async (search?: string) => {
    try {
      const response = await clientsService.getAll({ search, limit: 50 });
      set({ clients: response.clients || response });
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  },

  // Fetch ARK signals
  fetchSignals: async () => {
    try {
      const response = await arkWatchService.getSignals();
      set({ signals: response.signals || response });
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  },

  // Fetch sinistres
  fetchSinistres: async () => {
    try {
      const response = await sinistresService.getAll();
      set({ sinistres: response.sinistres || response });
    } catch (error) {
      console.error('Error fetching sinistres:', error);
    }
  },

  // Fetch KPIs
  fetchKPIs: async () => {
    try {
      const response = await dashboardService.getKPIs();
      set({ kpis: response });
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  },

  // Fetch morning brief
  fetchMorningBrief: async () => {
    try {
      const response = await dashboardService.getMorningBrief();
      set({ morningBrief: response });
    } catch (error) {
      console.error('Error fetching morning brief:', error);
    }
  },

  // Dismiss signal
  dismissSignal: async (id: string) => {
    try {
      await arkWatchService.dismissSignal(id);
      const signals = get().signals.filter((s) => s.id !== id);
      set({ signals });
    } catch (error) {
      console.error('Error dismissing signal:', error);
    }
  },

  // Update sinistre status
  updateSinistreStatus: async (id: string, status: string) => {
    try {
      await sinistresService.updateStatus(id, status);
      const sinistres = get().sinistres.map((s) =>
        s.id === id ? { ...s, status: status as Sinistre['status'] } : s
      );
      set({ sinistres });
    } catch (error) {
      console.error('Error updating sinistre:', error);
    }
  },
}));