# COURTIA — Script démo courtier 10-15 minutes

Objectif: montrer COURTIA comme un cockpit métier crédible, sans promettre une intégration active si la configuration n'est pas branchée.

## 1. Accueil public

- Ouvrir `https://courtia.vercel.app`.
- Positionner COURTIA: cockpit courtier pour gagner du temps, structurer la conformité et piloter les relances.
- Montrer rapidement les liens sécurité, RGPD, aide, status et tarifs.

Phrase utile: "COURTIA ne remplace pas votre jugement de courtier, il organise les signaux et prépare les actions à valider."

## 2. Problème courtier

- Beaucoup de portefeuilles vivent dans Excel, mails, agendas et fichiers séparés.
- Les échéances, relances, pièces DDA et commissions demandent du suivi manuel.
- COURTIA centralise le portefeuille et transforme les données en actions.

## 3. Login

- Se connecter avec le compte de démonstration prévu.
- Vérifier que le cockpit charge sans message technique.

## 4. Dashboard

- Montrer les KPI portefeuille et le bloc "Valeur générée ce mois-ci".
- Dire que les estimations restent prudentes et s'affinent avec l'usage.
- Cliquer vers les clients ou le Morning Brief.

## 5. Morning Brief

- Montrer ARK comme assistant métier: 5 priorités maximum, raison claire, action proposée.
- Si l'IA externe n'est pas configurée, présenter le mode local comme un fallback déterministe, pas comme une IA connectée.

## 6. Import client

- Aller sur `/import`.
- Télécharger le template CSV.
- Importer un CSV/XLSX simple.
- Montrer la preview, le mapping colonnes, la simulation, puis le rapport final.
- Après succès, utiliser les boutons "Voir les clients importés", "Lancer ARK" ou "Créer une tâche de relance".

## 7. Fiche client

- Ouvrir un client.
- Montrer les coordonnées, contrats, tâches, documents, activité et commissions si présents.
- Insister sur la vue 360: une fiche client devient le point de départ opérationnel.

## 8. ARK recommande une action

- Montrer une recommandation liée au client, au contrat ou à une échéance.
- Expliquer "Pourquoi ARK recommande ça".
- Créer ou préparer une action uniquement si elle est réellement disponible dans l'environnement.

## 9. Génération FIC

- Aller dans documents ou fiche client.
- Si ORIAS/cabinet est renseigné: générer une FIC.
- Si ORIAS manque: montrer le refus propre et expliquer que COURTIA exige les informations de conformité avant génération.
- Rappeler que le document reste à relire et valider par le courtier.

## 10. Commissions

- Ouvrir `/commissions`.
- Montrer l'état vide utile ou le suivi existant.
- Positionner le module comme un contrôle de bordereaux compagnie et non comme une promesse de récupération automatique si aucun import n'a été fait.

## 11. ROI

- Revenir dashboard ou rapports.
- Montrer temps estimé gagné, documents générés, relances préparées, opportunités ARK et commissions suivies.
- Si la donnée manque: "à mesurer après usage" est volontairement préférable à un montant inventé.

## 12. Intégrations prêtes

- Ouvrir `/parametres/integrations`.
- Montrer email, SMS, Google, WhatsApp, Yousign ou webhooks avec statut réel.
- Utiliser les termes "Configuré", "Configuration requise", "Prêt à connecter" ou "Mode local".
- Ne jamais dire "connecté" si l'OAuth ou le secret provider n'est pas en place.

## 13. Billing

- Ouvrir `/billing`.
- Montrer le plan, les limites et le chemin d'upgrade.
- Si Stripe n'est pas configuré dans l'environnement de démo, présenter "Configuration Stripe requise" comme garde-fou.

## 14. Conclusion commerciale

- Résumer en trois gains: reprendre un portefeuille Excel, prioriser les actions, tracer la conformité.
- Proposer une prochaine étape simple: import d'un échantillon portefeuille + revue Morning Brief + génération d'un document DDA.

## Points à éviter

- Ne pas promettre une conformité juridique automatique.
- Ne pas promettre un envoi email/SMS/WhatsApp si le provider est en configuration requise.
- Ne pas annoncer de montants ROI non mesurés.
- Ne pas utiliser de données personnelles réelles sans consentement.

