# Quick Start - Frontend CRM Assurance

## 🚀 Démarrage Rapide (5 min)

### 1. S'assurer que le backend est lancé
```bash
# Terminal 1: Backend
cd ~/Desktop/CRM-Assurance/backend
npm install
npm run dev
# Doit écouter sur http://localhost:3000
```

### 2. Lancer le frontend
```bash
# Terminal 2: Frontend
cd ~/Desktop/CRM-Assurance/frontend
npm install  # Si première fois
npm run dev
# Accès: http://localhost:5173
```

### 3. Tester l'application

**Accueil:**
- Vous serez automatiquement redirigé vers `/login`

**Créer un compte:**
1. Cliquez "Créer un compte"
2. Remplissez: Nom, Email, Mot de passe
3. Confirmez le mot de passe
4. Cliquez "S'enregistrer"

**Se connecter:**
1. Email: `votre@email.com`
2. Mot de passe: (celui que vous avez créé)
3. Cliquez "Se connecter"

**Naviguer:**
- **Dashboard** (🏠): Accueil avec stats
- **Clients** (👥): Liste et gestion des clients
- **Ajouter** (➕): Créer un nouveau client

---

## 📁 Fichiers Clés

```
frontend/
├── src/pages/
│   ├── LoginPage.jsx        ← Connexion
│   ├── RegisterPage.jsx     ← Inscription
│   ├── DashboardPage.jsx    ← Accueil
│   ├── ClientsListPage.jsx  ← Liste clients
│   ├── ClientFormPage.jsx   ← Créer/Modifier
│   └── ClientDetailPage.jsx ← Détails
├── src/store/
│   ├── authStore.js         ← État authentification
│   └── clientStore.js       ← État clients
└── src/api/
    └── client.js            ← Wrapper API
```

---

## 🔧 Configuration

### Changer l'URL Backend
Si votre backend n'est pas sur `http://localhost:3000`, modifiez:

**1. `src/store/authStore.js`** (ligne ~15)
```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
```

**2. `src/store/clientStore.js`** (ligne ~17)
```javascript
const response = await fetch('http://localhost:3000/api/clients?${params}', {
```

**3. `src/api/client.js`** (ligne ~1)
```javascript
const API_BASE = 'http://localhost:3000/api';
```

---

## ✅ Checklist de Démarrage

- [ ] Backend lancé sur `http://localhost:3000`
- [ ] Frontend lancé sur `http://localhost:5173`
- [ ] Pas d'erreur dans la console du navigateur
- [ ] Pas d'erreur dans le terminal frontend
- [ ] Page de login affichée
- [ ] Création de compte possible
- [ ] Connexion possible avec le nouveau compte
- [ ] Dashboard affiche "Bienvenue"
- [ ] Pouvoir créer un client
- [ ] Pouvoir lister les clients
- [ ] Pouvoir modifier un client
- [ ] Pouvoir supprimer un client

---

## 🐛 Troubleshooting

### "Cannot connect to localhost:3000"
**Solution:** Vérifiez que le backend est lancé
```bash
lsof -i :3000  # Doit montrer le processus Node
```

### "Module not found"
**Solution:** Réinstaller les dépendances
```bash
rm -rf node_modules package-lock.json
npm install
```

### "CSS not loading"
**Solution:** Vérifier que Tailwind est compilé
```bash
npm run dev
# Redémarrer le serveur de développement
```

### "Token not stored"
**Solution:** Vérifier localStorage dans DevTools
```javascript
// Ouvrir console du navigateur
localStorage.getItem('token')  // Doit retourner un token après login
```

---

## 📊 Endpoints Testés

```
✅ POST   /api/auth/login
✅ POST   /api/auth/register
✅ GET    /api/clients
✅ POST   /api/clients
✅ GET    /api/clients/:id
✅ PUT    /api/clients/:id
✅ DELETE /api/clients/:id
✅ GET    /api/stats/dashboard (optionnel)
```

---

## 💡 Tips & Tricks

### Effacer le localStorage
```javascript
localStorage.clear()  // Dans la console du navigateur
```

### Voir les logs des stores
```javascript
// Dans main.jsx, ajouter:
useAuthStore.setState((state) => { console.log('Auth:', state); return state; });
```

### Tester l'API directement
```bash
# Tester login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```

---

## 📱 Responsive Design

L'application est optimisée pour:
- ✅ Desktop (1920px+)
- ✅ Tablet (768px - 1024px)
- ✅ Mobile (320px - 767px)

Testez avec F12 → Responsive Mode

---

## 🎨 Personnalisation

### Changer les couleurs
Modifier `tailwind.config.js`:
```javascript
colors: {
  primary: "#votre-couleur",
  secondary: "#votre-couleur",
  // ...
}
```

### Ajouter une page
1. Créer `src/pages/NewPage.jsx`
2. Importer dans `src/App.jsx`
3. Ajouter la route:
```jsx
<Route path="/new-page" element={<NewPage />} />
```

---

## 🚨 Vérifier Avant de Livrer

- [ ] Backend répond et retourne les bonnes réponses
- [ ] Tous les CRUD fonctionnent
- [ ] Validation des formulaires marche
- [ ] Messages d'erreur affichés correctement
- [ ] Design responsive OK
- [ ] Pas de console errors
- [ ] Tokens JWT correctement gérés
- [ ] Déconnexion efface le token

---

**Besoin d'aide?** Vérifiez le README.md ou PHASE4_FRONTEND_STATUS.md

Happy coding! 🚀
