# COURTIARK Mobile

Application mobile iOS/Android pour courtiers en assurance.

## Stack technique

- **Expo SDK 51** (managed workflow)
- **React Navigation** (stack + bottom tabs)
- **NativeWind** (Tailwind pour React Native)
- **Zustand** (state management)
- **Axios** (API calls)

## Installation

```bash
cd mobile
npm install
npx expo start
```

## Structure

```
mobile/
├── App.tsx                    # Point d'entree
├── app.json                   # Config Expo
├── eas.json                   # Config EAS Build
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx  # Navigation principale
│   │   └── TabNavigator.tsx   # Bottom tabs
│   ├── screens/
│   │   ├── SplashScreen.tsx   # Ecran de chargement
│   │   ├── OnboardingScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── ClientsScreen.tsx
│   │   ├── ClientDetailScreen.tsx
│   │   ├── ARKWatchScreen.tsx
│   │   ├── SinistresScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── components/
│   │   ├── CLogo.tsx          # Logo anime
│   │   ├── ARKCard.tsx
│   │   ├── ClientCard.tsx
│   │   └── SignalCard.tsx
│   ├── services/
│   │   └── api.ts             # Axios instance
│   └── store/
│       └── useStore.ts        # Zustand store
└── assets/
    └── (icons, splash)
```

## Ecrans

| Ecran | Description |
|-------|-------------|
| Splash | Logo C anime, glow effect |
| Onboarding | 3 slides (cockpit, ARK, productivite) |
| Login | Google OAuth |
| Dashboard | KPIs, Morning Brief, actions |
| Clients | Liste searchable + filtres |
| ClientDetail | Fiche complete + score ARK |
| ARKWatch | Signaux Hamon/Chatel/resiliation |
| Sinistres | Liste + statuts |
| Profile | Parametres + deconnexion |

## Build

### Development
```bash
npx expo start
```

### Preview (APK/Simulator)
```bash
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

### Production
```bash
eas build --profile production --platform all
```

## Configuration

### Variables d'environnement
L'API URL est configuree dans `app.json` > `extra.apiUrl`.

### OAuth Google
Remplacer les client IDs dans `LoginScreen.tsx` :
- `androidClientId`
- `iosClientId`
- `webClientId`

## Design

- **Fond** : `#050510` (dark)
- **Accent** : `#8B5CF6` (violet)
- **Secondary** : `#22D3EE` (cyan)
- **Cartes** : `rgba(255,255,255,0.05)`
- **Typo** : Inter (Google Fonts)

## API

L'app communique avec `api.courtiark.fr` :
- `POST /api/auth/google` — Login
- `GET /api/clients` — Liste clients
- `GET /api/ark/signals` — Signaux ARK
- `GET /api/sinistres` — Sinistres
- `GET /api/dashboard/kpis` — KPIs

## Contacts

- **Package** : `fr.courtiark.app`
- **Bundle ID** : `fr.courtiark.app`