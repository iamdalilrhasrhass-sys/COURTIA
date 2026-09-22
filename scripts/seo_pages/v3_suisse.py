#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v3_suisse.py — VAGUE 3, groupe « univers suisse » (7 pages).

Contraintes tenues :
  - aucune traduction : ces pages sont écrites en français pour la Suisse romande, avec le vocabulaire
    du marché suisse (intermédiaire d'assurance, preneur d'assurance, canton, UID, journal de conseil) ;
  - devise CHF, jamais l'euro ;
  - aucune revendication de « conformité » ou de certification : les obligations sont celles du cabinet,
    le produit documente et trace ;
  - aucun argument d'hébergement suisse : le service ne tourne pas en Suisse, donc nous ne le
    revendiquons pas (les concurrents suisses s'en prévalent, nous ne les imitons pas).
Passes JEV utilisées : Pass A (Suisse alémanique = documenter seulement, 0,71), Pass B (documents,
portail, import, pilotage, équipe : adéquation produit >= 0,70), Pass C (fusion : pas de page
« logiciel de courtage » ni « romandie » séparée), Pass F (red team Suisse).
"""
PAGES = {}

PAGES["ch/logiciel-intermediaire-assurance-suisse"] = dict(
    marche="CH",
    titre="Logiciel pour intermédiaire d'assurance en Suisse — COURTIA",
    description=(
        "Un logiciel pensé pour le vocabulaire et le cadre suisses : preneur d'assurance, journal de "
        "conseil, canton, UID, facturation en CHF. Pour courtiers et intermédiaires en Suisse romande."
    ),
    h1="Intermédiaire d'assurance : un logiciel qui parle le langage de la Suisse",
    fil=[("Accueil", "/"), ("Suisse", "/ch"), ("Intermédiaire d'assurance", "/ch/logiciel-intermediaire-assurance-suisse")],
    maillage=[
        ("Logiciel de courtage en Suisse", "/ch/logiciel-courtier-assurance-suisse", "le pilier suisse"),
        ("Conformité LSA et registre FINMA", "/ch/conformite-intermediaire-assurance-lsa-finma", "le cadre applicable"),
        ("Données personnelles et nLPD", "/ch/nlpd-courtier-assurance", "traiter les données du cabinet"),
        ("Tarifs en francs suisses", "/ch/tarifs-logiciel-courtier-chf", "la grille suisse"),
    ],
    corps="""
<p>En Suisse, on ne dit pas « courtier » au sens où on l'entend partout : on parle
d'<strong>intermédiaire d'assurance</strong>, et l'activité est encadrée par une loi fédérale sur le
contrat d'assurance qui impose des obligations d'information et de documentation. Un logiciel conçu
ailleurs emploie rarement ce vocabulaire — et c'est le cabinet qui doit le traduire, dossier après
dossier.</p>

<div class="section">
<h2>Ce que le vocabulaire suisse change dans un dossier</h2>
<table>
<tr><th>Élément</th><th>Ce que cela implique</th></tr>
<tr><td>Preneur d'assurance</td><td>La personne qui conclut le contrat n'est pas toujours celle qui est assurée : le dossier doit le distinguer</td></tr>
<tr><td>Journal de conseil</td><td>L'entretien de conseil et les éléments échangés sont structurés, pour être restitués plus tard</td></tr>
<tr><td>Documentation précontractuelle</td><td>Ce qui est remis au preneur d'assurance avant la conclusion reste traçable</td></tr>
<tr><td>Canton et UID</td><td>L'identité du cabinet (raison sociale, numéro d'identification des entreprises, canton) est conservée dans son profil</td></tr>
<tr><td>Francs suisses</td><td>Montants, écrans et documents en CHF, sans conversion implicite en euros</td></tr>
</table>
</div>

<h2>Ce que le produit fait pour un intermédiaire suisse</h2>
<ul>
<li><strong>Un dossier client complet</strong> — contrats, échéances, documents, historique, tâches.</li>
<li><strong>Le journal de conseil</strong> — structuré dans le dossier, restituable des années plus tard.</li>
<li><strong>La documentation remise</strong> — préparée depuis les données du dossier, tracée avec sa date.</li>
<li><strong>Les commissions et rétrocessions</strong> — barèmes par partenaire, import de relevés, états
par période.</li>
<li><strong>La collecte de pièces par lien</strong> — le preneur d'assurance dépose ses documents sans
créer de compte.</li>
<li><strong>L'assistant ARK</strong> — synthèse du portefeuille, priorités du jour, préparation d'appel.</li>
</ul>

<h2>Ce que nous ne revendiquons pas</h2>
<ul>
<li>Nous ne disons pas que COURTIA rend un cabinet <strong>conforme</strong> : les obligations restent
celles du cabinet. Le produit organise, documente et trace.</li>
<li>Nous ne revendiquons pas d'<strong>hébergement en Suisse</strong> : le service est exploité sur une
infrastructure tierce. Certains éditeurs suisses en font un argument ; nous ne l'imitons pas.</li>
<li>Nous ne publions pas de traduction automatique vers l'allemand ou l'italien : voir la note sur la
localisation dans l'univers suisse.</li>
</ul>
""",
    faq=[
        ("Le produit utilise-t-il le vocabulaire suisse ?",
         "Oui : preneur d'assurance, intermédiaire, journal de conseil, canton, UID. Le dossier suisse ne reçoit pas la fiscalité française ni une devise en euros."),
        ("Faut-il un statut particulier pour utiliser COURTIA ?",
         "Non. Le produit s'adresse aux cabinets et intermédiaires d'assurance suisses ; le registre des intermédiaires et les obligations propres au cabinet restent sa responsabilité."),
        ("Le journal de conseil remplace-t-il mes notes ?",
         "Il structure l'information et la rattache au dossier pour qu'elle soit retrouvable. La conduite de l'entretien reste celle du courtier."),
    ],
)

PAGES["ch/gestion-cabinet-courtage-suisse"] = dict(
    marche="CH",
    titre="Gestion d'un cabinet de courtage en Suisse — COURTIA",
    description=(
        "Gérer un cabinet de courtage suisse : décomptes et rétrocessions en CHF, coûts du cabinet, "
        "pilotage, équipe et rôles. Ce que le produit couvre réellement."
    ),
    h1="Gérer un cabinet de courtage en Suisse : ce qui se pilote en francs suisses",
    fil=[("Accueil", "/"), ("Suisse", "/ch"), ("Gestion de cabinet", "/ch/gestion-cabinet-courtage-suisse")],
    maillage=[
        ("Commissions en Suisse", "/ch/gestion-commissions-courtier-assurance-suisse", "le détail des décomptes"),
        ("Pilotage du cabinet", "/ch/reporting-pilotage-courtier-assurance-suisse", "les indicateurs"),
        ("Logiciel de courtage en Suisse", "/ch/logiciel-courtier-assurance-suisse", "le pilier suisse"),
        ("Tarifs en CHF", "/ch/tarifs-logiciel-courtier-chf", "les offres suisses"),
    ],
    corps="""
<p>Un cabinet suisse gère deux choses en parallèle : les dossiers des preneurs d'assurance et la
relation avec les compagnies et les courtiers grossistes, dont dépendent les décomptes. La gestion
de cabinet, ici, n'est pas la même qu'ailleurs — la devise change, les partenaires changent, et les
flux de rémunération aussi.</p>

<div class="section">
<h2>Ce que recouvre la gestion de cabinet dans COURTIA</h2>
<ul>
<li><strong>Décomptes et rétrocessions</strong> — barèmes par partenaire, import des relevés, états par
période, en francs suisses.</li>
<li><strong>Coûts d'exploitation du cabinet</strong> — dans le même outil que l'activité, pour lire une
marge sans reconstituer un tableur.</li>
<li><strong>Pilotage</strong> — portefeuille, échéances, production, santé du portefeuille, objectifs.</li>
<li><strong>Équipe et rôles</strong> — plusieurs utilisateurs, données cloisonnées par cabinet.</li>
<li><strong>Suivi opérationnel</strong> — file de travail, affectation, actions du jour.</li>
</ul>
</div>

<h2>Avant / avec, pour un cabinet romand</h2>
<table>
<tr><th>Question du dirigeant</th><th>Sans outil dédié</th><th>Avec COURTIA</th></tr>
<tr><td>Où en sont les décomptes de ce trimestre ?</td><td>Consolidation des relevés dans un tableur</td><td>Relevés importés, états par période en CHF</td></tr>
<tr><td>Quel partenaire apporte quoi ?</td><td>À reconstituer</td><td>Barèmes par partenaire et suivi associé</td></tr>
<tr><td>Quels dossiers n'ont pas bougé ?</td><td>Difficile à savoir</td><td>Dossiers sans action récente, avec dernier contact</td></tr>
<tr><td>Qui suit ce dossier ?</td><td>À demander à l'oral</td><td>Responsable visible dans le tableau de travail</td></tr>
</table>

<h2>Ce que la page ne promet pas</h2>
<p>COURTIA ne tient pas la comptabilité du cabinet, ne remplace ni le fiduciaire ni l'expert-comptable,
et ne calcule pas d'impôts. Il couvre le suivi de l'activité de courtage : dossiers, décomptes, coûts
d'exploitation, pilotage et équipe.</p>
""",
    faq=[
        ("Les montants sont-ils en CHF ?",
         "Oui, dans les écrans comme dans les documents d'un cabinet suisse."),
        ("Peut-on gérer plusieurs partenaires avec des barèmes différents ?",
         "Les barèmes se saisissent par partenaire, et les relevés s'importent pour produire des états par période."),
        ("Le produit gère-t-il la TVA suisse ?",
         "Le produit n'impose pas de fiscalité française à un cabinet suisse. Le traitement de la TVA relève de la facturation du cabinet et de son fiduciaire."),
    ],
)

PAGES["ch/gestion-documentaire-courtier-assurance-suisse"] = dict(
    marche="CH",
    titre="Gestion documentaire d'un courtier suisse : pièces et traçabilité — COURTIA",
    description=(
        "Pièces et documents d'un cabinet suisse : collecte par lien, rattachement au dossier, "
        "documentation remise au preneur d'assurance, historique conservé. En CHF, vocabulaire suisse."
    ),
    h1="Pièces d'un dossier suisse : ce qui est demandé, ce qui est remis, ce qui reste",
    fil=[("Accueil", "/"), ("Suisse", "/ch"), ("Gestion documentaire", "/ch/gestion-documentaire-courtier-assurance-suisse")],
    maillage=[
        ("Journal de conseil et conformité", "/ch/conformite-intermediaire-assurance-lsa-finma", "ce que la loi demande de pouvoir restituer"),
        ("Données personnelles et nLPD", "/ch/nlpd-courtier-assurance", "la protection des données du dossier"),
        ("Portail client suisse", "/ch/portail-client-assurance-suisse", "le dépôt par lien"),
        ("Pilier suisse", "/ch/logiciel-courtier-assurance-suisse", "l'ensemble du produit"),
    ],
    corps="""
<p>Dans un cabinet suisse, la documentation d'un dossier sert deux fois : au moment de la conclusion,
pour informer le preneur d'assurance, et des années plus tard, si l'entretien de conseil doit être
restitué. Une pièce sans date ni rattachement ne rend service ni dans un cas, ni dans l'autre.</p>

<div class="section">
<h2>Trois flux documentaires, un seul dossier</h2>
<table>
<tr><th>Flux</th><th>Ce qui circule</th><th>Ce que fait COURTIA</th></tr>
<tr><td>Ce que le cabinet demande</td><td>Pièces du preneur d'assurance, documents de situation</td><td>Demande suivie, dépôt par lien, rattachement au dossier</td></tr>
<tr><td>Ce que le cabinet remet</td><td>Documentation précontractuelle, proposition, journal de conseil</td><td>Document généré depuis le dossier, trace de ce qui a été remis</td></tr>
<tr><td>Ce qui vient du partenaire</td><td>Polices, avenants, décomptes</td><td>Rattachement au dossier, historique conservé</td></tr>
</table>
</div>

<h2>Ce qui compte pour pouvoir restituer</h2>
<ol>
<li><strong>La date</strong> — un document non daté ne prouve rien sur le moment de l'entretien.</li>
<li><strong>Le destinataire</strong> — au preneur d'assurance, à la compagnie, ou au courtier grossiste.</li>
<li><strong>Le lien avec le dossier</strong> — un document orphelin est un document perdu.</li>
</ol>

<h2>Ce que le produit ne fait pas</h2>
<ul>
<li>Il ne remplace pas un <strong>archivage électronique à valeur probante</strong> : il organise et
trace, il ne délivre pas d'horodatage qualifié.</li>
<li>Il ne fixe pas les <strong>durées de conservation</strong> : elles relèvent du cabinet et des
obligations qui lui sont applicables.</li>
<li>Il n'affiche pas de revendication de « conformité au sens de la loi suisse » : ce que le produit
fait, c'est rendre le dossier vérifiable.</li>
</ul>
""",
    faq=[
        ("Le preneur d'assurance doit-il créer un compte ?",
         "Non. Le dépôt se fait par un lien transmis par le cabinet, sans inscription."),
        ("Les documents générés sont-ils datés ?",
         "Oui, la trace de ce qui a été produit et remis est conservée avec le dossier."),
        ("Le produit conserve-t-il les dossiers pendant la durée légale ?",
         "Le produit conserve les données du cabinet ; la durée applicable est une décision du cabinet, pas un réglage produit que nous imposerions."),
    ],
)

PAGES["ch/portail-client-assurance-suisse"] = dict(
    marche="CH",
    titre="Dépôt de pièces par le preneur d'assurance en Suisse — COURTIA",
    description=(
        "En Suisse romande, le preneur d'assurance dépose ses pièces par lien, sans compte. Ce que le "
        "client fait seul, ce qui reste au cabinet, et pourquoi la friction est retirée à l'entrée."
    ),
    h1="Le preneur d'assurance dépose ses pièces en trois clics",
    fil=[("Accueil", "/"), ("Suisse", "/ch"), ("Dépôt de pièces", "/ch/portail-client-assurance-suisse")],
    maillage=[
        ("Gestion documentaire en Suisse", "/ch/gestion-documentaire-courtier-assurance-suisse", "où arrivent les pièces"),
        ("Données personnelles et nLPD", "/ch/nlpd-courtier-assurance", "ce qui est transmis et conservé"),
        ("Relances en Suisse", "/ch/relances-courtier-assurance-suisse", "quand le client ne répond pas"),
        ("Pilier suisse", "/ch/logiciel-courtier-assurance-suisse", "l'ensemble du produit"),
    ],
    corps="""
<p>En Suisse comme ailleurs, faire créer un compte à un preneur d'assurance pour transmettre un
permis ou une attestation est une demande disproportionnée. Le résultat est prévisible : la pièce
arrive par un autre canal, ou n'arrive pas.</p>

<div class="section">
<h2>Comment ça se passe</h2>
<ol>
<li>Le cabinet prépare sa demande dans le dossier et envoie un lien.</li>
<li>Le preneur d'assurance ouvre le lien sur son téléphone ou son ordinateur.</li>
<li>Il transmet la pièce. Elle arrive dans le dossier, rattachée au client et à la demande.</li>
<li>Le cabinet est informé ; il n'a ni à classer ni à recopier.</li>
</ol>
</div>

<h2>Ce que le client fait, et ce qu'il ne fait pas</h2>
<table>
<tr><th>Action</th><th>Possible</th><th>Pourquoi</th></tr>
<tr><td>Transmettre une pièce</td><td>Oui</td><td>C'est ce qui débloque le plus de dossiers</td></tr>
<tr><td>Signer un document</td><td>Oui, dans le parcours du devis</td><td>Évite impression, scan et envoi postal</td></tr>
<tr><td>Modifier son dossier</td><td>Non</td><td>Le dossier est tenu par le cabinet</td></tr>
<tr><td>Obtenir un conseil ou un tarif</td><td>Non</td><td>Cela relève de l'entretien avec l'intermédiaire</td></tr>
</table>

<h2>Pourquoi c'est conçu ainsi en Suisse aussi</h2>
<p>Le vocabulaire change, la devise change, mais la mécanique de la friction est la même : chaque
étape imposée au client est un motif de report. Ce que le cabinet y gagne n'est pas un argument de
démonstration, c'est du temps de relance en moins — l'une des frictions les plus élevées mesurées
dans un cabinet.</p>
""",
    faq=[
        ("Le lien est-il valable longtemps ?",
         "Les liens de dépôt sont temporaires et rattachés à une demande précise du cabinet."),
        ("Les données sont-elles protégées ?",
         "Le dépôt est rattaché au dossier du cabinet, avec un lien limité dans le temps. Le traitement des données personnelles est décrit dans la page nLPD."),
        ("Cela fonctionne-t-il sur téléphone ?",
         "Oui, c'est le cas d'usage principal : le client transmet la pièce depuis son téléphone."),
    ],
)

PAGES["ch/import-portefeuille-courtier-assurance-suisse"] = dict(
    marche="CH",
    titre="Changer de logiciel de courtage en Suisse : reprendre son portefeuille — COURTIA",
    description=(
        "Migrer un portefeuille suisse vers COURTIA : polices, décomptes, documents, contrôle par "
        "échantillon. Méthode de reprise, en francs suisses, sans interruption d'activité."
    ),
    h1="Reprendre un portefeuille suisse sans tout casser",
    fil=[("Accueil", "/"), ("Suisse", "/ch"), ("Reprise de portefeuille", "/ch/import-portefeuille-courtier-assurance-suisse")],
    maillage=[
        ("Gestion de portefeuille en Suisse", "/ch/gestion-portefeuille-assurance-suisse", "ce qu'on doit retrouver"),
        ("Commissions en Suisse", "/ch/gestion-commissions-courtier-assurance-suisse", "les décomptes à reprendre"),
        ("Pilier suisse", "/ch/logiciel-courtier-assurance-suisse", "le produit cible"),
        ("Reprise côté France", "/fr/import-portefeuille-courtier-assurance", "la même méthode en euros"),
    ],
    corps="""
<p>Changer d'outil est une décision de dirigeant, pas un projet informatique. Ce qui l'empêche
souvent : la crainte de perdre les polices, les échéances et les décomptes. La réponse est une
méthode, pas une promesse.</p>

<div class="section">
<h2>Ce qui se reprend</h2>
<ul>
<li><strong>Les preneurs d'assurance</strong> — identité, coordonnées, canton, situation.</li>
<li><strong>Les polices</strong> — compagnie, numéro, prime en CHF, date d'échéance, statut.</li>
<li><strong>Les échéances</strong> — condition du premier mois utile : sans elles, la migration
n'apporte rien.</li>
<li><strong>Les décomptes</strong> — barèmes et historique si la structure de départ le permet.</li>
</ul>
</div>

<h2>Ce qui se reprend à la main</h2>
<ul>
<li>Les documents mal nommés ou sans rattachement clair.</li>
<li>Les notes libres accumulées dans un ancien outil.</li>
<li>Les automatisations maison (rappels personnels, formules de tableur) : les fonctions
correspondantes existent dans le produit.</li>
</ul>

<h2>L'ordre qui évite les mauvaises surprises</h2>
<ol>
<li>Exporter l'ancien système et archiver l'export, avant toute résiliation.</li>
<li>Importer, puis contrôler sur dix dossiers tirés au hasard.</li>
<li>Vérifier en priorité les échéances à moins de 90 jours et les décomptes du trimestre en cours.</li>
<li>Faire tourner les deux systèmes le temps d'un cycle partiel, puis basculer.</li>
</ol>
<p class="doux">Aucun frais de migration n'est facturé : la reprise se fait avec le cabinet, à partir
de ses propres fichiers. Nous ne promettons pas de durée sans avoir vu les données de départ.</p>
""",
    faq=[
        ("Faut-il résilier l'ancien logiciel tout de suite ?",
         "Non. L'export de l'ancien système est conservé jusqu'à la vérification complète de l'import."),
        ("Les polices et les échéances sont-elles reprises ?",
         "Oui, ce sont les priorités de l'import : sans leurs échéances, les renouvellements ne remontent pas."),
        ("Et les décomptes en cours ?",
         "Les relevés s'importent dans le produit ; le contrôle du trimestre en cours fait partie des vérifications de reprise."),
    ],
)

PAGES["ch/reporting-pilotage-courtier-assurance-suisse"] = dict(
    marche="CH",
    titre="Pilotage d'un cabinet de courtage suisse : indicateurs utiles — COURTIA",
    description=(
        "Piloter un cabinet suisse : portefeuille, échéances, production, santé du portefeuille, "
        "objectifs — sur les données réelles, en francs suisses. Aucun chiffre inventé."
    ),
    h1="Piloter un cabinet suisse sur ses propres chiffres",
    fil=[("Accueil", "/"), ("Suisse", "/ch"), ("Pilotage", "/ch/reporting-pilotage-courtier-assurance-suisse")],
    maillage=[
        ("Gestion de cabinet en Suisse", "/ch/gestion-cabinet-courtage-suisse", "décomptes et coûts"),
        ("Gestion de portefeuille en Suisse", "/ch/gestion-portefeuille-assurance-suisse", "contrats et échéances"),
        ("Tarifs en CHF", "/ch/tarifs-logiciel-courtier-chf", "les offres"),
        ("Pilier suisse", "/ch/logiciel-courtier-assurance-suisse", "l'ensemble du produit"),
    ],
    corps="""
<p>Un tableau de bord n'a de valeur que s'il change une décision. Dans un cabinet suisse, trois
questions méritent un indicateur : ce qui arrive à échéance dans les 90 jours, quels dossiers
décrochent, et quelle est la part de chaque partenaire dans l'activité.</p>

<div class="section">
<h2>Ce que le pilotage calcule</h2>
<ul>
<li><strong>Le portefeuille</strong> — polices actives, primes en CHF, échéances à venir, répartition
par branche et par compagnie.</li>
<li><strong>La santé du portefeuille</strong> — un indicateur interne calculé sur les dossiers du
cabinet, avec les motifs affichés : ce qui le dégrade est visible, pas seulement le chiffre.</li>
<li><strong>Les décomptes et l'activité</strong> — par période, avec les états correspondants.</li>
<li><strong>Les objectifs</strong> — suivis sur les données saisies.</li>
<li><strong>Les dossiers immobiles</strong> — ceux qu'on n'a pas touchés depuis longtemps.</li>
</ul>
</div>

<h2>La règle qui rend un indicateur crédible</h2>
<p>Un indicateur doit être calculé sur des données réellement présentes. Quand la donnée manque,
l'écran affiche un tiret : un « 0 » ferait croire à une activité nulle, une valeur inventée serait
pire encore. Cette règle vaut pour tous les cabinets, y compris suisses.</p>

<h2>Trois décisions qu'un pilotage suisse doit permettre</h2>
<ol>
<li><strong>Anticiper un creux</strong> — échéances des 90 jours et renouvellements à préparer.</li>
<li><strong>Rééquilibrer les partenaires</strong> — mesurer la concentration par compagnie ou par
courtier grossiste, et décider si elle est voulue.</li>
<li><strong>Réaffecter du temps</strong> — voir quels dossiers n'ont pas bougé depuis six mois.</li>
</ol>

<h2>Ce que le pilotage ne fait pas</h2>
<p>Il ne fixe pas les objectifs à la place du dirigeant, ne calcule pas la comptabilité du cabinet et
ne publie aucune donnée de marché. Les indicateurs portent sur les données du cabinet, et sur elles
seules.</p>
""",
    faq=[
        ("Les indicateurs sont-ils en CHF ?",
         "Oui, un cabinet suisse travaille dans sa devise, dans les écrans comme dans les documents."),
        ("D'où viennent les chiffres ?",
         "Des données saisies dans le cabinet : preneurs d'assurance, polices, échéances, devis, tâches et décomptes."),
        ("Peut-on exporter les états ?",
         "Le produit prévoit l'export des données du cabinet et la production d'états par période."),
    ],
)

PAGES["ch/nlpd-courtier-assurance"] = dict(
    marche="CH",
    titre="Données personnelles d'un courtier suisse : ce que la nLPD change — COURTIA",
    description=(
        "Ce qu'un cabinet suisse doit savoir sur les données personnelles de ses dossiers : finalité, "
        "minimisation, droits des personnes, sous-traitance. Ce que le produit fait, et ne fait pas."
    ),
    h1="Données personnelles dans un cabinet suisse : la question n'est pas théorique",
    fil=[("Accueil", "/"), ("Suisse", "/ch"), ("Données et nLPD", "/ch/nlpd-courtier-assurance")],
    maillage=[
        ("Conformité LSA et registre FINMA", "/ch/conformite-intermediaire-assurance-lsa-finma", "les obligations de l'intermédiaire"),
        ("Gestion documentaire en Suisse", "/ch/gestion-documentaire-courtier-assurance-suisse", "où vivent les pièces"),
        ("Dépôt de pièces par lien", "/ch/portail-client-assurance-suisse", "ce que le client transmet"),
        ("Pilier suisse", "/ch/logiciel-courtier-assurance-suisse", "l'ensemble du produit"),
    ],
    corps="""
<p>Un cabinet de courtage traite des données personnelles par nature : identité, situation familiale,
données de santé dans certaines branches, données patrimoniales. La loi fédérale révisée sur la
protection des données a renforcé les obligations d'information et de sécurité. Cette page décrit ce
qui, dans le travail quotidien, fait la différence.</p>

<div class="section">
<h2>Quatre principes, traduits en gestes du cabinet</h2>
<table>
<tr><th>Principe</th><th>Ce que cela veut dire au quotidien</th></tr>
<tr><td>Finalité</td><td>Une donnée est collectée pour un motif précis — pas « au cas où »</td></tr>
<tr><td>Minimisation</td><td>On ne demande pas au preneur d'assurance ce qui n'est pas nécessaire au dossier</td></tr>
<tr><td>Sécurité</td><td>Accès limités aux personnes qui en ont besoin, liens de dépôt temporaires</td></tr>
<tr><td>Droits des personnes</td><td>Pouvoir dire ce qui est détenu, et le corriger</td></tr>
</table>
</div>

<h2>Ce que le produit fait pour rendre cela tenable</h2>
<ul>
<li><strong>Cloisonnement par cabinet</strong> — les données d'un cabinet ne sont pas accessibles depuis
un autre.</li>
<li><strong>Rôles</strong> — l'accès n'est pas le même pour tous les collaborateurs.</li>
<li><strong>Liens de dépôt temporaires</strong> — un accès limité dans le temps, rattaché à une demande
précise.</li>
<li><strong>Historique du dossier</strong> — ce qui a été reçu, produit et remis est daté.</li>
<li><strong>Sous-traitants listés</strong> — les prestataires techniques sont identifiés dans la
documentation relative aux sous-traitants.</li>
</ul>

<h2>Ce que le produit ne fait pas</h2>
<ul>
<li>Il ne remplace pas le <strong>registre des activités de traitement</strong> que le cabinet doit
tenir s'il y est soumis.</li>
<li>Il ne rédige pas les <strong>déclarations de protection des données</strong> du cabinet.</li>
<li>Il ne certifie aucune <strong>conformité</strong> : cette page décrit des mécanismes, pas une
attestation.</li>
</ul>

<h2>Le geste qui change le plus, concrètement</h2>
<p>Ne plus demander une pièce « au cas où ». La minimisation n'est pas un principe abstrait : chaque
pièce demandée sans nécessité est une donnée à protéger, à conserver et à justifier en plus.</p>
""",
    faq=[
        ("COURTIA est-il conforme à la nLPD ?",
         "Nous n'affirmons aucune conformité : les obligations sont celles du cabinet. Le produit apporte des mécanismes — cloisonnement, rôles, liens temporaires, historique — qui rendent le travail plus tenable."),
        ("Les données de dossier servent-elles à entraîner un modèle ?",
         "Non. Les données du cabinet servent à produire les réponses demandées dans le périmètre du cabinet."),
        ("Où sont traitées les données ?",
         "Sur une infrastructure tierce, décrite dans notre documentation. Nous ne revendiquons pas d'hébergement en Suisse, à la différence de certains éditeurs locaux."),
    ],
)
