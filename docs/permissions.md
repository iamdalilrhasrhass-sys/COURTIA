# COURTIA — Matrice des permissions cabinet V1

Cette matrice décrit les rôles cabinet introduits dans la V1. Elle complète le rôle plateforme `super_admin`, réservé à l’administration COURTIA.

## Rôles

- `owner` : propriétaire du cabinet, responsable équipe, billing et conformité.
- `manager` : responsable opérationnel, reporting et conformité.
- `broker` : courtier métier, gestion portefeuille et documents.
- `assistant` : support administratif, saisie et suivi opérationnel.
- `viewer` : lecture seule.
- `super_admin` : rôle plateforme COURTIA, hors cabinet.

## Matrice

| Action | owner | manager | broker | assistant | viewer | super_admin |
|---|---:|---:|---:|---:|---:|---:|
| Inviter / supprimer membre | oui | non | non | non | non | oui |
| Changer rôle cabinet | oui | non | non | non | non | oui |
| Modifier billing | oui | non | non | non | non | oui |
| Modifier conformité DDA | oui | oui | non | non | non | oui |
| Voir reporting cabinet | oui | oui | non | non | non | oui |
| Créer / éditer client | oui | oui | oui | oui | non | oui |
| Voir clients | oui | oui | oui | oui | oui | oui |
| Générer documents | oui | oui | oui | oui | non | oui |
| Envoyer e-signature | oui | oui | oui | non | non | oui |
| Configurer intégrations | oui | oui | non | non | non | oui |
| Voir commissions | oui | oui | limité | non | non | oui |

## Implémentation PR2

La PR2 livre les fondations suivantes :

- `cabinet_members` pour rattacher les utilisateurs à un cabinet.
- `cabinet_invitations` pour inviter un collaborateur via un token hashé.
- `onboarding_progress` pour suivre les étapes cabinet.
- Middleware backend `requireRole(...roles)`.
- Page `/equipe` pour consulter l’équipe et inviter un collaborateur.
- Page `/invite/:token` pour accepter une invitation.
- Page `/onboarding` pour le parcours cabinet V1.

## Sécurité

- Le token brut d’invitation n’est retourné qu’à la création.
- La base stocke uniquement `token_hash` et `token_preview`.
- Le rôle `super_admin` ne peut pas être attribué par invitation cabinet.
- Les routes mutantes d’équipe sont réservées au rôle `owner` ou à `super_admin`.
- Les invitations expirent après 7 jours.

## Limites V1

- COURTIA crée automatiquement un cabinet par défaut au premier accès PR2 si aucun rattachement n’existe.
- La logique multi-cabinet avancée reste volontairement hors périmètre de PR2.
- Le rôle broker verra ses propres commissions dans une PR ultérieure dédiée aux commissions.
