# CRM Assurance - Frontend

Interface React pour la gestion des clients d'un cabinet de courtage en assurance.

## 📋 Prérequis

- Node.js >= 16
- npm ou yarn

## 🚀 Installation

```bash
cd ~/Desktop/CRM-Assurance/frontend
npm install
```

## 🎯 Développement

Lancer le serveur de développement:

```bash
npm run dev
```

L'application sera disponible à `http://localhost:5173`

## 🏗️ Structure du Projet

```
frontend/
├── src/
│   ├── pages/              # Pages principales
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── ClientsListPage.jsx
│   │   ├── ClientDetailPage.jsx
│   │   └── ClientFormPage.jsx
│   ├── components/         # Composants réutilisables
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Card.jsx
│   │   ├── Modal.jsx
│   │   └── ProtectedRoute.jsx
│   ├── layouts/            # Layouts
│   │   └── MainLayout.jsx
│   ├── store/              # Zustand stores
│   │   ├── authStore.js
│   │   └── clientStore.js
│   ├── api/                # API client
│   │   └── client.js
│   ├── styles/             # Styles globaux
│   │   └── globals.css
│   ├── App.jsx             # App principal
│   └── main.jsx            # Point d'entrée
├── index.html
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

## 🎨 Technologies

- **React 18** - Framework UI
- **Vite** - Bundler
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Zustand** - State management
- **Lucide React** - Icons

## 🔐 Authentification

L'authentification utilise JWT tokens stockés en localStorage. Les routes protégées nécessitent un token valide.

- Login: `/login`
- Register: `/register`
- Routes protégées: require authentication token

## 📱 Pages Implémentées

### Phase 4 - Priority 1 ✅
- **Login Page** - Connexion avec validation de formulaire
- **Register Page** - Inscription avec validation

### Phase 4 - Priority 2 ✅
- **Clients List** - Table avec pagination, recherche, tri et actions CRUD

### Phase 4 - Priority 3 ✅
- **Client Form** - Création et édition de clients
- **Client Detail** - Affichage détaillé d'un client

### Phase 4 - Priority 4 (Mobile Responsive) ✅
- Tous les composants sont responsive avec Tailwind CSS
- Layout mobile adapté pour tous les écrans

## 🛠️ Configuration

### API Backend
L'URL du backend est configurée dans les stores:
```
http://localhost:3000
```

Modifier cette valeur dans:
- `src/store/authStore.js`
- `src/store/clientStore.js`
- `src/api/client.js`

## 📦 Scripts Disponibles

```bash
npm run dev      # Lancer le développement
npm run build    # Build pour la production
npm run preview  # Prévisualiser le build
```

## 🎯 Prochaines Étapes

- [ ] Intégration avec le backend réel
- [ ] Tests unitaires
- [ ] Gestion d'erreurs avancée
- [ ] Modal de confirmation amélioré
- [ ] Notifications toast
- [ ] Filtering avancé
- [ ] Export de données (PDF, CSV)
- [ ] Dashboard avec graphiques

## 📝 Notes

- Tous les formulaires incluent la validation côté client
- Les erreurs API sont affichées à l'utilisateur
- Les tokens JWT sont automatiquement inclus dans les requêtes
- Les routes protégées redirigent vers login si non authentifié

## 🔗 Backend API

Endpoints utilisés:
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription
- `GET /api/clients` - Liste des clients
- `POST /api/clients` - Créer un client
- `GET /api/clients/:id` - Détail d'un client
- `PUT /api/clients/:id` - Modifier un client
- `DELETE /api/clients/:id` - Supprimer un client
- `GET /api/stats/dashboard` - Statistiques du dashboard
