#!/usr/bin/env python3
"""Génère les money pages du cluster suisse /ch de courtiark.fr.

Un seul fichier de contenu (PAGES) -> un dossier frontend/public/ch/<slug>/index.html.
Le gabarit reprend la charte des pages /ch existantes (hub, conformité, tarifs).

Usage : python3 scripts/generate_ch_money_pages.py
"""

import os
import json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "frontend", "public", "ch")
SITE = "https://courtiark.fr"
FR_FEATURES = f"{SITE}/fonctionnalites"
FR_HOME = f"{SITE}/"

STYLE = """  :root{--bg:#050510;--fg:#f6f7ff;--muted:#b9bdd4;--cyan:#8fe7ff;--pink:#ff7cc3;--line:rgba(255,255,255,.14)}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.65}
  a{color:var(--cyan)}
  header.top{padding:20px 24px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--line)}
  header.top a.brand{font-weight:800;letter-spacing:-.02em;color:var(--fg);text-decoration:none}
  main{max-width:920px;margin:0 auto;padding:32px 24px 72px}
  h1{font-size:clamp(1.85rem,4.6vw,2.85rem);line-height:1.07;letter-spacing:-.03em;margin:8px 0 16px}
  h2{margin-top:44px;font-size:clamp(1.2rem,2.5vw,1.6rem);letter-spacing:-.02em}
  h3{margin-top:24px;font-size:1.03rem}
  p,li{color:var(--muted)}
  strong{color:var(--fg)}
  .eyebrow{color:var(--cyan);text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:800}
  .lede{font-size:1.06rem}
  .card{border:1px solid var(--line);border-radius:18px;padding:20px 22px;background:rgba(255,255,255,.03);margin:18px 0}
  .grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
  table{width:100%;border-collapse:collapse;margin:16px 0;font-size:.95rem}
  th,td{border:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top}
  th{color:var(--fg)}
  .cta{display:inline-flex;align-items:center;gap:8px;margin:8px 12px 8px 0;padding:13px 22px;border-radius:999px;background:linear-gradient(135deg,#a9f1ff,#ff71bd);color:#060717;font-weight:800;letter-spacing:.02em;text-decoration:none}
  .cta.ghost{background:none;border:1px solid var(--line);color:var(--fg)}
  .note{font-size:.86rem;color:#8f93ad}
  .scenario{border-left:3px solid var(--cyan);padding:2px 0 2px 18px;margin:20px 0}
  .limit{border:1px dashed var(--line);border-radius:18px;padding:18px 22px;background:rgba(255,255,255,.02);margin:18px 0}
  details{border-top:1px solid var(--line);padding:12px 0}
  details summary{cursor:pointer;color:var(--fg);font-weight:600}
  details p{margin:10px 0 0}
  nav.crumbs{font-size:.85rem;color:#8f93ad;padding-top:8px}
  ul.links{list-style:none;padding:0}
  ul.links li{padding:6px 0;border-bottom:1px solid var(--line)}
  footer{border-top:1px solid var(--line);padding:24px;font-size:.85rem;color:#8f93ad}
  footer a{margin-right:14px}
  footer div{margin-top:8px}"""

HEADER = """<header class="top">
  <a class="brand" href="https://courtiark.fr/">COURTIA</a>
  <a href="/ch">Suisse</a>
  <a href="/ch/conformite-intermediaire-assurance-lsa-finma">Conformité LSA / FINMA</a>
  <a href="/ch/tarifs-logiciel-courtier-chf">Tarifs CHF</a>
  <a href="https://courtiark.fr/fonctionnalites">Fonctionnalités</a>
  <a href="https://courtiark.fr/contact">Contact</a>
</header>"""

FOOTER_LINKS = """  <div>
    <a href="/ch">Suisse</a>
    <a href="/ch/crm-courtier-assurance-suisse">CRM courtier</a>
    <a href="/ch/gestion-portefeuille-assurance-suisse">Portefeuille</a>
    <a href="/ch/gestion-commissions-courtier-assurance-suisse">Commissions</a>
    <a href="/ch/relances-courtier-assurance-suisse">Relances</a>
    <a href="/ch/logiciel-prospection-courtier-assurance-suisse">Prospection</a>
    <a href="/ch/logiciel-devis-courtier-assurance-suisse">Devis</a>
    <a href="/ch/ia-courtier-assurance-suisse">IA / ARK</a>
    <a href="/ch/conformite-intermediaire-assurance-lsa-finma">Conformité LSA / FINMA</a>
    <a href="/ch/tarifs-logiciel-courtier-chf">Tarifs CHF</a>
    <a href="https://courtiark.fr/legal/mentions-legales">Mentions légales</a>
    <a href="https://courtiark.fr/legal/confidentialite">Confidentialité</a>
  </div>"""

CTA_DEMO = '<a class="cta" href="https://courtiark.fr/demo">VOIR COURTIA EN ACTION</a>'


def org_schema():
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "COURTIA",
        "url": SITE,
        "logo": f"{SITE}/og-courtia.png",
        "email": "contact@courtiark.fr",
    }


def breadcrumb(slug, name):
    items = [
        {"@type": "ListItem", "position": 1, "name": "Accueil", "item": f"{SITE}/"},
        {"@type": "ListItem", "position": 2, "name": "Suisse", "item": f"{SITE}/ch"},
        {"@type": "ListItem", "position": 3, "name": name, "item": f"{SITE}/ch/{slug}"},
    ]
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items}


def faq_schema(faq):
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in faq
        ],
    }


def render(page):
    slug = page["slug"]
    url = f"{SITE}/ch/{slug}"
    faq_html = "\n".join(
        f"  <details><summary>{q}</summary><p>{a}</p></details>" for q, a in page["faq"]
    )
    schemas = [org_schema(), breadcrumb(slug, page["crumb"])]
    if page.get("schema"):
        schemas.append(page["schema"])
    schemas.append(faq_schema(page["faq"]))
    ld = "\n".join(
        '<script type="application/ld+json">' + json.dumps(s, ensure_ascii=False) + "</script>"
        for s in schemas
    )
    return f"""<!DOCTYPE html>
<html lang="fr-CH">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{page['title']}</title>
<meta name="description" content="{page['desc']}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="fr-CH" href="{url}">
<link rel="alternate" hreflang="fr-FR" href="{FR_FEATURES}">
<link rel="alternate" hreflang="x-default" href="{FR_HOME}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#050510">
<meta property="og:type" content="website">
<meta property="og:title" content="{page['og_title']}">
<meta property="og:description" content="{page['og_desc']}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/og-courtia.png">
<meta property="og:locale" content="fr_CH">
<meta name="twitter:card" content="summary_large_image">
{ld}
<style>
{STYLE}
</style>
</head>
<body>
{HEADER}
<main>
  <nav class="crumbs" aria-label="fil d'Ariane">Accueil › <a href="/ch">Suisse</a> › {page['crumb']}</nav>
  <p class="eyebrow">{page['eyebrow']}</p>
  <h1>{page['h1']}</h1>
  <p class="lede">{page['lede']}</p>
  <p>{CTA_DEMO}<a class="cta ghost" href="https://courtiark.fr/contact">Poser une question</a></p>

{page['body']}

  <h2>Questions fréquentes</h2>
{faq_html}

  <h2>Pour aller plus loin</h2>
  <ul class="links">
{page['links']}
  </ul>

  <p>{CTA_DEMO}<a class="cta ghost" href="/ch">Le cluster suisse</a></p>
</main>
<footer>
  <strong>COURTIA</strong> — courtiark.fr · Page publiée pour la Suisse romande (fr-CH). Aucun élément de cette page ne constitue un conseil juridique ou un avis réglementaire.
{FOOTER_LINKS}
</footer>
</body>
</html>
"""


PAGES = []

# --------------------------------------------------------------------------
# 1. IA / ARK
# --------------------------------------------------------------------------
PAGES.append(dict(
    slug="ia-courtier-assurance-suisse",
    crumb="IA pour courtier d'assurance",
    eyebrow="Suisse · assistance IA pour cabinets de courtage",
    title="IA pour courtier d'assurance en Suisse — ARK, l'assistance de COURTIA",
    desc="ARK trie chaque matin un portefeuille suisse : clients à risque de perte, couvertures manquantes, renouvellements sous 90 jours. Le courtier valide chaque action.",
    og_title="IA pour courtier d'assurance en Suisse — ARK, l'assistance de COURTIA",
    og_desc="Churn Predictor, Cross-Sell Engine, Renewal Optimizer et Morning Brief : ce que l'IA de COURTIA fait réellement dans un cabinet suisse, et ce qu'elle ne fait pas.",
    h1="IA pour courtier d'assurance en Suisse : ARK trie, vous décidez",
    lede="Un cabinet suisse gère couramment 300 à 900 contrats. Aucune de ces polices ne se plaint de ne pas être suivie : le client résilie, ou va voir ailleurs, sans prévenir. ARK, l'assistance IA intégrée à COURTIA, fait chaque matin le tri que personne n'a le temps de faire — quels clients risquent de partir, quelles couvertures manquent à quel client, quels contrats arrivent à échéance dans moins de 90 jours — puis s'arrête. Chaque recommandation doit être ouverte, lue et validée par le courtier avant de devenir une action.",
    body="""  <h2>Le problème réel : on traite la dernière urgence, pas le vrai risque</h2>
  <p>Dans un cabinet de courtage, la file d'attente du lundi est décidée par celui qui a appelé le dernier. Le dossier le plus récent gagne ; le dossier le plus dangereux attend. Or un client qui part ne fait pas de bruit : il compare, il signe ailleurs, et il l'annonce au moment de résilier.</p>
  <p>En Suisse, cette dérive a un calendrier précis. Une part importante des contrats se renouvelle à date fixe, souvent au 1<sup>er</sup> janvier, avec des délais d'opposition qui tombent en fin d'année. Un contrat qu'on redécouvre en décembre se défend mal, et une échéance ratée coûte une année entière de commission.</p>
  <p>Trois questions simples, auxquelles un cabinet de 500 polices ne répond pas en moins d'une heure :</p>
  <ul>
    <li>Quels clients n'ont eu <strong>aucun contact</strong> avec le cabinet depuis 90 jours ?</li>
    <li>Quels clients n'ont qu'une seule police alors que leur situation en appelle une deuxième ?</li>
    <li>Quels contrats arrivent à échéance dans les <strong>90 prochains jours</strong> ?</li>
  </ul>
  <p>C'est exactement le périmètre d'ARK : ces trois questions, plus l'ordre dans lequel les traiter.</p>

  <h2>Avant COURTIA / avec COURTIA</h2>
  <table>
    <thead><tr><th>Moment</th><th>Sans outil de tri</th><th>Avec ARK dans COURTIA</th></tr></thead>
    <tbody>
      <tr><td>7 h du matin</td><td>On ouvre sa boîte mail et on traite par ordre d'arrivée</td><td><strong>Morning Brief</strong> : priorités critiques, à traiter aujourd'hui, relances du jour, opportunités, points d'attention</td></tr>
      <tr><td>Qui relancer</td><td>Celui qui a rappelé en dernier</td><td><strong>Churn Predictor ARK</strong> : clients à risque de perte, top 20, liste relançable à la demande</td></tr>
      <tr><td>Couvertures manquantes</td><td>Au feeling, quand le client en parle de lui-même</td><td><strong>Cross-Sell Engine</strong> : matrice client × produit, avec le potentiel total chiffré</td></tr>
      <tr><td>Renouvellements</td><td>Redécouverts dans les PDF des compagnies</td><td><strong>Renewal Optimizer</strong> : contrats à échéance sous 90 jours, recommandation et économie potentielle</td></tr>
      <tr><td>Traçabilité</td><td>Dans la mémoire du courtier</td><td>Chaque recommandation devient une tâche ou une relance rattachée au client</td></tr>
    </tbody>
  </table>

  <h2>Ce que contient concrètement l'assistance ARK</h2>
  <div class="grid">
    <div class="card"><h3>Morning Brief</h3><p>L'écran d'ouverture du cabinet : un résumé exécutif, les priorités critiques, ce qui doit être traité aujourd'hui, les relances du jour, les opportunités et les points d'attention. Un compteur indique aussi les tâches générées par ARK.</p></div>
    <div class="card"><h3>Churn Predictor ARK</h3><p>Les clients à risque de perte, classés, avec la possibilité de relancer l'analyse (« Re-scanner ») après avoir mis le portefeuille à jour. Le courtier décide ensuite de relancer, d'appeler ou d'écarter.</p></div>
    <div class="card"><h3>Cross-Sell Engine</h3><p>Une matrice client × produit : ce que chaque client détient, ce qu'il n'a pas, et le potentiel total correspondant. Utile pour les produits suisses de prévoyance et de RC, souvent absents d'un portefeuille par simple oubli.</p></div>
    <div class="card"><h3>Renewal Optimizer</h3><p>Les contrats à échéance sous 90 jours, avec une recommandation par contrat et l'économie potentielle estimée. De quoi préparer une vague de renouvellements avant le dernier moment.</p></div>
    <div class="card"><h3>Recommandations dans la fiche client</h3><p>Le dossier client comporte un onglet ARK : les recommandations concernant ce client précis, dans le contexte de son historique et de ses contrats.</p></div>
    <div class="card"><h3>Santé portefeuille</h3><p>Les alertes actives et les recommandations ARK au niveau du portefeuille : contrats sans renouvellement, devis sans réponse, échéances proches, concentration par branche.</p></div>
  </div>
  <p class="note">Toutes les fonctions citées ici existent dans l'application. <a href="https://courtiark.fr/demo">La démonstration</a> les montre sur un portefeuille d'exemple : c'est la seule façon honnête de juger un tri automatique.</p>

  <h2>Scénario : un lundi matin dans un cabinet de deux personnes</h2>
  <p class="note">Cas de figure, pas une référence client : aucun cabinet n'est nommé, les volumes sont ceux d'un cabinet suisse de taille courante.</p>
  <div class="scenario">
    <p>Un cabinet de deux courtiers suit <strong>680 contrats</strong>. Lundi, 7 h 10, le Morning Brief affiche trois priorités critiques. L'une d'elles : un client dont le dossier n'a pas bougé depuis <strong>52 jours</strong> et dont la police principale arrive à échéance dans six semaines.</p>
    <p>Le courtier ouvre la fiche : l'historique du dossier est là, avec les contrats, les devis et les documents. Il valide la relance — elle part à son nom, avec ses mots, parce que l'envoi reste un acte du courtier. Il écarte ensuite deux autres recommandations : il connaît le contexte familial de ces clients, la proposition n'était pas pertinente.</p>
    <p>Il ouvre le Renewal Optimizer : <strong>19 contrats</strong> sous 90 jours, dont 8 qui se renouvellent au 1<sup>er</sup> janvier. Il en prépare 6 avant la fin de la matinée. Le Churn Predictor signale de son côté une liste de clients silencieux depuis plus de 90 jours : le courtier n'en traite pas la totalité, il traite les six premiers, dans l'ordre proposé.</p>
    <p>En une heure, le cabinet a traité ce qu'il aurait découvert — au mieux — en décembre.</p>
  </div>

  <h2>Ce qu'ARK ne fait pas</h2>
  <div class="limit">
    <ul>
      <li><strong>ARK ne contacte aucun client de lui-même.</strong> Pas d'e-mail automatique, pas de SMS, pas de message sortant. La recommandation s'arrête à l'écran.</li>
      <li><strong>ARK ne remplace pas le devoir de conseil</strong> au sens de l'art. 45 LSA : une recommandation est une proposition de travail interne, pas un conseil remis au client.</li>
      <li><strong>ARK ne transmet rien à une compagnie</strong> et ne signe rien. Elle ne remplit aucune démarche auprès de la FINMA.</li>
      <li><strong>Nous ne prétendons pas que l'IA ne se trompe jamais.</strong> C'est précisément pour cela qu'aucune recommandation n'est appliquée automatiquement dans COURTIA.</li>
      <li><strong>Rien n'est inventé quand la donnée manque.</strong> Si les branches ou les échéances ne sont pas renseignées dans le portefeuille, aucune IA ne les devinera : le paramétrage initial est donc une étape réelle, et c'est ce que finance le setup.</li>
    </ul>
  </div>""",
    faq=[
        ("ARK est-il un chatbot qui répond aux clients ?",
         "Non. ARK n'écrit jamais à un client et ne répond à personne à votre place. ARK produit un ordre de priorité et des recommandations dans votre cockpit ; l'envoi d'un message reste un acte du courtier, avec ses mots."),
        ("L'IA fonctionne-t-elle avec les produits suisses ?",
         "Le paramétrage suisse de COURTIA prévoit la caisse-maladie, la LAA et la LCA/LAMal dans les offres Indépendant et Cabinet. La qualité du tri dépend ensuite de ce que contient réellement votre portefeuille : les branches et les échéances doivent être renseignées."),
        ("Est-ce que je peux utiliser COURTIA avec 150 contrats ?",
         "Oui, techniquement. L'intérêt d'un tri automatique commence quand le volume dépasse ce qu'un courtier peut tenir de tête, ce qui arrive vite : dès quelques centaines de polices, la troisième question du lundi matin n'a plus de réponse fiable sans outil."),
        ("Que se passe-t-il si je quitte COURTIA ?",
         "Vous exportez vos clients, vos contrats et vos documents dans un format réutilisable. C'est une question que nous posons nous-mêmes aux cabinets en démonstration, et elle se règle avant la signature, pas après."),
        ("Combien de temps avant d'être opérationnel ?",
         "Cela dépend du portefeuille à reprendre, pas de l'installation. C'est précisément le rôle du paramétrage initial : cadrer les branches, les compagnies et les échéances. Nous ne promettons pas une migration « automatique » depuis un autre logiciel."),
        ("Que voit ARK, exactement ?",
         "Vos clients, vos contrats, vos échéances, vos devis, vos documents et l'historique d'actions de votre cabinet. Pas les données d'un autre cabinet, et pas un portefeuille d'exemple une fois que vous êtes en production."),
    ],
    links="""    <li><a href="/ch">Page pilier : logiciel et CRM pour courtiers d'assurance en Suisse</a></li>
    <li><a href="/ch/relances-courtier-assurance-suisse">Relances et tâches : transformer une recommandation en appel</a></li>
    <li><a href="/ch/gestion-portefeuille-assurance-suisse">Gestion de portefeuille : contrats, échéances, renouvellements</a></li>
    <li><a href="/ch/gestion-commissions-courtier-assurance-suisse">Gestion des commissions : attendu, encaissé, à suivre</a></li>
    <li><a href="/ch/tarifs-logiciel-courtier-chf">Tarifs en CHF</a></li>""",
))

# --------------------------------------------------------------------------
# 2. Commissions
# --------------------------------------------------------------------------
PAGES.append(dict(
    slug="gestion-commissions-courtier-assurance-suisse",
    crumb="Gestion des commissions",
    eyebrow="Suisse · suivi et réconciliation des commissions",
    title="Gestion des commissions d'un courtier d'assurance en Suisse — COURTIA",
    desc="Suivez les commissions attendues, encaissées et à réclamer, par compagnie et par apporteur, dans le même outil que vos contrats suisses.",
    og_title="Gestion des commissions d'un courtier d'assurance en Suisse — COURTIA",
    og_desc="Attendu, encaissé, à suivre, par compagnie et par apporteur. Rapprochez les décomptes de vos compagnies suisses et préparez l'information due au client.",
    h1="Gestion des commissions d'un courtier d'assurance en Suisse : attendu, encaissé, à suivre",
    lede="Un courtier suisse travaille couramment avec huit à quinze compagnies, chacune avec son décompte, sa périodicité et sa façon d'arrondir. Savoir ce qui est attendu, ce qui a été encaissé et ce qui reste à réclamer demande aujourd'hui de recouper des PDF avec un tableur. COURTIA tient ce suivi dans le même outil que les contrats, par compagnie et par apporteur.",
    body="""  <h2>Le problème réel : le décompte est l'endroit où l'on perd de l'argent sans le voir</h2>
  <p>Un courtier ne perd pas ses commissions d'un coup. Il les perd par petites lignes : un contrat résilié en cours d'année dont la commission n'a jamais été régularisée, une part d'apporteur recalculée à la main, un décompte trimestriel qu'on ne rapproche pas parce que le trimestre a été chargé.</p>
  <ul>
    <li><strong>Les contrats qui bougent en cours d'année.</strong> Un portefeuille suisse change tous les mois : avenants, résiliations, changements de véhicule ou de surface assurée. Chaque mouvement déplace une ligne de commission, et personne ne le recalcule.</li>
    <li><strong>Les apporteurs.</strong> Fiduciaires, courtiers en réseau, agences immobilières, gérants de fortune vous apportent des clients. Ils attendent leur part, et ce n'est pas le métier du courtier de la reconstituer sur un carnet.</li>
    <li><strong>L'information due au client.</strong> Pour un <strong>intermédiaire d'assurance non lié</strong>, l'art. 45<sup>b</sup> LSA impose d'informer le client sur tous les types de rémunération reçus d'entreprises d'assurance ou de tiers. Cette information se prépare sur des données de commission, pas de mémoire.</li>
  </ul>

  <h2>Avant COURTIA / avec COURTIA</h2>
  <table>
    <thead><tr><th>Moment</th><th>Sans suivi centralisé</th><th>Avec COURTIA</th></tr></thead>
    <tbody>
      <tr><td>Réception des décomptes</td><td>Un PDF par compagnie, à relire ligne par ligne</td><td>Import du décompte dans la vue commissions, rattaché à vos contrats</td></tr>
      <tr><td>Lecture de la situation</td><td>Aucune, sauf à tout additionner</td><td>Attendu, encaissé, à suivre et nombre d'apporteurs suivis, en tête d'écran</td></tr>
      <tr><td>Suivi par compagnie</td><td>Une feuille par compagnie, jamais alignée</td><td>Vue par compagnie comparable d'un trimestre à l'autre</td></tr>
      <tr><td>Part des apporteurs</td><td>Recalculée à la main</td><td>Suivi par apporteur dans le même écran que les contrats</td></tr>
      <tr><td>Information au client (non liés)</td><td>Reconstituée au moment de la question</td><td>Préparée à partir des commissions réellement suivies</td></tr>
    </tbody>
  </table>

  <h2>Ce que le module Commissions fait réellement</h2>
  <div class="grid">
    <div class="card"><h3>Vue commissions</h3><p>Quatre indicateurs en tête : ce qui est <strong>attendu</strong>, ce qui a été <strong>encaissé</strong>, ce qui reste <strong>à suivre</strong> (le reste théorique), et le nombre d'<strong>apporteurs</strong> suivis. Chaque ligne est rattachée à un client et à un contrat.</p></div>
    <div class="card"><h3>Import de décompte</h3><p>Les décomptes s'importent (fichier CSV) plutôt que se saisir ligne à ligne — c'est la seule méthode tenable quand une compagnie vous envoie 200 lignes.</p></div>
    <div class="card"><h3>Saisie rapide depuis un contrat</h3><p>Pour une ligne isolée, la commission se saisit directement depuis le contrat existant, sans ressaisir le client ni la compagnie.</p></div>
    <div class="card"><h3>Répartition par produit, par compagnie, par mois</h3><p>Les écrans Objectifs et Analyses présentent les commissions par produit, par compagnie et par mois : de quoi voir une compagnie qui décroche ou un produit qui porte le cabinet.</p></div>
    <div class="card"><h3>Estimation de commission</h3><p>Un écran dédié estime la commission d'une affaire à partir de la compagnie, du produit et de la prime, sur un barème que vous paramétrez — et compare les compagnies entre elles, avec l'écart sur la sélection.</p></div>
    <div class="card"><h3>Protocole de conseil</h3><p>Le journal de conseil de l'offre Cabinet conserve qui a remis quoi, quand : utile quand un client demande d'où vient votre rémunération.</p></div>
  </div>

  <h2>Scénario : les 380 CHF qui ne reviennent jamais</h2>
  <p class="note">Cas de figure, pas une référence client.</p>
  <div class="scenario">
    <p>Un cabinet encaisse ses décomptes de trois compagnies au trimestre. La vue commissions affiche un attendu de <strong>24 700 CHF</strong> et un encaissé de <strong>24 320 CHF</strong>. L'écart est trop petit pour justifier une soirée de tableur — et c'est exactement comme ça qu'il disparaît.</p>
    <p>En filtrant par compagnie, l'écart se concentre sur une seule d'entre elles. En regardant les lignes, deux contrats ont été résiliés en cours de trimestre : l'un a produit un rappel de commission, l'autre un trop-perçu non régularisé. Le courrier de réclamation part avec les numéros de contrat et les montants, pas avec une impression.</p>
    <p>Le même écran montre la part due à deux apporteurs. Elle est calculée sur des lignes réellement suivies, et non sur un pourcentage appliqué à un total de primes souvenir.</p>
  </div>

  <h2>Ce que ce module n'est pas</h2>
  <div class="limit">
    <ul>
      <li><strong>Ce n'est pas un logiciel de comptabilité.</strong> COURTIA suit la commission ; il ne produit ni votre bilan, ni votre décompte TVA, ni une écriture comptable.</li>
      <li><strong>Les taux ne sont pas inventés.</strong> Un barème de commission dépend de vos conventions signées avec chaque compagnie. Nous ne publions pas de taux « moyens du marché » : ils se paramètrent avec vous.</li>
      <li><strong>Les devises doivent être cadrées.</strong> Selon vos conventions, un décompte peut arriver en CHF ou en EUR. Le traitement des devises se valide sur vos conventions pendant le paramétrage ; nous ne prétendons pas le régler à l'aveugle.</li>
      <li><strong>Aucun rapprochement bancaire automatique n'est promis.</strong> L'import du décompte reste un acte du cabinet, déclenché par la réception réelle du document.</li>
    </ul>
  </div>""",
    faq=[
        ("Comment les décomptes des compagnies suisses entrent-ils dans COURTIA ?",
         "Par import d'un fichier de décompte, ou par saisie rapide d'une ligne depuis un contrat existant. Aucune connexion automatique aux systèmes des compagnies n'est promise : les compagnies suisses ne publient pas d'API commune à cet effet."),
        ("COURTIA calcule-t-il lui-même les taux de commission ?",
         "Non. Les taux dépendent des conventions signées entre votre cabinet et chaque compagnie. Le barème se paramètre dans COURTIA ; nous ne publions pas de taux de référence inventés."),
        ("Est-ce que cela remplace ma fiduciaire ou ma comptabilité ?",
         "Non. COURTIA est un outil de gestion de cabinet : il suit la commission, l'apporteur et le contrat. La comptabilité, la TVA et les bouclements restent chez votre fiduciaire, qui peut travailler sur des exportations."),
        ("Comment je justifie ma rémunération à un client (courtier non lié) ?",
         "Le suivi des commissions fournit la matière de l'information due au client au titre de l'art. 45<sup>b</sup> LSA. Le journal de conseil de l'offre Cabinet conserve la trace de ce qui a été remis. COURTIA ne remplace ni votre analyse juridique ni la LSA — voir la page conformité LSA / FINMA."),
        ("Et si mes décomptes arrivent en euros et ma facturation en francs suisses ?",
         "L'échéancier de facturation est en CHF. Pour les montants de commission, la devise dépend de vos conventions : c'est un point à valider explicitement pendant le paramétrage, et nous le disons plutôt que de le promettre."),
    ],
    links="""    <li><a href="/ch">Page pilier : logiciel et CRM pour courtiers d'assurance en Suisse</a></li>
    <li><a href="/ch/gestion-portefeuille-assurance-suisse">Gestion de portefeuille : les contrats d'où viennent les commissions</a></li>
    <li><a href="/ch/conformite-intermediaire-assurance-lsa-finma">Conformité LSA / FINMA : art. 45<sup>b</sup> et publicité des rémunérations</a></li>
    <li><a href="/ch/ia-courtier-assurance-suisse">IA : ce qu'ARK analyse dans le portefeuille</a></li>
    <li><a href="/ch/tarifs-logiciel-courtier-chf">Tarifs en CHF</a></li>""",
))

# --------------------------------------------------------------------------
# 3. Portefeuille
# --------------------------------------------------------------------------
PAGES.append(dict(
    slug="gestion-portefeuille-assurance-suisse",
    crumb="Gestion de portefeuille",
    eyebrow="Suisse · contrats, échéances, renouvellements",
    title="Gestion de portefeuille d'assurance en Suisse — contrats et échéances | COURTIA",
    desc="Contrats, échéances 30/60/90 jours, renouvellements et concentration par branche : un seul écran pour piloter un portefeuille de courtage suisse.",
    og_title="Gestion de portefeuille d'assurance en Suisse — COURTIA",
    og_desc="Combien de contrats, quelles branches, quelles échéances sous 90 jours, quels dossiers sans renouvellement : la réponse tient dans un écran.",
    h1="Gestion de portefeuille d'assurance en Suisse : contrats, échéances, renouvellements",
    lede="Un portefeuille suisse ne se pilote pas au nombre de clients, mais au nombre d'échéances. Entre les contrats qui se renouvellent au 1<sup>er</sup> janvier, les polices réparties sur l'année et les couvertures d'entreprise, un cabinet de 400 polices fait face à plusieurs dizaines d'échéances par trimestre. COURTIA les rassemble dans un échéancier filtrable, avec les contrats et les statuts dans la même fiche.",
    body="""  <h2>Le problème réel : la donnée est dans les polices, pas dans un système</h2>
  <p>Dans beaucoup de cabinets, la vérité d'un portefeuille est répartie dans une pile de polices PDF, un tableur de primes et la mémoire de deux personnes. Cela fonctionne jusqu'au jour où l'une des deux personnes est absente.</p>
  <ul>
    <li><strong>Le renouvellement tacite endort.</strong> Le client reste, donc personne ne s'en occupe — alors que la couverture n'est plus adaptée (nouvelle activité, nouveau véhicule, nouveau logement) et que le tarif dérive chaque année.</li>
    <li><strong>Les échéances suisses sont concentrées.</strong> Une part significative du portefeuille se renouvelle à date fixe, avec des délais d'opposition en fin d'année. Découvrir un contrat en décembre, c'est le traiter en urgence, mal.</li>
    <li><strong>La concentration n'est jamais mesurée.</strong> Savoir quelle part du portefeuille repose sur une branche ou sur une seule compagnie est une question de survie du cabinet, pas de curiosité. Peu de cabinets savent y répondre.</li>
  </ul>

  <h2>Avant COURTIA / avec COURTIA</h2>
  <table>
    <thead><tr><th>Question du cabinet</th><th>Sans outil centralisé</th><th>Avec COURTIA</th></tr></thead>
    <tbody>
      <tr><td>Quels contrats arrivent à échéance ?</td><td>On compare les dates dans les polices, une par une</td><td>Échéancier filtrable <strong>30 / 60 / 90 jours</strong></td></tr>
      <tr><td>Quels dossiers n'ont pas été renouvelés ?</td><td>Découvert quand le client appelle</td><td>Alerte « contrats sans renouvellement » dans la santé du portefeuille</td></tr>
      <tr><td>Quelle est la répartition par produit ?</td><td>Estimation de mémoire</td><td>Répartition produits et indicateurs détaillés</td></tr>
      <tr><td>Comment reprendre un portefeuille existant ?</td><td>Ressaisie complète</td><td>Écran d'import avec aide au mapping des colonnes</td></tr>
      <tr><td>Où sont les polices ?</td><td>Dans une arborescence de dossiers</td><td>Documents rattachés au client et au contrat</td></tr>
    </tbody>
  </table>

  <h2>Ce que le produit fait réellement</h2>
  <div class="grid">
    <div class="card"><h3>Contrats dans la fiche client</h3><p>Une fiche client avec ses contrats actifs, leurs statuts et leurs échéances, plus les devis et les documents du dossier. La vue 360° regroupe l'essentiel sans changer d'écran.</p></div>
    <div class="card"><h3>Échéancier 30 / 60 / 90 jours</h3><p>Les échéances et renouvellements à venir, filtrables, avec les échéances proches remontées en alerte dans la santé du portefeuille.</p></div>
    <div class="card"><h3>Santé du portefeuille</h3><p>Alertes actives, recommandations ARK, répartition des produits et indicateurs détaillés : une vue de contrôle sur ce qui décroche.</p></div>
    <div class="card"><h3>Clients silencieux et concentration</h3><p>Le nombre de clients sans contact depuis plus de 90 jours et les déséquilibres de branche (par exemple une concentration RC Pro) sont remontés comme points d'attention.</p></div>
    <div class="card"><h3>Import de portefeuille</h3><p>Un écran d'import de fichier client avec aide au mapping des colonnes, pour ne pas ressaisir un portefeuille existant ligne par ligne.</p></div>
    <div class="card"><h3>Vue cabinet et objectifs</h3><p>Les écrans de rapports et d'objectifs donnent la vue d'ensemble : clients, contrats, primes, commissions par produit, par compagnie et par mois.</p></div>
  </div>

  <h2>Scénario : préparer janvier en octobre</h2>
  <p class="note">Cas de figure, pas une référence client.</p>
  <div class="scenario">
    <p>Un cabinet suit <strong>412 contrats</strong>. Le filtre 90 jours de l'échéancier affiche <strong>37 contrats</strong>, dont 8 qui se renouvellent au 1<sup>er</sup> janvier — le cœur du problème, puisque c'est la période où les délais d'opposition tombent et où le client est le plus sollicité par la concurrence.</p>
    <p>La santé du portefeuille remonte par ailleurs <strong>23 contrats sans renouvellement</strong> : des dossiers dont l'échéance est passée sans qu'une action soit enregistrée. Chacun est rattaché au client concerné, avec l'historique du dossier : le courtier sait immédiatement s'il a déjà parlé au client ou non.</p>
    <p>Troisième alerte : la répartition par produit montre une <strong>concentration marquée sur la RC professionnelle</strong>. Ce n'est pas un problème de logiciel, c'est une information de pilotage — et le cabinet ne l'avait jamais mesurée.</p>
  </div>

  <h2>Ce que cette page ne couvre pas (et où le trouver)</h2>
  <div class="limit">
    <ul>
      <li><strong>La relation client</strong> — historique des échanges, journal du dossier, segmentation : voir <a href="/ch/crm-courtier-assurance-suisse">CRM courtier d'assurance en Suisse</a>.</li>
      <li><strong>La file d'actions du jour</strong> — qui appeler maintenant : voir <a href="/ch/relances-courtier-assurance-suisse">Relances et tâches</a>.</li>
      <li><strong>Les commissions</strong> — attendu, encaissé, à suivre : voir <a href="/ch/gestion-commissions-courtier-assurance-suisse">Gestion des commissions</a>.</li>
      <li><strong>La reprise d'un portefeuille depuis un logiciel suisse existant</strong> n'est pas promise « automatique » : elle est cadrée au cas par cas, compagnie par compagnie, pendant le paramétrage.</li>
      <li><strong>Les données cantonales.</strong> Nous ne publions pas de page par canton ni par ville : nous n'avons pas de données cantonales vérifiables, et une page locale sans donnée spécifique ne servirait personne.</li>
    </ul>
  </div>""",
    faq=[
        ("Peut-on reprendre un portefeuille existant dans COURTIA ?",
         "COURTIA dispose d'un écran d'import de portefeuille avec aide au mapping des colonnes, utilisable à partir d'un export tabulaire. La reprise complète depuis un logiciel de courtage suisse existant est cadrée au cas par cas pendant le paramétrage : nous ne la promettons pas automatique."),
        ("Les polices PDF sont-elles rattachées aux contrats ?",
         "Les documents se rattachent au dossier client, aux côtés des contrats, devis et de l'historique d'activité. L'objectif est qu'une police ne se cherche plus dans une arborescence de dossiers."),
        ("COURTIA gère-t-il plusieurs collaborateurs sur le même portefeuille ?",
         "L'offre Cabinet inclut trois accès, avec un tarif par utilisateur supplémentaire. Au-delà, l'offre Sur-Mesure se cale sur l'organisation réelle du cabinet."),
        ("Que se passe-t-il à la sortie de COURTIA ?",
         "Vos clients, contrats et documents s'exportent dans un format réutilisable. C'est une question que nous posons nous-mêmes aux cabinets en démonstration."),
        ("Est-ce que cela fonctionne pour un cabinet d'une seule personne ?",
         "Oui, l'offre Indépendant est prévue pour cela. L'intérêt est simplement plus visible dès que le volume dépasse ce qu'une personne peut tenir de tête — soit quelques centaines de polices."),
    ],
    links="""    <li><a href="/ch">Page pilier : logiciel et CRM pour courtiers d'assurance en Suisse</a></li>
    <li><a href="/ch/crm-courtier-assurance-suisse">CRM courtier d'assurance : le dossier client</a></li>
    <li><a href="/ch/gestion-commissions-courtier-assurance-suisse">Gestion des commissions par compagnie</a></li>
    <li><a href="/ch/ia-courtier-assurance-suisse">IA / ARK : churn, cross-sell, renouvellements</a></li>
    <li><a href="/ch/tarifs-logiciel-courtier-chf">Tarifs en CHF</a></li>""",
))

# --------------------------------------------------------------------------
# 4. Relances
# --------------------------------------------------------------------------
PAGES.append(dict(
    slug="relances-courtier-assurance-suisse",
    crumb="Relances et tâches",
    eyebrow="Suisse · relances et tâches du cabinet",
    title="Relances et tâches pour courtier d'assurance en Suisse — COURTIA",
    desc="Une file de relances par type — devis sans réponse, échéances, clients silencieux, documents manquants — priorisée par ARK et rattachée au client.",
    og_title="Relances et tâches pour courtier d'assurance en Suisse — COURTIA",
    og_desc="Quarante choses à relancer, six traitées : COURTIA classe les relances par type et par urgence, et ARK propose l'ordre.",
    h1="Relances et tâches d'un courtier d'assurance en Suisse : qui appeler aujourd'hui",
    lede="« Je n'ai pas le temps » n'est presque jamais un problème de temps : c'est un problème de file d'attente. Quarante dossiers à relancer, six réellement traités, et les six choisis par ordre d'arrivée plutôt que par gravité. COURTIA classe les relances par type et par urgence, les rattache au client concerné, et ARK propose l'ordre de traitement.",
    body="""  <h2>Le problème réel : une file d'attente sans règle de tri</h2>
  <p>Un cabinet de courtage n'oublie presque jamais un client important. Il oublie les dossiers qui n'ont rien dit depuis longtemps, et ceux-là sont précisément les plus coûteux.</p>
  <ul>
    <li><strong>Un devis sans réponse n'est pas un devis en attente.</strong> Passé quelques semaines, c'est un devis perdu — souvent au profit d'un courtier qui a simplement rappelé.</li>
    <li><strong>Une échéance dépassée coûte une année entière.</strong> Sur des contrats à renouvellement annuel, laisser filer une échéance, c'est laisser filer douze mois de commission et une occasion de revoir la couverture.</li>
    <li><strong>Un client silencieux est un client en train de partir.</strong> Le silence n'est pas un signe de satisfaction ; c'est un signe d'absence de relation, et donc de vulnérabilité à la première sollicitation concurrente.</li>
    <li><strong>Un document manquant rend un dossier fragile.</strong> Quand le client demande des comptes, ou quand un sinistre survient, ce qui n'est pas au dossier n'existe pas.</li>
  </ul>

  <h2>Avant COURTIA / avec COURTIA</h2>
  <table>
    <thead><tr><th>Moment</th><th>Sans file de travail</th><th>Avec COURTIA</th></tr></thead>
    <tbody>
      <tr><td>Décider qui relancer</td><td>On ouvre sa boîte mail et on part du plus récent</td><td>File classée par type : devis sans réponse, échéances, clients silencieux, documents, opportunités, prospects</td></tr>
      <tr><td>Repérer l'urgent</td><td>Au ressenti</td><td>Compteurs Urgentes, En attente, Devis sans réponse, Échéances, Taux de réponse, Potentiel</td></tr>
      <tr><td>Suivre une relance</td><td>Post-it, note dans un carnet</td><td>Relance rattachée au client, avec l'historique du dossier</td></tr>
      <tr><td>Voir ce qui n'a pas été fait</td><td>Impossible à mesurer</td><td>Tâches En retard / Aujourd'hui / Cette semaine / Terminées, et compteur « Générées par ARK »</td></tr>
      <tr><td>Passer d'une liste à un appel</td><td>Recherche manuelle du numéro et du contexte</td><td>Bouton de priorisation ARK, puis fiche client complète</td></tr>
    </tbody>
  </table>

  <h2>Ce que le produit fait réellement</h2>
  <div class="grid">
    <div class="card"><h3>File de relances par type</h3><p>Les relances sont classées en familles : <strong>devis sans réponse</strong>, <strong>échéance proche</strong>, <strong>renouvellement</strong>, <strong>client silencieux</strong>, <strong>document manquant</strong>, <strong>opportunité</strong> et <strong>prospect à relancer</strong>. Un filtre par famille, une recherche, et la liste utile seulement.</p></div>
    <div class="card"><h3>Indicateurs de charge</h3><p>Urgentes, en attente, devis sans réponse, échéances, taux de réponse et potentiel concerné : de quoi savoir si le retard coûte cher ou pas.</p></div>
    <div class="card"><h3>Priorisation ARK</h3><p>Un bouton ouvre la priorisation par ARK dans le Morning Brief : la même file, mais dans l'ordre du risque plutôt que dans l'ordre d'arrivée.</p></div>
    <div class="card"><h3>Tâches du cabinet</h3><p>Le module Tâches distingue ce qui est en retard, ce qui est prévu aujourd'hui, ce qui est prévu cette semaine et ce qui est terminé — avec le compteur des tâches générées par ARK.</p></div>
    <div class="card"><h3>Rattachement au client</h3><p>Chaque relance et chaque tâche pointe vers le client concerné : le contexte (contrats, devis, documents, historique) est là avant l'appel, pas après.</p></div>
    <div class="card"><h3>Rendez-vous</h3><p>Les rendez-vous se traitent dans le même module que les tâches, pour ne pas tenir deux calendriers parallèles.</p></div>
  </div>

  <h2>Scénario : 41 clients silencieux, six appels</h2>
  <p class="note">Cas de figure, pas une référence client.</p>
  <div class="scenario">
    <p>Un cabinet mono-courtier suit <strong>310 contrats</strong>. Lundi matin, la file de relances affiche <strong>41 clients silencieux depuis plus de 90 jours</strong> et <strong>9 devis sans réponse</strong>. Traiter les 41 est irréaliste ; les traiter tous les lundis pendant deux mois l'est aussi.</p>
    <p>Le courtier ouvre la priorisation ARK. La liste remonte d'abord les clients silencieux dont un contrat arrive à échéance dans les 60 jours : ce sont ceux pour lesquels le silence a un coût immédiat. Il en traite <strong>six</strong> avant midi, avec l'historique du dossier sous les yeux, et enregistre chaque appel comme une relance terminée.</p>
    <p>L'après-midi, la file affiche un chiffre honnête : ce qui reste en retard est visible, chiffré, et ne dépend plus de la mémoire de personne.</p>
  </div>

  <h2>Ce que ce module n'est pas</h2>
  <div class="limit">
    <ul>
      <li><strong>Aucune relance ne part automatiquement.</strong> COURTIA prépare et classe ; l'appel, l'e-mail et le courrier restent des actes du courtier, rédigés et envoyés par lui.</li>
      <li><strong>Ce n'est pas un outil de marketing de masse.</strong> Pas d'envoi de campagne publicitaire aux clients du portefeuille : ce n'est pas le métier, et ce n'est pas le nôtre.</li>
      <li><strong>Ce n'est pas un standard téléphonique</strong> ni un centre d'appels : le module suit le travail, il ne l'exécute pas.</li>
      <li><strong>Le taux de réponse affiché dépend de ce que vous saisissez.</strong> Un compteur n'est utile que si les relances sont effectivement clôturées dans l'outil.</li>
    </ul>
  </div>""",
    faq=[
        ("Les relances sont-elles envoyées automatiquement aux clients ?",
         "Non. COURTIA classe et prépare les relances, ARK en propose l'ordre de priorité ; l'envoi reste un acte du courtier, avec ses mots et sa signature. Aucun message ne part d'un client du portefeuille sans décision humaine."),
        ("Quels types de relances sont suivis ?",
         "Sept familles : devis sans réponse, échéance proche, renouvellement, client silencieux, document manquant, opportunité et prospect à relancer. Chacune se filtre séparément."),
        ("Comment COURTIA sait qu'un client est « silencieux » ?",
         "À partir de l'activité enregistrée sur son dossier. Le compteur reflète donc la qualité du suivi : si vous appelez sans rien noter, COURTIA ne peut pas le savoir — et c'est vrai de n'importe quel outil."),
        ("Est-ce que cela remplace un agenda ou Outlook ?",
         "Non. Les tâches et rendez-vous du cabinet sont gérés dans COURTIA pour rester rattachés aux clients et aux contrats ; nous ne prétendons pas remplacer votre messagerie professionnelle."),
        ("Combien de temps faut-il pour que la file devienne utile ?",
         "Dès que le portefeuille est repris et que les contrats sont rattachés aux clients : la file se remplit alors à partir des échéances réelles et des devis en cours."),
    ],
    links="""    <li><a href="/ch">Page pilier : logiciel et CRM pour courtiers d'assurance en Suisse</a></li>
    <li><a href="/ch/ia-courtier-assurance-suisse">IA / ARK : d'où vient l'ordre de priorité</a></li>
    <li><a href="/ch/logiciel-devis-courtier-assurance-suisse">Devis : les propositions sans réponse</a></li>
    <li><a href="/ch/logiciel-prospection-courtier-assurance-suisse">Prospection : relancer un prospect</a></li>
    <li><a href="/ch/tarifs-logiciel-courtier-chf">Tarifs en CHF</a></li>""",
))

# --------------------------------------------------------------------------
# 5. Prospection
# --------------------------------------------------------------------------
PAGES.append(dict(
    slug="logiciel-prospection-courtier-assurance-suisse",
    crumb="Prospection",
    eyebrow="Suisse · pipeline de nouveaux clients",
    title="Logiciel de prospection pour courtier d'assurance en Suisse — COURTIA",
    desc="Pipeline de prospects, potentiel estimé, statuts et prochaine action : suivez vos recommandations et votre réseau au lieu de les oublier.",
    og_title="Logiciel de prospection pour courtier d'assurance en Suisse — COURTIA",
    og_desc="Un pipeline de prospection pour cabinets suisses : prospects, potentiel, rendez-vous, taux de conversion et relance des prospects à froid.",
    h1="Logiciel de prospection pour courtier d'assurance en Suisse",
    lede="En Suisse romande, un nouveau client arrive rarement par une campagne publicitaire : il arrive par une recommandation, par la fiduciaire qui tient les comptes, par le gérant immobilier, par un apporteur d'affaires. Ces sources ne s'entretiennent pas avec une liste de noms : elles s'entretiennent avec un pipeline suivi, où chaque prospect a un statut, une date et une prochaine action.",
    body="""  <h2>Le problème réel : le carnet de recommandations ne se pilote pas</h2>
  <p>La prospection d'un courtier suisse n'est pas un problème de volume, c'est un problème de continuité. Le téléphone sonne, le rendez-vous est pris — et trois semaines plus tard, personne ne sait plus où en était le dossier.</p>
  <ul>
    <li><strong>Les recommandations se perdent dans le désordre.</strong> Un notaire vous parle d'un client intéressé ; cette phrase vit dans une conversation, pas dans un dossier. Elle disparaît au premier dossier urgent.</li>
    <li><strong>Les prospects sans rendez-vous ne sont jamais rappelés.</strong> C'est le gisement le plus rentable et le plus oublié du cabinet, parce qu'il ne sonne pas de lui-même.</li>
    <li><strong>Le taux de conversion est inconnu.</strong> Sans pipeline, un cabinet ne sait pas s'il convertit une recommandation sur deux ou une sur dix — donc ne sait pas s'il doit travailler sa source ou sa méthode.</li>
    <li><strong>Les apporteurs ne sont jamais remerciés.</strong> Un apporteur qui ne reçoit aucun retour arrête d'apporter. C'est le premier poste de perte de croissance d'un cabinet, et il ne se voit nulle part.</li>
  </ul>

  <h2>Avant COURTIA / avec COURTIA</h2>
  <table>
    <thead><tr><th>Moment</th><th>Sans pipeline</th><th>Avec COURTIA</th></tr></thead>
    <tbody>
      <tr><td>Entrée d'un prospect</td><td>Note prise sur un carnet ou dans la tête</td><td>Prospect créé avec secteur, ville, potentiel estimé, statut et date</td></tr>
      <tr><td>Après un premier contact</td><td>Rien de tracé</td><td>Statut mis à jour, prochaine action visible dans la liste</td></tr>
      <tr><td>Prospect sans rendez-vous</td><td>Oublié</td><td>Relance de type « prospect à relancer » dans la file de relances</td></tr>
      <tr><td>Lecture du pipeline</td><td>Aucune</td><td>Prospects, potentiel, rendez-vous planifiés et taux de conversion, en tête d'écran</td></tr>
      <tr><td>Synthèse du pipeline</td><td>—</td><td>ARK résume : prospect au plus fort potentiel, rendez-vous planifiés, prochaine action utile</td></tr>
    </tbody>
  </table>

  <h2>Ce que le produit fait réellement</h2>
  <div class="grid">
    <div class="card"><h3>Pipeline de prospects</h3><p>Une liste de travail : prospect, secteur d'activité, ville, potentiel estimé, statut et date. C'est un pipeline commercial de cabinet, pas un annuaire.</p></div>
    <div class="card"><h3>Quatre indicateurs</h3><p>Nombre de prospects, potentiel cumulé, rendez-vous planifiés et taux de conversion : la lecture que la plupart des cabinets ne peuvent pas faire aujourd'hui.</p></div>
    <div class="card"><h3>Synthèse ARK du pipeline</h3><p>ARK commente la liste : quel prospect porte le plus fort potentiel, quels rendez-vous sont planifiés, et quelle action manque — typiquement qualifier les prospects sans rendez-vous.</p></div>
    <div class="card"><h3>Relance du prospect</h3><p>Les prospects à relancer apparaissent dans la file de relances, à côté des devis et des échéances : la prospection devient une tâche comme une autre, donc une tâche qui se fait.</p></div>
    <div class="card"><h3>Opportunités</h3><p>Un module distinct suit les opportunités du portefeuille existant : un client actuel qui pourrait souscrire une couverture supplémentaire n'est pas un prospect, c'est une opportunité.</p></div>
    <div class="card"><h3>Partenaires et apporteurs</h3><p>L'écran Partenaires regroupe votre écosystème : compagnies d'un côté, apporteurs d'affaires de l'autre. C'est la contrepartie d'un pipeline alimenté par recommandation.</p></div>
  </div>

  <h2>Scénario : trois recommandations, une seule qui aboutit</h2>
  <p class="note">Cas de figure, pas une référence client.</p>
  <div class="scenario">
    <p>Un cabinet reçoit <strong>trois recommandations</strong> en trois semaines : deux viennent d'une fiduciaire, une d'un gérant immobilier. Le courtier crée trois prospects, avec un potentiel estimé pour chacun. Deux obtiennent un rendez-vous, le troisième reste sans date — et c'est précisément celui-là que la file de relances remonte quinze jours plus tard sous « prospect à relancer ».</p>
    <p>Le premier rendez-vous ne donne pas un contrat mais un client qui veut « y réfléchir ». Le devis correspondant est créé, et c'est la file de relances de devis qui reprend la main. Le second aboutit : le prospect devient un client, avec ses contrats et son dossier.</p>
    <p>En fin de trimestre, le tableau affiche un taux de conversion. Il n'est pas brillant. Le courtier avait le chiffre sous les yeux — ce qui est déjà plus que ce que la plupart des cabinets peuvent dire. Il appelle l'apporteur fiduciaire pour lui dire ce qui a marché et ce qui n'a pas marché dans le dossier ; c'est exactement ce qui déclenche la quatrième recommandation.</p>
  </div>

  <h2>Ce que ce module n'est pas</h2>
  <div class="limit">
    <ul>
      <li><strong>Aucun fichier d'entreprises suisses n'est inclus.</strong> Nous ne vendons pas de base de prospects ni d'annuaire d'entreprises. Le pipeline se remplit avec vos recommandations, votre réseau et votre travail.</li>
      <li><strong>Pas d'envoi de campagne de masse.</strong> COURTIA est un outil de cabinet, pas une plateforme d'e-mailing. Écrire à 5 000 entreprises suisses n'est pas ce que nous proposons.</li>
      <li><strong>Les règles de démarchage restent votre affaire.</strong> Selon le canal choisi et le type de client, la loi suisse (dont la LPD et la LCD) encadre la prospection. COURTIA suit votre pipeline ; il ne vous dispense pas de respecter ces règles.</li>
      <li><strong>Le potentiel affiché est une estimation saisie par vous</strong>, pas une prédiction. Nous ne prétendons pas deviner la prime future d'une entreprise que vous n'avez pas rencontrée.</li>
    </ul>
  </div>""",
    faq=[
        ("COURTIA fournit-il des listes de prospects suisses ?",
         "Non. Aucun fichier d'entreprises ni annuaire n'est inclus. Le pipeline sert à suivre les prospects que vous avez déjà — recommandations, réseau, apporteurs — pas à en acheter."),
        ("Quelle est la différence entre un prospect et une opportunité dans COURTIA ?",
         "Un prospect n'est pas encore client : il est dans le pipeline de prospection. Une opportunité concerne un client du portefeuille à qui une couverture supplémentaire pourrait convenir. Les deux suivis existent, dans deux modules séparés."),
        ("Peut-on suivre les apporteurs d'affaires dans COURTIA ?",
         "Oui, l'écran Partenaires distingue les compagnies et les apporteurs d'affaires. C'est le seul moyen de savoir ce que chaque source vous a réellement apporté."),
        ("Comment sont priorisés les prospects ?",
         "Par le statut, la date et le potentiel saisi, avec une synthèse ARK qui met en avant le plus fort potentiel et signale les prospects sans rendez-vous. La décision d'appeler reste au courtier."),
        ("Est-ce adapté à un cabinet qui prospecte par recommandation uniquement ?",
         "C'est exactement le cas d'usage prévu. Un pipeline est encore plus utile quand la source est une recommandation : sans suivi, une recommandation n'est qu'une conversation."),
    ],
    links="""    <li><a href="/ch">Page pilier : logiciel et CRM pour courtiers d'assurance en Suisse</a></li>
    <li><a href="/ch/logiciel-devis-courtier-assurance-suisse">Devis : transformer une proposition en contrat</a></li>
    <li><a href="/ch/relances-courtier-assurance-suisse">Relances : relancer un prospect à froid</a></li>
    <li><a href="/ch/crm-courtier-assurance-suisse">CRM : le dossier client quand le prospect devient client</a></li>
    <li><a href="/ch/tarifs-logiciel-courtier-chf">Tarifs en CHF</a></li>""",
))

# --------------------------------------------------------------------------
# 6. Devis
# --------------------------------------------------------------------------
PAGES.append(dict(
    slug="logiciel-devis-courtier-assurance-suisse",
    crumb="Devis",
    eyebrow="Suisse · devis et propositions d'assurance",
    title="Devis d'assurance en Suisse : produire et suivre ses propositions — COURTIA",
    desc="Devis en cours, à relancer, potentiel, taux de transformation, comparateur de compagnies : ne laissez plus une proposition d'assurance sans réponse.",
    og_title="Devis d'assurance en Suisse : produire et suivre ses propositions — COURTIA",
    og_desc="Un devis sans réponse n'est pas un devis en attente : c'est un devis perdu. COURTIA suit les propositions, du montage à l'acceptation.",
    h1="Devis d'assurance en Suisse : produire et suivre les propositions",
    lede="Un devis sans réponse n'est pas un devis en attente : c'est un devis perdu. Entre la comparaison des offres obtenues auprès des compagnies, la remise de la proposition au client, et l'information qui doit lui être fournie avant la conclusion du contrat (art. 45 LSA), le suivi d'un devis est un dossier à part entière. COURTIA le traite comme tel.",
    body="""  <h2>Le problème réel : le devis sort du radar dès qu'il est envoyé</h2>
  <p>Le moment où un devis est le plus fragile est celui où il vient d'être remis. Le courtier a fait son travail, le client a dit « je regarde », et le dossier quitte la mémoire active du cabinet.</p>
  <ul>
    <li><strong>Personne ne sait combien de devis sont en attente.</strong> Un cabinet de courtage de taille moyenne en a souvent vingt à quarante ouverts, sans savoir lesquels sont chauds et lesquels sont morts.</li>
    <li><strong>La relance arrive trop tard ou n'arrive pas.</strong> Le client signe chez celui qui a rappelé ; c'est une règle qui n'a rien de technique.</li>
    <li><strong>L'information précontractuelle se perd.</strong> Pour les contrats assurant des personnes, l'art. 45 LSA impose la remise d'informations au client avant la conclusion. Retrouver ce qui a été remis, à qui et quand, doit se faire au dossier — pas de mémoire.</li>
    <li><strong>Comparer trois offres prend une heure.</strong> Les compagnies ne présentent pas leurs garanties de la même façon, et la comparaison se fait souvent sur la prime seule, ce qui n'est pas une comparaison.</li>
  </ul>

  <h2>Avant COURTIA / avec COURTIA</h2>
  <table>
    <thead><tr><th>Moment</th><th>Sans suivi de devis</th><th>Avec COURTIA</th></tr></thead>
    <tbody>
      <tr><td>Production de la proposition</td><td>Un document par compagnie, refait à chaque client</td><td>Assistant de création de devis, puis comparateur des offres avec score et badges par offre</td></tr>
      <tr><td>Suivi des devis ouverts</td><td>Aucun compteur fiable</td><td>Devis en cours, à relancer, potentiel et taux de transformation, en tête d'écran</td></tr>
      <tr><td>Relance du client</td><td>Quand on y pense</td><td>Relance de type « devis sans réponse » dans la file de relances</td></tr>
      <tr><td>Information précontractuelle</td><td>Retrouvée dans la boîte mail</td><td>Documents rattachés au client et au devis, conservés au dossier</td></tr>
      <tr><td>Décision de suivi</td><td>Aucun signal</td><td>Alertes ARK sur les devis, et devis acceptés du mois</td></tr>
    </tbody>
  </table>

  <h2>Ce que le produit fait réellement</h2>
  <div class="grid">
    <div class="card"><h3>Tableau de bord des devis</h3><p>Six indicateurs : devis en cours, à relancer, potentiel correspondant, taux de transformation, devis acceptés du mois et alertes ARK.</p></div>
    <div class="card"><h3>Assistant de création</h3><p>Le devis se construit dans un écran dédié, puis se rattache au client existant — pour que la proposition ne vive pas en dehors du dossier.</p></div>
    <div class="card"><h3>Comparateur d'offres</h3><p>Pour un même client, les offres obtenues se comparent avec un score et des badges par offre, et s'exportent en document présentable. Utile quand le client demande « pourquoi celle-là et pas l'autre ».</p></div>
    <div class="card"><h3>Espace devis de la fiche client</h3><p>La fiche client contient un onglet devis : l'historique des propositions faites à cette personne, à côté de ses contrats et de ses documents.</p></div>
    <div class="card"><h3>Relance intégrée</h3><p>Un devis sans réponse alimente automatiquement la famille de relances correspondante : le devis ne peut plus disparaître sans que quelqu'un l'ait décidé.</p></div>
    <div class="card"><h3>Documents du dossier</h3><p>Rattachement des pièces au client et au devis, avec l'état du document (à vérifier, manquant, expiré, récent) : c'est là que se prépare la remise d'information avant conclusion.</p></div>
  </div>

  <h2>Scénario : les 23 jours d'un devis sans réponse</h2>
  <p class="note">Cas de figure, pas une référence client.</p>
  <div class="scenario">
    <p>Un devis de couverture d'entreprise est remis à un client. Le courtier a comparé trois offres, remis un document, et attendu. Trois semaines plus tard, la ligne du devis affiche <strong>23 jours sans réponse</strong> dans le module Devis.</p>
    <p>Le courtier ouvre la fiche : le devis, les documents remis et l'historique sont là. Il relance — non pas pour demander « alors ? », mais avec l'information manquante : la différence de franchise, chiffrée, entre les deux offres en tête. Le client répond le jour même.</p>
    <p>Le devis est accepté, le contrat est créé dans le même dossier, et la commission correspondante entre dans le suivi des commissions. Le compteur du mois gagne une ligne, et le cabinet une trace de ce qui a été remis au client avant la conclusion.</p>
  </div>

  <h2>Ce que ce module n'est pas</h2>
  <div class="limit">
    <ul>
      <li><strong>COURTIA n'est ni un comparateur d'assurances ni un courtier.</strong> Le comparateur interne compare les offres <em>que vous</em> avez obtenues auprès des compagnies. Aucune tarification automatique auprès d'un assureur n'est promise.</li>
      <li><strong>Aucune signature électronique de l'assureur n'est prétendue.</strong> Le devis est un document de travail du cabinet.</li>
      <li><strong>COURTIA ne vous met pas en conformité à lui seul.</strong> Il aide à préparer, rattacher et conserver l'information due au client au titre de l'art. 45 LSA. L'analyse juridique de votre situation reste la vôtre : voir la page conformité LSA / FINMA.</li>
      <li><strong>Pas d'envoi automatique au client.</strong> Comme partout dans COURTIA, le message part parce que le courtier l'a décidé.</li>
    </ul>
  </div>""",
    faq=[
        ("COURTIA est-il un comparateur d'assurances ?",
         "Non. COURTIA n'est ni un courtier, ni un comparateur, ni un intermédiaire : c'est un outil de gestion pour votre cabinet. Le comparateur interne compare les offres que vous avez obtenues ; il n'interroge aucune compagnie à votre place."),
        ("Les devis sont-ils suivis automatiquement ?",
         "Un devis sans réponse apparaît dans la famille de relances correspondante, et le module Devis affiche le nombre de devis à relancer ainsi que le potentiel concerné. La relance elle-même est écrite et envoyée par le courtier."),
        ("Est-ce que cela me protège juridiquement (art. 45 LSA) ?",
         "Non, et aucun logiciel ne le fait. COURTIA aide à préparer et à conserver les informations remises au client avant la conclusion, en les rattachant à son dossier. L'appréciation de vos obligations reste la vôtre."),
        ("Puis-je rattacher un devis à un client déjà existant ?",
         "Oui. La fiche client comporte un onglet devis : les propositions faites à une personne restent dans son dossier, à côté de ses contrats, de ses documents et de son historique."),
        ("Le devis peut-il être exporté pour le client ?",
         "Le comparateur produit un document présentable, exportable, à partir des offres que vous avez saisies. Le but est d'éviter de refaire une mise en forme à chaque proposition."),
    ],
    links="""    <li><a href="/ch">Page pilier : logiciel et CRM pour courtiers d'assurance en Suisse</a></li>
    <li><a href="/ch/logiciel-prospection-courtier-assurance-suisse">Prospection : d'où viennent les devis</a></li>
    <li><a href="/ch/relances-courtier-assurance-suisse">Relances : les devis sans réponse</a></li>
    <li><a href="/ch/conformite-intermediaire-assurance-lsa-finma">Conformité LSA : information avant conclusion (art. 45)</a></li>
    <li><a href="/ch/tarifs-logiciel-courtier-chf">Tarifs en CHF</a></li>""",
))

# --------------------------------------------------------------------------
# 7. CRM
# --------------------------------------------------------------------------
PAGES.append(dict(
    slug="crm-courtier-assurance-suisse",
    crumb="CRM courtier",
    eyebrow="Suisse · dossier client et relation",
    title="CRM pour courtier d'assurance en Suisse : le dossier client 360° — COURTIA",
    desc="Fiche client 360°, historique du dossier, contrats, devis, documents, activité et recommandations ARK dans un seul écran, pour un cabinet suisse.",
    og_title="CRM pour courtier d'assurance en Suisse : le dossier client 360° — COURTIA",
    og_desc="Trois questions en un écran : que détient ce client, qu'est-ce qui s'est dit, qu'est-ce qui arrive ? Le CRM de courtage de COURTIA.",
    h1="CRM pour courtier d'assurance en Suisse : le dossier client en un écran",
    lede="Le dossier d'un client suisse est éclaté : les polices dans une boîte mail, le compte rendu de la dernière visite dans un carnet, la date de renouvellement dans la tête du courtier. Un CRM de courtage n'a de valeur que s'il répond en un écran à trois questions : que détient ce client, qu'est-ce qui s'est dit, et qu'est-ce qui arrive ?",
    body="""  <h2>Le problème réel : l'information existe, mais elle est dispersée</h2>
  <p>La plupart des cabinets suisses n'ont pas un problème de mémoire, ils ont un problème de dispersion. Tout est su, rien n'est au même endroit — et c'est la dispersion qui coûte, parce qu'elle oblige à reconstituer un contexte à chaque appel.</p>
  <ul>
    <li><strong>Avant un rendez-vous, il faut retrouver les contrats.</strong> Trois compagnies, trois PDF, une date de renouvellement à vérifier : vingt minutes pour préparer un appel de dix.</li>
    <li><strong>Ce qui s'est dit n'est écrit nulle part.</strong> Le client rappelle six mois plus tard en disant « comme on avait dit » ; personne ne sait ce qui avait été dit.</li>
    <li><strong>Les documents ne sont pas rattachés aux personnes.</strong> Une pièce d'identité, un permis de circulation, une attestation d'employeur : ils vivent dans des dossiers, pas dans des fiches client.</li>
    <li><strong>Le suivi du conseil est introuvable.</strong> Le journal de conseil de l'offre Cabinet existe précisément pour répondre à cette question : qu'a-t-on remis à ce client, et quand.</li>
  </ul>

  <h2>Avant COURTIA / avec COURTIA</h2>
  <table>
    <thead><tr><th>Moment</th><th>Sans CRM</th><th>Avec COURTIA</th></tr></thead>
    <tbody>
      <tr><td>Préparer un appel</td><td>Recherche des polices dans la messagerie et les dossiers</td><td>Fiche client : contrats actifs, devis, documents, actions à venir, historique du dossier</td></tr>
      <tr><td>Comprendre un dossier</td><td>Reconstitution de mémoire</td><td>Vue 360°, profil de risque, activité récente, onglet ARK</td></tr>
      <tr><td>Retrouver ce qui a été dit</td><td>Invisible</td><td>Historique du dossier et onglet Activité (chronologie complète)</td></tr>
      <tr><td>Trouver un client</td><td>Tri d'un tableur</td><td>Recherche et filtres, affichage en tableau ou en vue bulles</td></tr>
      <tr><td>Reprendre un portefeuille</td><td>Ressaisie</td><td>Import de fichier client avec aide au mapping des colonnes</td></tr>
    </tbody>
  </table>

  <h2>Ce que le produit fait réellement</h2>
  <div class="grid">
    <div class="card"><h3>Fiche client 360°</h3><p>Six onglets : Vue 360°, Contrats, Devis, Documents, Activité et ARK. L'information d'un client est dans une fiche, pas dans une arborescence de dossiers.</p></div>
    <div class="card"><h3>Blocs du dossier</h3><p>Informations, contrats actifs, devis, actions à venir, documents, historique du dossier, profil de risque, activité récente et recommandations ARK.</p></div>
    <div class="card"><h3>Actions à venir</h3><p>Les prochaines échéances et relances du client, remontées dans sa fiche : le courtier voit ce qui vient avant que ça arrive.</p></div>
    <div class="card"><h3>Historique et activité</h3><p>Une chronologie des actions du cabinet sur le dossier. C'est ce qui distingue un CRM utilisé d'un CRM rempli.</p></div>
    <div class="card"><h3>Liste de portefeuille</h3><p>La liste des clients se parcourt en tableau ou en vue bulles, avec recherche et filtres, et un accès direct à l'import de portefeuille.</p></div>
    <div class="card"><h3>Journal de conseil</h3><p>Inclus dans l'offre Cabinet : il conserve la trace de ce qui a été préparé et remis au client, en lien avec les obligations documentaires de l'intermédiaire.</p></div>
  </div>

  <h2>Scénario : le client qui rappelle six mois plus tard</h2>
  <p class="note">Cas de figure, pas une référence client.</p>
  <div class="scenario">
    <p>Un client appelle : « Vous m'aviez parlé d'une extension pour l'activité de ma femme, on avait dit qu'on verrait en janvier. » Sans CRM, ce coup de fil déclenche une recherche dans la messagerie et une reconstitution approximative.</p>
    <p>Avec COURTIA, le courtier ouvre la fiche. L'onglet Activité montre l'échange, la date, ce qui avait été évoqué. L'onglet Contrats montre les polices en cours et celle qui se renouvelle en janvier. L'onglet Documents montre ce qui manque pour monter le dossier. Trois minutes, et la réponse est factuelle.</p>
    <p>Le courtier crée le devis depuis la fiche, et l'action à venir apparaît dans le dossier. Si le client ne répond pas, c'est la file de relances qui reprend le fil — pas la mémoire du courtier.</p>
  </div>

  <h2>Périmètre de cette page (pour éviter les confusions)</h2>
  <div class="limit">
    <ul>
      <li><strong>Cette page traite la relation client</strong> : qui est ce client, qu'est-ce qui s'est dit, quels documents sont au dossier.</li>
      <li><strong>Les contrats et les échéances du portefeuille</strong> sont traités sur <a href="/ch/gestion-portefeuille-assurance-suisse">Gestion de portefeuille d'assurance en Suisse</a>.</li>
      <li><strong>La file d'actions du jour</strong> est traitée sur <a href="/ch/relances-courtier-assurance-suisse">Relances et tâches</a>.</li>
      <li><strong>Ce n'est pas un CRM généraliste.</strong> COURTIA n'est pas conçu pour vendre des produits sans rapport avec l'assurance, ni pour faire du marketing de masse.</li>
      <li><strong>La conformité n'est pas automatique.</strong> Le journal de conseil conserve une trace ; il ne délivre ni attestation, ni audit, ni agrément — voir <a href="/ch/conformite-intermediaire-assurance-lsa-finma">Conformité LSA / FINMA</a>.</li>
    </ul>
  </div>""",
    faq=[
        ("Qu'est-ce qu'un CRM apporte à un courtier d'assurance suisse ?",
         "Un endroit unique où le dossier client tient en entier : contrats, devis, documents, historique des échanges et prochaines échéances. L'objectif n'est pas de « mieux gérer » en général, mais de ne plus reconstituer un contexte à chaque appel."),
        ("Quelle différence avec la page « gestion de portefeuille » ?",
         "Le CRM traite la relation avec chaque client : ce qui s'est dit, ce qui est au dossier. La gestion de portefeuille traite les contrats et les échéances de l'ensemble du cabinet. Les deux se complètent, ils ne se substituent pas."),
        ("Les documents clients sont-ils conservés dans COURTIA ?",
         "Oui, rattachés au client, avec un état (à vérifier, manquant, expiré, récent). Un logiciel ne « met pas en conformité » à lui seul ; il permet en revanche de retrouver une pièce au moment où on vous la demande."),
        ("Comment les données personnelles sont-elles traitées (nLPD) ?",
         "La nLPD est en vigueur depuis le 1<sup>er</sup> septembre 2023 et impose de documenter les finalités, la conservation et les droits des personnes. L'hébergement et les sous-traitants se valident au cas par cas selon les exigences de votre cabinet : nous en parlons en démonstration plutôt que d'afficher une certification que nous n'avons pas."),
        ("Puis-je reprendre mon fichier client existant ?",
         "COURTIA dispose d'un écran d'import de fichier client avec aide au mapping des colonnes. La reprise complète depuis un logiciel de courtage suisse existant est cadrée au cas par cas pendant le paramétrage."),
    ],
    links="""    <li><a href="/ch">Page pilier : logiciel et CRM pour courtiers d'assurance en Suisse</a></li>
    <li><a href="/ch/gestion-portefeuille-assurance-suisse">Contrats, échéances et renouvellements du portefeuille</a></li>
    <li><a href="/ch/relances-courtier-assurance-suisse">Relances et tâches : la file d'actions du jour</a></li>
    <li><a href="/ch/logiciel-devis-courtier-assurance-suisse">Devis et propositions</a></li>
    <li><a href="/ch/tarifs-logiciel-courtier-chf">Tarifs en CHF</a></li>""",
))


def main():
    for p in PAGES:
        d = os.path.join(OUT, p["slug"])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(render(p))
        print("écrit :", os.path.join(d, "index.html"))
    print(f"{len(PAGES)} pages générées.")


if __name__ == "__main__":
    main()
