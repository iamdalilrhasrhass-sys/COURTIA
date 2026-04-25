# Contexte complet — Login Page CourtIA
> Pour Claude — comprendre les deux versions, les bugs et les corrections attendues

---

## Structure des dossiers

```
/root/
├── courtia/                    ← DOSSIER PRINCIPAL — déployé sur Vercel
│   └── frontend/src/
│       ├── App.jsx             ← Route /login → import LoginPage from './pages/LoginPage'
│       ├── pages/
│       │   ├── LoginPage.jsx   ← Version déployée (166 lignes, inline styles, design simple)
│       │   └── Login.jsx       ← Version alternative non utilisée (139 lignes, 2 panneaux simples)
│       └── ...
├── courtia-repo/               ← COPIE de travail — contient le NOUVEAU DESIGN
│   └── frontend/src/pages/
│       ├── LoginPage.jsx       ← Version redesignée (603 lignes, bulles, left/right panel)
│       └── Login.jsx           ← Identique à LoginPage.jsx (copie exacte)
└── courtia_new/ courtia_fresh/ courtia2/ ← Autres copies, sans intérêt
```

---

## Version A — Déployée sur Vercel (courtia/)

**Fichier :** `/root/courtia/frontend/src/pages/LoginPage.jsx` (166 lignes)

**Design :** Fond `#f7f6f2`, carte blanche centrée max 420px, style minimaliste épuré.
**Style :** Inline styles React uniquement — pas de fichiers CSS, pas de classes.
**Bouton Google :** N'EXISTE PAS dans cette version. Il n'y a que le formulaire email/mdp.

**Routing (App.jsx ligne 6 & 128-129) :**
```jsx
import LoginPage from './pages/LoginPage'
// ...
<Route path="/login" element={<LoginPage />} />
<Route path="/register" element={<LoginPage />} />
```

**État actuel sur Vercel :** Cette version tourne en production.

---

## Version B — Nouveau design dans courtia-repo

**Fichier :** `/root/courtia-repo/frontend/src/pages/LoginPage.jsx` (603 lignes)

**Design :** Fond dégradé violet/rose/bleu, 8 bulles flottantes animées avec effet iris, carte à 2 panneaux (left sombre 43% + right clair 57%).

**Style :** `dangerouslySetInnerHTML` injecte un bloc `<style>` avec toutes les classes CSS sous forme d'une constante `STYLES` (lignes 7-416). Ce sont les classes que Claude a référencées.

**Les classes CSS dans le bloc `STYLES` (string template, lignes 7-416) :**
| Classe | Ligne | Rôle |
|--------|-------|------|
| `.login-root` | 8-23 | Container principal, min-height 100vh, background gradient |
| `.bubble` | 25-29 | Bulle flottante générique |
| `.bubble-inner` | 31-44 | Intérieur de bulle avec dégradé radial + border |
| `.bubble-iris` | 46-63 | Effet iris conic-gradient animé (rotation 12s) |
| `.bubble-shine` | 65-75 | Reflet lumineux haut-gauche |
| `.bubble-shine2` | 77-86 | Second reflet bas-droit |
| `.bubble-rim` | 88-93 | Bordure fine intérieure |
| `.bubble-shadow` | 95-104 | Ombre portée sous la bulle |
| `.b1` à `.b8` | 170-177 | Taille/position/délai d'animation de chaque bulle |
| `.card` | 179-190 | Carte principale 920px, arrondie 28px |
| `.left-panel` | 192-223 | Panneau gauche 43%, fond noir, pseudo-éléments dégradés |
| `.right-panel` | 231-240 | Panneau droit, fond blanc semi-transparent, blur |
| `.badge-founder` | 242-255 | Badge "Offre Fondateur — 50 places" |
| `.field-wrap` | 265-303 | Wrapper inputs avec icônes SVG |
| `.btn-primary` | 320-350 | Bouton submit principal |
| `.btn-google` | 374-396 | Bouton Google — stylisé mais sans logique |
| `.error-msg` | 398-409 | Message d'erreur |
| `.divider-or` | 352-372 | Séparateur "ou" |
| `.eye-toggle` | 305-318 | Bouton toggle mot de passe |

---

## Pourquoi le bouton Google ne fonctionne PAS

**Code exact (courtia-repo, lignes 582-590) :**
```jsx
<button type="button" className="btn-google">
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
  Continuer avec Google
</button>
```

**Diagnostic technique (vérifié via browser console) :**
1. `btn.onclick` → `null` (pas d'attribut onclick)
2. `btn.__reactProps?.onClick` → `null` (pas de handler React)
3. `btn.closest('a')` → `null` (pas de <a> parent avec href)
4. `btn.id` → `""` (pas d'ID)
5. Aucune erreur console au clic (événement simplement ignoré)

**Raison :** Le bouton est **purement décoratif**. Aucune intégration Google OAuth n'a été implémentée :
- Pas d'import de `@react-oauth/google` ou `gapi`
- Pas d'`onClick` qui appelle `window.open('/api/auth/google')` ou autre
- Pas d'endpoint backend `/api/auth/google` dans le code frontend
- Pas d'interface `window.google.accounts.id` (Google Identity Services)
- Aucune variable d'environnement `VITE_GOOGLE_CLIENT_ID`

**Ce qui serait nécessaire pour le faire marcher :**

**Option A — Google OAuth via @react-oauth/google (le plus simple) :**
```jsx
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'

// Dans le composant racine : wrapper <GoogleOAuthProvider clientId={VITE_GOOGLE_CLIENT_ID}>
// Dans le formulaire :
<GoogleLogin
  onSuccess={credentialResponse => {
    api.post('/api/auth/google', { credential: credentialResponse.credential })
  }}
  onError={() => setError('Erreur authentification Google')}
  text="continue_with"
/>
```

**Option B — Redirection classique OAuth :**
```jsx
<button onClick={() => {
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth
    ?client_id=${import.meta.env.VITE_GOOGLE_CLIENT_ID}
    &redirect_uri=${window.location.origin}/api/auth/google/callback
    &response_type=code
    &scope=email+profile
    &access_type=offline`
}}>...</button>
```

**Option C — Backend-only** (si le backend gère déjà Google OAuth) :
```jsx
<button onClick={() => {
  window.open(`${API_URL}/api/auth/google`, '_self')
}}>...</button>
```

---

## Les 5 corrections de Claude (à appliquer à la Version B)

### Correctif 1 — Carte trop petite
La carte (`.card`) ne prend pas assez de hauteur.
- `.login-root` : `min-height: 100vh;` + `align-items: center;` (déjà présent partiellement)
- `.card` : modifier `min-height: 580px` → `min-height: 90vh` + `width: 960px`

### Correctif 2 — Colonne gauche coupée
Le contenu du panneau gauche déborde.
- `.left-panel` : `overflow: visible;` (ajouter)
- Vérifier que `justify-content: space-between` est présent (ligne 200)
- Réduire font-size du titre `.headline` à 19px (ligne 494 : `fontSize: '21px'` → `fontSize: '19px'`)

### Correctif 3 — Supprimer "Rhasrhass®"
Ligne 510 :
```jsx
<p style={{ color:'rgba(255,255,255,0.15)', fontSize:'10px', letterSpacing:'0.1em' }}>Rhasrhass®</p>
```
→ **Supprimer cette ligne et son `</div>` parent si nécessaire.**

### Correctif 4 — Bulles plus belles
- `.bubble-shine` (ligne 72) : `rgba(255,255,255,0.85)` → `rgba(255,255,255,0.92)`
- `.bubble-inner` (ligne 42) : `border: 1.5px solid rgba(255,255,255,0.6)` → `1.5px solid rgba(255,255,255,0.7)`
- `.bubble-iris` (lignes 52-59) : chaque couleur +0.05 en opacité :
  - `rgba(168,85,247,0.22)` → `0.27`
  - `rgba(59,130,246,0.28)` → `0.33`
  - `rgba(16,185,129,0.18)` → `0.23`
  - `rgba(245,158,11,0.14)` → `0.19`
  - `rgba(239,68,68,0.16)` → `0.21`
  - `rgba(236,72,153,0.22)` → `0.27`
  - `rgba(139,92,246,0.2)` → `0.25`

### Correctif 5 — Background plus vivant
Remplacer le background de `.login-root` (lignes 17-22) par :
```css
background:
  radial-gradient(ellipse at 20% 15%, rgba(192,170,255,0.65) 0%, transparent 40%),
  radial-gradient(ellipse at 85% 80%, rgba(255,180,220,0.55) 0%, transparent 38%),
  radial-gradient(ellipse at 60% 35%, rgba(160,215,255,0.5) 0%, transparent 38%),
  radial-gradient(ellipse at 5% 75%, rgba(180,255,210,0.35) 0%, transparent 32%),
  #ede9f5;
```

---

## Workflow de déploiement

```bash
# 1. Appliquer les fixes → courtia-repo/frontend/src/pages/LoginPage.jsx
# 2. Copier dans le dossier principal :
cp /root/courtia-repo/frontend/src/pages/LoginPage.jsx /root/courtia/frontend/src/pages/LoginPage.jsx
# 3. Build local pour vérifier :
cd /root/courtia/frontend && npm run build
# 4. Commit & push → Vercel auto-déploie :
cd /root/courtia
git add frontend/src/pages/LoginPage.jsx
git commit -m "fix(login): apply redesign fixes - card size, bubbles, background, remove Rhasrhass"
git push origin main
# 5. Vérifier sur https://courtia.vercel.app/login
```

---

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| `/root/courtia-repo/frontend/src/pages/LoginPage.jsx` | Modifier (appliquer les 5 fixes) |
| `/root/courtia-repo/frontend/src/pages/Login.jsx` | Modifier aussi (copie identique) |
| `/root/courtia/frontend/src/pages/LoginPage.jsx` | Copier depuis courtia-repo après fixes |
| `/root/courtia/frontend/src/pages/Login.jsx` | Optionnel : sync si utilisé ailleurs |
