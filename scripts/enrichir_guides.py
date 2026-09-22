#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
enrichir_guides.py — DERNIER LEVIER SIGNALÉ PAR JEV (passe I : « enrichir les pages anciennes
faibles », 0,54).

Les dix guides réglementaires publiés en vague 1 font 480 à 512 mots : ils expliquent l'obligation
mais pas ce qu'elle change dans le travail du cabinet. On ajoute à chacun deux sections — « ce que
cela change au quotidien » et « les erreurs qui coûtent » — plus une question, en gardant le ton
factuel et sans produire de conseil juridique.

Le script est idempotent (marqueur) : relancé, il n'ajoute rien.
"""
import os
import sys

PUBLIC = "/srv/courtia/frontend/public"
MARQUEUR = "<!-- guide-enrichi:jev-20260922 -->"
ANCRES = ['<div class="cta">', '<p><a class="cta"', "</main>", "<footer"]

GUIDES = {
    "dda-15h": ("""
<h2>Ce que cela change au quotidien</h2>
<p>La formation n'est pas un document à retrouver le jour d'un contrôle : c'est une condition
d'exercice. Ce qui compte en pratique, c'est de savoir, pour chaque collaborateur, où en est son
compteur d'heures et quelle échéance arrive. Un cabinet qui tient cette information dans le dossier
du collaborateur n'a plus à reconstituer un historique au moment où on le lui demande.</p>
<h2>Les erreurs qui coûtent</h2>
<ul>
<li>Attendre la fin de l'année pour compter les heures : il est alors trop tard pour compléter.</li>
<li>Considérer qu'une formation interne vaut automatiquement : le contenu et l'organisme doivent
répondre aux exigences applicables.</li>
<li>Ne rien conserver de l'attestation : sans pièce, l'heure ne compte pas.</li>
</ul>
"""),
    "devoir-de-conseil": ("""
<h2>Ce que cela change au quotidien</h2>
<p>Le devoir de conseil se joue au moment de l'entretien, pas au moment du contrôle. Ce qui fait la
différence, c'est de disposer, dans le dossier, de la situation du client, du besoin exprimé, des
solutions examinées et du motif de la recommandation — et de pouvoir les restituer des années plus
tard sans dépendre de la mémoire de celui qui a conduit l'entretien.</p>
<h2>Les erreurs qui coûtent</h2>
<ul>
<li>Reconstituer un dossier de conseil après coup : la reconstitution se voit.</li>
<li>Ne tracer que la solution retenue, sans les solutions écartées ni le motif.</li>
<li>Laisser le conseil dans des notes personnelles qui ne survivent pas au départ d'un collaborateur.</li>
</ul>
"""),
    "verification-orias": ("""
<h2>Ce que cela change au quotidien</h2>
<p>Vérifier une immatriculation n'est pas une formalité administrative : c'est ce qui évite de
travailler avec un intermédiaire non habilité, ou de présenter comme courtier une structure qui ne
l'est pas. Le geste utile est de conserver la trace de la vérification avec ses coordonnées, pour ne
pas la refaire à chaque échange.</p>
<h2>Les erreurs qui coûtent</h2>
<ul>
<li>Se fier à un annuaire commercial plutôt qu'au registre officiel.</li>
<li>Vérifier une fois et ne jamais contrôler le maintien de l'immatriculation.</li>
<li>Confondre l'immatriculation de la société et celle de la personne qui exerce.</li>
</ul>
"""),
    "audit-acpr": ("""
<h2>Ce que cela change au quotidien</h2>
<p>Un contrôle ne commence pas par une question de fond, mais par une demande de pièces. Un cabinet
qui peut répondre à « montrez le dossier de ce client » en ouvrant un seul endroit traverse le
contrôle dans les mêmes conditions qu'un cabinet qui recompose ses réponses pendant trois semaines.
La préparation n'est donc pas un projet annuel : c'est l'effet continu d'un dossier complet.</p>
<h2>Les erreurs qui coûtent</h2>
<ul>
<li>Ne réunir les pièces qu'à l'approche d'un contrôle : les pièces manquantes ne se recréent pas.</li>
<li>Confondre « nous appliquons les règles » et « nous pouvons le démontrer ».</li>
<li>Laisser les processus dans la tête du dirigeant plutôt que dans un document consultable.</li>
</ul>
"""),
    "conformite-2026": ("""
<h2>Ce que cela change au quotidien</h2>
<p>Un calendrier réglementaire ne sert à rien s'il n'est pas relié aux échéances réelles du cabinet.
L'utile n'est pas de connaître la liste des textes, mais de savoir ce qui doit être fait ce
trimestre : formations à renouveler, informations à remettre, registres à mettre à jour.</p>
<h2>Les erreurs qui coûtent</h2>
<ul>
<li>Traiter la conformité comme un chantier annuel au lieu d'un suivi continu.</li>
<li>Découvrir une échéance après la date, faute de l'avoir rattachée à quelqu'un.</li>
<li>Empiler des procédures que personne n'applique : une procédure non appliquée est une faiblesse
démontrable.</li>
</ul>
"""),
    "ipid": ("""
<h2>Ce que cela change au quotidien</h2>
<p>Le document d'information produit est remis avant la conclusion : sa valeur tient donc à sa
traçabilité. Ce qui compte dans le dossier, c'est de pouvoir dire ce qui a été remis, à quelle date,
et sur quelle version — sans dépendre d'une pièce jointe qui a changé trois fois depuis.</p>
<h2>Les erreurs qui coûtent</h2>
<ul>
<li>Remettre une version périmée du document.</li>
<li>Renvoyer le client vers un document disponible en ligne sans conserver de trace.</li>
<li>Considérer que le document seul suffit, alors qu'il accompagne un conseil.</li>
</ul>
"""),
    "lcb-ft": ("""
<h2>Ce que cela change au quotidien</h2>
<p>Les obligations de vigilance se traduisent par des gestes répétitifs : identifier, vérifier,
conserver la preuve. Ce qui fait tenir l'ensemble, ce n'est pas la rigueur ponctuelle mais la
traçabilité : chaque vérification doit laisser une trace datée, rattachée au dossier, exploitable si
on la demande.</p>
<h2>Les erreurs qui coûtent</h2>
<ul>
<li>Effectuer les vérifications sans en conserver la preuve.</li>
<li>Traiter les vérifications « au dossier », sans suivi d'ensemble.</li>
<li>Découvrir après plusieurs années qu'un dossier n'a jamais été complété.</li>
</ul>
"""),
    "rgpd-courtier": ("""
<h2>Ce que cela change au quotidien</h2>
<p>La protection des données se joue sur trois gestes quotidiens : ne demander que ce qui est
nécessaire, limiter l'accès à ceux qui en ont besoin, et pouvoir dire ce qu'on détient pour une
personne qui le demande. Un registre tenu une fois par an ne sert à rien ; c'est le dossier qui doit
être propre.</p>
<h2>Les erreurs qui coûtent</h2>
<ul>
<li>Accumuler des pièces « au cas où » : chaque donnée conservée inutilement est une charge et un
risque.</li>
<li>Partager un dossier par un moyen non maîtrisé (fichier envoyé, espace ouvert).</li>
<li>Ne pas savoir qui a accès à quoi dans le cabinet.</li>
</ul>
"""),
    "sanctions-acpr": ("""
<h2>Ce que cela change au quotidien</h2>
<p>Les sanctions publiées décrivent des manquements qui, presque toujours, se seraient vus dans un
dossier bien tenu : une recommandation non justifiée, une information non remise, une vérification
non faite. Les lire comme un inventaire de ce qu'il faut pouvoir démontrer est plus utile que les
mémoriser.</p>
<h2>Les erreurs qui coûtent</h2>
<ul>
<li>Croire que la sanction ne concerne que les grandes structures.</li>
<li>Traiter chaque exigence séparément plutôt que par le dossier qui les porte toutes.</li>
<li>Attendre un contrôle pour vérifier ce que le cabinet peut réellement montrer.</li>
</ul>
"""),
    "reforme-courtage": ("""
<h2>Ce que cela change au quotidien</h2>
<p>Les évolutions du cadre professionnel se traduisent par des décisions concrètes : adhésion,
formation, statut, information du client. Ce qui compte pour un cabinet, c'est de savoir ce qui
s'applique à lui à une date donnée, et de pouvoir le justifier — l'incertitude se règle auprès de sa
fédération ou de son conseil, pas par approximation.</p>
<h2>Les erreurs qui coûtent</h2>
<ul>
<li>Appliquer une règle entendue sans vérifier qu'elle concerne son statut.</li>
<li>Ne pas conserver la trace des démarches d'adhésion et de formation.</li>
<li>Différer une obligation devenue applicable en attendant une clarification qui ne viendra pas.</li>
</ul>
"""),
}


def main():
    poses, problemes = [], []
    for slug, bloc in GUIDES.items():
        chemin = f"fr/guide/{slug}"
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
        html = html.replace(ancre, MARQUEUR + "\n" + bloc + "\n" + ancre, 1)
        open(f, "w", encoding="utf-8").write(html)
        poses.append(chemin)
    print(f"guides enrichis : {len(poses)}")
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
