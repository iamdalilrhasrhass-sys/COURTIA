# Séquence e-mail Suisse — uniquement après opt-in

> Activation : utiliser cette séquence uniquement après fusion de la PR #31, test réussi du formulaire de production et validation d'une boîte de réponse Courtiark avec MX/SPF/DKIM/DMARC.

Variables : `{{prenom}}`, `{{cabinet}}`, `{{ville}}`, `{{permission_context}}`.

## E-mail 1 — fiche promise

Objet : `la fiche Courtiark promise`

Bonjour {{prenom}},

Merci pour votre accord {{permission_context}}.

Courtiark réunit portefeuille, contrats, échéances, tâches et relances dans un seul cockpit. ARK prépare les priorités et les messages ; le courtier garde la validation et la relation client.

La démo suisse dure 20 minutes et part de vos outils actuels :
https://courtiark.fr/demo?market=CH

Est-ce pertinent pour {{cabinet}} ?

Dalil  
Fondateur de Courtiark

Vous pouvez répondre « stop » à tout moment ; aucun autre message ne sera envoyé.

## E-mail 2 — J+4, seulement sans réponse

Objet : `Re: la fiche Courtiark promise`

Bonjour {{prenom}},

Un exemple concret pour {{cabinet}} : le cockpit remonte les échéances et dossiers à traiter, puis ARK prépare la prochaine action. Rien ne part sans validation du cabinet.

Je peux adapter la démo à votre taille d'équipe et à vos outils actuels. Souhaitez-vous que je vous propose deux créneaux ?

Dalil

Vous pouvez répondre « stop » pour ne plus recevoir de message.

## E-mail 3 — J+9, clôture

Objet : `je clôture le sujet`

Bonjour {{prenom}},

Je clôture le sujet pour ne pas encombrer votre boîte. Si le suivi portefeuille ou les relances deviennent prioritaires, la démo reste ici :
https://courtiark.fr/demo?market=CH

Belle continuation,
Dalil

Ce message clôt la séquence. Répondez « stop » pour confirmer l'opposition définitive.
