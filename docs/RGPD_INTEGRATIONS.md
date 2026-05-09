# RGPD — Intégrations COURTIA (Agenda / WhatsApp / Email)

## Principes appliqués

- minimisation des données (aperçu, timestamps, IDs externes)
- finalité explicite: pilotage relation client courtier
- consentement et action explicite utilisateur pour connexion OAuth
- déconnexion possible dans `/parametres`
- secrets stockés côté backend, jamais dans le front

## Base légale (B2B)

- intérêt légitime opérationnel du cabinet
- usage strictement professionnel des données
- information des utilisateurs/collaborateurs cabinet

## Mesures techniques V1

- tokens chiffrés si `ENCRYPTION_KEY`
- webhook WhatsApp avec verify token
- routes protégées par JWT (hors callbacks/webhook)
- masquage des secrets dans les réponses API

## IA / ARK — cadre d'usage

- ARK assiste le courtier, ne remplace pas son jugement professionnel.
- recommandations indicatives, validation humaine obligatoire.
- pas de décision automatique sensible sans validation explicite.
- COURTIA aide à structurer/prioriser, ne garantit pas la conformité réglementaire complète à lui seul.

## Recommandations exploitation

- documenter la finalité dans politique interne cabinet
- limiter conservation des interactions à la durée utile
- respecter demandes de suppression/rectification
- éviter collecte email personnelle hors contexte pro
