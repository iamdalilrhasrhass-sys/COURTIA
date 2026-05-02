# COURTIA — Revue des sources officielles (pré-live)

Date: 2 mai 2026  
Statut: Pré-live (revue juridique/comptable obligatoire avant publication officielle)

## 1) CGV B2B
Source officielle: Entreprendre Service-Public — Conditions générales de vente (CGV)  
Lien: https://entreprendre.service-public.fr/vosdroits/F33527

Point retenu:
- Les CGV encadrent juridiquement et commercialement la relation vendeur/client.
- En B2B, elles doivent être communicables sur demande.
- Les clauses de prix, délais/pénalités de paiement et indemnité de recouvrement doivent être cadrées.

Impact COURTIA:
- Renforcement de `COURTIA_CGV_SAAS_B2B_PRELIVE.md` avec clauses paiement, retard, résiliation, support, responsabilité.
- Distinction claire Starter/Pro/Premium et essai 7 jours avec renouvellement automatique.

Point à valider juriste:
- Rédaction finale des clauses de responsabilité, juridiction compétente et médiation selon cas applicables.

## 2) Mentions obligatoires facture
Source officielle: Entreprendre Service-Public — Mentions obligatoires sur une facture  
Lien: https://entreprendre.service-public.fr/vosdroits/F31808

Point retenu:
- Une facture conforme doit inclure notamment identité EI, SIREN, TVA, prix unitaire HT, taux de TVA, total HT/TTC.
- Les mentions liées aux pénalités de retard et indemnité forfaitaire doivent être explicites.

Impact COURTIA:
- Wording prix harmonisé HT + TTC sur surfaces billing/onboarding.
- Préparation des docs pré-live cohérentes avec TVA applicable.

Point à valider comptable:
- Modèle de facture final (mentions légales complètes, taux, arrondis, mentions particulières éventuelles).

## 3) Numéro de TVA intracommunautaire
Source officielle: impots.gouv.fr — Les numéros d’identification  
Lien: https://www.impots.gouv.fr/professionnel/les-numeros-didentification

Point retenu:
- Le numéro TVA intracom est attribué aux assujettis TVA, format FR + clé + SIREN.
- Il doit figurer sur les factures lorsqu’applicable.

Impact COURTIA:
- Passage en mode TVA applicable dans les documents pré-live.
- Numéro TVA COURTIA appliqué: `FR12899070205`.

Point à valider comptable:
- Paramétrage fiscal final Stripe (HT/TTC, taux, éventuel Stripe Tax) avant live.

## 4) Mentions légales site d’un entrepreneur individuel
Source officielle: Entreprendre Service-Public — Mentions obligatoires sur le site internet d’un entrepreneur individuel  
Lien: https://entreprendre.service-public.fr/vosdroits/F31228

Point retenu:
- Mentions légales obligatoires et facilement accessibles.
- Doivent inclure identité EI, RCS/SIREN, contact, TVA, identité hébergeur.

Impact COURTIA:
- Création de `COURTIA_MENTIONS_LEGALES_PRELIVE.md` avec données EI réelles et champs restants à compléter.

Point à valider juriste:
- Contrôle de complétude LCEN/RGPD/consommation selon parcours final exact.

## 5) CNIL — relation responsable/sous-traitant
Source officielle: CNIL — Responsable de traitement et sous-traitant: bonnes pratiques  
Lien: https://www.cnil.fr/fr/responsable-de-traitement-et-sous-traitant-6-bonnes-pratiques-pour-respecter-les-donnees

Point retenu:
- Le contrat doit rendre les obligations opérationnelles (pas seulement recopier le RGPD).
- Le sous-traitant doit démontrer sa conformité et assister sur droits/contrôles.

Impact COURTIA:
- DPA pré-live renforcé sur instructions, sécurité, assistance, incidents, sous-traitance ultérieure.

Point à valider juriste/DPO:
- Répartition précise des rôles par traitement (courtier responsable, COURTIA sous-traitant).

## 6) CNIL — clauses de sous-traitance
Source officielle: CNIL — Sous-traitance: exemple de clauses  
Lien: https://www.cnil.fr/fr/sous-traitance-exemple-de-clauses

Point retenu:
- Traitement sur instructions documentées.
- Confidentialité, gestion des sous-traitants ultérieurs, aide aux droits, notification des violations.

Impact COURTIA:
- Structure de `COURTIA_DPA_PRELIVE.md` alignée sur ces blocs opérationnels.

Point à valider juriste:
- Version contractuelle finale signable (annexes sécurité, délais incidents, audit, transferts hors UE).

---

## Limite assumée
Cette revue source officielle prépare une version pré-live solide, mais ne remplace pas une validation juridique/comptable formelle avant encaissement live.
