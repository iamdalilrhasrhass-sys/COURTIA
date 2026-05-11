# COURTIA — Phase 2 Landing Premium

## 1. Objectif
Transformer la landing COURTIA en page SaaS verticale plus commerciale, plus longue, plus cohérente avec l’univers Aurora Bubble C et plus compréhensible pour un courtier français.

## 2. Problèmes corrigés
- Hero initial trop simple et trop haut.
- Storytelling métier insuffisant.
- ARK trop abstrait.
- Parcours quotidien du courtier absent.
- Justification de l’offre Pro à 159 EUR HT/mois trop faible.
- Lien `/contact` supprimé car la route React n’existe pas.
- Anciens logos texte `C` supprimés dans les mockups.
- Première passe Phase 2 jugée visuellement trop faible : hero mobile retravaillé avec fond plus noir, CTA visibles, badge lisible et mini-cockpit au-dessus de la ligne de flottaison.
- Discours essai Pro clarifié : 0 EUR aujourd’hui, carte demandée pour activer l’essai et sécuriser l’accès, annulation en ligne avant la fin des 7 jours.
- Reprise Phase B : structure visuelle jugée encore trop simple et trop “template”.
- Reprise Phase B : transitions entre sections rendues plus continues, suppression des ruptures de bande trop visibles.
- Reprise Phase B : pricing Starter et Pro retravaillés pour paraître plus premium, moins “prix blanc banal”.
- Reprise critique du 1er mai 2026 : landing jugée encore trop faible visuellement.
- Nouvelle structure : moins de blocs collés, plus de narration continue, plus de rôle central pour le logo Aurora Bubble C.
- Hero recentré sur l’impact immédiat : logo comme source de lumière, titre lisible, CTA Pro visible, réassurance `0 € aujourd’hui / 7 jours / annulation en ligne`.
- Pricing reconstruit pour vendre la valeur avant le prix et pousser Pro comme choix évident.
- Reprise finale après feedback : la landing devient une seule scène continue, avec ciel d’aurore boréale fixe et Bubble C canonique en filigrane permanent.
- Suppression de la sensation de “pages cassées” : les sections ne sont plus séparées par de grosses ruptures mais traversent un même univers visuel.

## 3. Sections ajoutées
- Hero premium.
- Bande de crédibilité.
- Problème courtier.
- Coût invisible.
- Solution COURTIA.
- ARK, IA métier.
- Workflow quotidien.
- Cockpit produit.
- Fonctionnalités.
- Avant / Après.
- Pourquoi pas un CRM généraliste.
- Tarifs.
- Réassurance.
- FAQ.
- CTA final.

## 4. Composants modifiés
- `frontend/src/pages/LandingPublic.jsx`
- `frontend/src/components/FloatingProductMockup.jsx`
- `frontend/src/components/DashboardMockup.jsx`
- `scripts/courtia_landing_audit.py`

### Reprise Phase B — Landing 3D scroll
- Ajout d’un fond `courtia-flow` continu sur toute la page.
- Ajout d’un rail Aurora vertical subtil pour donner une narration au scroll.
- Ajout d’un indicateur de progression discret.
- Cartes `GlassCard` enrichies avec bordure liquide et hover 3D léger.
- Hero cockpit enrichi par des signaux flottants : relances, échéances, opportunité.
- Tarifs : Starter reçoit le même soin premium que Pro, avec essai 7 jours, 0 EUR aujourd’hui, puis 89 EUR HT/mois après le 7e jour.
- Tarifs : Pro conserve le wording obligatoire “0 € aujourd’hui, puis 159 € HT/mois après le 7e jour” et l’annulation en ligne.

### Reprise critique — Landing cinematic simplifiée
- Suppression de l’ancienne pile très longue de sections/cartes au profit d’un flux plus premium et plus lisible.
- Ajout d’un système visuel autour du logo canonique : orb central, rails, halos, panneaux glass et signaux métier.
- Ajout d’un hero plus dense mais plus maîtrisé sur mobile : CTA principal visible rapidement, réassurance en trois blocs, mockup lourd remplacé par une scène logo plus stable.
- Cockpit produit remplacé par une preview compacte, assumée comme marketing, sans données client réelles.
- FAQ et réassurance conservées mais resserrées pour réduire l’effet “template”.

### Reprise finale — Une seule scène Aurora
- Ajout d’un ciel Aurora fixe (`aurora-sky`) couvrant toute la landing.
- Ajout d’un Bubble C canonique en watermark permanent, derrière le contenu, pour que tout l’écosystème tourne visuellement autour du logo officiel.
- Remplacement des ruptures de section par des halos continus et subtils.
- Optimisation du composant `CourtiaBubbleLogo` : quand `animated=false`, les animations SVG internes sont désactivées pour réduire le coût visuel sur les mini-logos.

## 5. Ancien logo supprimé
Audit statique OK :
- aucun ancien `>C<` détecté dans `FloatingProductMockup.jsx`,
- aucun ancien `>C<` détecté dans `DashboardMockup.jsx`,
- logo Aurora Bubble C utilisé dans les mockups.

## 6. CTA vérifiés
- `/register`
- `/register?plan=pro`
- `/login`
- `mailto:contact@courtiark.fr`

Aucun lien `/contact` restant dans la landing.

## 6.1 Stratégie essai Pro intégrée
- Starter : entrée simple, non positionnée comme offre principale.
- Pro : offre recommandée, 159 EUR HT/mois, essai gratuit 7 jours.
- Micro-réassurance : “Essai gratuit 7 jours — 0 € aujourd’hui — annulation en ligne.”
- Mention Pro : carte demandée pour activer l’essai et sécuriser l’accès.
- Annulation : décision CEO = simple, en ligne, sans recommandé obligatoire.
- Stripe Checkout : à prévoir en Phase Billing dédiée, pas codé en Phase 2.

## 7. Tests
- `python3 scripts/courtia_landing_audit.py` : OK.
- Navigateur local `http://127.0.0.1:5174/` : landing visible, hero visible, mini-cockpit visible, console sans erreur.
- Navigateur local Phase B : hero mobile/current viewport relu après animation, CTA visible, console 0 erreur.
- Navigateur local Phase B : section tarifs relue via navigation mobile, Starter et Pro visibles, console 0 erreur.
- Navigateur local `/login` : page visible, console sans erreur.
- Navigateur local `/register` : page visible, console sans erreur.
- Navigateur local `/register?plan=pro` : badge Pro visible, console sans erreur.
- Production Vercel Phase B `/` : commit servi, hero visible, nouveaux textes Starter/Pro détectés, console 0 erreur.
- Production Vercel Phase B `/register?plan=pro` : CTA Pro et bloc 0 EUR visibles, console 0 erreur.
- Production Vercel Phase B `/register` : funnel Starter visible, console 0 erreur.
- Production Vercel Phase B `/login` : page visible, console 0 erreur.
- Reprise critique locale : `npm run build` OK.
- Reprise critique locale : `npm run test` OK, 29 tests passés.
- Reprise critique locale : `python3 scripts/courtia_qa_audit.py` OK, 0 P0/P1.
- Reprise critique locale : in-app browser DOM OK sur `/`, hero/CTA/pricing/0 EUR détectés.
- Limite reprise critique : capture screenshot in-app browser indisponible par timeout CDP ; le contrôle DOM, build et tests sont OK.
- Reprise finale : `npm run build` OK.
- Reprise finale : `npm run test` OK, 29 tests passés.
- Reprise finale : `python3 scripts/courtia_qa_audit.py` OK, 0 P0/P1.

## 8. Build
- `npm run build` : OK.
- Warning restant : chunk principal supérieur à 500 kB. Non bloquant Phase 2, à traiter en optimisation P2 par découpage dynamique si nécessaire.
- `npm run test` : 29 tests OK.
- Warnings Vitest/Vite existants : options `esbuild` dépréciées par le plugin React/Babel.

## 9. Risques restants
- Production Vercel validée après push du commit Phase B.
- Admin Center toujours désaligné avec le backend : frontend `/api/admin/analytics` et `/api/admin/users`, backend réel `/api/admin/super/*`.
- Le hero et les sections ont été vérifiés dans l’in-app browser ; un contrôle desktop large est encore recommandé avant push.
- Le wording billing est commercial et non juridique. Les CGV et le checkout devront être validés avant encaissement réel.
- La landing utilise davantage de motion Framer. Le rendu reste léger, mais une passe performance P2 pourra découper le bundle principal.

## 10. Prochaine phase
Phase 3 Auth : ne modifier que si un écart visuel ou UX est confirmé, sans casser le login/register validé en Phase 1.

Phase Billing/Onboarding future : SIRET, ORIAS, cabinet, checkout abonnement avec essai 7 jours, consentement explicite, webhooks et annulation en ligne.
