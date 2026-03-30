# 🎨 Frontend Documentation

**Framework**: React 18 + Vite  
**Status**: 🚀 Phase 4 (In Progress)  
**Dev Server**: `http://localhost:5173`

---

## Table des matières

- [Architecture](#-architecture)
- [Setup](#-setup)
- [Project Structure](#-project-structure)
- [State Management](#-state-management)
- [API Client](#-api-client)
- [Components](#-components)
- [Routing](#-routing)
- [Styling](#-styling)
- [Best Practices](#-best-practices)

---

## 🏗️ Architecture

```
Frontend (React)
  ├── Pages (Route-based)
  │   ├── LoginPage
  │   ├── DashboardPage
  │   ├── ClientListPage
  │   ├── ClientDetailPage
  │   └── ...
  │
  ├── Components (Reusable)
  │   ├── Form components
  │   ├── Tables
  │   ├── Cards
  │   ├── Navigation
  │   └── ...
  │
  ├── Stores (Zustand)
  │   ├── authStore (login, logout, user)
  │   ├── clientStore (list, create, update)
  │   └── ...
  │
  ├── API Client (Axios)
  │   ├── axios instance
  │   ├── interceptors (auth, errors)
  │   └── API methods
  │
  └── Hooks (Custom)
      ├── useAuth
      ├── useClients
      └── ...
```

---

## 🚀 Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

**Key packages:**
```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "react-router-dom": "^6.x",
  "zustand": "^4.x",
  "axios": "^1.4.x",
  "tailwindcss": "^3.x"
}
```

### 2. Environment Variables

**Create `.env`:**
```bash
cp .env.example .env
```

**Content:**
```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=CRM Assurance
```

### 3. Run Development Server

```bash
npm run dev

# Server starts on http://localhost:5173
```

### 4. Build for Production

```bash
npm run build

# Creates dist/ folder (ready for deployment)
```

---

## 📁 Project Structure

```
src/
├── pages/                    # Route pages
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── DashboardPage.jsx
│   ├── ClientListPage.jsx
│   ├── ClientDetailPage.jsx
│   └── NotFoundPage.jsx
│
├── components/               # Reusable components
│   ├── common/
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Footer.jsx
│   │   └── Button.jsx
│   ├── forms/
│   │   ├── LoginForm.jsx
│   │   ├── ClientForm.jsx
│   │   └── SearchForm.jsx
│   ├── tables/
│   │   ├── ClientTable.jsx
│   │   └── TablePagination.jsx
│   └── cards/
│       ├── ClientCard.jsx
│       └── StatsCard.jsx
│
├── stores/                   # Zustand state management
│   ├── authStore.js          # Authentication state
│   ├── clientStore.js        # Clients state
│   └── appStore.js           # Global app state
│
├── api/                      # HTTP client
│   ├── axios.js              # Axios instance + interceptors
│   ├── auth.js               # Auth API methods
│   ├── clients.js            # Clients API methods
│   └── index.js              # Export all APIs
│
├── hooks/                    # Custom React hooks
│   ├── useAuth.js            # Auth hook
│   ├── useClients.js         # Clients hook
│   ├── useForm.js            # Form handling
│   └── useLocalStorage.js    # Local storage hook
│
├── utils/                    # Helper functions
│   ├── formatters.js         # Date, currency formatting
│   ├── validators.js         # Form validation
│   └── constants.js          # App constants
│
├── App.jsx                   # Root component + routing
├── main.jsx                  # Entry point
└── index.css                 # Global styles (Tailwind)
```

---

## 🎛️ State Management (Zustand)

### Auth Store

**File**: `src/stores/authStore.js`

```javascript
import create from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,

  // Actions
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password
      });
      const { token, user } = response.data.data;
      
      localStorage.setItem('token', token);
      set({ user, token, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  isAuthenticated: () => !!localStorage.getItem('token'),
}));

export default useAuthStore;
```

**Usage in Components:**

```jsx
const LoginPage = () => {
  const { login, isLoading } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form content */}
    </form>
  );
};
```

### Clients Store

**File**: `src/stores/clientStore.js`

```javascript
import create from 'zustand';
import * as clientApi from '../api/clients';

const useClientStore = create((set) => ({
  clients: [],
  currentClient: null,
  isLoading: false,
  pagination: { page: 0, limit: 10, total: 0 },

  // Fetch all clients
  fetchClients: async (page = 0, limit = 10) => {
    set({ isLoading: true });
    try {
      const data = await clientApi.listClients(page, limit);
      set({
        clients: data.clients,
        pagination: data.pagination,
        isLoading: false
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Fetch single client
  fetchClient: async (id) => {
    try {
      const data = await clientApi.getClient(id);
      set({ currentClient: data });
    } catch (error) {
      throw error;
    }
  },

  // Create client
  createClient: async (clientData) => {
    try {
      const newClient = await clientApi.createClient(clientData);
      set((state) => ({
        clients: [newClient, ...state.clients]
      }));
      return newClient;
    } catch (error) {
      throw error;
    }
  },

  // Update client
  updateClient: async (id, clientData) => {
    try {
      const updated = await clientApi.updateClient(id, clientData);
      set((state) => ({
        clients: state.clients.map(c => c.id === id ? updated : c),
        currentClient: updated
      }));
      return updated;
    } catch (error) {
      throw error;
    }
  },

  // Delete client
  deleteClient: async (id) => {
    try {
      await clientApi.deleteClient(id);
      set((state) => ({
        clients: state.clients.filter(c => c.id !== id)
      }));
    } catch (error) {
      throw error;
    }
  },
}));

export default useClientStore;
```

---

## 🔗 API Client (Axios)

**File**: `src/api/axios.js`

```javascript
import axios from 'axios';
import useAuthStore from '../stores/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default apiClient;
```

**File**: `src/api/clients.js`

```javascript
import apiClient from './axios';

export const listClients = async (page = 0, limit = 10) => {
  const response = await apiClient.get('/api/clients', {
    params: { page, limit }
  });
  return response.data;
};

export const getClient = async (id) => {
  const response = await apiClient.get(`/api/clients/${id}`);
  return response.data;
};

export const createClient = async (clientData) => {
  const response = await apiClient.post('/api/clients', clientData);
  return response.data;
};

export const updateClient = async (id, clientData) => {
  const response = await apiClient.put(`/api/clients/${id}`, clientData);
  return response.data;
};

export const deleteClient = async (id) => {
  await apiClient.delete(`/api/clients/${id}`);
};

export const searchClients = async (query, limit = 20) => {
  const response = await apiClient.get('/api/clients/search', {
    params: { q: query, limit }
  });
  return response.data;
};
```

---

## 🎨 Components

### Common Components

**Header Component**

```jsx
// src/components/common/Header.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">CRM Assurance</h1>
        <div className="flex items-center gap-4">
          <span>Bienvenue, {user?.firstName}!</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
```

### Form Components

**ClientForm Component**

```jsx
// src/components/forms/ClientForm.jsx
import React, { useState } from 'react';
import useClientStore from '../../stores/clientStore';

export default function ClientForm({ clientId = null, onSuccess }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    status: 'active'
  });

  const { createClient, updateClient } = useClientStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (clientId) {
        await updateClient(clientId, formData);
      } else {
        await createClient(formData);
      }
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          name="firstName"
          placeholder="Prénom"
          value={formData.firstName}
          onChange={handleChange}
          className="px-4 py-2 border rounded"
          required
        />
        <input
          type="text"
          name="lastName"
          placeholder="Nom"
          value={formData.lastName}
          onChange={handleChange}
          className="px-4 py-2 border rounded"
          required
        />
      </div>

      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email}
        onChange={handleChange}
        className="w-full px-4 py-2 border rounded"
        required
      />

      <input
        type="tel"
        name="phone"
        placeholder="Téléphone"
        value={formData.phone}
        onChange={handleChange}
        className="w-full px-4 py-2 border rounded"
      />

      <input
        type="text"
        name="company"
        placeholder="Entreprise"
        value={formData.company}
        onChange={handleChange}
        className="w-full px-4 py-2 border rounded"
      />

      <select
        name="status"
        value={formData.status}
        onChange={handleChange}
        className="w-full px-4 py-2 border rounded"
      >
        <option value="active">Actif</option>
        <option value="prospect">Prospect</option>
        <option value="inactive">Inactif</option>
      </select>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isLoading ? 'Chargement...' : 'Soumettre'}
      </button>
    </form>
  );
}
```

---

## 🛣️ Routing

**File**: `src/App.jsx`

```jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientListPage from './pages/ClientListPage';
import ClientDetailPage from './pages/ClientDetailPage';
import NotFoundPage from './pages/NotFoundPage';

// Protected Route
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore(state => state.token !== null);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <ClientListPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/clients/:id"
          element={
            <ProtectedRoute>
              <ClientDetailPage />
            </ProtectedRoute>
          }
        />
        
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}
```

---

## 🎨 Styling (Tailwind CSS)

**Global styles** are in `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom utilities */
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition;
  }

  .btn-secondary {
    @apply px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition;
  }

  .card {
    @apply bg-white rounded-lg shadow-md p-6;
  }

  .form-input {
    @apply w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500;
  }
}
```

---

## ✅ Best Practices

### 1. Component Naming
- Use PascalCase for components
- Name files same as component
- Example: `ClientCard.jsx` exports `ClientCard`

### 2. Props Validation
```jsx
import PropTypes from 'prop-types';

ClientCard.propTypes = {
  client: PropTypes.shape({
    id: PropTypes.string.required,
    firstName: PropTypes.string.required,
    email: PropTypes.string.required
  }).required,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func
};
```

### 3. Error Handling
```jsx
try {
  await fetchClients();
} catch (error) {
  console.error('Error fetching clients:', error);
  setError(error.message || 'An error occurred');
}
```

### 4. Loading States
```jsx
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <YourComponent />;
```

### 5. Environmental Variables
```javascript
const API_URL = import.meta.env.VITE_API_URL;
const APP_NAME = import.meta.env.VITE_APP_NAME;
```

---

## 🧪 Testing

**Currently**: Not implemented  
**Planned for Phase 5**

Recommended tools:
- Jest (unit tests)
- React Testing Library (component tests)
- Cypress (e2e tests)

---

## 📦 Phase 4 Deliverables

- [x] Project setup (React + Vite + Tailwind)
- [ ] Pages: Login, Register, Dashboard, Clients
- [ ] Forms: Login, Client CRUD
- [ ] Tables: Client list with pagination
- [ ] Auth flow (login/logout)
- [ ] Error handling
- [ ] Responsive design (mobile-friendly)
- [ ] Protected routes

**ETA**: 28 mars 2026

---

**Last Updated**: 26 mars 2026  
**Frontend Version**: 1.0.0 (Phase 4)
