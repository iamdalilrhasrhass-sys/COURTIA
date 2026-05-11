# Inventaire Réel COURTIA — Mai 2026

> Document préparatoire à la refonte V2 IA native ARK.
> Inspecté depuis `/root/courtia` (dépôt maître déployé sur Vercel `courtiark` → `courtia.vercel.app`).

---

## 1. Stack technique

| Élément | Valeur |
|---------|--------|
| Frontend | React 18.2, Vite 5.0, JavaScript (JSX) |
| Styling | TailwindCSS + inline styles (mix non harmonisé) |
| Animation | Framer Motion |
| Icons | Lucide React |
| Bundler | Vite (`npm run build` → `frontend/dist/`) |
| API Proxy | Vercel rewrites → `https://api.courtiark.fr/api` |
| Backend | Node.js/Express, Render |
| Base de données | PostgreSQL via `crm_assurance` (table `users`) |
| Auth | JWT stateless (token en sessionStorage/localStorage) |
| Déploiement | Vercel (`courtia.vercel.app`) + Render |
| Domaine cible | `courtiark.fr`, `app.courtiark.fr` |

---

## 2. Arborescence utile (`frontend/src/`)

```
frontend/src/
├── App.jsx              ← Routeur principal (293 lignes)
├── main.jsx             ← Point d'entrée Vite
├── api/                 ← Services API (getAuthToken, sessionPolicy, etc.)
│   ├── sessionPolicy.js
│   ├── sessionUser.js
│   └── ...
├── components/
│   ├── Sidebar.jsx      ← Navigation (426 lignes)
│   ├── AdminRoute.jsx
│   ├── AdminLayout.jsx
│   ├── ProtectedRoute.jsx
│   ├── PaywallModal.jsx
│   ├── ErrorBoundary.jsx
│   ├── NotificationBell.jsx
│   ├── FeedbackButton.jsx
│   ├── brand/           ← Composants Aurora
│   │   ├── AuroraPageHeader.jsx
│   │   ├── AuroraCard.jsx
│   │   ├── AuroraButton.jsx
│   │   ├── AuroraBadge.jsx
│   │   ├── AuroraEmptyState.jsx
│   │   ├── AuroraDivider.jsx
│   │   ├── CourtiaLogoLoader.jsx
│   │   ├── CourtiaBubbleLogo.jsx
│   │   ├── CourtiaMiniLogo.jsx
│   │   └── RhasrhassSignature.jsx
│   └── ui/              ← Composants UI réutilisables
│       ├── GlassCard.jsx
│       ├── PremiumTable.jsx
│       ├── PremiumTabs.jsx
│       ├── PremiumSkeleton.jsx
│       ├── PremiumSection.jsx
│       ├── PremiumEmptyState.jsx
│       ├── AnimatedMetric.jsx
│       ├── AnimatedNumber.jsx
│       ├── Button.jsx
│       ├── Badge.jsx
│       ├── Input.jsx
│       ├── Select.jsx
│       ├── StatusPill.jsx
│       ├── TiltCard.jsx
│       ├── ScrollReveal3D.jsx
│       ├── CommandPalette.jsx
│       ├── BubbleOrb.jsx
│       ├── AuroraBackground.jsx
│       └── PageTransition.jsx
├── pages/               ← 60+ pages (voir routes)
├── lib/                 ← Utilitaires métier
│   ├── priorities.js
│   ├── scoring.js
│   ├── commissions.js
│   ├── roles.js
│   ├── sentry.js
│   ├── seo.js
│   ├── ark/             ← Logique IA
│   │   ├── client.js
│   │   └── cache.js
│   └── ...
├── stores/              ← Stores globaux
│   ├── authStore.js
│   ├── clientStore.js
│   ├── planStore.js
│   ├── partnerStore.js
│   ├── documentInboxStore.js
│   ├── browserPilotStore.js
│   └── reachStore.js
├── hooks/
│   └── useFeatureFlag.js
└── styles/
    ├── design-system.css
    └── tokens.css
```

---

## 3. Routes existantes

### 3.1 Routes publiques (non-authentifiées)

| Route | Composant | Statut |
|-------|-----------|--------|
| `/` | LandingPublic | ✅ |
| `/login` | LoginPage | ✅ |
| `/register` | LoginPage | ✅ |
| `/tarifs` | TarifsPublic | ✅ |
| `/demo` | DemoPublic | ✅ |
| `/contact` | ContactPublic | ✅ |
| `/securite` | SecurityPublic (TrustPages) | ✅ |
| `/rgpd` | RgpdPublic (TrustPages) | ✅ |
| `/changelog` | ChangelogPublic (TrustPages) | ✅ |
| `/roadmap` | RoadmapPublic (TrustPages) | ✅ |
| `/aide` | HelpPublic (TrustPages) | ✅ |
| `/status` | StatusPublic (TrustPages) | ✅ |
| `/legal/mentions-legales` | LegalMentionsLegales | ✅ |
| `/legal/confidentialite` | LegalConfidentialite | ✅ |
| `/legal/cookies` | LegalCookies | ✅ |
| `/legal/conditions-utilisation` | LegalConditionsUtilisation | ✅ |
| `/legal/cgv` | LegalCgv | ✅ |
| `/legal/dpa` | LegalDpa | ✅ |
| `/legal/sous-traitants` | LegalSubprocessors | ✅ |
| `/upload/:token` | PublicDocumentUpload | ✅ |
| `/invite/:token` | InviteAccept | ✅ |
| `/dev/ui` | DevUi | ✅ |

### 3.2 Routes authentifiées (avec Sidebar)

| Route | Composant | Statut |
|-------|-----------|--------|
| `/dashboard` | Dashboard | ✅ |
| `/morning-brief` | MorningBrief | ✅ |
| `/clients` | Clients | ✅ |
| `/clients/new` | ClientNew | ✅ |
| `/client/:id` | ClientDetail | ✅ |
| `/clients/:id` | ClientDetail | ✅ |
| `/clients/:id/edit` | ClientNew | ✅ |
| `/contrats` | Contrats | ✅ |
| `/contrats/new` | ContratNew | ✅ |
| `/taches` | Taches | ✅ |
| `/rapports` | Rapports | ✅ |
| `/parametres` | Parametres | ✅ |
| `/parametres/integrations` | Parametres | ✅ |
| `/equipe` | Equipe | ✅ |
| `/import` | ImportPortfolio | ✅ |
| `/academy` | Academy | ✅ |
| `/academy/*` | Academy | ✅ |
| `/documents` | Documents | ✅ |
| `/commissions` | Commissions | ✅ |
| `/browser-pilot` | BrowserPilot | ✅ |
| `/capitia` | Capitia | ✅ (ARK "chatbot") |
| `/analytics` | AnalyticsExecutive | ✅ |
| `/analyses` | AnalyticsExecutive | ✅ |
| `/abonnement` | Abonnement | ✅ |
| `/billing` | Billing | ✅ |
| `/billing/success` | PaiementSucces | ✅ |
| `/billing/cancel` | PaiementAnnule | ✅ |
| `/paiement-succes` | PaiementSucces | ✅ |
| `/paiement-annule` | PaiementAnnule | ✅ |
| `/onboarding/*` | Multi (Cabinet, Billing, Data) | ✅ |
| `/reach/*` | 7 pages Reach | ✅ |

### 3.3 Routes Admin

| Route | Composant |
|-------|-----------|
| `/admin` | AdminOverview |
| `/admin/users` | AdminUsers |
| `/admin/users/:id` | AdminUserDetail |
| `/admin/subscriptions` | AdminSubscriptions |
| `/admin/system` | AdminSystem |
| `/admin/logs` | AdminLogs |
| `/admin/support` | AdminSupport |
| `/admin/costs` | AdminCostsDashboard |
| `/admin/feedback` | AdminFeedback |
| `/admin/growth-leads` | AdminGrowthLeads (conditionnel) |

---

## 4. Routes manquantes (vs brief V2)

| Route attendue | Existe ? | Problème |
|----------------|----------|----------|
| `/devis` | ❌ | **Aucune route devis/quotes.** Critique. |
| `/relances` | ❌ | Aucune route |
| `/opportunites` | ❌ | Aucune route |
| `/assistant-ark` | ❌ | ARK est à `/capitia` (nom obscur) |
| `/partners` / `/partenaires` | ❌ | **Présent dans la Sidebar mais PAS dans le routeur → 404 !** |
| `/prospection` | ❌ | Aucune route |
| `/campagnes` | ❌ | `/reach/campaigns` existe mais sous REACH, pas autonome |

---

## 5. Pages manquantes ou vides

- **Devis** : inexistant. Pas de page, pas de route, pas de logique devis dans le frontend.
- **Relances** : inexistant.
- **Opportunités** : inexistant.
- **Assistant ARK** : `/capitia` existe mais le nom n'est pas clair ("ARK Intelligence" en sidebar).
- **Partenaires** : lien dans la sidebar qui renvoie 404.

---

## 6. Sidebar actuelle — analyse

### 6.1 Structure actuelle (13 items plats)

```
Tableau de bord
Clients
Contrats
Tâches
Rapports
Morning Brief
Paramètres
Équipe
─── ACQUISITION ───
REACH [Nouveau] (sous-menu conditionnel)
─── MODULES ───
Academy [Nouveau]
Documents
Commissions
Browser Pilot [Bêta]
Partenaires [Prospection]  ← 404 !
Analyses
Abonnement
```

### 6.2 Problèmes identifiés

1. **Pas d'accordéon** — 13 items plats, pas de hiérarchie visuelle
2. **Séparateurs faibles** — "ACQUISITION" et "MODULES" sont juste du texte, pas des groupes cliquables
3. **REACH conditionnel** — sous-items visibles uniquement si on est sur /reach/* (confusion UX)
4. **/partners = 404** — lien visible mais route inexistante
5. **ARK pas en évidence** — bouton en bas de sidebar, nommé "ARK Intelligence" qui mène à /capitia
6. **Pas de chevrons** — pas d'ouverture/fermeture de groupes
7. **Icône Users en double** — utilisée pour Clients ET Équipe

---

## 7. Prix — état réel

### 7.1 Dans Tarifs.jsx

| Plan | Prix affiché |
|------|-------------|
| Starter | 89€ |
| Pro | 159€ |
| Cabinet | 350€ |

### 7.2 Target du brief V2

| Plan | Prix cible |
|------|-----------|
| Starter | 89 € HT/mois |
| Pro | 159 € HT/mois |
| Cabinet/Premium | Sur devis |

**⚠️ Incohérence** : Cabinet affiche 350€ au lieu de "Sur devis".

---

## 8. Dashboard — analyse rapide

- KPIs : clients, contrats, CA, tâches, opportunités
- Cartes Aurora avec icônes colorées
- Sections : Vue d'ensemble, Priorités ARK, Activité récente
- Données chargées via API
- Design Aurora cohérent
- **Manque** : Morning Brief intégré (est une page séparée)

---

## 9. Morning Brief — analyse rapide

- 866 lignes — page la plus aboutie du produit
- Salutation personnalisée (Bonjour/Bonsoir)
- Date formatée FR
- Priorités du jour (haute/moyenne/basse)
- Alertes et recommandations ARK
- Relances, échéances, clients silencieux
- Boutons d'action rapide
- **Forces** : IA visible, structuré, premium
- **Faiblesses** : pas intégré au dashboard (page séparée)

---

## 10. Composants ARK existants

- `Capitia.jsx` — Interface ARK "chatbot" à `/capitia`
- `lib/ark/client.js` — Logique IA côté client
- `lib/ark/cache.js` — Cache des réponses ARK
- `lib/priorities.js` — Calcul des priorités
- `lib/scoring.js` — Scoring client
- Recommandations dans Morning Brief et Dashboard

**Limite** : ARK est un chatbot supplémentaire, pas une couche native intégrée partout.

---

## 11. Mocks et données de démo

- Pas de seed file visible dans le frontend
- Données de démo en base (`crm_assurance`)
- Compte démo : `demo@courtiark.fr` (mot de passe en DB)
- **Manque** : données crédibles pour tous les écrans (124 clients, 312 contrats, etc. comme demandé)

---

## 12. Problèmes UX/Design

| Problème | Impact |
|----------|--------|
| Sidebar plate, pas d'accordéon | Navigation confuse |
| /partners = 404 | Lien cassé visible |
| Pas de page Devis | Fonction métier critique absente |
| Pas de page Relances | Fonction métier absente |
| Pas de page Opportunités | Fonction métier absente |
| ARK nommé "Capitia" dans l'URL | Pas clair pour l'utilisateur |
| 350€ vs "Sur devis" | Incohérence pricing |
| Mix inline styles + Tailwind | Code non harmonisé |
| Pas de composant `ArkInsightCard` dédié | ARK pas assez visible |
| Dashboard et Morning Brief séparés | Devrait être unifié |

---

## 13. Problèmes techniques

- **174+ fichiers non commités** (connu via memory)
- **Duplication massive** : `/root/courtia`, `/root/courtia_new`, `/root/courtia-repo`, `/root/courtia2`, `/root/courtia_fresh` — 6 copies !
- `vercel.json` dans `/root/courtia_new` pointe vers IP VPS au lieu de `api.courtiark.fr`
- Pas de tests automatisés visibles (quelques `.test.js` isolés)
- Pas de CI/CD documenté

---

## 14. Priorités d'intervention

| # | Action | Urgence |
|---|--------|---------|
| 1 | Corriger `/partners` → 404 | 🔴 Immédiat |
| 2 | Créer page `/devis` | 🔴 Critique |
| 3 | Créer page `/relances` | 🔴 Critique |
| 4 | Créer page `/opportunites` | 🔴 Critique |
| 5 | Renommer `/capitia` → `/assistant-ark` | 🟠 Important |
| 6 | Refondre Sidebar en accordéon 7 univers | 🟠 Important |
| 7 | Harmoniser prix Cabinet → "Sur devis" | 🟠 Important |
| 8 | Intégrer Morning Brief au Dashboard | 🟡 Moyen |
| 9 | Ajouter données de démo crédibles | 🟡 Moyen |
| 10 | Nettoyer duplication de dépôts | 🟡 Moyen |

---

*Fin de l'inventaire réel. Document suivant : Benchmark concurrentiel.*
