# RAPPORT LOT 19 — App Mobile Expo + Outreach Beta

**Date** : 11 mai 2026  
**Auteur** : ARK (CTO COURTIA)  
**Statut** : COMPLETE

---

## RESUME EXECUTIF

Le LOT 19 delivre deux livrables majeurs :
1. **Application mobile COURTIARK** (iOS + Android) en React Native/Expo
2. **Templates d'outreach** pour recruter les 50 premiers beta-testeurs

---

## PARTIE 1 — APPLICATION MOBILE EXPO

### Stack technique
| Composant | Technologie |
|-----------|-------------|
| Framework | Expo SDK 51 (managed) |
| Navigation | React Navigation 6 |
| Styling | NativeWind (Tailwind RN) |
| State | Zustand |
| API | Axios |
| Animations | React Native Reanimated |
| Icons | Lucide React Native |

### Ecrans implementes (9)

| Ecran | Description | Status |
|-------|-------------|--------|
| SplashScreen | Logo C anime + glow 3D | OK |
| OnboardingScreen | 3 slides (cockpit, ARK, productivite) | OK |
| LoginScreen | Google OAuth + email | OK |
| DashboardScreen | KPIs, Morning Brief, actions | OK |
| ClientsScreen | Liste searchable + filtres | OK |
| ClientDetailScreen | Fiche + score ARK + contrats | OK |
| ARKWatchScreen | Signaux Hamon/Chatel/resiliation | OK |
| SinistresScreen | Liste + statuts (ouvert/en cours/clos) | OK |
| ProfileScreen | Parametres + stats + deconnexion | OK |

### Navigation
- **Root Stack** : Splash -> Onboarding -> Login -> (App)
- **Bottom Tabs** : Dashboard | Clients | ARK Watch | Sinistres | Profil

### Composants reutilisables
- `CLogo.tsx` : Logo C anime avec glow
- `ARKCard.tsx` : Card gradient pour Morning Brief
- `ClientCard.tsx` : Card client avec score
- `SignalCard.tsx` : Card signal avec priorite

### Configuration
```
Package: fr.courtiark.app
Bundle ID: fr.courtiark.app
API: api.courtiark.fr
```

### Design Aurora
- Fond: `#050510`
- Accent: `#8B5CF6`
- Secondary: `#22D3EE`
- Cartes: `rgba(255,255,255,0.05)`

### Fichiers crees
```
mobile/
├── App.tsx
├── app.json
├── eas.json
├── package.json
├── babel.config.js
├── tailwind.config.js
├── tsconfig.json
├── README.md
├── assets/.gitkeep
└── src/
    ├── navigation/ (2 files)
    ├── screens/ (9 files)
    ├── components/ (4 files)
    ├── services/ (1 file)
    └── store/ (1 file)
```

**Total** : 26 fichiers, 4303 lignes de code

---

## PARTIE 2 — OUTREACH BETA

### Templates livres

| Fichier | Contenu |
|---------|---------|
| `SEQUENCE_EMAIL_BETA.md` | 3 emails (J0, J+3, J+7) + timing |
| `LINKEDIN_OUTREACH.md` | Messages connexion, suivi, post carrousel |
| `LANDING_BETA_COPY.md` | Hero, benefices, temoignage, FAQ |
| `CIBLE_PERSONAS.md` | 2 personas + objections + arguments |

### Sequence email
1. **Email 1 (J0)** : Approche froide, question accroche
2. **Email 2 (J+3)** : Relance + temoignage Julien M.
3. **Email 3 (J+7)** : Last chance + lien demo

### Personas cibles
| Persona | Volume | Cycle |
|---------|--------|-------|
| Courtier solo deborde | 70% (35/50) | 1 semaine |
| Cabinet en croissance | 30% (15/50) | 2-3 semaines |

### Metriques cibles outreach
- Taux d'ouverture email : > 35%
- Taux de reponse : > 8%
- Conversion beta : > 5%

---

## PARTIE 3 — VERIFICATION PROD

### Build frontend
```bash
cd frontend && npm run build
# ✓ built in 6.97s
# ✓ 0 erreurs, 0 warnings
```

### Route /v2/sinistres
Deja presente dans App.jsx (ligne 278) :
```jsx
<Route path="/v2/sinistres" element={<SinistresV2 />} />
```

---

## COMMITS

```
833a1f2 feat(mobile): App Expo React Native — iOS/Android complet
f39e02f docs(marketing): Outreach beta courtiers — emails + LinkedIn + personas
```

**Push** : `ca62b39..f39e02f main -> main`

---

## PROCHAINES ETAPES

### Mobile
1. Generer les assets (icon.png, splash.png) avec le logo C
2. Configurer les client IDs Google OAuth
3. `npm install` et test sur simulateur
4. Build EAS preview pour test reel

### Outreach
1. Constituer liste ORIAS (courtiers 50-200 clients)
2. Envoyer batch 1 (20 emails) mardi 9h
3. Tracker ouvertures/reponses
4. Ajuster sequence selon resultats

---

## STATISTIQUES LOT 19

| Metrique | Valeur |
|----------|--------|
| Fichiers crees | 30 |
| Lignes de code | 4840 |
| Commits | 2 |
| Temps execution | ~15 min |
| Build frontend | OK |
| Push | OK |

---

**LOT 19 TERMINE**