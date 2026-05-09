# COURTIA — RGPD & DPA (résumé opérationnel)

## Finalités
- gestion portefeuille courtier (clients, contrats, tâches, échéances)
- génération de documents métier (FIC, mandat, devoir de conseil)
- centralisation interactions (agenda, email, WhatsApp selon activation)

## Principes
- minimisation: seules les données utiles sont traitées
- séparation des secrets: tokens OAuth stockés côté backend uniquement
- chiffrement: secrets intégrations protégés par `ENCRYPTION_KEY`
- contrôle humain: ARK assiste, ne décide pas à la place du courtier

## Sous-traitants techniques
- hébergement applicatif/cloud
- Stripe (si abonnement activé)
- Google (si intégrations Google activées)
- Meta WhatsApp Cloud API (si activée)

## Droits des personnes
- accès, rectification, suppression, limitation, opposition selon cadre légal
- export des données via interfaces/exports disponibles

## Rétention
- conservation limitée au besoin opérationnel/réglementaire du cabinet
- suppression sur demande selon contraintes légales de conservation

## DPA
- un DPA contractuel doit être annexé pour les comptes cabinet
- ce document complète, sans remplacer, la politique de confidentialité
