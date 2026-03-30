# Commands - Frontend CRM Assurance

Tous les commandes utiles pour développer et déployer le frontend.

---

## 🚀 Démarrage

### Dev Mode (avec hot reload)
```bash
npm run dev
```
- Accès: `http://localhost:5173`
- Hot Module Replacement actif
- Debugging avec DevTools

### Production Build
```bash
npm run build
```
- Compile TypeScript + JSX
- Minify + tree-shake
- Output: `dist/` folder
- Taille: ~265KB JS, 23KB CSS

### Preview Build Localement
```bash
npm run preview
```
- Simule la version de production
- Accès: `http://localhost:4173`

---

## 📦 Package Management

### Installer dépendances
```bash
npm install
```

### Installer une nouvelle dépendance
```bash
npm install nom-package
npm install -D nom-dev-package  # Dev only
```

### Mettre à jour dépendances
```bash
npm update
npm outdated  # Voir les packages obsolètes
```

### Nettoyer & réinstaller
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 🧹 Code Quality

### Linter (ESLint)
```bash
npm run lint
npm run lint -- --fix  # Auto-fix issues
```

### Format Code (optionnel, ajouter Prettier)
```bash
npx prettier --write src/
```

---

## 🧪 Testing (à implémenter)

### Run Tests
```bash
npm run test      # Unit tests
npm run test:watch # Watch mode
npm run test:coverage # Coverage report
```

### E2E Testing (Cypress)
```bash
npm run cypress:open
npm run cypress:run
```

---

## 🔍 Debugging

### Voir Logs du Projet
```bash
npm run dev 2>&1 | tee build.log
```

### Ouvrir DevTools du Navigateur
```
F12 ou Cmd+Option+I (Mac)
```

### Déboguer Stores (Zustand)
```javascript
// Dans la console du navigateur
localStorage.getItem('token')
// Ou importer le store dans la console
```

---

## 📊 Analyse

### Taille du Bundle
```bash
npm run build -- --analyze  # Si configuré
```

### Vérifier Dépendances
```bash
npm list                    # Tree view
npm ls --depth=0           # Top-level seulement
npm outdated               # Packages à mettre à jour
```

---

## 🌐 Déploiement

### Vercel (recommandé)
```bash
# Installation
npm i -g vercel

# Deploy
vercel

# Configure .env.production
VITE_API_BASE=https://api.votre-domaine.com
```

### Netlify
```bash
# Installation
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Ou via GitHub (CD automatique)
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

```bash
docker build -t crm-assurance-frontend .
docker run -p 5173:5173 crm-assurance-frontend
```

---

## 🔐 Environment Variables

### Créer `.env.local`
```
VITE_API_BASE=http://localhost:3000
VITE_JWT_STORAGE=localStorage
```

### Dans le Code
```javascript
const apiBase = import.meta.env.VITE_API_BASE
```

### Fichier Example
```
# .env.example (commit dans git)
VITE_API_BASE=http://localhost:3000
VITE_JWT_STORAGE=localStorage
```

---

## 📝 Git Workflow

### Initialiser le repo (première fois)
```bash
cd ~/Desktop/CRM-Assurance/frontend
git init
git add .
git commit -m "Initial commit: Phase 4 Frontend"
```

### Branch Development
```bash
git checkout -b feature/new-feature
git add .
git commit -m "feat: Add new feature"
git push origin feature/new-feature
```

### Merge vers Main
```bash
git checkout main
git merge feature/new-feature
git push origin main
```

---

## 🚨 Troubleshooting

### Port 5173 déjà utilisé
```bash
# Trouver le processus
lsof -i :5173

# Kill le processus
kill -9 <PID>

# Ou utiliser un autre port
npm run dev -- --port 3000
```

### Node modules cassés
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Cache problématique
```bash
# Vite cache
rm -rf .vite

# Browser cache
# Ctrl+Shift+Delete (Windows/Linux) ou Cmd+Shift+Delete (Mac)
```

### Tailwind CSS pas appliqué
```bash
# Régénérer CSS
npm run dev

# Vérifier import
# Voir src/styles/globals.css
```

---

## 📈 Performance

### Check Build Size
```bash
npm run build
ls -lh dist/

# Expected:
# index.html: ~0.5KB
# CSS: ~23KB
# JS: ~265KB
```

### Lighthouse Score
```bash
npm run build
npm run preview

# Ouvrir DevTools → Lighthouse
# Minimum score à atteindre: 90
```

---

## 🔄 CI/CD Setup

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run lint
```

### Pre-commit Hook
```bash
# .git/hooks/pre-commit
#!/bin/bash
npm run lint
if [ $? -ne 0 ]; then
  echo "Lint failed. Commit aborted."
  exit 1
fi
```

---

## 📚 Documentation

### Générer README
```bash
# Déjà existe
cat README.md
cat QUICKSTART.md
cat ARCHITECTURE.md
```

### Build Documentation
```bash
npm install -D typedoc
npx typedoc src/
```

---

## 🎨 UI Development

### Storybook (optionnel)
```bash
npm install -D storybook
npx storybook init
npm run storybook
```

### Components Snapshot Testing
```bash
npm install -D @testing-library/react
npm test -- --updateSnapshot
```

---

## 🔗 Useful URLs

### Local Development
```
Frontend:     http://localhost:5173
Backend:      http://localhost:3000
DevTools:     F12
Vite Docs:    http://vitejs.dev
React:        http://react.dev
Router:       http://reactrouter.com
Zustand:      http://zustand-demo.vercel.app
Tailwind:     http://tailwindcss.com
```

### Deployed (à mettre à jour)
```
Frontend:     https://crm-assurance.vercel.app
Backend:      https://api.crm-assurance.com
Monitoring:   https://your-monitoring-tool.com
```

---

## 📞 Help Commands

### List all npm scripts
```bash
npm run
# ou
npm run --list-tasks  # Selon version npm
```

### Check npm version
```bash
npm --version
node --version
```

### Package size
```bash
npm view nom-package size
npm bundle-report  # Webpack only
```

---

## 🎯 Quick Reference

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Clean build
rm -rf dist/ && npm run build

# Update dependencies
npm update

# Reinstall from scratch
rm -rf node_modules package-lock.json && npm install
```

---

## 💾 Backup & Restore

### Backup Frontend
```bash
tar -czf frontend-backup.tar.gz frontend/
# ou
zip -r frontend-backup.zip frontend/
```

### Restore Backend
```bash
tar -xzf frontend-backup.tar.gz
# ou
unzip frontend-backup.zip
```

---

## 🚀 Deploy Checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Bundle size < 300KB
- [ ] All routes tested
- [ ] All forms validated
- [ ] Mobile responsive OK
- [ ] No console errors
- [ ] API endpoints configured
- [ ] .env variables set
- [ ] Git committed & pushed
- [ ] Deploy to production

---

## 🎓 Best Practices

### Before Committing
```bash
npm run lint -- --fix
npm run build
npm run test  # Si tests existent
git status
git diff
```

### Code Review Checklist
```
✅ All imports used
✅ No console.log() left
✅ Proper error handling
✅ Accessibility OK
✅ Performance good
✅ Tests passing
✅ Documentation updated
```

---

**Last Updated:** 26 March 2026  
**Version:** 1.0
