# Design System — Aurora Bubble C

> **Date :** 10 Mai 2026
> **Version :** 1.0 — Guide d'implémentation V2
> **Identité :** Cockpit sombre premium pour courtiers en assurance

---

## 1. Identité Visuelle

**Direction :** Cockpit intelligent, sombre, premium. Ni dashboard fade, ni dark mode générique.

- Fond noir bleuté profond
- Halos irisés (cyan, violet, bleu) en arrière-plan
- Bulles translucides subtiles
- Effets de verre (glassmorphism) léger
- Reflets, pas d'opacité lourde
- Typographie Inter, lisible, professionnelle
- Densité cockpit : informations visibles sans surcharge

**Interdictions :**
- Cartes opaques et fades
- Gris administratif
- Couleurs criardes
- Effets cheap
- Incohérences entre pages

---

## 2. Palette Couleurs

### 2.1 Fonds

| Token | Usage | Valeur |
|-------|-------|--------|
| `--aurora-bg-primary` | Fond principal | `#050510` |
| `--aurora-bg-secondary` | Fond secondaire | `#080818` |
| `--aurora-bg-sidebar` | Fond sidebar | `#080808` |
| `--aurora-bg-card` | Fond carte | `rgba(255,255,255,0.03)` |
| `--aurora-bg-card-hover` | Fond carte hover | `rgba(255,255,255,0.06)` |
| `--aurora-bg-input` | Fond input | `rgba(255,255,255,0.05)` |

### 2.2 Texte

| Token | Usage | Valeur |
|-------|-------|--------|
| `--aurora-text-primary` | Texte principal | `#FFFFFF` |
| `--aurora-text-secondary` | Texte secondaire | `#9CA3AF` |
| `--aurora-text-muted` | Texte atténué | `#6B7280` |
| `--aurora-text-dim` | Texte très discret | `#4B5563` |

### 2.3 Bordures

| Token | Usage | Valeur |
|-------|-------|--------|
| `--aurora-border` | Bordure standard | `rgba(255,255,255,0.06)` |
| `--aurora-border-light` | Bordure légère | `rgba(255,255,255,0.10)` |
| `--aurora-border-accent` | Bordure active | `rgba(91,77,245,0.40)` |

### 2.4 Accents

| Token | Usage | Valeur |
|-------|-------|--------|
| `--aurora-accent` | Accent principal (violet) | `#5B4DF5` |
| `--aurora-accent-cyan` | Accent cyan (halos) | `#22D3EE` |
| `--aurora-accent-blue` | Accent bleu | `#3B82F6` |
| `--aurora-accent-violet` | Accent violet profond | `#7C3AED` |

### 2.5 Sémantique

| Token | Usage | Valeur |
|-------|-------|--------|
| `--aurora-success` | Succès | `#22C55E` |
| `--aurora-warning` | Attention | `#F59E0B` |
| `--aurora-danger` | Danger | `#EF4444` |
| `--aurora-ark` | ARK IA (violet vif) | `#8B5CF6` |

### 2.6 Dégradés de fond (halos)

```css
/* Halo violet (gauche) */
.aurora-halo-violet {
  position: fixed;
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%);
  top: -200px; left: -200px;
  pointer-events: none;
}

/* Halo cyan (droite) */
.aurora-halo-cyan {
  position: fixed;
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%);
  bottom: -100px; right: -150px;
  pointer-events: none;
}
```

---

## 3. Composants Standards

### 3.1 Boutons

| Variante | Fond | Texte | Bordure | Hover |
|----------|------|-------|---------|-------|
| **Primary** | `--aurora-accent` | Blanc | Aucune | `#6B5EF5` |
| **Secondary** | Transparent | `--aurora-text-primary` | `--aurora-border-light` | `rgba(255,255,255,0.05)` |
| **Ghost** | Transparent | `--aurora-text-secondary` | Aucune | `rgba(255,255,255,0.05)` |
| **Danger** | `rgba(239,68,68,0.15)` | `--aurora-danger` | `rgba(239,68,68,0.25)` | `rgba(239,68,68,0.25)` |
| **ARK** | `rgba(139,92,246,0.12)` | `--aurora-ark` | `rgba(139,92,246,0.25)` | `rgba(139,92,246,0.20)` |

Dimensions : `py-2 px-4`, `rounded-lg`, `text-sm font-medium`

### 3.2 Cartes

```css
.aurora-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(12px);
}

.aurora-card:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.10);
}
```

### 3.3 Badges

| Type | Fond | Texte |
|------|------|-------|
| **Default** | `rgba(255,255,255,0.08)` | `--aurora-text-secondary` |
| **Success** | `rgba(34,197,94,0.12)` | `--aurora-success` |
| **Warning** | `rgba(245,158,11,0.12)` | `--aurora-warning` |
| **Danger** | `rgba(239,68,68,0.12)` | `--aurora-danger` |
| **ARK** | `rgba(139,92,246,0.12)` | `--aurora-ark` |
| **Priority-High** | `rgba(239,68,68,0.15)` | `--aurora-danger` |

Dimensions : `px-2 py-0.5`, `rounded-md`, `text-xs font-semibold`

### 3.4 Inputs

```css
.aurora-input {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px;
  padding: 8px 12px;
  color: white;
  font-size: 13px;
}

.aurora-input:focus {
  border-color: rgba(91,77,245,0.40);
  outline: none;
  box-shadow: 0 0 0 2px rgba(91,77,245,0.15);
}
```

### 3.5 Tableaux

```css
.aurora-table {
  width: 100%;
  border-collapse: collapse;
}

.aurora-table th {
  text-align: left;
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--aurora-text-muted);
  border-bottom: 1px solid var(--aurora-border);
}

.aurora-table td {
  padding: 12px 16px;
  font-size: 13px;
  border-bottom: 1px solid var(--aurora-border);
}

.aurora-table tr:hover td {
  background: rgba(255,255,255,0.02);
}
```

### 3.6 Modales & Drawers

```css
.aurora-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
}

.aurora-modal {
  background: #0A0A15;
  border: 1px solid var(--aurora-border-light);
  border-radius: 16px;
  max-width: 520px;
  margin: 10vh auto;
}

.aurora-drawer {
  position: fixed; right: 0; top: 0; bottom: 0;
  width: 420px;
  background: #0A0A15;
  border-left: 1px solid var(--aurora-border-light);
  z-index: 100;
}
```

### 3.7 Loaders & Skeletons

```css
.aurora-skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  animation: aurora-shimmer 1.5s infinite;
  border-radius: 6px;
}

@keyframes aurora-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 3.8 États Vides

```css
.aurora-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.aurora-empty-icon {
  width: 64px; height: 64px;
  background: rgba(139,92,246,0.08);
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
}

.aurora-empty-title {
  font-size: 16px; font-weight: 600;
  color: var(--aurora-text-primary);
  margin-bottom: 8px;
}

.aurora-empty-desc {
  font-size: 13px;
  color: var(--aurora-text-muted);
  max-width: 320px;
}
```

---

## 4. Composants Métier COURTIA

### 4.1 Carte Client

```
┌──────────────────────────────────┐
│ ● Jean DUPONT                    │
│ Particulier • Paris • Actif      │
│ ─────────────────────────────── │
│ 3 contrats    2 400€/an         │
│ Score : 85%   Risque : Faible   │
│ Dernier contact : 3 mai 2026    │
│ ⚡ ARK : Renouvellement J-60    │
└──────────────────────────────────┘
```

### 4.2 Bulle Client (vue alternative)

```
     ╭──────────╮
    ╱  Jean D.  ╲
   │  Actif      │
   │  3 contrats │
   │  Paris      │
    ╲  ⚡ ARK   ╱
     ╰──────────╯
```

### 4.3 Carte Contrat

```
┌──────────────────────────────────┐
│ Auto — Client Moreau             │
│ Compagnie A • Prime 1 200€/an   │
│ Échéance : 15 juin 2026         │
│ Statut : Actif                  │
│ ─────────────────────────────── │
│ [📄 Documents] [✏️ Modifier]    │
│ ⚡ ARK : Renouvellement J-35    │
└──────────────────────────────────┘
```

### 4.4 Carte Devis

```
┌──────────────────────────────────┐
│ Devis #247 — Client Berger       │
│ MRH Confort • 480€/an           │
│ Envoyé le 20 avril 2026         │
│ Statut : En attente             │
│ ─────────────────────────────── │
│ [📧 Relancer] [📋 Transformer]  │
│ ⚡ ARK : Relance suggérée       │
└──────────────────────────────────┘
```

### 4.5 Carte Relance

```
┌──────────────────────────────────┐
│ 🔴 Priorité haute                 │
│ Client Dupont — 47j sans contact │
│ Dernier contrat : MRH Confort    │
│ Risque perte : 72%               │
│ ─────────────────────────────── │
│ [📞 Appeler] [📧 Email]          │
│ [💡 Expliquer avec ARK]          │
└──────────────────────────────────┘
```

---

## 5. Composants IA Native ARK

### 5.1 ArkInsightCard

Carte de recommandation ARK principale. Fond légèrement violet, bordure ARK.

```
┌──────────────────────────────────┐
│ ⚡ ARK INSIGHT                    │
│                                   │
│ 3 contrats arrivent à échéance   │
│ cette semaine.                    │
│                                   │
│ Impact : 6 800 € de primes       │
│ Risque : Résiliation sans suivi  │
│                                   │
│ [📋 Morning Brief] [💡 Expliquer]│
└──────────────────────────────────┘
```

### 5.2 ArkPriorityCard

Carte de priorité quotidienne.

```
┌──────────────────────────────────┐
│ 🔴 URGENT                         │
│ Renouvellement Auto — Moreau     │
│ J-35 — 2 400€                    │
│ [📋 Préparer] [👤 Client]        │
└──────────────────────────────────┘
```

### 5.3 ArkPortfolioScore

Jauge de santé portefeuille.

```
┌──────────────────────────────────┐
│ SANTÉ PORTEFEUILLE               │
│ ████████████░░ 82%              │
│ +2% vs mois dernier              │
│ 3 alertes • 7 opportunités       │
└──────────────────────────────────┘
```

---

## 6. Navigation — Sidebar Accordéon

### 6.1 Structure

```
┌─────────────────────┐
│       COURTIA       │
├─────────────────────┤
│                     │
│ ▸ PILOTAGE      [>] │
│ ▸ PORTEFEUILLE  [>] │
│ ▸ ACTIONS       [>] │
│ ▸ ACQUISITION   [>] │
│ ▸ ARK IA        [>] │
│ ▸ CABINET       [>] │
│ ▸ RESSOURCES    [>] │
│                     │
├─────────────────────┤
│ ⚡ ARK Intelligence  │
├─────────────────────┤
│ 👤 Dalil Rhasrhass  │
│ dalil@courtia.fr    │
│              [⇥]    │
└─────────────────────┘
```

### 6.2 Groupe déplié

```
┌─────────────────────┐
│ ▾ PILOTAGE      [v] │
│   Tableau de bord   │
│   Morning Brief     │
│   Rapports          │
│   Analytics         │
├─────────────────────┤
│ ▸ PORTEFEUILLE  [>] │
│ ...                 │
└─────────────────────┘
```

### 6.3 Règles de navigation

- **Largeur :** 240px desktop
- **Fond :** `#080808`
- **Bordures :** `rgba(255,255,255,0.06)`
- **Groupe actif :** Fond `rgba(91,77,245,0.06)`, bordure gauche `2px solid #5B4DF5`
- **Sous-lien actif :** Fond `rgba(91,77,245,0.10)`, texte violet
- **Chevron :** Rotation 90° à l'ouverture, animation 150ms
- **Mobile :** Drawer depuis la gauche, overlay sombre
- **Scroll :** Indépendant dans la sidebar si contenu long

### 6.4 Contenu des groupes

| Groupe | Sous-liens |
|--------|-----------|
| **PILOTAGE** | Tableau de bord, Morning Brief, Rapports, Analytics |
| **PORTEFEUILLE** | Clients, Contrats, Devis, Documents |
| **ACTIONS** | Tâches, Relances, Rendez-vous, Opportunités |
| **ACQUISITION** | Prospection, REACH, Partenaires, Commissions |
| **ARK IA** | Assistant ARK, Recommandations, Automatisations, Historique |
| **CABINET** | Équipe, Paramètres, Abonnement, Import |
| **RESSOURCES** | Academy, Aide, Feedback, Statut |

---

## 7. Règles UX

### Obligations

- ✅ Fond sombre cohérent sur TOUTES les pages
- ✅ Composants Aurora réutilisés partout (pas de CSS sauvage)
- ✅ ARK visible mais non intrusive
- ✅ États vides premium (jamais de page blanche)
- ✅ Transitions fluides (150-200ms)
- ✅ Responsive mobile (sidebar en drawer)
- ✅ Données crédibles (jamais d'écran vide)
- ✅ Navigation clavier (Cmd+K fonctionnel)

### Interdictions

- ❌ Aucune page "Page introuvable" sur les routes visibles
- ❌ Aucun composant non-Aurora (pas de mélange de design)
- ❌ Aucun placeholder brutal "Bientôt disponible"
- ❌ Aucune sidebar à 50 lignes
- ❌ Aucun fond blanc ou gris clair
- ❌ Aucune incohérence de couleur entre pages

---

## 8. Checklist de Validation

**Un écran COURTIA est valide uniquement si :**

- [ ] Fond sombre (`#050510` ou `#080818`)
- [ ] Halos Aurora visibles en arrière-plan
- [ ] Cartes avec fond `rgba(255,255,255,0.03)` et bordures subtiles
- [ ] Texte principal blanc, secondaire gris
- [ ] Boutons cohérents avec la palette
- [ ] Présence ARK appropriée (carte, badge, ou bouton selon contexte)
- [ ] Pas d'état vide brutal
- [ ] Données crédibles affichées
- [ ] Sidebar accordéon fonctionnelle
- [ ] Route active visible
- [ ] Aucune route dans la sidebar ne mène à 404
- [ ] Prix cohérents avec la grille officielle (89€ / 159€ / Sur devis)
- [ ] Composants réutilisés (pas de CSS unique par page)
- [ ] Transitions fluides
- [ ] Responsive testé (mobile sidebar en drawer)

---

*Document prêt pour implémentation. Prochaine étape : LOT 6 — Sidebar accordéon.*
