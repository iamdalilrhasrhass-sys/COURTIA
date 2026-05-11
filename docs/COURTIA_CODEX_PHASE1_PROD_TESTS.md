# COURTIA — Phase 1 Tests Reels Production

Date : 1er mai 2026
Base : `codex/courtia-2m` depuis `origin/main` + audit Phase 0
Objectif : verifier les parcours production essentiels avant toute refonte.

## 1. Landing

- URL : `https://courtia.vercel.app/`
- Statut : OK, page visible, pas de page blanche.
- Titre document : `COURTIA — Le cockpit IA des courtiers`.
- Logo / marque : COURTIA visible, univers Aurora visible.
- CTA : `Essai gratuit 7 jours` visible.
- Console : aucune erreur bloquante capturee par le navigateur in-app.
- Probleme : ancien `C` encore visible dans le mockup produit de la landing. Deja classe P1 Phase 0.

## 2. Login demo

- URL : `https://courtia.vercel.app/login`
- Identifiant teste : `demo@courtiark.fr`
- Resultat initial : OK.
- Route apres login : `https://courtia.vercel.app/dashboard`
- Dashboard visible : oui, `Bonjour Test`, cockpit et empty state portefeuille visibles.
- Session / token : persistence confirmee par refresh dashboard OK.
- Refresh : OK, reste sur `/dashboard`.
- Console : aucune erreur bloquante capturee.
- Navigation apres login : menu mobile visible ; `Clients`, `Contrats`, `Taches`, `Analyses`, `Parametres` presents.

### Note importante rate limit

Apres plusieurs tests auth repetes (login, mauvais mot de passe, register, register pro), l'API auth production a renvoye :

- Status : `429 Too Many Requests`
- Payload : `{"error":"too_many_attempts","details":"10 tentatives max par 15 minutes"}`
- `Retry-After` observe : environ 10 a 11 minutes.

Impact UI :
- Le formulaire login affiche alors `Une erreur est survenue. Verifiez vos identifiants.`
- Ce message est trop vague pour un rate limit.

Decision :
- Login demo fonctionnel au premier passage.
- Le rate limit n'est pas considere comme P0 bloquant la refonte landing.
- Il est classe P1 Auth UX : mapper `429 too_many_attempts` vers un message francais clair.

## 3. Mauvais mot de passe

- Identifiants :
  - email : `demo@courtiark.fr`
  - mot de passe : mauvais mot de passe de test
- Message affiche : `Email ou mot de passe incorrect.`
- Statut : OK.
- Message technique visible : non.
- Console : aucune erreur bloquante capturee.

## 4. Register

- URL : `https://courtia.vercel.app/register`
- Page visible : oui.
- Formulaire lisible : oui.
- Champs detectes : `Prenom`, `Nom`, `votre@email.fr`, mot de passe.
- Creation email nouveau : OK.
- Compte test cree : `codex.phase1.1777648030280@example.com`
- Route apres inscription : `/dashboard`
- Dashboard visible : oui, `Bonjour Codex`.
- Console : aucune erreur bloquante capturee.
- Mot de passe du compte test : non documente volontairement.

## 5. Register Pro

- URL : `https://courtia.vercel.app/register?plan=pro`
- Badge Pro visible : oui, `Offre Pro selectionnee — Essai gratuit 7 jours`.
- Query param : OK, pas de bug observe.
- Test doublon : email de test deja cree reutilise.
- Message affiche : `Cette adresse email est deja utilisee. Connectez-vous ou utilisez une autre adresse.`
- Message technique visible : non.
- Console : aucune erreur bloquante capturee.

## 6. Dashboard

- URL reelle : `https://courtia.vercel.app/dashboard`
- Statut : OK apres login.
- Route `/app/dashboard` : non declaree cote React ; Vercel sert l'index mais l'application redirige via wildcard.
- Sidebar/menu : OK en viewport navigateur in-app, mode mobile avec bouton `Ouvrir le menu`.
- Navigation visible :
  - Tableau de bord
  - Clients
  - Contrats
  - Taches
  - REACH
  - Academy
  - Documents
  - Browser Pilot
  - Analyses
  - Parametres
  - Abonnement
- Refresh : OK.
- Crash : aucun observe.

## 7. Routes privees non connecte

| Route testee | Resultat | Commentaire |
|---|---|---|
| `/dashboard` | redirection `/login?next=%2Fdashboard` | OK |
| `/clients` | redirection `/login?next=%2Fclients` | OK |
| `/contrats` | redirection `/login?next=%2Fcontrats` | OK |

- Page blanche : non.
- Message technique : non.
- Console : aucune erreur bloquante capturee.

## 8. Admin

### Non connecte

- URL : `https://courtia.vercel.app/admin`
- Resultat : redirection vers `/login`.
- Page blanche : non.
- Console : aucune erreur bloquante capturee.

### Broker connecte

- Test complet broker connecte : non finalise a cause du rate limit auth declenche pendant la batterie de tests.
- Risque deja confirme par code et par bundle : l'Admin Center appelle encore les endpoints sans prefixe `/super`.

### Appels API Admin

Endpoints observes dans le bundle production :
- `/api/admin/analytics`
- `/api/admin/users`
- `/api/admin/users/:id`
- `/api/admin/impersonation/logs`
- `/app/dashboard`

Endpoints backend reels pour le super admin :
- `/api/admin/super/analytics`
- `/api/admin/super/users`
- `/api/admin/super/users/:id`
- `/api/admin/super/impersonation/logs`

Probleme confirme :
- Le frontend Admin et le backend Super Admin sont desalignes.
- Sans token, les deux familles renvoient 401, ce qui masque le probleme.
- Avec token super_admin, les pages Admin risquent de refuser ou de ne pas charger les donnees.

## 9. API

| Endpoint | Resultat |
|---|---|
| `https://api.courtiark.fr/api/health` | 200 OK |
| `https://api.courtiark.fr/health` | 200 OK |
| `https://courtia.vercel.app/api/health` | 200 OK |

Backend health :
- Status : OK.
- API : `crm-assurance-backend`
- Version : `1.0.0`

## 10. Bundle / Console

- Console bloquante landing : aucune capturee.
- Console bloquante login : aucune capturee.
- Console bloquante register : aucune capturee.
- Console bloquante dashboard : aucune capturee.
- Console bloquante admin non connecte : aucune capturee.
- Bundle contient encore `/app/dashboard` et endpoints Admin non alignes.

## 11. Decision

### P0 bloquant avant refonte landing

Non pour les parcours landing / login initial / register / dashboard.

### P0 separe

Admin Center :
- Le mismatch `/api/admin/analytics` vs `/api/admin/super/analytics` reste un P0 Admin.
- Il ne bloque pas la refonte landing.
- Il doit etre corrige en phase Admin dediee avant de declarer la plateforme 100 % prete.

### P1

- Mapper le rate limit auth `429 too_many_attempts` vers un message clair :
  `Trop de tentatives. Reessayez dans quelques minutes.`
- Supprimer l'ancien `C` des mockups landing.
- Ne plus utiliser `/app/dashboard`.

### Autorisation

Autorisation de passer a la Phase 2 Landing :
- oui, car landing, login initial, register, register Pro et dashboard ont ete valides.
- avec prudence : ne pas toucher auth/backend/Stripe/impersonation.

