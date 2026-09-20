# COURTIA — Séquence de relances d'essai (7 jours)

STATUT : **DRAFT_ONLY_NOT_SENT** — aucun message de ce document n'a été envoyé.
Raison : le domaine `courtiark.fr` n'a ni MX ni DMARC (aucune réponse ne pourrait
être reçue), et `RESEND_API_KEY` n'est configurée nulle part. Le service d'envoi
commercial refuse volontairement de partir sans `EMAIL_REPLY_TO`
(`services/emailService.js`). Cette séquence est donc prête à charger, pas à
envoyer.

PRÉREQUIS AVANT TOUT ENVOI (dans l'ordre) :

1. MX + SPF + DMARC posés sur `courtiark.fr` (voir HUMAN_ACTION_QUEUE #3) ;
2. `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` définis côté backend ;
3. `COURTIA_ADMIN_EMAIL` défini (notifications d'exploitation) ;
4. GO OUTBOUND explicite de Dalil, avec le périmètre exact.

RÈGLES DE RÉDACTION (appliquées ci-dessous) :

- pas de promesse non tenue (aucun « conformité FINMA en un clic », aucun montant
  de gain) ;
- un seul appel à l'action par message ;
- les montants tarifaires cités (89 € HT, 159 € HT) viennent de la grille
  publique validée ; la Suisse reste sur devis tant que la grille CHF n'est pas
  arbitrée dans le produit ;
- le lien d'activation est un lien à durée limitée (72 h), jamais un mot de passe.

Variables : `{{prenom}}`, `{{cabinet}}`, `{{lien_activation}}`, `{{fin_essai}}`,
`{{jours_restants}}`.

---

## D0 — Activation (jour de création de l'essai)

Objet : `Votre essai COURTIA est ouvert — 7 jours`

    Bonjour {{prenom}},

    Votre espace {{cabinet}} est prêt. Vous disposez de 7 jours pour tester
    COURTIA avec vos propres dossiers, sans engagement.

    Pour choisir votre mot de passe : {{lien_activation}}
    (lien valable 72 heures).

    Votre essai se termine le {{fin_essai}}. Aucune carte bancaire n'est
    demandée pendant cette période.

    Si vous préférez que nous fassions le tour ensemble, répondez simplement à
    ce message.

    Bonne découverte,
    L'équipe COURTIA

## D1 — Aide à la prise en main

Objet : `Vos 3 premiers pas dans COURTIA`

    Bonjour {{prenom}},

    Pour tirer le meilleur de l'essai en dix minutes :

    1. créez un client (le cockpit se remplit tout seul) ;
    2. déposez une pièce depuis son dossier ;
    3. ouvrez ARK et demandez-lui « quels clients dois-je relancer ? ».

    Tout part de votre portefeuille réel : rien n'est pré-rempli, donc rien
    n'est faux.

    L'équipe COURTIA

## D3 — Usage

Objet : `Ce que COURTIA peut faire sur vos {{jours_restants}} jours restants`

    Bonjour {{prenom}},

    S'il vous reste des dossiers à structurer, le pipeline et les échéances
    sont les deux écrans qui font gagner le plus de temps : ils listent ce qui
    doit être traité aujourd'hui, pas ce qui pourrait l'être.

    Vous avez une question précise (import de portefeuille, modèle de
    document) ? Répondez à ce message : on la traite directement.

    L'équipe COURTIA

## D5 — Valeur

Objet : `Un point sur votre essai COURTIA`

    Bonjour {{prenom}},

    Il reste {{jours_restants}} jours d'essai. À l'échéance, vous choisissez :
    Starter (89 € HT/mois), Pro (159 € HT/mois) ou Cabinet (sur devis) — ou
    vous arrêtez, sans frais.

    Vos données restent accessibles dans tous les cas.

    Si vous voulez être accompagné sur la mise en route, dites-le : on le
    planifie avant la fin de l'essai.

    L'équipe COURTIA

## D6 — Dernier jour

Objet : `Votre essai COURTIA se termine demain`

    Bonjour {{prenom}},

    Votre essai se termine demain ({{fin_essai}}). Après cette date, votre
    cabinet passe en lecture seule : vous conservez l'accès à vos clients,
    contrats, documents et tâches, mais les modifications nécessitent un
    abonnement.

    Pour choisir votre offre : {{lien_activation}}
    Pour en parler : répondez à ce message.

    L'équipe COURTIA

## D7 — Expiration

Objet : `Votre essai est terminé — vos données sont conservées`

    Bonjour {{prenom}},

    L'essai de {{cabinet}} est terminé. Rien n'a été supprimé : vos dossiers
    sont toujours là, en consultation.

    Pour reprendre le travail : Starter (89 € HT/mois) ou Pro (159 € HT/mois).
    Pour un cabinet de plusieurs collaborateurs : sur devis.

    Ouvrir mes offres : {{lien_activation}}

    On reste disponible si vous préférez en parler de vive voix.

    L'équipe COURTIA

---

## Notes d'exploitation

- Cadence : un message par jour maximum, arrêt immédiat si le prospect répond.
- Les relances D1/D3/D5 ne partent que si l'essai est toujours actif
  (`trial_state = TRIAL_ACTIVE`, source serveur `/api/billing/status`).
- Les relances D6/D7 ne partent que sur `TRIAL_EXPIRED` constaté côté serveur.
- Aucun message ne doit contenir de mot de passe, de jeton, ni de donnée client.
- Une séquence équivalente pourra être branchée sur `email_templates`
  (la table existe) quand l'envoi sera opérationnel ; en attendant, elle vit
  dans ce document, pas dans un automate qui enverrait pour de vrai.
