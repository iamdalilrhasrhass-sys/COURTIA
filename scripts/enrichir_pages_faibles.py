#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
enrichir_pages_faibles.py — DERNIER GROUPE DE PAGES SOUS 530 MOTS.

Levier JEV maintenu (passe I : « enrichir les pages anciennes faibles », 0,54). Mesure du 22/09/2026 :
12 pages indexables passaient sous 530 mots. Chacune reçoit UNE section réellement spécifique à son
sujet — ce qui change dans le travail du cabinet, ce que le produit y fait, et ce qu'il n'y fait pas.

Aucune promesse nouvelle : ni tarification, ni souscription, ni conformité revendiquée, ni chiffre.

Ce script tourne APRÈS la génération (voir scripts/seo_pipeline.py) et est idempotent (marqueur).
"""
import os
import sys

PUBLIC = "/srv/courtia/frontend/public"
MARQUEUR = "<!-- faibles-enrichi:jev-20260922 -->"
ANCRES = ['<div class="cta">', '<p><a class="cta"', "</main>", "<footer"]

SECTIONS = {
    "ch/import-portefeuille-courtier-assurance-suisse": """
<h2>L'ordre de travail qui évite les pertes pendant une reprise</h2>
<p>Reprendre un portefeuille se joue sur l'ordre des opérations, pas sur la vitesse de saisie. L'ordre
qui limite les pertes :</p>
<ol>
<li><strong>Les clients d'abord, avec leur identifiant légal</strong> — pour un cabinet suisse, le
rattachement se fait sur des traits stables, pas sur une adresse qui a changé trois fois.</li>
<li><strong>Les contrats ensuite, avec leurs dates</strong> — ce sont les échéances qui déclenchent
tout le reste ; une reprise sans dates oblige à revenir sur chaque dossier plus tard.</li>
<li><strong>Les pièces en troisième</strong> — rattachées au dossier, jamais dans un dossier partagé
hors outil, sinon le lien avec le dossier se perd au premier changement d'ordinateur.</li>
<li><strong>Les doublons en dernier</strong> — on ne fusionne qu'après avoir tout importé : fusionner
pendant l'import fait disparaître des contrats rattachés à la mauvaise fiche.</li>
</ol>
<p>L'import accepte un fichier tabulaire ; il n'automatise ni la déduplication ni le rapprochement avec
la compagnie : ces deux contrôles restent des décisions du cabinet, et c'est volontaire.</p>
""",
    "fr/logiciel-courtier-transport-flotte": """
<h2>Ce qui est spécifique au transport et aux flottes</h2>
<p>Sur une flotte, l'unité de suivi n'est pas seulement le client : c'est aussi le <strong>véhicule</strong>.
Un dossier transport se reconnaît à ceci :</p>
<ul>
<li><strong>Autant d'échéances que de véhicules</strong> — deux tracteurs et trois remorques peuvent
avoir cinq dates différentes, et une seule oubliée coûte cher.</li>
<li><strong>Des pièces liées à l'exploitation</strong> — cartes grises, attestations, permis et
habilitations des conducteurs, changements de parc en cours d'année.</li>
<li><strong>Des conducteurs qui ne sont pas les clients</strong> — l'interlocuteur n'est pas toujours
la personne à couvrir : le dossier doit tenir les deux.</li>
<li><strong>Des entrées et des sorties de parc</strong> — un véhicule vendu doit cesser d'apparaître
dans les échéances, sans effacer l'historique.</li>
</ul>
<p>COURTIA tient le dossier client, ses contrats et leurs échéances, les pièces rattachées et les
échanges de propositions. Il n'établit pas de carte verte, ne calcule pas de prime et ne remplace pas
l'outil de la compagnie.</p>
""",
    "ch/portail-client-assurance-suisse": """
<h2>Ce que le client fait seul, et ce que nous ne demandons jamais</h2>
<p>Le dépôt de pièces par le client fait gagner du temps au cabinet quand la frontière est claire.</p>
<p><strong>Ce que le client fait seul :</strong> ouvrir un lien reçu, joindre les documents demandés et
en suivre l'état. Rien d'autre.</p>
<p><strong>Ce que nous ne demandons jamais par ce canal :</strong> de mot de passe, de données
bancaires, de pièce d'identité complète sans demande motivée, ni de signature engageante. Aucun lien
n'ouvre d'accès au reste du dossier, et un lien transmis à la mauvaise personne ne donne accès qu'à la
demande de pièces, pas au portefeuille.</p>
<p><strong>Ce que le cabinet garde :</strong> la décision. Une pièce reçue est une pièce reçue ; c'est
le courtier qui juge si elle est complète, suffisante et valable — le produit ne tranche pas à sa place.</p>
""",
    "fr/logiciel-courtier-entreprise": """
<h2>Ce qui est spécifique aux risques d'entreprise</h2>
<p>Un dossier d'entreprise ne ressemble pas à un dossier de particulier : il a plusieurs sites, plusieurs
interlocuteurs et des dates qui ne dépendent pas que de l'assureur.</p>
<ul>
<li><strong>Plusieurs lieux à couvrir</strong> — un site principal, un entrepôt, un second
établissement : les garanties et les valeurs ne sont pas les mêmes, et le dossier doit le refléter.</li>
<li><strong>Plusieurs interlocuteurs</strong> — le dirigeant signe, le responsable administratif
transmet, le comptable date. Savoir qui a dit quoi, et quand, évite les reprises.</li>
<li><strong>Des échéances qui se croisent</strong> — dates de renouvellement, clôture des comptes,
changement d'exercice : un renouvellement mal calé se paie en couverture manquante.</li>
<li><strong>Des pièces justificatives lourdes</strong> — bilan, effectifs, chiffre d'affaires,
attestations : leur collecte est un projet en soi, à suivre dossier par dossier.</li>
</ul>
<p>COURTIA tient le dossier, les contrats et leurs échéances, les pièces demandées et reçues, et
l'historique des propositions. Il ne rédige pas les conditions particulières et ne se substitue pas à
l'assureur.</p>
""",
    "fr/logiciel-courtier-decennale": """
<h2>Ce qui est spécifique à la garantie décennale</h2>
<p>La décennale est une assurance où le dossier vit très longtemps après la signature, et où la pièce
administrative est le cœur du métier.</p>
<ul>
<li><strong>Une date d'ouverture de chantier par chantier</strong> — l'attestation nominative
correspond à une opération, pas seulement à un client.</li>
<li><strong>Des attestations à produire vite</strong> — un client sans attestation se retrouve bloqué
sur un chantier : la demande et son suivi doivent être traçables.</li>
<li><strong>Des sous-traitants à mentionner</strong> — les taux et les mentions dépendent du rôle
réel de l'entreprise sur le chantier.</li>
<li><strong>Une durée très longue</strong> — dix ans après la réception, le dossier doit encore pouvoir
être retrouvé, avec ses pièces et ses échanges.</li>
</ul>
<p>COURTIA tient la fiche entreprise, les contrats et leurs dates, les pièces demandées avec leur
historique, et les propositions en cours. Il ne délivre pas d'attestation à la place de l'assureur et
n'évalue pas les conditions techniques du chantier.</p>
""",
    "ch/gestion-cabinet-courtage-suisse": """
<h2>La semaine d'un responsable de cabinet, poste par poste</h2>
<p>Gérer un cabinet de courtage, en Suisse comme ailleurs, c'est faire tourner quatre boucles courtes :</p>
<ul>
<li><strong>Les échéances</strong> — ce qui tombe dans les trente jours, contrat par contrat, avec la
question « qui appelle ce client et quand ? ».</li>
<li><strong>Les propositions en attente</strong> — un devis envoyé sans suite n'est pas une vente
perdue, c'est une relance non faite.</li>
<li><strong>Les commissions</strong> — ce qui est attendu, ce qui est reçu, et l'écart entre les deux,
compagnie par compagnie, en francs.</li>
<li><strong>Le travail de l'équipe</strong> — qui a quoi en cours, ce qui est bloqué, et ce qui attend
une décision.</li>
</ul>
<p>COURTIA réunit ces quatre vues sur les données réellement saisies dans le cabinet. Aucun indicateur
n'est affiché s'il ne peut pas être calculé : un écran vide veut dire « pas de donnée », pas
« zéro ».</p>
""",
    "ch/reporting-pilotage-courtier-assurance-suisse": """
<h2>Ce qu'on peut piloter, et ce qu'on ne peut pas</h2>
<p>Un tableau de bord n'a de valeur que si l'on sait d'où viennent ses chiffres. Trois règles tenues
dans COURTIA :</p>
<ul>
<li><strong>Chaque indicateur a une source identifiable</strong> — il est calculé à partir des dossiers,
contrats, devis et échéances saisis dans le cabinet.</li>
<li><strong>Un indicateur non calculable ne s'affiche pas</strong> — l'écran montre un tiret plutôt
qu'un zéro trompeur, parce qu'un zéro se lirait comme une mesure.</li>
<li><strong>Aucune projection n'est affichée comme un fait</strong> — une prévision de commission reste
une prévision, avec sa base de calcul.</li>
</ul>
<p>Ce que le pilotage ne fera pas à votre place : dire quel client rappeler en premier, trancher un
arbitrage commercial ou juger la performance d'un collaborateur. Ce sont des décisions de direction.</p>
""",
    "ch/gestion-documentaire-courtier-assurance-suisse": """
<h2>Conservation, accès et durée : les trois questions à se poser</h2>
<p>Un document de courtage n'est pas seulement un fichier à ranger. Trois questions se posent pour
chaque type de pièce :</p>
<ul>
<li><strong>Qui y accède ?</strong> Les accès sont cloisonnés par cabinet et par rôle : un collaborateur
voit les dossiers qui lui sont rattachés, la direction voit l'ensemble.</li>
<li><strong>Combien de temps le garde-t-on ?</strong> La durée relève de la politique du cabinet et des
obligations qui lui sont applicables : COURTIA conserve, il ne fixe pas la durée à votre place — et il
ne purge pas automatiquement un dossier sans consigne.</li>
<li><strong>Que se passe-t-il au départ d'un collaborateur ?</strong> Les pièces restent rattachées au
dossier et au cabinet, pas au compte de la personne qui les a déposées.</li>
</ul>
<p>Le produit ne revendique aucune certification de conformité à la nLPD : il cloisonne les accès,
limite la collecte à ce qui est demandé, et laisse la qualification juridique au cabinet et à son
conseil.</p>
""",
    "fr/logiciel-courtier-habitation": """
<h2>Ce qui est spécifique à l'habitation</h2>
<p>L'habitation est une branche où tout se joue sur les dates et sur la valeur déclarée :</p>
<ul>
<li><strong>Des échéances très concentrées</strong> — une part importante des contrats arrive à
échéance au même moment de l'année, ce qui sature le mois concerné si rien n'est anticipé.</li>
<li><strong>Des changements de situation</strong> — déménagement, travaux, colocation, résidence
secondaire : chaque changement peut modifier ce qui est couvert.</li>
<li><strong>Des pièces simples mais oubliées</strong> — justificatif de propriété ou de bail, état des
lieux, photos, factures de biens de valeur.</li>
<li><strong>Des valeurs à réviser</strong> — le contenu déclaré vieillit plus vite qu'on ne le croit,
et une sous-assurance se découvre au sinistre.</li>
</ul>
<p>COURTIA suit les contrats, les échéances, les pièces et les propositions. Il ne calcule pas de
valeur de reconstruction ni d'indemnité : ces calculs appartiennent à l'assureur.</p>
""",
    "fr/logiciel-courtier-auto": """
<h2>Ce qui est spécifique à l'assurance auto</h2>
<p>En auto, le dossier se suit presque autant par le véhicule que par le conducteur :</p>
<ul>
<li><strong>Le véhicule comme objet du contrat</strong> — marque, usage, stationnement, conducteur
principal : autant d'éléments qui changent la couverture et qu'il faut pouvoir ressortir sans ouvrir
la pièce jointe.</li>
<li><strong>Les attestations et relevés d'information</strong> — souvent demandés au moment d'un
changement de véhicule ou d'une résiliation, et rarement classés au bon endroit.</li>
<li><strong>Les résiliations</strong> — échéance, vente du véhicule, changement d'assureur : chaque
motif a sa formalité et sa date limite.</li>
<li><strong>Le foyer</strong> — trois véhicules, deux conducteurs, un jeune conducteur : le même
client porte plusieurs contrats avec des dates différentes.</li>
</ul>
<p>COURTIA tient ces informations dans le dossier, avec les échéances et les pièces. Il ne produit ni
constat, ni attestation d'assurance au nom de la compagnie.</p>
""",
    "fr/comparatif/automatisation-vs-gestion-manuelle": """
<h2>Ce que l'automatisation ne fait pas — et où le manuel reste légitime</h2>
<p>Automatiser une tâche n'est utile que si le jugement n'est pas nécessaire à chaque exécution. C'est
la frontière qui sépare les deux approches :</p>
<ul>
<li><strong>Ce qu'une automatisation fait bien</strong> : détecter une échéance, préparer un message,
demander une pièce, rappeler qu'une réponse manque, classer un document dans le bon dossier, comparer
des dates.</li>
<li><strong>Ce qu'elle ne doit pas faire à votre place</strong> : décider du conseil à donner, valider
l'adéquation d'une garantie, arbitrer un litige, choisir ce qu'on dit à un client mécontent, engager
une souscription.</li>
<li><strong>Où le manuel reste le bon choix</strong> : la discussion d'un dossier complexe, la
négociation avec une compagnie, l'annonce d'un refus, le traitement d'un sinistre sensible.</li>
</ul>
<p>La bonne question n'est donc pas « faut-il automatiser ? » mais « <em>quelle étape</em> de ce
processus n'a besoin d'aucun jugement ? ». COURTIA prépare et déclenche ; le cabinet valide et
décide — et rien ne part sans validation humaine.</p>
""",
    "fr/guide/organiser-renouvellements-courtier": """
<h2>Le calendrier de travail par échéance</h2>
<p>Un renouvellement ne se traite pas le jour de l'échéance mais par paliers. Le découpage qui tient
dans un cabinet :</p>
<ul>
<li><strong>J-90 : repérer</strong> — la liste des contrats arrivant à échéance dans le trimestre, sans
action commerciale à ce stade. Objectif : savoir combien de dossiers la période contient.</li>
<li><strong>J-60 : qualifier</strong> — vérifier ce qui a changé depuis un an (situation, véhicule,
valeurs, effectifs) et noter ce qu'il faut demander au client.</li>
<li><strong>J-45 : demander</strong> — envoyez la demande de pièces et l'information au client, avec la
date de retour souhaitée, pour éviter les allers-retours de fin de mois.</li>
<li><strong>J-30 : comparer</strong> — les propositions sont en main, la décision peut être prise sans
urgence.</li>
<li><strong>J-15 : verrouiller</strong> — les dossiers sans retour sont traités en priorité : ce sont
eux qui coûtent un client.</li>
<li><strong>J-0 : archiver</strong> — la nouvelle date d'échéance est enregistrée, sinon le cycle
suivant recommence sans trace.</li>
</ul>
<p>Le but de ce découpage n'est pas d'appeler plus : c'est de savoir, à tout moment, combien de dossiers
sont dans chaque palier — et de ne plus découvrir une échéance le jour où elle tombe.</p>
""",
}


def main():
    poses, problemes = [], []
    for chemin, bloc in SECTIONS.items():
        f = os.path.join(PUBLIC, chemin, "index.html")
        if not os.path.isfile(f):
            problemes.append(f"absent : {chemin}")
            continue
        html = open(f, encoding="utf-8").read()
        if MARQUEUR in html:
            continue
        ancre = next((a for a in ANCRES if a in html), None)
        if ancre is None:
            problemes.append(f"point d'insertion introuvable : {chemin}")
            continue
        html = html.replace(ancre, MARQUEUR + bloc + ancre, 1)
        open(f, "w", encoding="utf-8").write(html)
        poses.append(chemin)
    print(f"pages faibles enrichies : {len(poses)}")
    for p in poses:
        print("   ", p)
    if problemes:
        print("PROBLÈMES :")
        for p in problemes:
            print("   ", p)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
