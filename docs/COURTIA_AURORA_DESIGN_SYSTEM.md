# COURTIA — Aurora Design System

## Logo officiel
**Aurora Bubble C** — C iridescent, membrane de savon, fond cosmique.

- **Wordmark** : "courtia." (minuscules, point dégradé)
- **Tagline** : "Une bulle d'intelligence pour celui qui protège."
- **Fichier source** : `courtia_bubble_C.html`

## Composants Aurora créés

| Composant | Fichier | Usage |
|-----------|---------|-------|
| CourtiaBubbleLogo | components/brand/CourtiaBubbleLogo.jsx | Logo principal (grand) |
| CourtiaWordmark | components/brand/CourtiaWordmark.jsx | Wordmark textuel |
| CourtiaBrandIntro | components/brand/CourtiaBrandIntro.jsx | Intro animée branding |
| CourtiaMiniLogo | components/brand/CourtiaMiniLogo.jsx | Logo miniature (navbar, sidebar) |
| CourtiaLogoLoader | components/brand/CourtiaLogoLoader.jsx | Loader animé Aurora |
| AuroraCard | components/brand/AuroraCard.jsx | Carte premium iridescente |
| AuroraButton | components/brand/AuroraButton.jsx | Bouton premium |
| AuroraBadge | components/brand/AuroraBadge.jsx | Badge de statut |
| AuroraDivider | components/brand/AuroraDivider.jsx | Séparateur visuel |
| AuroraEmptyState | components/brand/AuroraEmptyState.jsx | État vide premium |
| AuroraPageHeader | components/brand/AuroraPageHeader.jsx | En-tête de page |
| AuroraHalo | components/brand/AuroraHalo.jsx | Effet de halo lumineux |
| AuroraBackground | components/brand/AuroraBackground.jsx | Fond d'écran Aurora |
| AuroraTransition | components/brand/AuroraTransition.jsx | Transition animée |

## Règles visuelles
- Pas d'ancien logo violet (banni définitivement)
- Pas de surcharge — un seul rappel Aurora par page
- Pas d'animations lourdes
- Palette : fonds sombres, accents iridescents
- Admin Center : style cockpit propriétaire (pas marketing)

## Pages harmonisées (Batch 3)
- Landing ✅ (Phase 2 Codex : landing étendue 15 sections, hero mobile repris, pricing Pro clarifié)
- Login ✅ (Aurora déjà présent)
- Dashboard ✅ (cockpit Aurora)
- À faire : Clients, Contrats, Tâches, Rapports, Paramètres

## Landing Phase 2 — Règles ajoutées
- Le hero doit rester lisible sur mobile : CTA visibles, badge non tronqué, pas de mockup trop lourd avant le contenu principal.
- Le cockpit produit peut utiliser des données illustratives uniquement si elles sont indiquées comme aperçu ou démonstration.
- Le pricing Pro doit être clair : 159 EUR HT/mois, essai gratuit 7 jours, 0 EUR aujourd’hui, annulation en ligne.
- Aucun wording de piège commercial : pas de recommandé obligatoire, pas de fausse friction à la résiliation.
- La carte bancaire sera collectée uniquement via un checkout sécurisé dans une phase Billing dédiée, jamais directement par COURTIA.

## Phase 3 — Conversion premium
- Le pricing Pro doit vendre la valeur avant le prix : coût journalier, contrôle du portefeuille, essai clair.
- Le prix ne doit pas apparaître comme une simple ligne blanche froide ; utiliser un traitement Aurora premium sur l’offre principale.
- Les formulaires auth doivent parler cockpit et valeur métier, pas “compte” générique.
- Les funnels Starter et Pro doivent partager la même qualité visuelle ; Starter ne doit pas paraître low-cost, seulement plus simple.
- Les transitions entre sections doivent être continues : éviter les gros séparateurs ou bandes qui donnent l’impression de pages collées.

## Phase A — Validation production funnel
- Le premier écran du funnel Pro doit afficher rapidement la valeur : logo Aurora, titre cockpit, essai Pro, `0 €`, `7 jours`, annulation en ligne et CTA visible.
- Le CTA principal Pro reste `Activer mon essai Pro`.
- Le register classique conserve un niveau premium aligné via le funnel Starter.
- Le wording de collecte carte reste commercial et clair, mais l’intégration Stripe reste réservée à une phase Billing dédiée.

## Phase B — Landing 3D scroll premium
- La landing doit se lire comme une seule expérience continue, pas comme une pile de pages séparées.
- Les sections utilisent un fond `courtia-flow`, des halos progressifs et un rail Aurora subtil pour créer une narration au scroll.
- Les cartes utilisent une bordure liquide et un hover 3D léger ; l’effet doit rester sobre et lisible.
- Le hero peut afficher des signaux flottants métier, mais ils ne doivent jamais masquer le titre ni les CTA.
- Le pricing Starter reçoit un traitement premium, tout en restant une entrée volontairement plus simple que Pro.
- Pro reste l’offre poussée : plus lumineuse, badge recommandé, valeur journalière et wording essai clair.

## Phase C — Auth / funnel final
- Le login doit être un accès au cockpit, pas une simple page de formulaire.
- Les titres auth doivent vendre l’activation du cockpit : `Accédez à votre cockpit COURTIA`, `Activez votre cockpit Pro`, `Activez votre cockpit Starter`.
- Les panneaux d’essai doivent rester lisibles sur mobile : 0 EUR, 7 jours, annulation en ligne, CTA visible.
- Les champs SIRET / ORIAS et la carte bancaire restent hors formulaire actuel tant que le backend Billing/Onboarding n’est pas prêt.

## Phase D — Cockpit interne
- Le dashboard doit distinguer clairement les données réelles des aperçus de démonstration.
- Les pages métier doivent utiliser `AuroraPageHeader` et des CTA cohérents quand possible.
- Les fallbacks mock doivent être explicitement signalés à l’utilisateur.
- Les loaders métier doivent privilégier `CourtiaLogoLoader`.

## Interdictions
- Ancien logo violet
- Pastels excessifs
- Fête foraine multicolore
- Halo qui cache le contenu
