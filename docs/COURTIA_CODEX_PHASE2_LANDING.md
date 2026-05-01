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

## 5. Ancien logo supprimé
Audit statique OK :
- aucun ancien `>C<` détecté dans `FloatingProductMockup.jsx`,
- aucun ancien `>C<` détecté dans `DashboardMockup.jsx`,
- logo Aurora Bubble C utilisé dans les mockups.

## 6. CTA vérifiés
- `/register`
- `/register?plan=pro`
- `/login`
- `mailto:contact@courtia.fr`

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

## 8. Build
- `npm run build` : OK.
- Warning restant : chunk principal supérieur à 500 kB. Non bloquant Phase 2, à traiter en optimisation P2 par découpage dynamique si nécessaire.
- `npm run test` : 29 tests OK.
- Warnings Vitest/Vite existants : options `esbuild` dépréciées par le plugin React/Babel.

## 9. Risques restants
- La production Vercel n’est pas modifiée tant que le commit n’est pas poussé.
- Test production post-déploiement encore requis après push.
- Admin Center toujours désaligné avec le backend : frontend `/api/admin/analytics` et `/api/admin/users`, backend réel `/api/admin/super/*`.
- Le hero et les sections ont été vérifiés dans l’in-app browser ; un contrôle desktop large est encore recommandé avant push.
- Le wording billing est commercial et non juridique. Les CGV et le checkout devront être validés avant encaissement réel.
- La landing utilise davantage de motion Framer. Le rendu reste léger, mais une passe performance P2 pourra découper le bundle principal.

## 10. Prochaine phase
Phase 3 Auth : ne modifier que si un écart visuel ou UX est confirmé, sans casser le login/register validé en Phase 1.

Phase Billing/Onboarding future : SIRET, ORIAS, cabinet, checkout abonnement avec essai 7 jours, consentement explicite, webhooks et annulation en ligne.
