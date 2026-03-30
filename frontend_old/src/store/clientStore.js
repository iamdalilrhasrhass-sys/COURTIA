import { create } from 'zustand';

export const useClientStore = create((set) => ({
  clients: [],
  currentClient: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
  filters: {
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },

  fetchClients: async (token, page = 1, limit = 10, search = '') => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({
        page,
        limit,
        ...(search && { search }),
      });

      const response = await fetch(`http://localhost:3000/api/clients?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des clients');
      }

      const data = await response.json();
      set({
        clients: data.clients,
        pagination: {
          page,
          limit,
          total: data.total,
        },
        isLoading: false,
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  getClientById: async (token, clientId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`http://localhost:3000/api/clients/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement du client');
      }

      const data = await response.json();
      set({ currentClient: data, isLoading: false });
      return data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createClient: async (token, clientData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('http://localhost:3000/api/clients', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la création');
      }

      const data = await response.json();
      set((state) => ({
        clients: [data, ...state.clients],
        isLoading: false,
      }));
      return data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateClient: async (token, clientId, clientData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`http://localhost:3000/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      const data = await response.json();
      set((state) => ({
        clients: state.clients.map((c) => (c.id === clientId ? data : c)),
        currentClient: data,
        isLoading: false,
      }));
      return data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteClient: async (token, clientId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`http://localhost:3000/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      set((state) => ({
        clients: state.clients.filter((c) => c.id !== clientId),
        currentClient: null,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setSearch: (search) => set((state) => ({
    filters: { ...state.filters, search },
  })),

  setSortBy: (sortBy, sortOrder) => set((state) => ({
    filters: { ...state.filters, sortBy, sortOrder },
  })),
}));
