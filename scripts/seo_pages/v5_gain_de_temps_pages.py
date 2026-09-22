#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v5_gain_de_temps_pages.py — les six pages du cluster « gagner du temps ».

Grille identique sur chaque tâche : problème → process manuel → process optimisé → automatisation
possible → ce que COURTIA fait réellement → ce qui reste humain. Aucun chiffre de temps inventé.
"""
PAGES = {}


def fpage(chemin=None, intention=None, liens=None, motscles=None, **kw):
    kw.pop("chemin", None)
    kw["fil"] = [("Accueil", "/"), ("France", "/fr"),
                 ("Gagner du temps", "/fr/gagner-du-temps-courtier-assurance"),
                 (kw["h1"][:44], "/" + chemin.strip("/"))]
    kw["maillage"] = [(titre, "/" + url.strip("/"), "à lire aussi") for url, titre in (liens or [])]
    return kw


def t(probleme, manuel, optimise, automatisable, courtia, humain):
    return (f"\n<h2>{probleme}</h2>\n<ul>\n"
            f"<li><strong>Process manuel :</strong> {manuel}</li>\n"
            f"<li><strong>Process optimisé :</strong> {optimise}</li>\n"
            f"<li><strong>Automatisation possible :</strong> {automatisable}</li>\n"
            f"<li><strong>Ce que COURTIA fait réellement :</strong> {courtia}</li>\n"
            f"<li><strong>Ce qui reste humain :</strong> {humain}</li>\n</ul>\n")


PAGES["fr/gain-de-temps/temps-administratif-et-double-saisie"] = fpage(
    chemin="fr/gain-de-temps/temps-administratif-et-double-saisie",
    intention="Le courtier qui ressaisit les mêmes informations d'un outil à l'autre et qui cherche "
              "comment arrêter, sans perdre la traçabilité du dossier.",
    liens=[("fr/gagner-du-temps-courtier-assurance", "Le hub gagner du temps"),
           ("fr/reduire-double-saisie-cabinet-courtage", "Réduire la double saisie"),
           ("fr/import-portefeuille-courtier-assurance", "Reprendre un portefeuille existant"),
           ("fr/mesurer-temps-administratif-cabinet", "Mesurer son temps administratif")],
    motscles=["double saisie courtier assurance", "temps administratif cabinet courtage", "saisie contrat assurance"],
    titre="Temps administratif et double saisie — gagner du temps au cabinet",
    description="Trois tâches administratives passées à la grille : saisie d'un contrat, ressaisie entre "
                "outils, classement d'une pièce. Process manuel, process optimisé, ce qui est "
                "automatisable, ce qui reste humain.",
    h1="Saisie d'un contrat, ressaisie entre outils, classement : trois tâches à reprendre",
    corps=("""
<p>Le temps administratif d'un cabinet ne vient pas d'une seule grosse tâche, mais de dizaines de
petites opérations répétées sur chaque dossier. Trois d'entre elles concentrent l'essentiel du
gaspillage parce qu'elles sont faites deux fois ou pas au bon moment.</p>
"""
    + t("Saisir les informations d'un nouveau contrat",
        "les données sont relevées sur le document du client ou de la compagnie, puis recopiées dans le "
        "dossier, avec un risque d'erreur sur les dates, les montants et les références.",
        "on saisit une fois, dans un dossier qui porte déjà le client, et l'échéance est enregistrée "
        "en même temps que le contrat — pas plus tard « quand on aura le temps ».",
        "le relevé des données d'un document (pièce d'identité, carte grise, document bancaire) peut être "
        "proposé automatiquement, puis validé.",
        "extraction de données des documents pris en charge (RIB, carte grise, pièces administratives) "
        "avec application manuelle par le courtier ; contrat et échéance dans le même dossier client.",
        "la vérification de ce qui a été relevé et l'appréciation du contrat.")
    + t("Ressaisir la même donnée dans plusieurs outils",
        "le contrat existe dans l'outil métier, dans un tableur de suivi et parfois dans un outil de "
        "facturation : trois versions de la même réalité, aucune ne fait autorité.",
        "on désigne une source unique par nature d'information — le dossier métier pour le contrat et "
        "l'échéance — et les autres usages s'y rapportent, par export plutôt que par recopie.",
        "un export ou un import peut remplacer la recopie ; la déduplication, elle, reste une décision.",
        "commissions calculées depuis les contrats déjà saisis, avec barèmes et import des relevés ; "
        "import de portefeuille pour reprendre l'existant ; aucune ressaisie des contrats pour la partie "
        "commissions.",
        "le choix de la source de vérité, et l'arbitrage quand deux sources se contredisent.")
    + t("Classer une pièce reçue",
        "la pièce arrive par mail, elle est enregistrée dans un dossier local ou imprimée, et le dossier "
        "du client n'en garde aucune trace — ou une trace introuvable au moment où elle compte.",
        "les pièces sont demandées par un canal unique et rattachées au dossier au moment où elles "
        "arrivent, avec leur date et leur état.",
        "la réception peut être déclenchée par une demande de pièces liée à un dossier, avec suivi de ce "
        "qui manque.",
        "dépôt de pièces par lien transmis au client, boîte de réception documentaire, rattachement au "
        "dossier, état de la demande et des pièces reçues.",
        "juger si la pièce est conforme, complète et suffisante — le produit ne tranche pas à votre "
        "place.")
    + """
<h2>Le principe à retenir</h2>
<p>Sur les trois tâches, la même règle s'applique : <strong>une information, un endroit, une date</strong>.
Tout ce qui est recopié finit par diverger, et toute divergence se paie au moment d'un contrôle, d'un
renouvellement ou d'un désaccord avec un client.</p>
<p>Pour savoir si le sujet vous concerne, mesurez d'abord : le
<a href="/fr/outils/calculateur-temps-administratif">calculateur de temps administratif</a> part de vos
propres comptages et affiche ses hypothèses.</p>
"""
    ),
    faq=[
        ("L'extraction de documents remplace-t-elle la saisie ?",
         "Non : elle propose les données, le courtier valide. L'objectif est de supprimer la recopie, pas "
         "le contrôle."),
        ("Faut-il supprimer le tableur de suivi ?",
         "Pas forcément d'un coup : il faut décider par nature d'information quelle source fait autorité, "
         "sinon les deux resteront vivantes en parallèle."),
        ("Est-ce que cela empêche les erreurs ?",
         "Cela en supprime une partie — celles qui viennent de la recopie. Les erreurs de jugement "
         "restent, et c'est normal : elles sont le métier."),
    ],
)

PAGES["fr/gain-de-temps/relances-et-suivi-client"] = fpage(
    chemin="fr/gain-de-temps/relances-et-suivi-client",
    intention="Le courtier qui sait qu'il devrait relancer davantage et qui cherche un process tenable "
              "plutôt qu'une bonne intention.",
    liens=[("fr/gagner-du-temps-courtier-assurance", "Le hub gagner du temps"),
           ("fr/relance-client-assurance", "Les relances dans COURTIA"),
           ("fr/guide/automatiser-relances-courtier", "Le guide pour automatiser ses relances"),
           ("fr/gain-de-temps/documents-et-pieces", "Documents et pièces")],
    motscles=["relance client courtier assurance", "relance devis assurance", "suivi prospect courtage"],
    titre="Relances et suivi client — gagner du temps au cabinet",
    description="Relance d'une pièce manquante, relance d'un devis, suivi d'un prospect : les trois "
                "tâches passées à la grille, avec ce qui est automatisable et ce qui reste au courtier.",
    h1="Relancer sans y penser : trois tâches, un seul principe",
    corps=("""
<p>Une relance n'est presque jamais oubliée par négligence : elle est oubliée parce qu'elle dépend de la
mémoire de quelqu'un. Le principe qui tient dans la durée est simple : <strong>une relance doit avoir un
déclencheur et une trace</strong>, jamais un rappel mental.</p>
"""
    + t("Relancer un client pour une pièce manquante",
        "on s'aperçoit du manque en préparant le dossier, on envoie un message, et si le client ne "
        "répond pas on ne le sait qu'au moment où cela bloque.",
        "la demande de pièces est rattachée au dossier avec un état (demandée, reçue, manquante), et la "
        "relance se fait sur l'état, pas sur la mémoire.",
        "la relance peut être préparée automatiquement quand une pièce est toujours manquante ; l'envoi "
        "reste une décision du cabinet.",
        "demande de pièces par lien avec suivi d'état, préparation de relance dans le dossier, envoi "
        "déclenché par le cabinet, y compris par WhatsApp lorsque le canal est configuré.",
        "le ton du message et le choix du moment — un client qui vient de vivre un décès ne se relance "
        "pas comme un client qui a oublié une carte grise.")
    + t("Relancer après l'envoi d'un devis",
        "le devis part, puis on attend une réponse qui n'arrive pas toujours ; la relance dépend du "
        "souvenir de la personne qui a envoyé la proposition.",
        "une proposition envoyée a un état et une date de relance ; la question n'est plus « faut-il "
        "relancer ? » mais « qu'est-ce qui est en attente de réponse ? ».",
        "la préparation du message de relance et la détection des propositions sans réponse sont "
        "automatisables ; le contenu final reste validé.",
        "propositions suivies avec leur état, modèles de messages, préparation de relance dans le "
        "dossier, aucune expédition automatique.",
        "la décision de relancer, le contenu commercial et la réponse aux objections du client.")
    + t("Suivre un prospect jusqu'à la décision",
        "le prospect est noté quelque part, puis plus rien : la prochaine interaction dépend d'un appel "
        "entrant ou d'une échéance totalement externe.",
        "chaque prospect a une étape et une prochaine action datée — même si cette action est « ne rien "
        "faire avant trois mois ».",
        "la détection des prospects sans action depuis trop longtemps est automatisable ; l'étape "
        "suivante peut être proposée à partir de la configuration du cabinet.",
        "pipeline avec statuts, suivi visuel par étapes selon l'offre, tâches rattachées, propositions "
        "suivies.",
        "l'appréciation du prospect : un dossier sans réponse depuis deux mois n'a pas la même valeur "
        "qu'un dossier en attente de pièce.")
    + """
<h2>Ce qui fait tenir un process de relance</h2>
<p>Trois conditions, dans cet ordre : <strong>un état</strong> (que relance-t-on ?), <strong>une date</strong>
(quand ?), <strong>un responsable</strong> (qui ?). Sans les trois, on retombe sur la bonne intention du
lundi matin. Le <a href="/fr/workflows-courtier-assurance">recueil de processus</a> détaille celui de la
relance de devis, étape par étape.</p>
"""
    ),
    faq=[
        ("Les relances partent-elles toutes seules ?",
         "Non. Le produit détecte et prépare ; l'envoi est déclenché par le cabinet. Une relance envoyée "
         "sans validation est un risque commercial avant d'être un gain."),
        ("Combien de relances prévoir pour un devis ?",
         "Il n'existe pas de nombre universel : cela dépend du produit, du client et du contexte. Ce qui "
         "compte est d'avoir décidé à l'avance ce qui se passe à chaque étape."),
        ("Faut-il relancer par e-mail ou par téléphone ?",
         "Les deux, selon le client et l'enjeu. Un message écrit garde la trace ; un appel fait avancer "
         "un dossier bloqué. Le process doit prévoir les deux cas."),
    ],
)

PAGES["fr/gain-de-temps/documents-et-pieces"] = fpage(
    chemin="fr/gain-de-temps/documents-et-pieces",
    intention="Le cabinet qui court après les pièces de ses clients et qui cherche à ce que la demande "
              "et la réception ne dépendent plus de sa propre insistance.",
    liens=[("fr/gagner-du-temps-courtier-assurance", "Le hub gagner du temps"),
           ("fr/gestion-documentaire-courtier-assurance", "La gestion documentaire dans COURTIA"),
           ("fr/ia-gestion-documentaire-assurance", "L'extraction de données des documents"),
           ("fr/checklists/collecte-documentaire", "La checklist de collecte documentaire")],
    motscles=["collecte pièces client assurance", "gestion documentaire courtier", "demande de pièces"],
    titre="Documents et pièces : collecter, classer, exploiter — gagner du temps",
    description="La collecte des pièces, le classement et l'exploitation des données : trois tâches du "
                "cabinet passées à la grille, avec ce que le produit fait réellement.",
    h1="Collecter, classer, exploiter une pièce : trois moments, trois problèmes",
    corps=("""
<p>Une pièce coûte du temps trois fois : quand on la demande, quand elle arrive et qu'il faut la
retrouver, et quand il faut y prendre une information. La plupart des cabinets optimisent l'un des trois
moments et subissent les deux autres.</p>
"""
    + t("Demander une pièce au client",
        "la demande se fait par mail ou par téléphone, dans les mots du courtier ; si le client ne "
        "répond pas, il faut s'en souvenir et recommencer.",
        "la demande est rattachée au dossier, avec la liste exacte de ce qui est attendu et un état "
        "visible ; le client sait ce qu'on attend de lui.",
        "la demande peut être envoyée par un lien dédié, et l'état de réception est suivi sans "
        "intervention.",
        "demande de pièces par lien, dépôt par le client, suivi de ce qui est reçu et de ce qui manque, "
        "relance préparée depuis le dossier.",
        "la reformulation des pièces réellement nécessaires selon la situation, et la relation quand le "
        "client est en difficulté.")
    + t("Retrouver une pièce au moment où elle compte",
        "on sait qu'on l'a reçue, mais on ne sait plus où : boîte mail, dossier local, scanner. Le temps "
        "de recherche est du temps sans valeur ajoutée.",
        "toute pièce reçue entre dans le dossier au moment où elle arrive, avec sa date et son objet.",
        "le rattachement automatique à un dossier à partir d'une demande connue est possible.",
        "documents rattachés au dossier client, avec leur date ; boîte de réception documentaire pour ce "
        "qui arrive par ailleurs.",
        "la qualification de la pièce : est-ce la bonne, est-elle à jour, couvre-t-elle la période ?")
    + t("Exploiter une information contenue dans la pièce",
        "les données utiles (un IBAN, une immatriculation, une référence de contrat) sont recopiées à la "
        "main dans le dossier, avec le risque d'erreur de recopie qui va avec.",
        "on ne recopie plus : l'information est lue dans le document et appliquée au dossier en un geste, "
        "après vérification.",
        "le relevé automatique des données est possible sur les types de documents pris en charge.",
        "extraction des données (RIB, carte grise, pièces administratives), proposition de valeurs, "
        "application par le courtier, résultat conservé.",
        "la vérification et l'interprétation — un IBAN lu correctement peut quand même être celui d'un "
        "compte qui n'a rien à voir avec le dossier.")
    + """
<h2>Le test qui dit si le sujet est réel</h2>
<p>Prenez trois dossiers au hasard et cherchez une pièce précise : le contrat, la pièce d'identité, le "
"dernier échange. Si le temps de recherche dépasse le temps d'utilisation, le problème n'est pas le "
"nombre de pièces — c'est qu'elles vivent en dehors du dossier.</p>
"""
    ),
    faq=[
        ("Le client peut-il déposer ses pièces sans compte ?",
         "Oui : le dépôt se fait par un lien transmis au client, sans création de compte de son côté."),
        ("Les pièces sont-elles accessibles à toute l'équipe ?",
         "Les accès sont cloisonnés par cabinet et par rôle ; le partage suit la structure du cabinet."),
        ("Que se passe-t-il si une pièce est obsolète ?",
         "Elle reste dans l'historique du dossier avec sa date ; c'est l'état de la demande qui indique ce "
         "qui est attendu."),
    ],
)

PAGES["fr/gain-de-temps/renouvellements-et-echeances"] = fpage(
    chemin="fr/gain-de-temps/renouvellements-et-echeances",
    intention="Le courtier qui veut arrêter de découvrir ses échéances et qui cherche à traiter les "
              "renouvellements par paliers.",
    liens=[("fr/gagner-du-temps-courtier-assurance", "Le hub gagner du temps"),
           ("fr/guide/organiser-renouvellements-courtier", "Le guide des renouvellements"),
           ("fr/gestion-portefeuille-courtier", "Le suivi de portefeuille"),
           ("fr/logiciel-courtier-renouvellements", "Les renouvellements dans COURTIA")],
    motscles=["gestion renouvellements assurance", "échéances contrats courtier", "renouvellement portefeuille"],
    titre="Renouvellements et échéances — gagner du temps au cabinet",
    description="Détecter une échéance, préparer un renouvellement, comparer des propositions : trois "
                "tâches passées à la grille, du process manuel au process tenu.",
    h1="Détecter, préparer, comparer : le renouvellement en trois temps",
    corps=("""
<p>Le renouvellement est le moment où un cabinet gagne ou perd un client sans s'en apercevoir. Ce n'est
pas la date qui pose problème : c'est l'absence de palier entre « rien » et « c'est demain ».</p>
"""
    + t("Savoir ce qui arrive à échéance",
        "on découvre les échéances dans l'agenda, dans un tableur ou quand le client appelle ; certaines "
        "n'apparaissent qu'une fois passées.",
        "toutes les échéances vivent dans le dossier du contrat, et une vue les rassemble par période : "
        "la question devient « combien de dossiers ce trimestre ? ».",
        "le calcul et le regroupement des échéances sont automatiques dès qu'elles sont enregistrées ; "
        "l'alerte peut remonter dans une liste de travail quotidienne.",
        "échéances portées par chaque contrat, vue par période, brief du matin avec les actions à "
        "traiter, score de santé du portefeuille.",
        "décider ce qu'on fait de l'échéance : renouveler sans changement, revoir les garanties, ou "
        "laisser partir.")
    + t("Préparer un renouvellement",
        "on recherche l'historique, on demande les informations manquantes au client à la dernière "
        "minute, et la préparation se fait sous pression.",
        "le travail est découpé en paliers : repérer à trois mois, qualifier à deux mois, demander les "
        "pièces à six semaines, comparer à un mois.",
        "la préparation de la demande d'informations et la détection des dossiers sans réponse sont "
        "automatisables.",
        "vue des échéances par palier, état des pièces, propositions suivies, tâches rattachées au "
        "dossier.",
        "la conversation commerciale et le conseil : ce que l'on propose, et pourquoi.")
    + t("Comparer des propositions",
        "les propositions arrivent par mail, dans des formats différents ; la comparaison se fait de "
        "mémoire ou sur un tableau refait à la main.",
        "les propositions sont enregistrées dans le dossier du client avec leurs éléments, et la "
        "comparaison porte sur des critères définis à l'avance.",
        "la mise en forme et l'analyse assistée des propositions sont automatisables.",
        "comparateur de propositions, devis et registre, propositions conservées dans le dossier.",
        "l'arbitrage final et l'explication du choix au client — c'est le cœur du devoir de conseil.")
    + """
<h2>Le palier qui change tout</h2>
<p>Sur les trois tâches, c'est le découpage en paliers qui produit l'effet : un dossier « repéré à trois
mois » ne se traite pas comme un dossier « échéance dans dix jours ». Le
<a href="/fr/guide/organiser-renouvellements-courtier">guide des renouvellements</a> détaille les paliers
J-90 à J-0.</p>
"""
    ),
    faq=[
        ("Où sont enregistrées les échéances ?",
         "Sur le contrat, dans le dossier du client : c'est ce qui permet de les regrouper par période "
         "sans tenue d'une liste parallèle."),
        ("Le client est-il prévenu automatiquement ?",
         "Non. Le produit prépare et signale ; le cabinet décide du contact et de son moment."),
        ("Et les échéances déjà passées qu'on découvre ?",
         "Elles doivent être enregistrées quand même : sans date saisie, la même découverte se reproduira "
         "l'an prochain."),
    ],
)

PAGES["fr/gain-de-temps/sinistres-et-conformite"] = fpage(
    chemin="fr/gain-de-temps/sinistres-et-conformite",
    intention="Le cabinet qui doit prouver ce qu'il a fait, sur un sinistre comme sur un devoir de "
              "conseil, et qui ne veut pas reconstituer un dossier au moment du contrôle.",
    liens=[("fr/gagner-du-temps-courtier-assurance", "Le hub gagner du temps"),
           ("fr/sinistres-courtier-assurance", "Le suivi des sinistres"),
           ("fr/conformite-courtier-assurance", "La conformité dans COURTIA"),
           ("fr/checklists/suivi-sinistre", "La checklist de suivi de sinistre")],
    motscles=["suivi sinistre courtier", "conformité courtier assurance", "devoir de conseil preuve"],
    titre="Sinistres et conformité — gagner du temps au cabinet",
    description="Suivre un sinistre, documenter le devoir de conseil, préparer un contrôle : trois tâches "
                "traitées à la grille, avec ce qui est automatisable et ce qui ne l'est pas.",
    h1="Sinistre, devoir de conseil, contrôle : arrêter de reconstituer les dossiers",
    corps=("""
<p>Ces trois tâches ont un point commun : elles se paient plus tard. Le sinistre se retrouve au
renouvellement, le devoir de conseil se prouve lors d'un contrôle, et le contrôle arrive sans prévenir.
Le temps perdu est celui de la reconstitution.</p>
"""
    + t("Suivre un sinistre pendant son instruction",
        "le suivi vit dans la boîte mail et dans la mémoire : quand le client rappelle, il faut retrouver "
        "où en est le dossier.",
        "le sinistre est rattaché au client et au contrat, avec son état et ses pièces ; l'historique "
        "reste consultable même des mois après.",
        "les changements d'état peuvent être signalés sans recherche ; le résumé de situation peut être "
        "préparé automatiquement à partir des éléments saisis.",
        "sinistres rattachés au dossier, états suivis, pièces conservées, résumé de situation pour "
        "préparer un échange.",
        "la relation avec le client et l'expert, et l'appréciation de ce qui est couvert.")
    + t("Documenter le devoir de conseil",
        "les preuves existent mais dispersées : un mail par-ci, un document signé par-là, une note dans un "
        "cahier.",
        "chaque dossier porte l'état des points attendus, avec les pièces associées et leurs dates.",
        "l'état peut être suivi par dossier et consolidé dans un tableau de bord ; le journal des "
        "opérations est tenu par le produit.",
        "checklist par client au titre du devoir de conseil, vérification KYC, suivi des mandats, journal "
        "d'audit.",
        "la qualification des obligations applicables au cabinet et l'appréciation du conseil donné — le "
        "produit ne produit aucun conseil juridique et ne certifie aucune conformité.")
    + t("Préparer un contrôle",
        "on cherche les pièces au dernier moment, dossier par dossier, avec l'impression de découvrir sa "
        "propre organisation.",
        "on interroge l'outil sur l'état des contrôles internes, et l'on traite les dossiers incomplets "
        "avant la visite, pas pendant.",
        "l'extraction de l'état des contrôles est automatisable ; le jugement sur ce qui manque reste "
        "interne.",
        "tableau de bord de conformité, état par client, journal d'audit consultable.",
        "la décision de ce qu'on corrige, et l'explication au contrôleur.")
    + """
<h2>Le principe à retenir</h2>
<p>Une pièce de preuve produite dans le flux de travail ne coûte presque rien ; la même pièce "
"reconstituée coûte des heures. C'est vrai pour un sinistre comme pour un devoir de conseil.</p>
"""
    ),
    faq=[
        ("Le produit garantit-il la conformité du cabinet ?",
         "Non, et aucun logiciel ne le peut : il documente ce qui a été fait et quand. La conformité "
         "dépend des obligations applicables et de leur application."),
        ("Le journal d'audit remplace-t-il une politique d'archivage ?",
         "Non. Il conserve une trace des opérations prévues pour cet usage ; la durée de conservation "
         "relève de la politique du cabinet."),
        ("Un sinistre clos reste-t-il visible ?",
         "Oui, il reste rattaché au dossier avec son historique, ce qui permet d'en tenir compte au "
         "renouvellement."),
    ],
)

PAGES["fr/gain-de-temps/commissions-et-pilotage"] = fpage(
    chemin="fr/gain-de-temps/commissions-et-pilotage",
    intention="Le responsable de cabinet qui veut savoir ce qui doit rentrer, ce qui se fait aujourd'hui "
              "et ce qui part en premier.",
    liens=[("fr/gagner-du-temps-courtier-assurance", "Le hub gagner du temps"),
           ("fr/gestion-commissions-courtier-assurance", "Les commissions dans COURTIA"),
           ("fr/reporting-pilotage-cabinet-courtage", "Le pilotage du cabinet"),
           ("fr/sante-portefeuille-courtier-assurance", "La santé du portefeuille")],
    motscles=["commissions courtier assurance", "pilotage cabinet courtage", "priorisation dossiers courtier"],
    titre="Commissions et pilotage — gagner du temps au cabinet",
    description="Rapprocher les commissions, produire un reporting utile, décider par quoi commencer la "
                "journée : trois tâches passées à la grille.",
    h1="Commissions, reporting, priorités : les trois boucles de la direction",
    corps=("""
<p>Ces trois tâches ne s'adressent pas au même moment de la journée, mais elles reposent sur la même
matière : ce qui est réellement enregistré dans les dossiers. Sans cela, elles consomment du temps de
reconstitution.</p>
"""
    + t("Rapprocher les commissions attendues et reçues",
        "les relevés des compagnies arrivent par mail, dans des formats différents ; le rapprochement se "
        "fait à la main, souvent plusieurs mois plus tard, quand personne ne se souvient du dossier.",
        "les règles de commission sont enregistrées une fois, la commission attendue se calcule à partir "
        "du contrat, et l'import d'un relevé se compare au suivi.",
        "le calcul par contrat et par période est automatique dès que les règles existent ; l'import du "
        "relevé ne demande plus de recopie.",
        "barèmes et règles, calcul par contrat et par période, import des relevés, statistiques "
        "d'écart.",
        "la relance de la compagnie et l'arbitrage en cas de désaccord — le produit rend l'écart visible, "
        "il ne réclame rien à votre place.")
    + t("Produire un reporting qui serve à décider",
        "les chiffres sont reconstruits chaque mois à partir de plusieurs sources, avec des définitions "
        "qui changent selon la personne qui les prépare.",
        "les indicateurs sont calculés toujours de la même façon, depuis les dossiers saisis ; ce qui "
        "n'est pas calculable ne s'affiche pas.",
        "l'agrégation est automatique ; l'interprétation reste une lecture humaine.",
        "pilotage du cabinet, commissions, activité par collaborateur, vue des échéances et des "
        "propositions.",
        "l'interprétation et la décision : un écart de production n'a pas la même cause selon les dossiers "
        "concernés.")
    + t("Décider par quoi commencer la journée",
        "on commence par ce qui sonne : le téléphone, l'urgence du client, le mail le plus récent — pas "
        "nécessairement ce qui a le plus d'enjeu.",
        "une liste courte est préparée à partir des échéances, des propositions sans réponse et des "
        "dossiers sans contact depuis longtemps.",
        "la constitution de la liste est automatique ; les critères sont définis par le cabinet.",
        "brief du matin avec actions à traiter, score de santé par dossier, historique des insights.",
        "la priorisation finale : un dossier « à risque » selon l'indicateur peut être un client "
        "stratégique qu'on ne veut pas bousculer cette semaine.")
    + """
<h2>Ce que ces trois tâches ont en commun</h2>
<p>Elles transforment des données de travail en décisions. C'est pour cela qu'elles échouent quand le "
"dossier n'est pas tenu, et qu'elles deviennent rapides quand il l'est — sans qu'aucune magie "
"n'intervienne.</p>
"""
    ),
    faq=[
        ("Le produit calcule-t-il les commissions sans barèmes saisis ?",
         "Non. Les règles sont propres à chaque cabinet et à chaque compagnie : le produit les applique, "
         "il ne les devine pas."),
        ("Le reporting est-il personnalisable ?",
         "Le cabinet règle ce qu'il veut voir remonter ; les indicateurs non calculables restent "
         "masqués plutôt que d'afficher un zéro trompeur."),
        ("La liste d'actions remplace-t-elle l'agenda ?",
         "Non : l'agenda dit quand vous êtes pris, la liste dit ce qui mérite une action aujourd'hui."),
    ],
)
