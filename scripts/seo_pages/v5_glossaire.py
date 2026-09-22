#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v5_glossaire.py — GLOSSAIRE MÉTIER (hub France + quinze entrées + hub suisse).

Règle 11 de la mission : pas de définitions générées en masse. Chaque entrée retenue porte une
définition courte, un contexte de courtage, un exemple, l'erreur fréquente, les liens utiles et la
fonction COURTIA concernée. Les entrées choisies sont celles qui servent réellement dans un cabinet.

Décision suisse : `passQ_suisse` — glossaire suisse true 0,89, avec la terminologie réellement employée
(intermédiaire, courtier lié, rétrocession, journal de conseil...). Les entrées suisses vivent sur une page
unique, pour éviter la production de pages minces qui n'apporteraient rien de plus.
"""
PAGES = {}


def fpage(chemin=None, intention=None, liens=None, motscles=None, fil=None, **kw):
    kw.pop("chemin", None)
    kw["fil"] = fil or [("Accueil", "/"), ("France", "/fr"), ("Glossaire", "/fr/glossaire/"),
                        (kw["h1"][:38], "/" + chemin.strip("/"))]
    kw["maillage"] = [(titre, "/" + url.strip("/"), "à lire aussi") for url, titre in (liens or [])]
    return kw


TERMES = {
    "courtier-assurance": dict(
        titre="Courtier d'assurance",
        definition="Intermédiaire qui présente des contrats d'assurance et conseille son client, en "
                   "principe auprès de plusieurs compagnies, sans être lié à une seule.",
        contexte="Le courtier est choisi par le client ; c'est cette relation qui distingue son travail de "
                 "celui du mandataire, qui agit pour une ou plusieurs compagnies. Elle explique aussi "
                 "pourquoi un cabinet tient un dossier client complet : sa valeur est là.",
        exemple="Un cabinet recherche des propositions auprès de trois compagnies pour la multirisque d'un "
                "client, puis explique pourquoi l'une est mieux adaptée à son activité.",
        erreur="Confondre courtier et mandataire, puis organiser son suivi comme celui d'une agence : les "
               "mandats, le devoir de conseil et la traçabilité se posent différemment.",
        liens=[("fr/courtia-logiciel-courtage-assurance", "COURTIA : éditeur et périmètre"),
               ("fr/logiciel-courtier-mandataire", "Logiciel pour mandataire d'assurance"),
               ("fr/evaluer-crm-courtier-assurance", "Comment évaluer un CRM")],
        fonction="Dossier client, contrats et échéances, propositions comparées, devis et registre."),
    "logiciel-courtier": dict(
        titre="Logiciel de courtier (CRM de courtage)",
        definition="Application qui concentre le travail d'un cabinet de courtage : dossiers clients, "
                   "contrats et échéances, propositions, documents, relances, commissions et suivi.",
        contexte="Le marché utilise indifféremment « logiciel de courtage », « CRM courtier » ou « outil "
                 "courtier ». L'usage réel d'un cabinet tranche : ce qui compte est le nombre de tâches qui "
                 "vivent dans le même endroit.",
        exemple="Un cabinet remplace un tableur de suivi de contrats et un dossier de pièces partagé par un "
                "outil où l'échéance est portée par le contrat lui-même.",
        erreur="Choisir un outil sur la longueur de sa liste de fonctions plutôt que sur le nombre de tâches "
               "réellement traitées au même endroit.",
        liens=[("fr/logiciel-courtier-assurance", "Le logiciel de courtage, fonction par fonction"),
               ("fr/outil-courtier-assurance", "Ce qu'un outil doit réunir"),
               ("fr/evaluer-crm-courtier-assurance", "La grille d'évaluation")],
        fonction="L'ensemble du produit."),
    "devoir-de-conseil": dict(
        titre="Devoir de conseil",
        definition="Obligation, pour un intermédiaire, de recueillir les besoins de son client et de "
                   "justifier le contrat proposé au regard de ces besoins.",
        contexte="C'est le cœur du travail du courtier et la demande la plus fréquente lors d'un contrôle : "
                 "montrer, dossier par dossier, ce qui a été demandé au client et ce qui lui a été remis.",
        exemple="Un dossier contient les besoins exprimés, les propositions étudiées et la raison du choix "
                "final, ce qui permet de répondre en quelques minutes à un contrôle.",
        erreur="Reconstituer les preuves au moment du contrôle : une pièce produite dans le flux de travail "
               "ne coûte presque rien, la même pièce reconstituée coûte des heures.",
        liens=[("fr/guide/dda-15h", "Guide : le devoir de conseil (DDA)"),
               ("fr/conformite-courtier-assurance", "La conformité dans COURTIA"),
               ("fr/checklists/preparation-audit", "Checklist de préparation d'un contrôle")],
        fonction="Checklist par client, documents remis, journal d'audit."),
    "commissions": dict(
        titre="Commission de courtage",
        definition="Rémunération versée par la compagnie pour un contrat apporté ou suivi par "
                   "l'intermédiaire, selon des règles qui varient par produit et par compagnie.",
        contexte="Le suivi des commissions est un sujet de trésorerie autant que de comptabilité : ce qui "
                 "n'est pas rapproché n'est pas réclamé, et un écart se découvre souvent des mois trop tard.",
        exemple="Le cabinet compare ce qu'il attend au titre d'un portefeuille avec le relevé trimestriel "
                "d'une compagnie, et voit un contrat absent du relevé.",
        erreur="Faire le rapprochement seulement en fin d'année : plus le temps passe, plus la piste du "
               "contrat concerné est froide.",
        liens=[("fr/gestion-commissions-courtier-assurance", "Les commissions dans COURTIA"),
               ("ch/gestion-commissions-courtier-assurance-suisse", "Les commissions en Suisse"),
               ("fr/gain-de-temps/commissions-et-pilotage", "Gagner du temps : commissions et pilotage")],
        fonction="Barèmes et règles, calcul par contrat et par période, import des relevés."),
    "echeance-contrat": dict(
        titre="Échéance de contrat",
        definition="Date à laquelle un contrat arrive à son terme annuel ou à sa date de reconduction, "
                   "avec un préavis éventuel à respecter.",
        contexte="L'échéance n'est pas une date administrative : c'est le moment où le client décide. Un "
                 "cabinet qui la découvre tard travaille sous contrainte de temps.",
        exemple="Un contrat arrivant à échéance dans trois mois est repéré, qualifié, puis le client est "
                "contacté avant les paliers serrés.",
        erreur="Faire vivre les échéances ailleurs que sur le contrat : la même découverte se reproduit "
               "l'année suivante, à l'identique.",
        liens=[("fr/guide/organiser-renouvellements-courtier", "Guide : organiser ses renouvellements"),
               ("fr/gain-de-temps/renouvellements-et-echeances", "Gagner du temps : renouvellements"),
               ("fr/checklists/renouvellement", "Checklist de renouvellement")],
        fonction="Échéance portée par le contrat, vue par période, liste d'actions quotidiennes."),
    "sinistre": dict(
        titre="Sinistre",
        definition="Événement donnant lieu à une déclaration auprès de l'assureur, avec une instruction "
                   "pouvant impliquer un expert et des pièces justificatives.",
        contexte="Le suivi d'un sinistre dure souvent plus longtemps que prévu et se relit au renouvellement : "
                 "c'est un dossier qui vit après sa clôture.",
        exemple="Un dégât d'eau déclaré en mars est encore en instruction en juillet ; le dossier conserve "
                "les pièces et l'état des échanges.",
        erreur="Laisser le sinistre dans la boîte mail : personne ne sait où en est le dossier, ni ce qui a "
               "été demandé au client.",
        liens=[("fr/sinistres-courtier-assurance", "Le suivi des sinistres"),
               ("fr/checklists/suivi-sinistre", "Checklist de suivi de sinistre"),
               ("ch/sinistres-courtier-assurance-suisse", "Le suivi des sinistres en Suisse")],
        fonction="Sinistre rattaché au client et au contrat, état suivi, pièces conservées."),
    "prospect": dict(
        titre="Prospect",
        definition="Personne ou entreprise avec laquelle un contact a eu lieu mais qui n'a pas encore de "
                   "contrat en cours avec le cabinet.",
        contexte="Un prospect non enregistré n'existe pas : le suivi commence au moment où la demande est "
                 "notée, avec son canal d'origine et une action datée.",
        exemple="Un appel entrant est enregistré le jour même avec un statut et une prochaine action, même "
                "si cette action est « rappeler dans trois semaines ».",
        erreur="Ne noter que les prospects « chauds » : ce sont souvent les autres qui rappellent, au moment "
               "où le cabinet ne s'y attend plus.",
        liens=[("fr/gestion-prospects-clients-courtier-assurance", "Prospects et clients"),
               ("fr/workflows/nouveau-prospect", "Processus : nouveau prospect"),
               ("fr/pipeline-kanban-courtier-assurance", "Pipeline visuel")],
        fonction="Enregistrement du prospect, statut, pipeline, tâches rattachées."),
    "portefeuille": dict(
        titre="Portefeuille de contrats",
        definition="Ensemble des contrats suivis par un cabinet ou par un collaborateur, avec leurs "
                   "échéances, leurs clients et leurs commissions.",
        contexte="Le portefeuille est la matière première du pilotage : sa santé (échéances, contacts, "
                 "propositions) indique où l'attention est nécessaire avant que le client parte.",
        exemple="Un cabinet identifie les dossiers sans contact depuis longtemps et les traite par ordre "
                "d'enjeu, plutôt qu'au fil des appels entrants.",
        erreur="Piloter le portefeuille au nombre de contrats : ce chiffre ne dit rien de ce qui va se "
               "passer dans les six mois.",
        liens=[("fr/gestion-portefeuille-courtier", "Le suivi de portefeuille"),
               ("fr/sante-portefeuille-courtier-assurance", "La santé du portefeuille"),
               ("fr/gain-de-temps/commissions-et-pilotage", "Gagner du temps : pilotage")],
        fonction="Portefeuille, score de santé, brief du matin, historique."),
    "relance": dict(
        titre="Relance",
        definition="Contact destiné à obtenir une réponse ou une pièce restée en attente, à un moment "
                   "décidé à l'avance.",
        contexte="Une relance efficace repose sur un état (que relance-t-on ?) et non sur la mémoire. C'est "
                 "pour cela qu'elle se prépare depuis le dossier.",
        exemple="Une pièce demandée depuis quinze jours est relancée sur la seule liste de ce qui manque, et "
                "la relance est enregistrée.",
        erreur="Relancer « au feeling » : soit aucune relance, soit trois en deux jours — les deux abîment la "
               "relation.",
        liens=[("fr/relance-client-assurance", "Les relances dans COURTIA"),
               ("fr/guide/automatiser-relances-courtier", "Guide : automatiser ses relances"),
               ("fr/gain-de-temps/relances-et-suivi-client", "Gagner du temps : relances")],
        fonction="Préparation de relance, modèles de messages, envoi validé par le cabinet."),
    "pipeline": dict(
        titre="Pipeline commercial",
        definition="Représentation des opportunités par étapes, de la première prise de contact à la "
                   "décision, avec l'étape où se trouve chaque dossier.",
        contexte="Un pipeline n'a de valeur que s'il se met à jour en travaillant : sinon il devient un "
                 "second travail, tenu quelques semaines puis abandonné.",
        exemple="Un cabinet tient quatre étapes réellement utilisées plutôt que dix colonnes qui ne servent "
                "qu'à justifier l'outil.",
        erreur="Créer des colonnes que personne ne met à jour : un pipeline faux est plus dangereux qu'une "
               "absence de pipeline, parce qu'il donne l'illusion de la visibilité.",
        liens=[("fr/pipeline-kanban-courtier-assurance", "Pipeline visuel (Kanban)"),
               ("fr/guide/suivre-prospects-courtier", "Guide : suivre ses prospects"),
               ("fr/gestion-prospects-clients-courtier-assurance", "Prospects et clients")],
        fonction="Statuts d'opportunité, vue par colonnes selon l'offre, affectation."),
    "onboarding-client": dict(
        titre="Onboarding client",
        definition="Ensemble des vérifications et enregistrements réalisés à l'ouverture d'un dossier, "
                   "avant la première échéance.",
        contexte="Un dossier mal ouvert coûte du temps à chaque échéance : les pièces manquent, la situation "
                 "est incomplète, et la trace du conseil est à reconstituer.",
        exemple="À la signature, le cabinet vérifie identité, contrats, échéances, pièces obtenues et "
                "pièces attendues, et planifie la prochaine action.",
        erreur="Traiter l'onboarding comme une formalité administrative : c'est le moment où se construit "
               "tout le reste du dossier.",
        liens=[("fr/checklists/onboarding-client", "Checklist d'onboarding"),
               ("fr/guide/onboarding-client-courtier", "Guide : structurer son onboarding"),
               ("fr/import-portefeuille-courtier-assurance", "Reprendre un portefeuille existant")],
        fonction="Fiche client, contrats, pièces, documents remis, prochaine action."),
    "dda": dict(
        titre="DDA (directive sur la distribution d'assurances)",
        definition="Cadre européen organisant la distribution d'assurances : exigences de compétence, "
                   "information du client et devoir de conseil.",
        contexte="Dans un cabinet français, la DDA se voit dans le quotidien : formation, information du "
                 "client, justification du contrat proposé, et capacité à le prouver.",
        exemple="Les points attendus au titre du devoir de conseil sont suivis par dossier, avec la date de "
                "l'information donnée au client.",
        erreur="Traiter la DDA comme un exercice de formation uniquement : c'est aussi une exigence de "
               "traçabilité, dossier par dossier.",
        liens=[("fr/guide/dda-15h", "Guide : l'obligation de formation"),
               ("fr/conformite-courtier-assurance", "La conformité dans COURTIA"),
               ("fr/glossaire/devoir-de-conseil", "Devoir de conseil")],
        fonction="Checklist par client, documents remis, journal d'audit."),
    "nlpd": dict(
        titre="nLPD (Suisse)",
        definition="Loi fédérale suisse sur la protection des données, révisée : elle encadre la collecte et "
                   "le traitement des données personnelles, y compris dans un cabinet d'intermédiation.",
        contexte="Un cabinet suisse traite des données personnelles sensibles (santé, situation "
                 "patrimoniale). Le cloisonnement des accès et la limitation de la collecte sont des "
                 "réflexes quotidiens, avant toute question de conformité formelle.",
        exemple="Les accès aux pièces sont limités aux personnes concernées par le dossier, et la collecte "
               "se limite aux documents réellement nécessaires.",
        erreur="Croire qu'un logiciel « rend conforme » : un outil cloisonne et limite, il ne qualifie pas "
               "les obligations du cabinet.",
        liens=[("ch/nlpd-courtier-assurance", "La nLPD dans un cabinet suisse"),
               ("ch/gestion-documentaire-courtier-assurance-suisse", "Conservation, accès et durée"),
               ("ch/logiciel-intermediaire-assurance-suisse", "Le vocabulaire suisse")],
        fonction="Cloisonnement par cabinet et par rôle, limitation de la collecte, pas de revendication de "
                 "conformité."),
    "finma": dict(
        titre="FINMA (Suisse)",
        definition="Autorité fédérale suisse de surveillance des marchés financiers, qui surveille notamment "
                   "les intermédiaires d'assurance dans le cadre de la loi sur la surveillance des assurances.",
        contexte="Pour un cabinet romand, la FINMA et le registre des intermédiaires structurent "
                 "l'organisation : identification de l'intermédiaire, information du client, journal de "
                 "conseil.",
        exemple="Un cabinet enregistre son identifiant d'intermédiaire et son canton, et tient un journal "
               "de conseil par dossier.",
        erreur="Importer un raisonnement français (ORIAS) dans un cabinet suisse : ni les registres, ni les "
               "obligations, ni les documents attendus ne sont les mêmes.",
        liens=[("ch/logiciel-intermediaire-assurance-suisse", "L'intermédiation en Suisse"),
               ("ch/conformite-intermediaire-assurance-lsa-finma", "Le cadre LSA et FINMA"),
               ("ch/crm-courtier-assurance-suisse", "Le CRM courtier en Suisse")],
        fonction="Référentiels suisses (FINMA, UID, canton) et journal de conseil."),
    "intermediaire-assurance": dict(
        titre="Intermédiaire d'assurance (Suisse)",
        definition="Terme suisse désignant la personne ou l'entreprise qui propose des contrats d'assurance, "
                   "qu'elle soit liée à une ou plusieurs entreprises d'assurance ou travaille comme courtier.",
        contexte="La distinction est juridique et pratique : elle détermine les obligations, l'information "
                 "du client et, souvent, la façon dont le cabinet organise ses mandats.",
        exemple="Un cabinet romand identifie, pour chaque dossier, sous quel statut il agit, et le "
               "différencie dans son suivi.",
        erreur="Confondre intermédiaire lié et courtier, puis traiter les mandats et les rétrocessions de la "
               "même façon pour tous les dossiers.",
        liens=[("ch/logiciel-intermediaire-assurance-suisse", "Le logiciel pour intermédiaire en Suisse"),
               ("ch/glossaire", "Glossaire suisse du courtage"),
               ("ch/gestion-commissions-courtier-assurance-suisse", "Les rétrocessions en francs")],
        fonction="Statut du dossier, mandats, journal de conseil, montants en CHF."),
}


def entree(cle):
    t = TERMES[cle]
    liens = "\n".join(f'<li><a href="/{u}">{lib}</a></li>' for u, lib in t["liens"])
    return f"""
<h2>Définition</h2>
<p>{t['definition']}</p>
<h2>Contexte en cabinet de courtage</h2>
<p>{t['contexte']}</p>
<h2>Un exemple concret</h2>
<p>{t['exemple']}</p>
<h2>L'erreur fréquente</h2>
<p>{t['erreur']}</p>
<h2>La fonction COURTIA concernée</h2>
<p>{t['fonction']}</p>
<h2>Pour aller plus loin</h2>
<ul>{liens}</ul>
"""


PAGES["fr/glossaire/"] = fpage(
    chemin="fr/glossaire/",
    intention="Le professionnel de l'assurance ou le nouvel arrivant qui cherche une définition utilisable, "
              "pas un dictionnaire.",
    liens=[("fr/glossaire/devoir-de-conseil", "Devoir de conseil"),
           ("fr/glossaire/commissions", "Commissions de courtage"),
           ("fr/glossaire/echeance-contrat", "Échéance de contrat"),
           ("fr/glossaire/logiciel-courtier", "Logiciel de courtier"),
           ("ch/glossaire", "Glossaire suisse du courtage"),
           ("fr/workflows-courtier-assurance", "Les processus du cabinet"),
           ("fr/gagner-du-temps-courtier-assurance", "Gagner du temps au cabinet")],
    motscles=["glossaire assurance courtage", "définitions courtier assurance", "vocabulaire cabinet de courtage"],
    titre="Glossaire du courtage d'assurance — COURTIA",
    description="Quinze notions du courtage expliquées utilement : définition, contexte de cabinet, "
                "exemple, erreur fréquente et fonction correspondante dans un logiciel de courtage.",
    h1="Glossaire du courtage : quinze notions qui servent vraiment",
    corps="""
<p>Ce glossaire ne cherche pas à être exhaustif : il traite les notions qui reviennent dans le travail réel
d'un cabinet, et pour chacune il fait la même chose — une définition courte, ce que cela change dans le
cabinet, un exemple, l'erreur fréquente, la fonction logicielle correspondante.</p>
<p>Une bonne définition ne suffit pas : ce qui aide, c'est de savoir <em>où ça se passe</em> dans un
dossier. C'est le fil de ces quinze entrées.</p>

<h2>Les entrées</h2>
<ul>
<li><a href="/fr/glossaire/courtier-assurance">Courtier d'assurance</a></li>
<li><a href="/fr/glossaire/logiciel-courtier">Logiciel de courtier (CRM de courtage)</a></li>
<li><a href="/fr/glossaire/devoir-de-conseil">Devoir de conseil</a></li>
<li><a href="/fr/glossaire/commissions">Commission de courtage</a></li>
<li><a href="/fr/glossaire/echeance-contrat">Échéance de contrat</a></li>
<li><a href="/fr/glossaire/sinistre">Sinistre</a></li>
<li><a href="/fr/glossaire/prospect">Prospect</a></li>
<li><a href="/fr/glossaire/portefeuille">Portefeuille de contrats</a></li>
<li><a href="/fr/glossaire/relance">Relance</a></li>
<li><a href="/fr/glossaire/pipeline">Pipeline commercial</a></li>
<li><a href="/fr/glossaire/onboarding-client">Onboarding client</a></li>
<li><a href="/fr/glossaire/dda">DDA (distribution d'assurances)</a></li>
<li><a href="/fr/glossaire/nlpd">nLPD (Suisse)</a></li>
<li><a href="/fr/glossaire/finma">FINMA (Suisse)</a></li>
<li><a href="/fr/glossaire/intermediaire-assurance">Intermédiaire d'assurance (Suisse)</a></li>
</ul>

<h2>Comment nous choisissons les entrées</h2>
<p>Une notion entre dans ce glossaire si elle remplit trois conditions : elle revient dans le travail
quotidien, elle peut être mal comprise (donc expliquée), et elle se rattache à une pratique concrète.
Nous n'ajoutons pas d'entrées pour du volume : une définition qui ne change rien au travail n'a pas sa
place ici.</p>

<h2>Et côté suisse ?</h2>
<p>Le vocabulaire suisse diffère réellement : intermédiaire d'assurance, courtier lié, rétrocession,
journal de conseil, FINMA, nLPD. Le <a href="/ch/glossaire">glossaire suisse</a> traite ces notions
séparément, sans les plaquer sur les définitions françaises.</p>
""",
    faq=[
        ("Pourquoi seulement quinze entrées ?",
         "Parce que ces quinze notions couvrent l'essentiel du travail réel d'un cabinet. Ajouter des "
         "définitions de volume n'aiderait personne."),
        ("Ces définitions ont-elles une valeur juridique ?",
         "Non : ce sont des explications pratiques. Les définitions opposables sont dans les textes et les "
         "documents contractuels."),
        ("Le glossaire suisse est-il séparé ?",
         "Oui, parce que le vocabulaire et le cadre diffèrent réellement : les traduire mot à mot donnerait "
         "des définitions fausses."),
    ],
)

for cle in TERMES:
    t = TERMES[cle]
    PAGES[f"fr/glossaire/{cle}"] = fpage(
        chemin=f"fr/glossaire/{cle}",
        intention=f"Le lecteur qui cherche ce qu'est « {t['titre']} » dans le travail réel d'un cabinet.",
        liens=[("fr/glossaire/", "Le glossaire complet")] + t["liens"],
        motscles=[t["titre"].lower(), f"{t['titre'].lower()} définition", "courtage assurance"],
        titre=f"{t['titre']} : définition et usage en cabinet — COURTIA",
        description=f"{t['titre']} : définition courte, contexte en cabinet de courtage, exemple, erreur "
                    f"fréquente et fonction logicielle correspondante.",
        h1=t["titre"],
        corps=entree(cle),
        faq=[
            (f"À quoi sert cette notion dans le quotidien du cabinet ?",
             t["contexte"].split(".")[0] + "."),
            ("Où cela se passe-t-il dans un logiciel de courtage ?", t["fonction"]),
            ("Est-ce différent en Suisse ?",
             "Souvent oui : voir le glossaire suisse et les pages du marché suisse sur ce site."),
        ],
    )

PAGES["ch/glossaire"] = fpage(
    marche="CH",
    chemin="ch/glossaire",
    fil=[("Accueil", "/"), ("Suisse", "/ch"), ("Glossaire suisse", "/ch/glossaire")],
    intention="Le professionnel suisse qui cherche le vocabulaire réellement employé en Suisse romande, "
              "pas une traduction du vocabulaire français.",
    liens=[("ch/logiciel-intermediaire-assurance-suisse", "L'intermédiation en Suisse"),
           ("ch/conformite-intermediaire-assurance-lsa-finma", "Le cadre LSA et FINMA"),
           ("ch/nlpd-courtier-assurance", "La nLPD dans un cabinet"),
           ("ch/gestion-commissions-courtier-assurance-suisse", "Les rétrocessions en francs"),
           ("fr/glossaire/", "Le glossaire France")],
    motscles=["glossaire assurance suisse", "vocabulaire courtage suisse", "termes intermédiaire assurance"],
    titre="Glossaire suisse du courtage d'assurance — COURTIA",
    description="Le vocabulaire suisse de l'intermédiation d'assurance : intermédiaire, courtier lié, "
                "rétrocession, journal de conseil, FINMA, nLPD, LSA — en une page, sans traduction mot à mot.",
    h1="Glossaire suisse : le vocabulaire réellement employé",
    corps="""
<p>Le vocabulaire suisse n'est pas une variante du vocabulaire français : il désigne des statuts et des
obligations différents. Traduire les termes mot à mot produit des définitions fausses — d'où cette page
séparée.</p>

<h2>Les termes</h2>
<dl>
<dt>Intermédiaire d'assurance</dt>
<dd>Personne ou entreprise qui propose des contrats d'assurance en Suisse ; selon son statut, elle est
liée à une ou plusieurs entreprises d'assurance ou agit comme courtier. Le terme « intermédiaire » est le
terme générique, « courtier » un statut particulier.</dd>

<dt>Courtier lié</dt>
<dd>Intermédiaire travaillant pour une ou plusieurs entreprises d'assurance déterminées, dans le cadre
d'un lien contractuel. Cela change l'information due au client et la façon de documenter le conseil.</dd>

<dt>Registre des intermédiaires</dt>
<dd>Le registre tenu par la FINMA recense les intermédiaires d'assurance autorisés et permet de vérifier
le statut d'un professionnel.</dd>

<dt>FINMA</dt>
<dd>Autorité fédérale de surveillance des marchés financiers, compétente notamment pour la surveillance
des intermédiaires d'assurance en Suisse.</dd>

<dt>LSA</dt>
<dd>Loi fédérale sur la surveillance des assurances : elle encadre notamment l'activité
d'intermédiation et les obligations d'information et de conseil.</dd>

<dt>nLPD</dt>
<dd>Loi fédérale révisée sur la protection des données : encadre la collecte et le traitement des
données personnelles, y compris les données sensibles traitées par un cabinet (santé, situation
personnelle).</dd>

<dt>Journal de conseil</dt>
<dd>Trace écrite du conseil donné au preneur d'assurance : ce qui a été exposé, sur quelle base, et quand.
C'est la pièce qui permet de démontrer le devoir de conseil.</dd>

<dt>Rétrocession</dt>
<dd>Part de la rémunération reversée à un intermédiaire ou à un partenaire. Elle se suit en francs, avec
ses propres règles, et ne se confond pas avec la commission telle qu'elle est pratiquée en France.</dd>

<dt>Canton</dt>
<dd>Le canton structure l'activité d'un cabinet suisse : adresse, autorité compétente, parfois usages
locaux. Il figure dans les informations d'une entreprise aux côtés de la raison sociale.</dd>

<dt>UID</dt>
<dd>Identifiant unique d'entreprise en Suisse : il identifie une entité de manière stable, ce qui en fait
un bon point de rattachement pour un dossier client personne morale.</dd>

<dt>CHF</dt>
<dd>Franc suisse : devise des montants d'un cabinet suisse. Les primes, commissions et rétrocessions se
suivent dans cette devise, sans conversion automatique.</dd>

<dt>Révision de portefeuille</dt>
<dd>Reprise en gestion de contrats venant d'un autre intermédiaire : elle suppose de retrouver échéances,
pièces et historique.</dd>
</dl>

<h2>Ce que cette page n'est pas</h2>
<p>Ni un texte juridique, ni un conseil. Les définitions opposables figurent dans la loi, dans les
ordonnances et dans les documents des autorités compétentes. Cette page sert à parler le même langage
dans un cabinet — pas à remplacer un avis qualifié.</p>

<h2>Pourquoi un glossaire suisse séparé</h2>
<p>Parce qu'un cabinet romand envoie rarement ses dossiers à un cabinet français, et inversement : les
registres, les obligations d'information et les termes diffèrent. Un contenu suisse doit employer le
vocabulaire suisse.</p>
""",
    faq=[
        ("Un cabinet suisse doit-il s'enregistrer quelque part ?",
         "Cette question relève des autorités compétentes et du statut réel de l'activité ; nous ne "
         "produisons pas de réponse générale sur ce point."),
        ("Les montants se suivent-ils en francs ?",
         "Oui : le produit utilise la devise du cabinet suisse pour les primes, commissions et "
         "rétrocessions."),
        ("Le vocabulaire français est-il inutile en Suisse ?",
         "Non : certains termes se recoupent, mais les statuts et les obligations ne se transposent pas "
         "directement."),
    ],
)
