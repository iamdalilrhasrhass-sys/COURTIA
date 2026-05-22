# COURTIA Widgets — 12 composants React prêts à l'emploi

## Stack
React 18+ · Vite · Tailwind CSS · zéro dépendance externe requise

---

## Installation

Copie le dossier `courtia-widgets/` dans `src/components/widgets/` de ton projet COURTIA.

```bash
cp -r courtia-widgets/ /srv/courtia/frontend/src/components/widgets/
```

---

## Import

```jsx
import {
  ArkNeuralPulse,
  RiskDnaHelix,
  PartnerSolarSystem,
  DealFlowRiver,
  DossierOrbitalRings,
  ArkRadarCombat,
  OfferPodium,
  SmartMessageComposer,
  CommissionForecastBar,
  ArkActivityFeed,
  DealTimelineScrubber,
  ConversionGravityFunnel,
} from '@/components/widgets'
```

---

## Widgets & emplacement recommandé

| Widget | Emplacement COURTIA | Priorité |
|--------|---------------------|----------|
| `ArkNeuralPulse` | Sidebar globale, pendant tout appel ARK | P0 |
| `DossierOrbitalRings` | Fiche dossier — section "Complétude" | P0 |
| `PartnerSolarSystem` | Page Partenaires & Accès | P0 |
| `ArkRadarCombat` | Page Comparateur ARK | P0 |
| `OfferPodium` | Page Comparateur ARK (résultat) | P0 |
| `SmartMessageComposer` | Modal envoi message (WhatsApp/email/SMS) | P1 |
| `DealFlowRiver` | Dashboard principal | P1 |
| `DealTimelineScrubber` | Fiche dossier — onglet Historique | P1 |
| `ConversionGravityFunnel` | Dashboard principal | P1 |
| `CommissionForecastBar` | Dashboard rapports | P2 |
| `RiskDnaHelix` | Fiche dossier — section Risque | P2 |
| `ArkActivityFeed` | Dashboard admin cabinet | P2 |

---

## Exemples rapides

### ArkNeuralPulse
```jsx
<ArkNeuralPulse
  isThinking={arkStatus === 'processing'}
  confidence={78}
  label="Analyse dossier Dupont..."
  width={320}
  height={160}
/>
```

### DossierOrbitalRings
```jsx
<DossierOrbitalRings
  docsScore={60}
  fieldsScore={85}
  missingDocs={[
    { id: 'ri', label: "Relevé d'information", action: 'whatsapp' }
  ]}
  missingFields={[{ id: 'bonus_malus', label: 'Bonus/malus' }]}
  clientName="Jean Dupont — Auto"
  onAction={({ type, item }) => console.log(type, item)}
  size={220}
/>
```

### ArkRadarCombat
```jsx
<ArkRadarCombat
  offers={[
    { id: '1', partnerName: 'April', recommended: true,
      scores: { price:88, coverage:75, acceptance:90, margin:70, stability:80, speed:95 } },
    { id: '2', partnerName: 'Wakam', recommended: false,
      scores: { price:72, coverage:85, acceptance:80, margin:55, stability:70, speed:60 } },
  ]}
  onOfferClick={(offer) => console.log('Selected:', offer)}
  size={280}
/>
```

### SmartMessageComposer
```jsx
<SmartMessageComposer
  dossier={currentDossier}
  client={currentClient}
  onSend={({ channel, message }) => sendMessage(channel, message)}
  anthropicEnabled={true}
/>
```

### ArkActivityFeed
```jsx
<ArkActivityFeed
  onRefresh={() => fetch('/api/ark/activity').then(r => r.json())}
  autoRefresh={true}
/>
```

---

## Variables d'environnement requises

Pour `SmartMessageComposer` (génération ARK côté client) :
```
VITE_ANTHROPIC_API_KEY=sk-ant-...   ← uniquement si tu exposes ARK en frontend
```

Pour usage production : faire passer les appels Anthropic par ton backend `/api/ark/generate`.
Ne jamais exposer la clé API en frontend production.

---

## Notes techniques

- **Canvas** : ArkNeuralPulse, PartnerSolarSystem, DealFlowRiver, RiskDnaHelix utilisent `<canvas>` avec `requestAnimationFrame`. Les animations s'arrêtent automatiquement quand le composant est démonté (cleanup dans `useEffect`).
- **Dark mode** : tous les widgets utilisent `window.matchMedia('prefers-color-scheme')` et les CSS variables Tailwind. Ils s'adaptent automatiquement.
- **Responsive** : les props `width`/`height`/`size` acceptent n'importe quelle valeur. Pour du responsive, passe la largeur du container via `ResizeObserver` ou un hook `useElementSize`.
- **Données mock** : chaque widget a des données par défaut. En production, remplace par tes appels API.
- **Performances** : les widgets Canvas font du `ctx.clearRect` à chaque frame. Sur de nombreux composants simultanés, utilise `IntersectionObserver` pour pauser les animations hors viewport.
