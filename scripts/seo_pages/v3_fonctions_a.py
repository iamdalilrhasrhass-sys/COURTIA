#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v3_fonctions_a.py — VAGUE 4, groupe « fonctions du produit » (6 pages France, 1/2).

Source des décisions : appel TypeSafe réel `passL_fonctionnalites` du 22/09/2026
(/root/ark/seo_jev/preuves/20260922T152039Z_passL_fonctionnalites.json). Deux corrections de fait en
découlent, documentées :
  - SINISTRES : un appel antérieur avait jugé le sujet sans objet (0,17) parce que j'avais décrit le
    produit comme n'ayant pas de module sinistres. C'était faux (routes /api/claims). Rejugé : True, 0,79.
  - CONFORMITÉ : un module réel existe (routes /api/conformite : tableau de bord, checklist DDA par
    client, vérification KYC, mandats, journal d'audit). Rejugé : True, 0,91.

Règle de description : chaque page décrit ce que la fonction fait RÉELLEMENT (vérifié dans le code du
produit) et ce qu'elle ne fait pas. Aucune promesse de conformité, de tarification ou de résultat.
"""
from generate_seo_pillars import page


# Adaptateur : les pages de ce module sont écrites avec une signature lisible (intention, liens,
# mots-clés). Le moteur de rendu attend les clés du générateur (fil, maillage, faq) et reçoit le chemin
# séparément. L'adaptateur fait la traduction, sans toucher au contenu rédigé.
def fpage(chemin=None, intention=None, liens=None, motscles=None, **kw):
    kw.pop("chemin", None)
    fil_silo = "Suisse" if kw.get("marche") == "CH" else "France"
    prefixe = "/ch" if kw.get("marche") == "CH" else "/fr"
    kw["fil"] = [("Accueil", "/"), (fil_silo, prefixe), (kw["h1"][:48], "/" + chemin.strip("/"))]
    kw["maillage"] = [(titre, "/" + url.strip("/"), "à lire aussi") for url, titre in (liens or [])]
    return kw


PAGES = {}

PAGES["fr/sinistres-courtier-assurance"] = fpage(
    chemin="fr/sinistres-courtier-assurance",
    titre="Suivi des sinistres en cabinet de courtage — COURTIA",
    description="Déclarer, suivre et retrouver les sinistres de vos clients dans le même dossier que "
                "le contrat : historique, pièces, résumé assisté, relances.",
    h1="Suivre les sinistres sans sortir du dossier client",
    intention="Le courtier qui cherche comment suivre les sinistres de ses clients sans tenir un "
              "fichier à part, et qui veut retrouver l'historique au moment du renouvellement.",
    corps="""
<p>Un sinistre se traite vite et se retrouve des mois plus tard. Le problème n'est pas de déclarer :
c'est de garder, au même endroit, ce qui s'est passé, quand, avec quelles pièces, et où en est le
dossier — sans ouvrir un tableur parallèle ni fouiller sa boîte mail.</p>
<h2>Ce que le module sinistres fait exactement</h2>
<ul>
<li><strong>Déclarer un sinistre sur le dossier du client</strong> : le sinistre est rattaché à la
personne et au contrat concerné, pas à un dossier isolé.</li>
<li><strong>Suivre l'état du dossier</strong> : ce qui est ouvert, mis à jour, clos — et ce qui attend
une pièce ou une réponse.</li>
<li><strong>Résumé assisté</strong> : la situation du sinistre peut être résumée à partir des éléments
saisis, pour préparer un échange avec le client ou la compagnie.</li>
<li><strong>Pièces rattachées</strong> : constat, factures, photos, expertises — la collecte passe par
le même mécanisme de pièces que le reste du dossier.</li>
<li><strong>Historique disponible au renouvellement</strong> : ce qui s'est passé sur les deux
dernières années est visible au moment de reparler du contrat.</li>
</ul>
<h2>Ce que le module ne fait pas</h2>
<p>Il ne déclare pas à votre place auprès de la compagnie, ne gère pas la relation avec l'expert, ne
calcule pas d'indemnisation et ne remplace pas l'espace assureur. Il tient le dossier côté cabinet.</p>
<h2>Pourquoi c'est utile au renouvellement</h2>
<p>Un client dont le sinistre a été mal clos, ou dont la franchise n'était pas claire, revient toujours
au même moment : quand on lui parle d'argent. Avoir le dossier sous les yeux au moment de l'échéance
change la conversation — et évite la mauvaise surprise.</p>
""",
    faq=[
        ("Le sinistre est-il rattaché au contrat ou au client ?",
         "Aux deux : le sinistre appartient au client et référence le contrat concerné, ce qui permet "
         "de le retrouver par l'un ou par l'autre."),
        ("Faut-il saisir le sinistre à la main ?",
         "La création est manuelle — c'est le cabinet qui décide qu'un événement est un sinistre à "
         "suivre. Le résumé de situation est assisté, la qualification reste humaine."),
        ("Est-ce prévu pour les particuliers seulement ?",
         "Non : le dossier porte le client et ses contrats, quelle que soit la branche — un sinistre "
         "professionnel se suit exactement de la même manière."),
    ],
    liens=[("fr/logiciel-courtier-assurance", "Le logiciel de courtage, fonction par fonction"),
           ("fr/gestion-documentaire-courtier-assurance", "Gérer les pièces et les documents"),
           ("fr/relance-client-assurance", "Organiser les relances clients")],
    motscles=["suivi sinistres courtier", "gestion sinistres assurance", "dossier sinistre cabinet de courtage"],
)

PAGES["fr/conformite-courtier-assurance"] = fpage(
    chemin="fr/conformite-courtier-assurance",
    titre="Conformité du cabinet de courtage : DDA, KYC, mandats — COURTIA",
    description="Tableau de bord conformité, checklist DDA par client, vérification KYC, suivi des "
                "mandats et journal d'audit, sur les dossiers réellement tenus par le cabinet.",
    h1="Suivre la conformité sur les dossiers, pas dans un classeur",
    intention="Le responsable de cabinet qui doit montrer, dossier par dossier, que le devoir de "
              "conseil a été fait et que les pièces ont été vérifiées.",
    corps="""
<p>Un cabinet ne se juge pas sur l'existence d'une procédure, mais sur sa capacité à retrouver la
preuve, pour un client donné, qu'elle a été appliquée. C'est exactement ce que fait un suivi de
conformité tenu dans l'outil plutôt que dans un classeur.</p>
<h2>Ce que le module conformité fait exactement</h2>
<ul>
<li><strong>Tableau de bord conformité</strong> : l'état d'avancement des contrôles sur les dossiers du
cabinet.</li>
<li><strong>Checklist DDA par client</strong> : les points attendus au titre du devoir de conseil, avec
leur état, dossier par dossier.</li>
<li><strong>Vérification KYC</strong> : le suivi des éléments d'identification du client et de leur
contrôle.</li>
<li><strong>Suivi des mandats</strong> : ce qui a été signé, avec qui et quand.</li>
<li><strong>Journal d'audit</strong> : la trace des opérations, consultable après coup.</li>
</ul>
<h2>Ce que le module ne fait pas</h2>
<p>Il ne produit pas de conseil juridique, ne certifie pas votre conformité et ne remplace ni votre
conseil, ni les contrôles de l'organisme de tutelle. Il documente ce qui a été fait et quand — la
qualification des obligations applicables au cabinet reste votre décision.</p>
<h2>Ce que ça change le jour d'un contrôle</h2>
<p>La question posée est toujours la même : « montrez-moi, pour ce client, que vous avez fait ce que
vous deviez faire ». Un dossier qui contient la checklist, les pièces de vérification, le mandat et
l'historique des échanges répond en quelques minutes. Un dossier réparti entre un tableur, une boîte
mail et un scanner ne répond pas.</p>
""",
    faq=[
        ("Le produit garantit-il la conformité ?",
         "Non. Il organise et conserve la trace des contrôles. La conformité dépend des obligations qui "
         "s'appliquent au cabinet et de leur application réelle."),
        ("La checklist DDA est-elle la même pour tous les cabinets ?",
         "La checklist est portée par le produit ; le cabinet reste responsable de ce qu'il y ajoute "
         "selon son marché, son activité et ses contrôles internes."),
        ("Le journal d'audit conserve-t-il tout ?",
         "Il conserve la trace des opérations prévues pour cet usage. Il ne remplace pas une politique "
         "d'archivage propre au cabinet."),
    ],
    liens=[("fr/logiciel-courtier-assurance", "Le logiciel de courtage, fonction par fonction"),
           ("fr/guide/dda-15h", "Le guide DDA 15 heures"),
           ("fr/guide/audit-acpr", "Se préparer à un audit ACPR"),
           ("fr/gestion-documentaire-courtier-assurance", "Gérer les pièces et les documents")],
    motscles=["conformité courtier assurance", "checklist DDA", "audit log cabinet courtage", "KYC assurance"],
)

PAGES["fr/gestion-commissions-courtier-assurance"] = fpage(
    chemin="fr/gestion-commissions-courtier-assurance",
    titre="Gestion des commissions d'un cabinet de courtage — COURTIA",
    description="Suivre les commissions attendues et reçues, par contrat et par période, avec des "
                "règles de barème et l'import des relevés des compagnies.",
    h1="Savoir ce que les compagnies vous doivent, contrat par contrat",
    intention="Le courtier qui veut arrêter de rapprocher à la main les relevés des compagnies avec "
              "son propre suivi de portefeuille.",
    corps="""
<p>Le suivi des commissions est le point où un cabinet découvre, trop tard, qu'il a produit sans être
payé — ou qu'il a été payé sur un contrat qu'il ne suit plus. Deux séries de chiffres se rencontrent
rarement : ce que le cabinet croit avoir vendu, et ce que la compagnie dit avoir versé.</p>
<h2>Ce que le module commissions fait exactement</h2>
<ul>
<li><strong>Calcul par contrat</strong> : la commission attendue est calculée à partir du contrat et
des règles enregistrées.</li>
<li><strong>Calcul par période</strong> : le total attendu sur un mois, un trimestre ou une
période choisie.</li>
<li><strong>Règles de barème</strong> : les taux et les modalités sont paramétrés dans l'outil, et
restent modifiables.</li>
<li><strong>Import des relevés</strong> : un fichier de compagnie peut être importé pour être comparé
au suivi du cabinet.</li>
<li><strong>Statistiques</strong> : les écarts sautent aux yeux quand les deux sources sont côte à
côte.</li>
</ul>
<h2>Ce que le module ne fait pas</h2>
<p>Il n'encaisse rien, ne se connecte pas aux espaces compagnies et ne réclame pas les impayés à votre
place. Il rend l'écart visible ; la relance de la compagnie reste une action du cabinet.</p>
<h2>Le vrai gain</h2>
<p>Ce n'est pas de calculer plus vite : c'est de <em>voir</em>. Une commission non versée se découvre
en général des mois plus tard, quand le client a déjà changé de contrat et que la piste est froide.
Un écart visible le mois même se règle encore.</p>
""",
    faq=[
        ("Faut-il saisir les barèmes à la main ?",
         "Oui. Les règles sont propres à chaque cabinet et à chaque compagnie : le produit les applique, "
         "il ne les devine pas."),
        ("Le produit se connecte-t-il aux espaces compagnies ?",
         "Non. L'import se fait par fichier ; le suivi vit dans le cabinet."),
        ("Et en Suisse, avec des montants en francs ?",
         "Le suivi existe aussi pour le marché suisse, avec des montants en CHF et ses propres règles."),
    ],
    liens=[("fr/logiciel-courtier-assurance", "Le logiciel de courtage, fonction par fonction"),
           ("ch/gestion-commissions-courtier-assurance-suisse", "La version suisse, en francs"),
           ("fr/gestion-portefeuille-courtier", "Suivre tout le portefeuille")],
    motscles=["gestion commissions courtier", "suivi commissions assurance", "barème commission courtage"],
)

PAGES["fr/sante-portefeuille-courtier-assurance"] = fpage(
    chemin="fr/sante-portefeuille-courtier-assurance",
    titre="Santé du portefeuille : quels dossiers risquent de partir — COURTIA",
    description="Un brief du matin, des actions à traiter et un score de santé du portefeuille, "
                "calculés sur les dossiers, échéances et échanges réellement enregistrés.",
    h1="Voir, chaque matin, les dossiers qui demandent une action",
    intention="Le courtier qui veut arrêter de découvrir un départ de client une fois qu'il est parti.",
    corps="""
<p>Perdre un client ne se produit presque jamais par surprise : un contrat arrive à échéance sans
contact, une proposition reste sans réponse, un dossier n'a plus d'échange depuis longtemps. Le
problème est de le voir à temps, sur l'ensemble du portefeuille, plusieurs fois par semaine.</p>
<h2>Ce que la santé du portefeuille fait exactement</h2>
<ul>
<li><strong>Brief du matin</strong> : ce qui mérite une action aujourd'hui, présenté comme une liste de
travail, pas comme un tableau de bord décoratif.</li>
<li><strong>Actions à traiter</strong> : chaque ligne est une action, que l'on peut marquer comme
traitée — la liste se vide, elle ne s'accumule pas.</li>
<li><strong>Score de santé</strong> : un indicateur par dossier, calculé à partir des éléments
enregistrés (échéances, contacts, propositions).</li>
<li><strong>Historique</strong> : l'évolution du portefeuille dans le temps, pour repérer une dérive
plutôt qu'un accident.</li>
<li><strong>Préférences</strong> : le cabinet règle ce qu'il veut voir remonter.</li>
</ul>
<h2>Ce que ça ne fait pas</h2>
<p>Le score n'est pas une prophétie : il signale des situations à regarder, il ne prédit pas la
décision d'un client. Aucun chiffre n'est affiché si les données nécessaires ne sont pas présentes —
un écran vide veut dire « pas de donnée », pas « aucune risque ».</p>
<h2>Ce que ça change dans une semaine</h2>
<p>Au lieu de traiter les urgences annoncées par les clients — donc déjà perdues pour le cabinet — on
traite une liste courte, préparée la veille, où les dossiers sont encore rattrapables.</p>
""",
    faq=[
        ("D'où vient le score de santé ?",
         "Des données du cabinet : échéances, historique d'échanges, propositions en cours. Le détail "
         "est visible sur le dossier, pas caché dans une formule opaque."),
        ("Le produit prévient-il en cas de risque ?",
         "Le risque apparaît dans le brief et la liste d'actions, sur les dossiers qui remplissent les "
         "critères définis par le cabinet."),
        ("Est-ce que cela remplace le suivi des échéances ?",
         "Non, cela le complète : les échéances disent <em>quand</em> le contrat bouge, la santé du "
         "portefeuille dit <em>où regarder</em> aujourd'hui."),
    ],
    liens=[("fr/logiciel-courtier-assurance", "Le logiciel de courtage, fonction par fonction"),
           ("fr/gestion-portefeuille-courtier", "Le suivi de portefeuille"),
           ("fr/prioriser-dossiers-courtier-assurance", "Prioriser les dossiers"),
           ("fr/relance-client-assurance", "Organiser les relances clients")],
    motscles=["santé portefeuille assurance", "prévenir départ client courtier", "brief matin courtier"],
)

PAGES["fr/whatsapp-courtier-assurance"] = fpage(
    chemin="fr/whatsapp-courtier-assurance",
    titre="WhatsApp dans un cabinet de courtage : canal client suivi — COURTIA",
    description="Discussions WhatsApp reliées aux dossiers, envoi de messages et de modèles, rappels "
                "d'échéance — sans perdre la trace de ce qui a été dit à un client.",
    h1="Utiliser WhatsApp sans perdre l'historique du dossier",
    intention="Le courtier qui communique déjà avec ses clients sur WhatsApp et cherche à conserver "
              "la trace des échanges dans le dossier.",
    corps="""
<p>Le canal est déjà là : beaucoup de clients envoient une photo de carte grise ou une question par
WhatsApp, et le cabinet répond. Le problème n'est pas le canal, c'est la trace : ces échanges
n'existent plus pour le dossier, et le jour où l'on cherche « est-ce qu'on lui a bien dit ça ? », il
n'y a rien.</p>
<h2>Ce que l'intégration WhatsApp fait exactement</h2>
<ul>
<li><strong>Conversations reliées à un numéro</strong> : les échanges sont reçus par l'outil via
l'API WhatsApp Business, et rattachés au dossier correspondant.</li>
<li><strong>Envoi depuis le cabinet</strong> : un message peut être envoyé au client sans changer
d'outil.</li>
<li><strong>Modèles de messages</strong> : réponses types, pour ne pas réécrire la même chose.</li>
<li><strong>Rappel d'échéance</strong> : un rappel lié à une échéance de contrat peut partir par ce
canal.</li>
</ul>
<h2>Ce que cette intégration n'est pas</h2>
<p>Ce n'est pas une messagerie personnelle : elle passe par l'API WhatsApp Business, donc par un
compte professionnel déclaré, avec ses propres règles d'usage et de modération. Le produit n'envoie
aucun message automatique sans qu'une décision du cabinet ne déclenche l'envoi.</p>
<h2>Le bon critère pour l'utiliser</h2>
<p>Un canal professionnel se choisit sur ce qu'il laisse derrière lui. Si la conversation est
aujourd'hui hors dossier, la ramener dans le dossier — même en continuant à répondre depuis son
téléphone — suffit à changer la valeur de l'historique client.</p>
""",
    faq=[
        ("Faut-il un compte WhatsApp Business ?",
         "Oui, l'intégration repose sur l'API WhatsApp Business : un compte professionnel est "
         "nécessaire, avec les règles d'usage de WhatsApp."),
        ("Les messages partent-ils automatiquement ?",
         "Un rappel est déclenché par le cabinet — typiquement sur une échéance. Rien ne part sans "
         "décision humaine."),
        ("Les échanges sont-ils visibles sur le dossier du client ?",
         "Oui, c'est tout l'intérêt : les conversations sont rattachées au numéro et donc au dossier."),
    ],
    liens=[("fr/logiciel-courtier-assurance", "Le logiciel de courtage, fonction par fonction"),
           ("fr/relance-client-assurance", "Organiser les relances clients"),
           ("fr/gestion-documentaire-courtier-assurance", "Collecter les pièces du client")],
    motscles=["whatsapp courtier assurance", "whatsapp business assurance", "relance whatsapp client"],
)

PAGES["fr/dicter-compte-rendu-appel-assurance"] = fpage(
    chemin="fr/dicter-compte-rendu-appel-assurance",
    titre="Dicter un compte rendu d'appel et préremplir la fiche — COURTIA",
    description="Déposer un enregistrement d'appel : il est transcrit, les informations utiles sont "
                "extraites, et vous validez le préremplissage de la fiche client.",
    h1="Dicter après un appel au lieu de tout saisir",
    intention="Le courtier qui raccroche et doit encore saisir ; qui veut dicter son compte rendu "
              "pendant que le contexte est frais, et valider ensuite.",
    corps="""
<p>La saisie après appel est le moment où l'information est encore fraîche et où le temps manque. Le
portable est dans la main : il est plus rapide de dicter trente secondes que d'ouvrir un formulaire.</p>
<h2>Ce que la prise vocale fait exactement</h2>
<ul>
<li><strong>Déposer un enregistrement</strong> dans l'outil, depuis le téléphone ou l'ordinateur.</li>
<li><strong>Transcription automatique</strong> de l'audio en texte.</li>
<li><strong>Extraction des informations utiles</strong> (ce dont on a parlé, les éléments à retenir)
pour préparer la fiche.</li>
<li><strong>Préremplissage</strong> : les champs proposés sont revus par le courtier, qui applique —
ou corrige — ce qui doit entrer dans le dossier.</li>
<li><strong>Conservation de l'entrée</strong> : la transcription et l'audio restent disponibles pour
être repris plus tard.</li>
</ul>
<h2>Ce que la fonction ne fait pas</h2>
<p>Elle n'enregistre pas vos appels à votre insu : vous fournissez l'audio. Elle ne décide pas de ce
qui est vrai — le préremplissage est proposé, jamais appliqué sans validation. Et elle ne remplace pas
un compte rendu rédigé quand le dossier l'exige.</p>
<h2>Un usage réaliste</h2>
<p>Trois usages tiennent dans une semaine de cabinet : le compte rendu d'appel, la reformulation après
un rendez-vous, et la note de synthèse d'un dossier complexe. Dans les trois cas, l'intérêt est le
même : ne plus perdre ce qui a été dit faute de temps pour l'écrire.</p>
""",
    faq=[
        ("Faut-il installer une application ?",
         "Le dépôt se fait dans l'outil, depuis un appareil qui peut enregistrer. Le fichier audio est "
         "ensuite traité côté produit."),
        ("Le préremplissage est-il fiable ?",
         "Il est <em>proposé</em> : le courtier relit et applique. C'est une aide à la saisie, pas une "
         "écriture automatique du dossier."),
        ("Que devient l'enregistrement ?",
         "Il est conservé avec sa transcription pour pouvoir être repris ou audité plus tard."),
    ],
    liens=[("fr/logiciel-courtier-assurance", "Le logiciel de courtage, fonction par fonction"),
           ("fr/ia-courtier-assurance", "Ce que l'IA fait réellement dans COURTIA"),
           ("fr/ia-gestion-documentaire-assurance", "Extraire des données d'un document"),
           ("fr/mesurer-temps-administratif-cabinet", "Mesurer son temps administratif")],
    motscles=["dicter compte rendu appel courtier", "transcription appel assurance", "saisie vocale courtage"],
)
