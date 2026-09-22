#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v3_outils.py — VAGUE 3, groupe « outils gratuits et données originales » (3 pages).

Règle de conception : aucun chiffre inventé, aucune promesse de gain.
  - Le diagnostic d'automatisation ordonne les frictions d'après les réponses de l'utilisateur, en
    s'appuyant sur le classement des frictions jugées par JEV (pièces, devis, information, échéances).
    Il ne produit AUCUNE durée économisée.
  - Le calculateur reprend les quatre comptages de la page « mesurer son temps administratif » et
    restitue les chiffres SAISIS par l'utilisateur, avec la conséquence de chacun. Aucun coefficient
    caché, aucun barème de marché.
  - La cartographie publie des comptages RÉELS d'établissements de courtage (base SIRENE / DINUM,
    code NAF 66.22Z), avec la source, la date d'extraction et les limites de lecture.
"""
from generate_seo_pillars import SITE

PAGES = {}

# ─────────────────────────────────────────────────────────────────────────────
# 1. Diagnostic d'automatisation
# ─────────────────────────────────────────────────────────────────────────────

DIAGNOSTIC_JS = """
<div id="diag" class="section">
  <h2>Les dix questions</h2>
  <p>Répondez pour votre cabinet. Le résultat classe vos points de friction du plus lourd au plus
  léger, d'après vos réponses — sans estimation de temps.</p>
  <div id="questions"></div>
  <div class="cta"><a class="principal" href="#" id="calculer">Voir mes priorités</a></div>
  <div id="resultat"></div>
</div>
<script>
const Q = [
 ["Pièces justificatives redemandées au même client", 3, ["Jamais", "Parfois", "Souvent", "À chaque dossier"]],
 ["Devis envoyés restés sans réponse, sans relance faite", 3, ["Aucun", "Quelques-uns", "Beaucoup", "Je ne sais pas les compter"]],
 ["Temps passé à chercher une information avant un appel", 3, ["Aucun", "Rare", "Fréquent", "Systématique"]],
 ["Renouvellements découverts trop tard", 3, ["Jamais", "Une fois par an", "Chaque trimestre", "Chaque mois"]],
 ["Compte rendu d'entretien écrit après coup (ou pas écrit)", 2, ["Jamais", "Parfois", "Souvent", "Presque toujours"]],
 ["Documents types reconstruits à partir d'anciens fichiers", 2, ["Jamais", "Parfois", "Souvent", "Toujours"]],
 ["Commissions rapprochées des relevés à la main", 2, ["Non, c'est automatique", "Un peu", "Beaucoup", "Tout à la main"]],
 ["Réunions où l'on ne sait pas qui suit quel dossier", 2, ["Jamais", "Parfois", "Souvent", "À chaque réunion"]],
 ["Informations saisies deux fois (dossier + tableur + agenda)", 3, ["Jamais", "Rarement", "Souvent", "Constamment"]],
 ["Nouveau collaborateur laissé sans méthode claire", 1, ["Non, tout est écrit", "Partiellement", "Peu", "Non, rien n'est écrit"]]
];
const PRIP = {
 0:["Dépôt de pièces par lien", "/fr/gestion-documentaire-courtier-assurance"],
 1:["Registre des devis et relance préparée", "/fr/logiciel-devis-courtier-assurance"],
 2:["Dossier client unique", "/fr/crm-courtier-assurance"],
 3:["Échéances suivies dans le dossier", "/fr/gestion-portefeuille-courtier"],
 4:["Traçabilité du conseil", "/fr/gestion-documentaire-courtier-assurance"],
 5:["Documents générés depuis le dossier", "/fr/gestion-documentaire-courtier-assurance"],
 6:["Barèmes et import de relevés", "/fr/logiciel-gestion-cabinet-courtage"],
 7:["Affectation et travail en équipe", "/fr/logiciel-courtier-equipe"],
 8:["Lecture assistée des pièces", "/fr/ia-gestion-documentaire-assurance"],
 9:["Organisation écrite du cabinet", "/fr/organisation-cabinet-courtage"]
};
const zone = document.getElementById('questions');
Q.forEach((q, i) => {
  const d = document.createElement('div');
  d.style.cssText = 'margin:14px 0;padding:12px;border:1px solid rgba(255,255,255,.10);border-radius:12px';
  d.innerHTML = '<p style="margin:0 0 8px"><strong>' + (i + 1) + '. ' + q[0] + '</strong></p>' +
    q[2].map((r, j) => '<label style="display:block;margin:4px 0"><input type="radio" name="q' + i +
      '" value="' + j + '"> ' + r + '</label>').join('');
  zone.appendChild(d);
});
document.getElementById('calculer').addEventListener('click', (e) => {
  e.preventDefault();
  const points = [];
  let repondues = 0;
  Q.forEach((q, i) => {
    const sel = document.querySelector('input[name="q' + i + '"]:checked');
    if (sel) { repondues++; points.push({ i, poids: q[1], valeur: parseInt(sel.value, 10) }); }
  });
  const out = document.getElementById('resultat');
  if (repondues < Q.length) {
    out.innerHTML = '<p class="doux">Répondez aux dix questions pour obtenir vos priorités (' +
      repondues + '/10 répondues).</p>';
    return;
  }
  points.sort((a, b) => (b.poids * b.valeur) - (a.poids * a.valeur));
  const top = points.filter(p => p.valeur >= 2).slice(0, 4);
  if (!top.length) {
    out.innerHTML = '<h3>Vos réponses ne signalent pas de friction majeure</h3>' +
      '<p>Aucun des dix points ne ressort. La priorité utile devient la mesure : ' +
      '<a href="/fr/mesurer-temps-administratif-cabinet">quatre comptages</a> pour vérifier ' +
      'sur des chiffres.</p>';
    return;
  }
  out.innerHTML = '<h3>Vos priorités, dans cet ordre</h3>' +
    '<ol>' + top.map(p => '<li><strong>' + Q[p.i][0] + '</strong> — ' + PRIP[p.i][0] +
      ' (<a href="' + PRIP[p.i][1] + '">voir</a>)</li>').join('') + '</ol>' +
    '<p class="doux">Cet ordre vient de vos réponses et du poids de chaque friction. Il ne contient ' +
    'aucune durée estimée : nous ne produisons pas de gain chiffré sans mesure. Pour aller plus loin : ' +
    '<a href="/fr/mesurer-temps-administratif-cabinet">la méthode de mesure</a> et ' +
    '<a href="/fr/automatisation-courtier-assurance">ce qui est réellement automatisable</a>.</p>';
});
</script>
"""

PAGES["fr/outils/diagnostic-automatisation-cabinet"] = dict(
    marche="FR",
    titre="Diagnostic d'automatisation d'un cabinet de courtage — COURTIA",
    description=(
        "Dix questions pour savoir par quoi commencer dans un cabinet de courtage : le diagnostic "
        "classe vos frictions et indique la fonction correspondante. Gratuit, sans inscription."
    ),
    h1="Diagnostic d'automatisation : par quoi commencer dans votre cabinet",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Outils", "/fr/outils/diagnostic-automatisation-cabinet")],
    maillage=[
        ("Mesurer son temps administratif", "/fr/mesurer-temps-administratif-cabinet", "la méthode manuelle"),
        ("Automatisation du cabinet", "/fr/automatisation-courtier-assurance", "ce qui est automatisable"),
        ("Gain de temps", "/fr/gagner-du-temps-courtier-assurance", "le cluster complet"),
        ("Prioriser ses dossiers", "/fr/prioriser-dossiers-courtier-assurance", "traiter dans le bon ordre"),
    ],
    corps=(
        "<p>Ce diagnostic ne demande ni inscription, ni e-mail, ni carte bancaire : il fonctionne dans "
        "votre navigateur et n'envoie rien. Il ordonne dix frictions connues des cabinets de courtage "
        "et vous renvoie vers la fonction qui les traite.</p>\n"
        "<div class=\"section\"><h2>Ce qu'il fait, et ce qu'il ne fait pas</h2>"
        "<p>Il <strong>classe ce que vous déclarez</strong>. Il ne calcule aucune durée économisée, "
        "aucun pourcentage de gain, aucun retour sur investissement : ces chiffres dépendent de votre "
        "portefeuille et nous n'avons pas de mesure à publier. Le classement des frictions reprend "
        "l'ordre issu de nos propres travaux d'analyse (pièces, devis, information, échéances en tête).</p></div>\n"
        + DIAGNOSTIC_JS
    ),
    faq=[
        ("Le diagnostic envoie-t-il mes réponses quelque part ?",
         "Non. Tout se passe dans votre navigateur : aucune donnée n'est transmise ni conservée."),
        ("Pourquoi aucun gain chiffré ?",
         "Parce qu'un gain dépend du portefeuille, du nombre de collaborateurs et des outils en place. Un diagnostic honnête ordonne des priorités, il n'invente pas de pourcentage."),
        ("Le résultat m'engage-t-il à quelque chose ?",
         "Non. Il renvoie vers des pages publiques : méthode de mesure, automatisation, priorisation. La démonstration de COURTIA reste ouverte et sans inscription."),
    ],
)

# ─────────────────────────────────────────────────────────────────────────────
# 2. Calculateur de manipulations administratives
# ─────────────────────────────────────────────────────────────────────────────

CALCULATEUR_JS = """
<div class="section">
  <h2>Vos quatre comptages</h2>
  <p>Saisissez ce que vous avez compté dans votre cabinet (les quatre mesures de la méthode). Le
  calculateur ne fait que mettre en évidence le plus lourd et rappeler la fonction correspondante.</p>
  <label>Nombre d'outils à ouvrir pour répondre à « où en est ce contrat ? »
    <input type="number" min="0" id="m1" value="0" style="width:100px;padding:8px;margin-left:8px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:#0b0b1a;color:#fff"></label><br><br>
  <label>Pièces justificatives redemandées au moins deux fois (ce mois)
    <input type="number" min="0" id="m2" value="0" style="width:100px;padding:8px;margin-left:8px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:#0b0b1a;color:#fff"></label><br><br>
  <label>Échéances découvertes trop tard (ce mois)
    <input type="number" min="0" id="m3" value="0" style="width:100px;padding:8px;margin-left:8px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:#0b0b1a;color:#fff"></label><br><br>
  <label>Devis sans réponse depuis plus de 15 jours
    <input type="number" min="0" id="m4" value="0" style="width:100px;padding:8px;margin-left:8px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:#0b0b1a;color:#fff"></label><br><br>
  <div class="cta"><a class="principal" href="#" id="lire">Lire mes chiffres</a></div>
  <div id="lecture"></div>
</div>
<script>
document.getElementById('lire').addEventListener('click', (e) => {
  e.preventDefault();
  const v = id => Math.max(0, parseInt(document.getElementById(id).value || '0', 10) || 0);
  const m = [v('m1'), v('m2'), v('m3'), v('m4')];
  const libelles = [
    'outils ouverts pour répondre à une question simple',
    'pièces redemandées au même client',
    'échéances découvertes trop tard',
    'devis sans réponse et sans relance'
  ];
  const suite = [
    ['Un dossier client unique : tout au même endroit.', '/fr/crm-courtier-assurance'],
    ['Un dépôt de pièces par lien, rattaché au dossier.', '/fr/gestion-documentaire-courtier-assurance'],
    ['Les échéances portées par le contrat et remontées chaque jour.', '/fr/gestion-portefeuille-courtier'],
    ['Un registre des devis avec relance préparée.', '/fr/logiciel-devis-courtier-assurance']
  ];
  const total = m.reduce((a, b) => a + b, 0);
  let html = '<h3>Vos chiffres</h3><table><tr><th>Ce que vous avez compté</th><th>Votre valeur</th><th>Ce que cela indique</th></tr>';
  m.forEach((x, i) => {
    html += '<tr><td>' + libelles[i] + '</td><td><strong>' + x + '</strong></td><td>' +
      (x === 0 ? 'Rien à traiter ici' : 'À traiter') + '</td></tr>';
  });
  html += '</table>';
  if (total === 0) {
    html += '<p>Aucun des quatre comptages ne ressort : votre organisation tient. La priorité ' +
      'redevient la surveillance — refaire ces comptages dans trois mois.</p>';
  } else {
    const ordre = m.map((x, i) => [x, i]).filter(p => p[0] > 0).sort((a, b) => b[0] - a[0]);
    html += '<h3>Par où commencer</h3><ol>' + ordre.map(p =>
      '<li><strong>' + libelles[p[1]] + '</strong> (' + p[0] + ') — ' + suite[p[1]][0] +
      ' <a href="' + suite[p[1]][1] + '">voir</a></li>').join('') + '</ol>';
    html += '<p class="doux">Le classement vient de vos chiffres, pas d\\'un barème. Aucun temps ' +
      'économisé n\\'est estimé ici : la comparaison utile se fait en refaisant ces quatre comptages ' +
      'après un mois d\\'usage.</p>';
  }
  document.getElementById('lecture').innerHTML = html;
});
</script>
"""

PAGES["fr/outils/calculateur-manipulations-administratives"] = dict(
    marche="FR",
    titre="Calculateur : manipulations administratives d'un cabinet — COURTIA",
    description=(
        "Saisissez vos quatre comptages (outils ouverts, pièces redemandées, échéances tardives, "
        "devis sans relance) et voyez par quoi commencer. Aucun chiffre inventé, rien n'est envoyé."
    ),
    h1="Calculateur : vos chiffres, votre ordre de priorité",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Outils", "/fr/outils/calculateur-manipulations-administratives")],
    maillage=[
        ("Mesurer son temps administratif", "/fr/mesurer-temps-administratif-cabinet", "la méthode des quatre comptages"),
        ("Réduire la double saisie", "/fr/reduire-double-saisie-cabinet-courtage", "la conséquence directe"),
        ("Diagnostic d'automatisation", "/fr/outils/diagnostic-automatisation-cabinet", "l'autre outil gratuit"),
        ("Organisation du cabinet", "/fr/organisation-cabinet-courtage", "ce qui se décide ensuite"),
    ],
    corps=(
        "<p>Un cabinet n'a pas besoin d'un calcul de retour sur investissement pour savoir où il perd "
        "du temps : il a besoin de quatre nombres. Cet outil les met en ordre — et n'invente rien "
        "d'autre.</p>\n" + CALCULATEUR_JS
    ),
    faq=[
        ("D'où viennent les quatre mesures ?",
         "De la méthode publiée sur ce site : elles se comptent en une semaine, sans logiciel. L'outil ne fait que les ordonner."),
        ("Le calculateur estime-t-il des heures économisées ?",
         "Non. Aucun coefficient n'est appliqué : nous ne publions pas de gain chiffré que nous ne pouvons pas mesurer."),
        ("Mes saisies sont-elles conservées ?",
         "Non, tout reste dans votre navigateur et disparaît au rechargement de la page."),
    ],
)

# ─────────────────────────────────────────────────────────────────────────────
# Contenu STATIQUE des outils : un outil doit être lisible par un crawler sans exécuter le
# JavaScript. Les questions, les réponses possibles et la grille de lecture sont donc aussi écrites
# en HTML — c'est ce que voit un moteur, et c'est utile à un lecteur qui n'active pas le script.
# ─────────────────────────────────────────────────────────────────────────────

STATIQUE_DIAGNOSTIC = """
<div class="section">
<h2>Les dix questions, en clair</h2>
<ol>
<li><strong>Pièces justificatives redemandées au même client</strong> — jamais, parfois, souvent, à
chaque dossier.</li>
<li><strong>Devis restés sans réponse sans relance faite</strong> — aucun, quelques-uns, beaucoup, ou
« je ne sais pas les compter » (cette réponse est en soi une information).</li>
<li><strong>Recherche d'information avant un appel</strong> — aucune, rare, fréquente, systématique.</li>
<li><strong>Renouvellements découverts trop tard</strong> — jamais, une fois par an, chaque trimestre,
chaque mois.</li>
<li><strong>Compte rendu d'entretien écrit après coup ou pas écrit</strong> — jamais, parfois,
souvent, presque toujours.</li>
<li><strong>Documents types reconstruits à partir d'anciens fichiers</strong> — jamais, parfois,
souvent, toujours.</li>
<li><strong>Commissions rapprochées des relevés à la main</strong> — automatique, un peu, beaucoup,
tout à la main.</li>
<li><strong>Réunions où l'on ne sait pas qui suit quel dossier</strong> — jamais, parfois, souvent, à
chaque réunion.</li>
<li><strong>Informations saisies deux fois</strong> (dossier, tableur, agenda) — jamais, rarement,
souvent, constamment.</li>
<li><strong>Nouveau collaborateur laissé sans méthode claire</strong> — non, partiellement, peu, non
et rien n'est écrit.</li>
</ol>
<h2>La grille de lecture</h2>
<p>Quatre familles de friction pèsent plus que les autres dans un cabinet de courtage, et dans cet
ordre : <strong>les pièces</strong> (collecte et classement), <strong>les devis</strong> (suivi des
propositions sans réponse), <strong>l'information</strong> (la retrouver avant un appel),
<strong>les échéances</strong> (les renouvellements préparés à temps). Le diagnostic applique cet
ordre aux réponses données : il ne calcule ni durée ni pourcentage, il classe.</p>
<h2>Ce que vous obtenez, et ce que vous n'obtiendrez pas</h2>
<p>Vous obtenez une liste ordonnée de vos points de friction, chacun renvoyé vers la fonction qui le
traite et vers la page qui l'explique. Vous n'obtiendrez aucun gain en heures ou en euros : nous
n'avons pas de mesure reproductible à publier, et un outil publicitaire qui en invente n'aide
personne à décider.</p>
</div>
"""

STATIQUE_CALCULATEUR = """
<div class="section">
<h2>Les quatre comptages, et ce qu'ils disent</h2>
<table>
<tr><th>Ce que vous comptez</th><th>Ce que cela indique</th><th>Ce qui se met en place ensuite</th></tr>
<tr><td>Outils à ouvrir pour répondre à « où en est ce contrat ? »</td><td>L'information est dispersée</td><td>Un dossier client unique</td></tr>
<tr><td>Pièces redemandées au moins deux fois au même client</td><td>La collecte ne laisse pas de trace</td><td>Un dépôt de pièces par lien, rattaché au dossier</td></tr>
<tr><td>Échéances découvertes trop tard</td><td>Le suivi dépend de la mémoire ou d'un agenda séparé</td><td>Des échéances portées par le contrat</td></tr>
<tr><td>Devis sans réponse depuis plus de quinze jours</td><td>Le suivi commercial n'a pas d'état consolidé</td><td>Un registre des devis avec relance préparée</td></tr>
</table>
<h2>Pourquoi ces quatre-là</h2>
<p>Elles se comptent sans chronomètre, sans interprétation et sans outil : un nombre, pas une
impression. C'est ce qui les rend comparables d'un mois sur l'autre — et c'est la seule manière
honnête de savoir si une organisation a réellement changé.</p>
<h2>Comment s'en servir</h2>
<ol>
<li>Comptez sur un mois complet, pas sur une semaine exceptionnelle.</li>
<li>Notez les quatre chiffres quelque part, avec la date.</li>
<li>Reprenez le même comptage après un mois d'usage d'un outil, et comparez.</li>
</ol>
<p class="doux">Cet outil ne conserve rien : vos saisies restent dans votre navigateur. Il ne
convertit aucun de vos chiffres en heures, et n'applique aucun coefficient.</p>
</div>
"""

PAGES["fr/outils/diagnostic-automatisation-cabinet"]["corps"] += STATIQUE_DIAGNOSTIC
PAGES["fr/outils/calculateur-manipulations-administratives"]["corps"] += STATIQUE_CALCULATEUR
