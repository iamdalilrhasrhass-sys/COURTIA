# COURTIA — RGPD / DPA

Mise à jour : 9 mai 2026.

## Positionnement
COURTIA est un SaaS B2B pour courtiers en assurance français. Le cabinet reste responsable de ses données clients et COURTIA agit comme sous-traitant technique selon le périmètre contractuel.

## Données traitées
- Utilisateurs cabinet : identité professionnelle, email, rôle, préférences.
- Clients/prospects : identité, coordonnées, statut, notes, contrats, tâches.
- Contrats : compagnie, numéro, prime annuelle, échéances, statut.
- Documents DDA : FIC, mandat, devoir de conseil, attestations, statuts.
- Intégrations : métadonnées agenda/email/WhatsApp si le cabinet les active.
- ARK : recommandations structurées, coûts et traces d’exécution.
- Audit log : action, entité, utilisateur, date, contexte minimal.

## Finalités
- Gestion du portefeuille courtier.
- Priorisation quotidienne via Morning Brief et ARK.
- Traçabilité DDA et documents métier.
- Communication client via email/WhatsApp si connectés.
- Facturation, support, sécurité et administration.

## Base et consentement
- Prospection B2B : intérêt légitime, avec opt-out.
- Intégrations Google/Microsoft/Meta : activation explicite par l’utilisateur/cabinet.
- IA ARK : assistance métier indicative, validation humaine obligatoire.

## DPA
Le DPA COURTIA est prévu dans le parcours conformité. Pendant la bêta, il est fourni sur demande ou via la page conformité lorsque le module Yousign est configuré.

## Droits utilisateurs
Les demandes d’accès, rectification, suppression, limitation, portabilité ou opposition sont adressées au support COURTIA. Les exports RGPD doivent être limités au périmètre cabinet autorisé.

## Conservation
- Données cabinet/client : durée contractuelle + obligations légales applicables.
- Documents DDA : conservation longue selon besoin de preuve, cible 5 ans minimum.
- Logs techniques : durée limitée et proportionnée.
- Tokens intégrations : suppression à la déconnexion du service.

## Sous-traitants
Voir `docs/SECURITY_OVERVIEW.md` et les pages publiques `/securite` et `/rgpd`.

## Limites
COURTIA aide à structurer, tracer et prioriser. L’outil ne garantit pas à lui seul la conformité RGPD/DDA complète du cabinet ; le courtier reste responsable de ses décisions et de ses obligations professionnelles.
