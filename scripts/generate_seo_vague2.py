#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_seo_vague2.py — VAGUE 2 SEO (pilotée par les jugements TypeSafe/JEV du 22/09/2026).

CE QUE CETTE VAGUE AJOUTE, ET POURQUOI (chaque décision vient d'un appel JEV réel, journalisé dans
/root/ark/seo_jev/JEV_JOURNAL.csv) :

1. Enrichissement du pilier /fr/logiciel-courtier-assurance.
   JEV : « par où commencer pour gagner le plus en efficacité commerciale par euro d'effort ? »
   → le_pilier_logiciel (confidence 0,95 ; p 0,96). La page mesurait 592 mots et s'affichait sans
   accents, alors que /fr/crm-courtier-assurance en faisait 1067. Elle est réécrite avec le H1
   choisi par JEV (h1_benefice, confidence 0,78) et un title/meta contraints par la longueur
   d'affichage (JEV avait choisi l'angle « bénéfice direct » avec une confiance faible 0,36 : le
   code applique la contrainte de longueur, ce qui reste la décision finale).

2. Preuve produit. JEV : « les pages manquent-elles d'éléments qui montrent le produit ? » → OUI
   (0,82), et le levier de conversion prioritaire = montrer_le_produit (p 0,56). Une capture RÉELLE
   du tableau de bord de la démonstration publique (données synthétiques, bandeau « démonstration »
   visible) est publiée sur le pilier : `frontend/public/img/demo-courtia-tableau-de-bord.jpg`.

3. Deux pages nouvelles, retenues parce que JEV a jugé l'intention DISTINCTE avec une probabilité
   ≥ 0,70 ET que le produit couvre réellement le sujet (contrôle déterministe dans le code) :
   - /fr/logiciel-devis-courtier-assurance (JEV : intention distincte, 0,75 — le silo suisse avait
     une page devis, le silo français non) ;
   - /fr/mesurer-temps-administratif-cabinet (JEV : 0,77 — page de méthode, apport propre, aucune
     promesse chiffrée).

4. Pages REFUSÉES (et pourquoi, pour ne pas les ressusciter) :
   portail client 0,42 ; sinistres CH 0,47 ; appels d'offres CH 0,33 → sous le seuil ;
   sinistres FR 0,69 (juste sous le seuil, à revoir avec un appel dédié) ; programme de pages
   géographiques de masse : JEV répond NON (0,37) — aucune déclinaison automatique.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_seo_pillars import PAGES, PUBLIC, SITE, page  # noqa: E402

CAPTURE = "/img/demo-courtia-tableau-de-bord.jpg"

VILLES = ["paris", "lyon", "marseille", "bordeaux", "toulouse",
          "nantes", "lille", "strasbourg", "montpellier", "nice"]

BLOC_VILLES = """<!-- seo-noyau:villes-prioritaires:start -->
  <section id="villes-prioritaires">
    <h2>Le courtage, ville par ville</h2>
    <p>COURTIA sert des cabinets partout en France : le produit ne dépend pas de la ville. Les pages
    ci-dessous sont les seules entrées locales conservées, parce qu'elles portent un contenu propre
    sur leur tissu de courtage.</p>
    <ul class="links">
{liens}
    </ul>
    <p>Les autres entrées locales ont été retirées de l'index : un même gabarit décliné sur des
    centaines de villes n'apporte rien à un courtier.</p>
  </section>
<!-- seo-noyau:villes-prioritaires:end -->""".replace(
    "{liens}",
    "\n".join(f'      <li><a href="/fr/logiciel-courtier-assurance-{v}">'
              f'{v.capitalize().replace("-", " ")}</a></li>' for v in VILLES))

# ─────────────────────────────────────────────────────────────────────────────
# 1. PILIER /fr/logiciel-courtier-assurance — enrichi (réécriture du contenu, villes préservées)
# ─────────────────────────────────────────────────────────────────────────────

PAGES["fr/logiciel-courtier-assurance"] = dict(
    marche="FR",
    titre="Logiciel courtier assurance : dossier, relances, commissions — COURTIA",
    description=(
        "Logiciel de courtage pour courtiers et cabinets d'assurance : CRM, contrats, échéances, "
        "devis, relances, commissions et conformité dans un seul outil. Essai 7 jours, France et Suisse."
    ),
    h1="Arrêtez de chercher vos dossiers : contrats, relances et commissions dans un seul outil de courtage",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Logiciel courtier assurance", "/fr/logiciel-courtier-assurance")],
    maillage=[
        ("CRM courtier assurance", "/fr/crm-courtier-assurance",
         "le dossier client 360° et le travail quotidien"),
        ("Devis d'assurance à produire et à suivre", "/fr/logiciel-devis-courtier-assurance",
         "le parcours devis, du besoin exprimé à la signature"),
        ("Gestion d'un cabinet de courtage", "/fr/logiciel-gestion-cabinet-courtage",
         "commissions, coûts et pilotage du cabinet"),
        ("Automatisation du cabinet", "/fr/automatisation-courtier-assurance",
         "ce qui se déclenche sans intervention, et ce qui reste à valider"),
        ("Mesurer son temps administratif", "/fr/mesurer-temps-administratif-cabinet",
         "la méthode pour savoir où part le temps du cabinet, sans chiffre inventé"),
        ("Logiciel de courtage en Suisse", "/ch/logiciel-courtier-assurance-suisse",
         "le même outil dans le cadre suisse (CHF, UID, canton, journal de conseil)"),
    ],
    corps=f"""
<div class="section">
<h2>Pour qui, et pour quel problème</h2>
<p>COURTIA est un logiciel de gestion pour les <strong>courtiers et cabinets de courtage en
assurance</strong> : courtier indépendant qui travaille seul, cabinet de deux à dix personnes,
structure multi-agences. Il règle un problème précis : le portefeuille, les échéances, les pièces,
les devis et les commissions vivent dans des outils séparés, et c'est cette dispersion qui consume
les journées.</p>
<p>Trois mots résument ce que le produit fait : <strong>centraliser</strong> (un dossier client, un
écran), <strong>automatiser</strong> (ce qui peut se déclencher sans décision), <strong>prioriser</strong>
(ce qui doit être traité aujourd'hui, et pas au hasard).</p>
<div class="cta">
  <a class="principal" href="{SITE}/onboarding">Créer un accès (essai 7 jours)</a>
  <a href="{SITE}/demo-public">Ouvrir la démonstration publique</a>
</div>
<p class="doux">Aucune durée économisée n'est promise sur cette page : nous n'avons pas de mesure
reproductible à publier, et nous n'en fabriquons pas.</p>
</div>

<h2>Le produit, en images</h2>
<p>Plutôt qu'une description : voici le tableau de bord de la démonstration publique de COURTIA, sur
un cabinet fictif aux données synthétiques. On y voit les dossiers actifs, les contrats, les primes
annuelles, la tâche prioritaire du jour et les échéances à 30 jours.</p>
<p><img src="{CAPTURE}" width="1280" height="519"
  alt="Tableau de bord de COURTIA : dossiers actifs, contrats, primes annuelles, score de santé du portefeuille, tâches prioritaires du jour et échéances à 30 jours, sur un cabinet de démonstration aux données synthétiques"
  loading="lazy" style="width:100%;height:auto;border-radius:14px;border:1px solid rgba(255,255,255,.10)"></p>
<p class="doux">Capture réelle de la démonstration publique : cabinet fictif, données synthétiques, <strong>aucune donnée client réelle</strong>. La démonstration est ouverte à tous : <a href="{SITE}/demo-public">l'essayer sans compte</a>.</p>

<section>
<h2>Un cabinet multi-branches, un seul cockpit</h2>
<p>Un courtier généraliste gère des contrats qui n'ont ni la même durée, ni la même échéance, ni la
même compagnie : auto, habitation, prévoyance, santé, flotte, responsabilité civile
professionnelle. Ce qui coûte du temps n'est pas de vendre : c'est de tenir à jour un portefeuille
qui bouge tous les mois sans rien laisser passer.</p>
<p>COURTIA rassemble ce portefeuille dans un seul écran : chaque contrat avec sa compagnie, sa prime,
sa date d'échéance et son historique de relance. L'assistant ARK signale ce qui demande une action
<em>avant</em> que le client ne s'en aperçoive.</p>
</section>

<h2>Ce que le logiciel fait réellement</h2>
<p>Cette liste correspond aux fonctions présentes dans le produit, pas à une feuille de route :</p>
<ul>
<li><strong>Dossier client 360°</strong> — coordonnées, contrats, échéances, documents, tâches et
historique sur une seule fiche, avec détection des doublons et étiquettes.</li>
<li><strong>Contrats et échéances</strong> — suivi des dates et des montants, dans la devise du
marché du cabinet (EUR en France, CHF en Suisse).</li>
<li><strong>Devis</strong> — parcours guidé, produits, registre des devis, relance et signature
électronique, sans sortir du dossier.</li>
<li><strong>Relances et suivi</strong> — ce qui est attendu, depuis quand, avec un message préparé
que le cabinet valide avant envoi.</li>
<li><strong>Collecte de pièces</strong> — un lien de dépôt permet au client de transmettre ses
justificatifs sans créer de compte ; la pièce arrive dans le dossier.</li>
<li><strong>Commissions</strong> — barèmes par partenaire, import des relevés, états par période,
calculateur.</li>
<li><strong>Documents</strong> — génération de documents depuis les données du dossier, lecture
assistée des pièces reçues pour limiter la ressaisie.</li>
<li><strong>Tâches et affectation</strong> — file de travail et tableau kanban, réparti dans
l'équipe.</li>
<li><strong>Conformité par marché</strong> — référentiels et listes de contrôle adaptés au marché du
cabinet, pas une liste générique.</li>
<li><strong>Assistant IA ARK</strong> — briefing du matin, synthèse du portefeuille, priorisation des
actions, préparation d'appel, brouillons de messages, veille ciblée.</li>
<li><strong>Prospection</strong> — campagnes, boîte de réception des réponses et suivi des prospects
dans le même outil que les clients existants.</li>
<li><strong>Pilotage du cabinet</strong> — tableau de bord, reporting, objectifs, opportunités et
santé du portefeuille, calculés sur les données saisies.</li>
<li><strong>Équipe</strong> — plusieurs utilisateurs par cabinet, rôles distincts, données
cloisonnées par cabinet (un cabinet ne voit que ses données).</li>
<li><strong>Import de portefeuille</strong> — pour démarrer avec les dossiers déjà détenus plutôt
qu'avec une page blanche.</li>
</ul>

<h2>Un dossier, de bout en bout</h2>
<p>Plutôt qu'une liste de fonctions, voici le trajet réel d'un dossier dans le produit — sans
chiffre, sans durée promise :</p>
<ol>
<li><strong>Le client appelle.</strong> Le courtier ouvre sa fiche : contrats en cours, échéances à
venir, documents reçus, derniers échanges. Rien à chercher ailleurs pendant l'appel.</li>
<li><strong>Une échéance approche.</strong> Elle remonte dans les tâches du jour et dans le briefing
du matin, avec ce qui doit être préparé. Le renouvellement ne se découvre plus après coup.</li>
<li><strong>Une pièce manque.</strong> Un lien de dépôt est transmis au client ; la pièce déposée
arrive dans le dossier, sans ressaisie ni classement manuel.</li>
<li><strong>Un devis doit être produit.</strong> Il se construit dans le parcours guidé à partir du
dossier, entre dans le registre, et son état reste visible — y compris s'il reste sans réponse.</li>
<li><strong>Le devis est accepté.</strong> La signature électronique se recueille dans le parcours ;
le devis, ses pièces et son historique restent attachés au client.</li>
<li><strong>Le contrat vit.</strong> Il porte sa compagnie, sa prime et sa date d'échéance ; la
commission qui en découle se suit dans les états du cabinet.</li>
<li><strong>Un contrôle arrive.</strong> Ce qui a été fait, quand et sur quelle base reste
consultable dans le dossier — sans reconstituer trois ans d'échanges.</li>
</ol>
<p class="doux">Ce déroulé décrit des enchaînements de travail, pas des durées : COURTIA ne publie
aucun gain chiffré qui n'aurait pas été mesuré. Pour le constater, la démonstration publique est
ouverte et l'essai dure 7 jours.</p>

<h2>Deux écrans réels</h2>
<p>Le premier montre le tableau de bord ; le second, l'écran d'assistance ARK, qui compte les
clients évalués, ceux à risque et le score moyen du portefeuille de démonstration, puis liste les
dossiers à traiter avec le motif et le plan de rétention :</p>
<p><img src="/img/demo-courtia-ark-intelligence.jpg" width="1280" height="398"
  alt="Écran ARK Intelligence de la démonstration COURTIA : clients évalués, dossiers à risque, score moyen du portefeuille et liste des clients à risque avec leur score, sur un cabinet de démonstration aux données synthétiques"
  loading="lazy" style="width:100%;height:auto;border-radius:14px;border:1px solid rgba(255,255,255,.10)"></p>
<p class="doux">Ces deux captures viennent de la démonstration publique : cabinet fictif, données
synthétiques, <strong>aucune donnée client réelle</strong>. Elles sont vérifiables par n'importe qui,
sans création de compte — c'est ce qui les distingue d'une illustration marketing.</p>

<h2>Ce que ça change au quotidien</h2>
<p>Les renouvellements ne se perdent plus dans un tableur, les commissions se rapprochent des relevés
par compagnie, et le registre des contrats reste consultable en un clic le jour d'un contrôle. Le
briefing du matin résume ce qui est urgent et ce qui peut attendre.</p>
<table>
<tr><th>Moment</th><th>Sans outil dédié</th><th>Avec COURTIA</th></tr>
<tr><td>Un client appelle</td><td>Chercher dans les e-mails, ouvrir un dossier, vérifier l'agenda</td><td>La fiche affiche contrats, échéances, documents et historique</td></tr>
<tr><td>Une pièce manque</td><td>Relancer par e-mail et classer à la main</td><td>Un lien de dépôt, et la pièce entre dans le dossier</td></tr>
<tr><td>Un devis attend une réponse</td><td>S'en souvenir au hasard d'un appel</td><td>Le devis garde son état et sa relance dans le registre</td></tr>
<tr><td>Fin de mois</td><td>Reconstituer les commissions dans un tableur</td><td>Relevés importés, états par période</td></tr>
</table>

<h2>Pour qui, concrètement</h2>
<ul>
<li><strong>Courtier indépendant</strong> — l'offre d'entrée couvre le dossier client, les contrats,
les échéances et les relances.</li>
<li><strong>Cabinet de 2 à 10 personnes</strong> — l'offre principale ajoute les documents métier,
les intégrations et l'assistant complet ; l'offre cabinet ajoute le multi-utilisateurs, les
commissions et le reporting avancé.</li>
<li><strong>Cabinet suisse</strong> — grille et facturation en francs suisses, identité du cabinet
(raison sociale, UID, canton), journal de conseil : voir
<a href="/ch/logiciel-courtier-assurance-suisse">l'univers suisse</a>.</li>
<li><strong>Structure multi-agences</strong> — rôles, cloisonnement des données et
<a href="/fr/logiciel-courtier-multi-agences">pilotage multi-agences</a>.</li>
</ul>

<h2>Comment on démarre</h2>
<ol>
<li>Créer un accès et essayer 7 jours — à l'expiration, <strong>aucune donnée n'est supprimée</strong> :
le cabinet garde la consultation et reprend les écritures à la souscription.</li>
<li>Importer le portefeuille existant plutôt que de saisir les dossiers à la main.</li>
<li>Renseigner les échéances, pour que les renouvellements remontent d'eux-mêmes.</li>
<li>Ouvrir la collecte de pièces, puis les relances et les documents.</li>
</ol>

<h2>Ce que COURTIA ne fait pas</h2>
<ul>
<li>Ce n'est pas un <strong>comparateur grand public</strong> d'assurances : il n'y a ni palmarès
d'assureurs ni mise en relation de particuliers.</li>
<li>Ce n'est pas un logiciel de <strong>comptabilité générale</strong> : le suivi des commissions et
des coûts sert le pilotage, pas la tenue des comptes.</li>
<li>COURTIA n'est pas <strong>certifié</strong> par une autorité de surveillance et ne rend personne
conforme à lui seul : il structure, trace et documente, la responsabilité reste celle du cabinet.</li>
</ul>

{BLOC_VILLES}
""",
    faq=[
        ("Qu'est-ce qu'un logiciel de courtage, par rapport à un CRM classique ?",
         "Un CRM classique suit des contacts et des opportunités. Un logiciel de courtage suit des objets métier : contrats avec compagnie et échéance, devis à produire et à signer, pièces justificatives, commissions, obligations d'information. COURTIA est de la seconde famille, avec le dossier client comme point de départ."),
        ("COURTIA gère-t-il plusieurs branches d'assurance dans un même cabinet ?",
         "Oui. Un portefeuille multi-branches est le cas normal : chaque contrat porte sa compagnie et son échéance, et les vues se filtrent par branche sans changer d'outil."),
        ("Faut-il tout saisir à la main pour commencer ?",
         "Non. L'import de portefeuille permet de démarrer avec les contrats déjà détenus. Le reste se complète au fil de l'eau, sans interruption d'activité."),
        ("Les relances partent-elles automatiquement ?",
         "Non. COURTIA prépare le message et suit la relance ; l'envoi reste une décision du cabinet. Une relance envoyée à contretemps coûte plus cher que le temps qu'elle économise."),
        ("Combien de temps cela fait-il gagner ?",
         "Nous ne publions pas de chiffre : il dépend du portefeuille et des outils déjà en place. Ce qui se vérifie, c'est le nombre d'outils consultés et de ressaisies supprimées — et cela se constate sur ses propres dossiers pendant les 7 jours d'essai."),
        ("Peut-on tester avant de s'engager ?",
         "Oui, 7 jours, sans engagement, et la démonstration publique est ouverte sans création de compte. À l'expiration, aucune donnée n'est supprimée."),
        ("Puis-je manipuler le prix depuis l'interface ?",
         "Non. Le prix appliqué est déterminé côté serveur à partir de la grille du marché du cabinet : rien n'est décidé par le navigateur."),
    ],
    schema_offres=[
        {"@type": "Offer", "name": "Starter", "price": "89", "priceCurrency": "EUR",
         "description": "Offre d'entrée, par mois, hors taxes (France)."},
        {"@type": "Offer", "name": "Pro", "price": "159", "priceCurrency": "EUR",
         "description": "Offre principale, par mois, hors taxes (France)."},
        {"@type": "Offer", "name": "Indépendant", "price": "199", "priceCurrency": "CHF",
         "description": "Offre pour courtier indépendant, par mois, hors taxes (Suisse)."},
        {"@type": "Offer", "name": "Cabinet", "price": "349", "priceCurrency": "CHF",
         "description": "Offre cabinet, par mois, hors taxes (Suisse)."},
    ],
)

# ─────────────────────────────────────────────────────────────────────────────
# 2. NOUVELLE PAGE — devis d'assurance (intention distincte selon JEV : 0,75)
# ─────────────────────────────────────────────────────────────────────────────

PAGES["fr/logiciel-devis-courtier-assurance"] = dict(
    marche="FR",
    titre="Devis d'assurance : produire, suivre, faire signer — COURTIA",
    description=(
        "Produire et suivre les devis d'assurance d'un cabinet de courtage : parcours guidé, registre "
        "des propositions, relance de celles restées sans réponse, signature électronique."
    ),
    h1="Devis d'assurance : du besoin exprimé à la signature, sans sortir du dossier",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Devis d'assurance", "/fr/logiciel-devis-courtier-assurance")],
    maillage=[
        ("Logiciel courtier assurance", "/fr/logiciel-courtier-assurance", "la vue d'ensemble du produit"),
        ("Comparer des propositions", "/fr/comparateur-assurance-courtier", "mettre côte à côte les offres reçues"),
        ("Relances clients", "/fr/relance-client-assurance", "ce qui se relance et ce qui se valide"),
        ("Devis en Suisse", "/ch/logiciel-devis-courtier-assurance-suisse", "le même parcours côté suisse"),
    ],
    corps="""
<div class="section">
<h2>Un devis se perd rarement parce qu'il est mal fait</h2>
<p>Il se perd parce qu'il n'a pas d'endroit où vivre. Rédigé dans un traitement de texte, envoyé par
e-mail, suivi de mémoire : au moment de la relance, personne ne sait si le client a répondu, ni ce
qui manquait. Et quand vient la signature, il faut retrouver le document, la version envoyée et les
pièces associées.</p>
</div>

<h2>Ce que le produit fait sur un devis</h2>
<ol>
<li><strong>Le besoin est consigné dans le dossier</strong> — il ne s'agit pas d'un document isolé :
le devis part d'un client, d'un besoin exprimé et d'éléments de situation.</li>
<li><strong>Le devis se construit dans un parcours guidé</strong> — produits, garanties et montants
sont saisis dans un formulaire qui suit le déroulé réel du cabinet plutôt qu'une page blanche.</li>
<li><strong>Le devis entre dans un registre</strong> — chaque proposition garde son état : envoyée,
sans réponse, acceptée, refusée. C'est ce registre qui permet de savoir, sans chercher, ce qui
attend une décision.</li>
<li><strong>La relance se prépare</strong> — le message est rédigé à partir du dossier ; le cabinet
le valide avant envoi.</li>
<li><strong>La signature se recueille</strong> — le parcours va jusqu'à la signature électronique via
un prestataire, sans que le cabinet ait à imprimer, scanner ou coller un PDF.</li>
<li><strong>Les pièces suivent</strong> — le lien de dépôt permet de récupérer les justificatifs
attendus, rattachés au même dossier.</li>
</ol>

<h2>Avant / avec, sur le même devis</h2>
<table>
<tr><th>Étape</th><th>Sans suivi dédié</th><th>Avec COURTIA</th></tr>
<tr><td>Rédiger</td><td>Repartir d'un ancien document et le réadapter</td><td>Parcours guidé, depuis les données du dossier</td></tr>
<tr><td>Envoyer</td><td>Pièce jointe, sans trace centralisée</td><td>L'envoi est rattaché au devis et reste consultable</td></tr>
<tr><td>Relancer</td><td>« Il faut que je repense à rappeler »</td><td>Le registre signale les propositions sans réponse</td></tr>
<tr><td>Faire signer</td><td>Impression, scan, relance du document</td><td>Signature électronique dans le parcours</td></tr>
<tr><td>Justifier le conseil</td><td>Reconstituer après coup</td><td>Le devis et ses pièces restent attachés au dossier</td></tr>
</table>

<h2>Ce que cette page ne prétend pas</h2>
<p>Aucun taux de conversion ni aucune durée de production n'est annoncé. Le produit accélère la
circulation du devis et supprime des ressaisies ; il ne décide ni du prix, ni de la garantie, ni du
conseil donné au client.</p>
""",
    faq=[
        ("Le devis est-il conservé même s'il reste sans réponse ?",
         "Oui. Le registre garde l'état de chaque proposition, y compris celles qui n'ont pas abouti : c'est ce qui permet de relancer utilement au lieu de relancer au hasard."),
        ("La signature électronique est-elle incluse ?",
         "Le parcours va jusqu'à la signature via un prestataire de signature électronique, sans que le cabinet ait à sortir du dossier."),
        ("Peut-on comparer plusieurs propositions pour un même client ?",
         "Oui : les propositions s'enregistrent dans le dossier du client, ce qui permet de les mettre côte à côte, avec le besoin exprimé et les documents reçus."),
    ],
)

# ─────────────────────────────────────────────────────────────────────────────
# 3. NOUVELLE PAGE — méthode de mesure du temps administratif (JEV : 0,77)
# ─────────────────────────────────────────────────────────────────────────────

PAGES["fr/mesurer-temps-administratif-cabinet"] = dict(
    marche="FR",
    titre="Mesurer le temps administratif d'un cabinet de courtage : la méthode",
    description=(
        "Quatre mesures simples pour savoir où part le temps administratif d'un cabinet de courtage, "
        "avant d'acheter un outil. Méthode reproductible, sans chiffre inventé."
    ),
    h1="Mesurer le temps administratif de son cabinet avant de changer d'outil",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Mesurer le temps administratif", "/fr/mesurer-temps-administratif-cabinet")],
    maillage=[
        ("Gagner du temps en cabinet", "/fr/gagner-du-temps-courtier-assurance", "les cinq postes où le temps se perd"),
        ("Automatisation du cabinet", "/fr/automatisation-courtier-assurance", "ce qui peut être retiré du travail manuel"),
        ("Logiciel courtier assurance", "/fr/logiciel-courtier-assurance", "ce que COURTIA réunit dans un seul outil"),
        ("CRM courtier assurance", "/fr/crm-courtier-assurance", "le dossier client unique"),
    ],
    corps="""
<div class="section">
<h2>Pourquoi cette page existe</h2>
<p>Le marché du logiciel de courtage fonctionne à la promesse : « gagnez 5 à 10 heures par
semaine », « +20 % de rétention ». Ces chiffres viennent rarement d'une mesure, et personne ne dit
comment ils ont été obtenus. Un cabinet qui veut décider sérieusement n'a besoin que d'une chose :
<strong>savoir où part son temps</strong>, avec ses propres chiffres.</p>
<p>Cette page décrit une méthode mesurable en une semaine, sans logiciel et sans consultant. Elle
appartient à COURTIA, mais elle sert même si vous ne choisissez pas COURTIA.</p>
</div>

<h2>Mesure 1 — Le comptage des outils ouverts</h2>
<p>Pendant trois jours, notez le nombre d'outils (onglets, applications, dossiers, classeurs,
boîtes mail) qu'il faut ouvrir pour répondre à une question simple : « où en est le contrat de ce
client ? ». Ce que vous mesurez : la dispersion de l'information. Un cabinet qui répond en un seul
écran n'a pas le même problème qu'un cabinet qui en ouvre cinq.</p>
<p class="doux">Ce qu'il faut noter : le nombre, pas le temps. Le nombre se compte sans chronomètre
et ne dépend pas de l'interprétation de chacun.</p>

<h2>Mesure 2 — Les pièces redemandées</h2>
<p>Sur un mois, comptez les pièces justificatives qui ont dû être réclamées plus d'une fois au même
client. Chaque redemande est le signe d'une information qui ne circule pas entre le dossier et les
échanges. Le comptage se fait à partir des e-mails et des dossiers, sans estimation.</p>

<h2>Mesure 3 — Les échéances découvertes en retard</h2>
<p>Listez les renouvellements traités en retard le mois dernier, et pour chacun, comment vous l'avez
découvert : un agenda, un e-mail de la compagnie, un appel du client. Cette mesure dit si le suivi
repose sur un système ou sur la mémoire.</p>

<h2>Mesure 4 — Les propositions sans réponse</h2>
<p>Comptez les devis envoyés sans réponse depuis plus de quinze jours, et vérifiez si une relance a
été faite. C'est la mesure la plus souvent oubliée, et l'une des plus rentables : un devis sans
suite n'est pas un refus, c'est une absence de suivi.</p>

<h2>Interpréter les quatre mesures</h2>
<table>
<tr><th>Résultat</th><th>Ce que cela indique</th><th>Ce qui se met en place ensuite</th></tr>
<tr><td>Nombre d'outils élevé pour une question simple</td><td>L'information est dispersée</td><td>Centraliser le dossier client avant toute automatisation</td></tr>
<tr><td>Pièces redemandées plusieurs fois</td><td>La collecte ne laisse pas de trace</td><td>Collecte de pièces par lien, rattachée au dossier</td></tr>
<tr><td>Échéances découvertes en retard</td><td>Le suivi dépend de la mémoire ou d'un agenda séparé</td><td>Échéances suivies dans le dossier, remontées quotidiennement</td></tr>
<tr><td>Propositions sans relance</td><td>Le suivi commercial n'a pas d'état consolidé</td><td>Registre des devis avec état, relance préparée</td></tr>
</table>

<h2>Ce que cette méthode n'est pas</h2>
<p>Ce n'est pas un audit financier, ni une promesse de gain : aucun chiffre n'est avancé ici. C'est
un point de départ honnête — quatre comptages dont vous tirez vos propres conclusions, avant
d'engager un budget.</p>
""",
    faq=[
        ("Faut-il un logiciel pour appliquer cette méthode ?",
         "Non. Un tableur suffit pour les quatre comptages, sur une semaine. Le but est justement de décider avec ses propres chiffres avant d'acheter."),
        ("Pourquoi ne pas publier de gain moyen ?",
         "Parce qu'un gain dépend du portefeuille, du nombre de collaborateurs et des outils déjà en place. Nous ne publions pas de chiffre que nous ne pouvons pas mesurer et faire reproduire."),
        ("Ces mesures servent-elles aussi en Suisse ?",
         "Oui. La méthode est identique ; le vocabulaire, la devise et les obligations diffèrent, c'est pourquoi l'univers suisse de COURTIA est séparé."),
    ],
)


def main():
    ecrits = []
    for chemin, definition in PAGES.items():
        if chemin not in ("fr/logiciel-courtier-assurance", "fr/logiciel-devis-courtier-assurance",
                          "fr/mesurer-temps-administratif-cabinet"):
            continue
        rendu = page(chemin=chemin, **definition)
        cible = os.path.join(PUBLIC, chemin, "index.html")
        os.makedirs(os.path.dirname(cible), exist_ok=True)
        with open(cible, "w", encoding="utf-8") as f:
            f.write(rendu)
        ecrits.append((chemin, len(rendu)))
        print(f"OK  /{chemin}  {len(rendu)} octets")
    print(f"\n{len(ecrits)} page(s) vague 2 écrite(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
