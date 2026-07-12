# Courtiark Suisse — lancement permission-first

Ce dossier contient le premier lot vérifié de cabinets romands et le protocole de prise de contact. Il ne constitue pas une autorisation d'envoi.

## Règle d'exécution

- `do_not_email=true` tant qu'aucun consentement explicite n'est consigné.
- Premier contact : appel humain, introduction réseau, événement ou LinkedIn non automatisé.
- Demander l'autorisation d'envoyer la fiche Courtiark et la démo.
- Consigner la date, le canal, la personne et le texte d'autorisation.
- Passer `permission_status` à `obtained` avant tout e-mail commercial.
- Chaque e-mail identifie l'émetteur et permet une opposition simple et gratuite.
- Toute opposition passe immédiatement en liste de suppression.

## Sources juridiques officielles

- PFPDT : https://www.edoeb.admin.ch/fr/publicite-et-marketing
- OFCOM : https://www.bakom.admin.ch/fr/pollupostage
- OFCOM : https://www.bakom.admin.ch/fr/quand-les-envois-en-masse-sont-ils-autorises

En Suisse, une adresse professionnelle publiée ne vaut pas opt-in. L'exception concerne un client existant et des services analogues. Plusieurs destinataires peuvent déjà constituer un envoi de masse.

## Fichiers

- `prospects_romandie_2026-07-12.csv` : 15 cabinets vérifiés, tous bloqués pour l'e-mail par défaut.
- `call_permission_script.md` : script d'appel humain court.
- `email_after_optin.md` : séquence utilisable uniquement après accord.

## Cible du premier sprint

1. Appeler les 5 prospects P1 les plus proches du profil multi-utilisateur.
2. Obtenir cinq autorisations d'envoi, pas cinq ventes forcées.
3. Envoyer la fiche et le lien `https://courtiark.fr/demo?market=CH` après accord.
4. Mesurer : autorisations, réponses, démos prévues, objections et refus.

Les promesses « 312 000 CHF/an » et « conformité FINMA en un clic » sont interdites dans cette séquence tant qu'une méthodologie vérifiable et une validation juridique ne les étayent pas.
