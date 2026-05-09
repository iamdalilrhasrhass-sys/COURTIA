# New Cabinet Setup — COURTIA

## Objectif
Dupliquer rapidement un lancement cabinet avec un parcours standardisé.

## Étapes opérationnelles
1. Créer le compte propriétaire cabinet (`owner` ou `broker` initial).
2. Vérifier le profil cabinet dans `/onboarding`:
- nom cabinet
- ville
- spécialités
- nombre de collaborateurs
3. Importer le portefeuille initial via `/import`:
- preview
- mapping
- confirmation
4. Configurer les intégrations dans `/parametres`:
- Google Agenda
- WhatsApp Business
- Gmail / Outlook
5. Lancer Morning Brief pour première priorisation.
6. Vérifier accès rôles:
- broker: pas d’accès admin
- super_admin: accès admin complet
7. Configurer abonnement (`/billing`) et portail client Stripe.

## Smoke cabinet minimum
```bash
npm --prefix backend run qa:prod-smoke
```
Contrôles obligatoires:
- `/api/api = 0`
- `auth 429 = 0`
- login/logout OK
- dashboard/clients/fiche/contrats/tâches/rapports/morning-brief OK

## Notes architecture multi-cabinet
- modèle actuel orienté `owner_user_id` (organization_profiles).
- cible V2: `tenant_id` explicite pour chaque ressource métier sensible.
