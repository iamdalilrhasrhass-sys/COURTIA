#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v5_outils.py — DEUX OUTILS DE CALCUL, HONNÊTES.

Règles tenues (règles 6, 7 et 8 de la mission, et engagement d'honnêteté du projet) :
  - aucun chiffre magique : les valeurs pré-remplies sont explicitement présentées comme des hypothèses
    de départ à corriger, jamais comme des mesures ou des moyennes de marché ;
  - les formules sont affichées sur la page ;
  - le calcul se fait dans le navigateur du visiteur : rien n'est envoyé, aucun compte n'est demandé ;
  - aucun résultat n'est présenté comme une promesse : ce sont des ordres de grandeur issus des chiffres
    saisis par le visiteur lui-même.

Fichiers : deux pages HTML+JavaScript, avec la substance utile aussi en HTML statique (les questions, les
formules et la méthode sont lisibles sans exécuter le script).
"""
PAGES = {}
MARQUE_STYLE = "v5-outils"


def fpage(chemin=None, intention=None, liens=None, motscles=None, **kw):
    kw.pop("chemin", None)
    kw["fil"] = [("Accueil", "/"), ("France", "/fr"), ("Outils gratuits", "/fr/outils/"),
                 (kw["h1"][:40], "/" + chemin.strip("/"))]
    kw["maillage"] = [(titre, "/" + url.strip("/"), "à lire aussi") for url, titre in (liens or [])]
    return kw


SCRIPT_TEMPS = """
<h2>Le calculateur</h2>
<div class="section" id="outil-temps">
<style>
#outil-temps label{display:block;margin:10px 0 2px;font-weight:600}
#outil-temps input{width:120px;padding:4px}
#outil-temps .aide{font-size:.9em;color:#555}
#outil-temps .res{margin-top:18px;padding:12px;border-left:3px solid #1f6feb;background:#f6f8fa}
#outil-temps table{border-collapse:collapse;width:100%;margin-top:10px}
#outil-temps th,#outil-temps td{border:1px solid #ddd;padding:6px;text-align:left;font-size:.95em}
</style>
<p>Entrez vos propres nombres. <strong>Les valeurs pré-remplies sont des hypothèses de départ</strong>
— corrigez-les avec vos valeurs réelles, sinon le résultat ne décrit que nos hypothèses.</p>

<label for="t-clients">Clients actifs dans le cabinet</label>
<input id="t-clients" type="number" min="0" value="300">
<label for="t-prospects">Nouveaux prospects par mois</label>
<input id="t-prospects" type="number" min="0" value="8">
<label for="t-relances">Relances envoyées par mois</label>
<input id="t-relances" type="number" min="0" value="40">
<label for="t-appels">Appels entrants par semaine</label>
<input id="t-appels" type="number" min="0" value="25">
<label for="t-documents">Documents reçus par mois</label>
<input id="t-documents" type="number" min="0" value="60">
<label for="t-renouv">Renouvellements par an</label>
<input id="t-renouv" type="number" min="0" value="240">
<label for="t-equipe">Personnes qui prennent part à l'administratif</label>
<input id="t-equipe" type="number" min="1" value="2">
<label for="t-cout">Coût horaire chargé d'une personne (€)</label>
<input id="t-cout" type="number" min="0" value="35">
<p class="aide">Le coût horaire est une valeur que vous fixez : salaire chargé divisé par les heures
travaillées. Nous ne fournissons aucune moyenne de marché.</p>

<h3>Minutes moyennes par opération (à corriger)</h3>
<label for="t-relance-min">Une relance (rédaction, envoi, suivi)</label>
<input id="t-relance-min" type="number" min="0" step="0.5" value="6">
<label for="t-appel-min">Un appel entrant (recherche du dossier comprise)</label>
<input id="t-appel-min" type="number" min="0" step="0.5" value="7">
<label for="t-doc-min">Un document (demande, réception, classement)</label>
<input id="t-doc-min" type="number" min="0" step="0.5" value="5">
<label for="t-renouv-min">Un renouvellement (préparation et suivi)</label>
<input id="t-renouv-min" type="number" min="0" step="0.5" value="25">
<label for="t-prospect-min">Un nouveau prospect (enregistrement et qualification)</label>
<input id="t-prospect-min" type="number" min="0" step="0.5" value="15">
<label for="t-saisie-min">Saisie ou ressaisie d'un contrat</label>
<input id="t-saisie-min" type="number" min="0" step="0.5" value="10">

<button id="t-calc" type="button">Calculer</button>

<div class="res" id="t-resultat" aria-live="polite">
  <p>Entrez vos nombres puis lancez le calcul. Les formules utilisées sont écrites sous le tableau :
  rien n'est caché.</p>
</div>
</div>

<script>
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var nombre = function(id){ var v = parseFloat($(id).value); return isNaN(v) || v < 0 ? 0 : v; };
  var fr = function(v){ return v.toLocaleString('fr-FR', {maximumFractionDigits: 1}); };

  function calculer(){
    var relanceMin = nombre('t-relance-min'), appelMin = nombre('t-appel-min'), docMin = nombre('t-doc-min');
    var renouvMin = nombre('t-renouv-min'), prospectMin = nombre('t-prospect-min'), saisieMin = nombre('t-saisie-min');
    var cout = nombre('t-cout'), equipe = Math.max(1, nombre('t-equipe'));

    // volumes ramenés à l'échelle hebdomadaire
    var lignes = [
      {t:'Relances', hebdo: nombre('t-relances') / 4.33, min: relanceMin, auto: 'préparation automatique, envoi validé'},
      {t:'Appels entrants', hebdo: nombre('t-appels'), min: appelMin, auto: 'compte rendu transcrit, action tracée'},
      {t:'Documents', hebdo: nombre('t-documents') / 4.33, min: docMin, auto: 'demande et collecte par lien, extraction des données'},
      {t:'Renouvellements', hebdo: nombre('t-renouv') / 52, min: renouvMin, auto: 'échéances détectées, relances préparées'},
      {t:'Nouveaux prospects', hebdo: nombre('t-prospects') / 4.33, min: prospectMin, auto: 'enregistrement et statut suivis'},
      {t:'Saisie / ressaisie de contrats', hebdo: nombre('t-clients') / 52 / 3, min: saisieMin, auto: 'extraction proposée, validation humaine'}
    ];

    var totalHebdo = 0, html = '<table><tr><th>Tâche</th><th>Volume / semaine</th><th>Minutes / unité</th><th>Heures / semaine</th><th>Ce qui est partiellement automatisable</th></tr>';
    lignes.forEach(function(l){
      var heures = (l.hebdo * l.min) / 60;
      totalHebdo += heures;
      html += '<tr><td>' + l.t + '</td><td>' + fr(l.hebdo) + '</td><td>' + fr(l.min) + '</td><td>' + fr(heures) + '</td><td>' + l.auto + '</td></tr>';
    });
    var totalMois = totalHebdo * 4.33, coutMois = totalMois * cout, parPersonne = totalHebdo / equipe;

    html += '</table>';
    html += '<p><strong>Total administratif :</strong> ' + fr(totalHebdo) + ' heures par semaine, soit ' +
            fr(totalMois) + ' heures par mois.</p>';
    html += '<p><strong>Coût estimé :</strong> ' + fr(coutMois) + ' € par mois, sur la base d\\'un coût horaire de ' +
            fr(cout) + ' € que vous avez fixé.</p>';
    html += '<p><strong>Par personne :</strong> ' + fr(parPersonne) + ' heures par semaine pour ' + fr(equipe) +
            ' personne(s) prenant part à l\\'administratif.</p>';
    html += '<p class="aide">Ces chiffres ne mesurent rien d\\'autre que ce que vous venez de saisir. Aucune ' +
            'moyenne de marché n\\'est appliquée, aucune économie n\\'est promise.</p>';

    // zones les plus lourdes = priorité de travail
    lignes.sort(function(a,b){ return (b.hebdo*b.min) - (a.hebdo*a.min); });
    html += '<p><strong>Par où commencer :</strong> les trois postes les plus lourds dans votre saisie sont ' +
            lignes.slice(0,3).map(function(l){ return l.t.toLowerCase(); }).join(', ') + '.</p>';
    $('t-resultat').innerHTML = html;
  }
  $('t-calc').addEventListener('click', calculer);
})();
</script>

<h2>Les formules, en clair</h2>
<ul>
<li>Volume hebdomadaire = volume mensuel ÷ 4,33 (semaines par mois) ou volume annuel ÷ 52.</li>
<li>Heures par semaine d'une tâche = volume hebdomadaire × minutes par unité ÷ 60.</li>
<li>Total mensuel = total hebdomadaire × 4,33. Coût mensuel = total mensuel × coût horaire saisi.</li>
<li>Aucun coefficient d'économie n'est appliqué : ce calculateur mesure l'existant, il ne promet rien.</li>
</ul>

<h2>Ce que les valeurs par défaut sont — et ne sont pas</h2>
<p>Les nombres pré-remplis sont des <strong>hypothèses de départ</strong> pour que l'outil soit utilisable
immédiatement. Ils ne proviennent d'aucune étude, d'aucun panel de cabinets : nous n'avons pas de mesure
du temps des cabinets de courtage et nous ne l'inventerons pas. Si vous ne modifiez rien, le résultat
décrit nos hypothèses — c'est écrit ici pour que personne ne s'y trompe.</p>
"""

SCRIPT_ROI = """
<h2>Le calculateur</h2>
<div class="section" id="outil-roi">
<style>
#outil-roi label{display:block;margin:10px 0 2px;font-weight:600}
#outil-roi input{width:120px;padding:4px}
#outil-roi .res{margin-top:18px;padding:12px;border-left:3px solid #1f6feb;background:#f6f8fa}
#outil-roi table{border-collapse:collapse;width:100%;margin-top:10px}
#outil-roi th,#outil-roi td{border:1px solid #ddd;padding:6px;text-align:left;font-size:.95em}
</style>
<p>Ce calculateur fait de l'arithmétique, rien d'autre. Vous décidez vous-même de la part de temps
réellement récupérable : c'est le seul paramètre qui change le résultat.</p>

<label for="r-heures">Temps administratif estimé par semaine (heures)</label>
<input id="r-heures" type="number" min="0" step="0.5" value="20">
<label for="r-cout">Coût horaire chargé (€)</label>
<input id="r-cout" type="number" min="0" value="35">
<label for="r-part">Part de ce temps que vous jugez récupérable (%)</label>
<input id="r-part" type="number" min="0" max="100" value="20">
<label for="r-prix">Abonnement mensuel COURTIA à comparer (€ HT)</label>
<input id="r-prix" type="number" min="0" value="89">
<p class="aide">Le montant pré-rempli correspond au tarif public de l'offre Starter en France ; remplacez-le
si vous regardez une autre offre, ou 0 pour ignorer l'abonnement.</p>

<button id="r-calc" type="button">Calculer</button>
<div class="res" id="r-resultat" aria-live="polite">
  <p>Entrez vos nombres puis lancez le calcul. Le détail du calcul est affiché à chaque étape.</p>
</div>
</div>

<script>
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var nombre = function(id){ var v = parseFloat($(id).value); return isNaN(v) || v < 0 ? 0 : v; };
  var fr = function(v){ return v.toLocaleString('fr-FR', {maximumFractionDigits: 1}); };
  var euros = function(v){ return v.toLocaleString('fr-FR', {maximumFractionDigits: 0}) + ' €'; };

  function calculer(){
    var heures = nombre('r-heures'), cout = nombre('r-cout');
    var part = Math.min(100, nombre('r-part')) / 100, prix = nombre('r-prix');

    var coutHebdo = heures * cout, coutMois = coutHebdo * 4.33;
    var heuresRecupereesMois = heures * part * 4.33;
    var valeurMois = heuresRecupereesMois * cout;
    var net = valeurMois - prix;
    var seuilHeures = cout > 0 ? prix / cout : 0;              // heures à récupérer pour couvrir l'abonnement
    var seuilPart = heures > 0 ? (prix / cout) / (heures * 4.33) : 1;

    var html = '<table><tr><th>Étape</th><th>Calcul</th><th>Résultat</th></tr>';
    html += '<tr><td>Coût administratif hebdomadaire</td><td>' + fr(heures) + ' h × ' + euros(cout) + '</td><td>' + euros(coutHebdo) + '</td></tr>';
    html += '<tr><td>Coût administratif mensuel</td><td>' + euros(coutHebdo) + ' × 4,33</td><td>' + euros(coutMois) + '</td></tr>';
    html += '<tr><td>Heures récupérées par mois</td><td>' + fr(heures) + ' h × ' + fr(part*100) + ' % × 4,33</td><td>' + fr(heuresRecupereesMois) + ' h</td></tr>';
    html += '<tr><td>Valeur de ces heures</td><td>' + fr(heuresRecupereesMois) + ' h × ' + euros(cout) + '</td><td>' + euros(valeurMois) + '</td></tr>';
    html += '<tr><td>Seuil de rentabilité</td><td>' + euros(prix) + ' ÷ ' + euros(cout) + '</td><td>' + fr(seuilHeures) + ' h par mois</td></tr>';
    html += '<tr><td>Résultat net mensuel</td><td>' + euros(valeurMois) + ' − ' + euros(prix) + '</td><td>' + euros(net) + '</td></tr>';
    html += '</table>';

    if (seuilPart <= part) {
      html += '<p><strong>Au taux que vous avez choisi, le seuil est atteint :</strong> il faut récupérer ' +
              fr(seuilHeures) + ' heures par mois (' + fr(seuilPart*100) + ' % de votre temps administratif) pour couvrir l\\'abonnement saisi.</p>';
    } else {
      html += '<p><strong>Avec la part que vous avez choisie, le seuil n\\'est pas atteint :</strong> il faudrait ' +
              fr(seuilPart*100) + ' % de votre temps administratif pour couvrir l\\'abonnement saisi. C\\'est votre estimation, pas une promesse : changez la part pour voir les autres scénarios.</p>';
    }

    html += '<h3>Trois scénarios, mêmes chiffres</h3><table><tr><th>Part récupérée</th><th>Heures / mois</th><th>Valeur</th><th>Net après abonnement</th></tr>';
    [0.05, 0.10, 0.20].forEach(function(p){
      var h = heures * p * 4.33, v = h * cout;
      html += '<tr><td>' + fr(p*100) + ' %</td><td>' + fr(h) + ' h</td><td>' + euros(v) + '</td><td>' + euros(v - prix) + '</td></tr>';
    });
    html += '</table>';
    html += '<p class="aide">Tout est reproductible : les formules sont sous le tableau et les nombres viennent ' +
            'de vos saisies. Rien ne quitte votre navigateur.</p>';
    $('r-resultat').innerHTML = html;
  }
  $('r-calc').addEventListener('click', calculer);
})();
</script>

<h2>Les formules, en clair</h2>
<ul>
<li>Coût administratif mensuel = heures par semaine × coût horaire × 4,33.</li>
<li>Heures récupérées par mois = heures par semaine × part choisie × 4,33.</li>
<li>Seuil de rentabilité = abonnement mensuel ÷ coût horaire (en heures à récupérer par mois).</li>
<li>Résultat net = valeur des heures récupérées − abonnement.</li>
</ul>

<h2>Ce que ce calculateur ne fait pas</h2>
<p>Il ne prédit pas ce que vous récupérerez réellement : il traduit votre propre hypothèse en euros. Si la
part de temps récupérable est fausse, le résultat l'est aussi — c'est le seul paramètre qui compte, et
c'est vous qui le fixez.</p>
"""

PAGES["fr/outils/calculateur-temps-administratif"] = fpage(
    chemin="fr/outils/calculateur-temps-administratif",
    intention="Le responsable de cabinet qui veut savoir combien d'heures représentent ses tâches "
              "administratives, avec ses propres chiffres.",
    liens=[("fr/mesurer-temps-administratif-cabinet", "Le protocole de mesure"),
           ("fr/outils/calculateur-roi-courtia", "Le calculateur de retour sur investissement"),
           ("fr/gagner-du-temps-courtier-assurance", "Le cluster gagner du temps"),
           ("fr/outils/diagnostic-automatisation-cabinet", "Le diagnostic d'automatisation")],
    motscles=["calculateur temps administratif cabinet", "temps administratif courtier", "coût administratif assurance"],
    titre="Calculateur du temps administratif d'un cabinet de courtage — COURTIA",
    description="Entrez vos volumes et vos minutes : le calculateur donne le temps hebdomadaire et "
                "mensuel, le coût estimé et les postes les plus lourds. Hypothèses visibles et "
                "modifiables.",
    h1="Calculer le temps administratif de votre cabinet",
    corps="""
<p>Ce calculateur répond à une seule question : <strong>combien d'heures représentent les tâches
administratives d'un cabinet, avec les chiffres du cabinet</strong> — pas avec des moyennes de marché.
Il ne promet aucune économie : il met des heures et un coût en face de volumes que vous connaissez.</p>
"""
    + SCRIPT_TEMPS
    + """
<h2>Comment l'utiliser sérieusement</h2>
<p>Deux façons. La rapide : entrez vos volumes estimés, corrigez les minutes, regardez quels postes
pèsent le plus. La rigoureuse : pendant une semaine, notez le temps réel passé sur chaque famille de
tâches (le <a href="/fr/mesurer-temps-administratif-cabinet">protocole de mesure</a> explique comment),
puis remplacez les valeurs.</p>
<p>Une fois le temps connu, deux suites logiques : le
<a href="/fr/outils/calculateur-roi-courtia">calculateur de retour sur investissement</a> pour traduire
en euros, et le <a href="/fr/outils/diagnostic-automatisation-cabinet">diagnostic d'automatisation</a>
pour savoir par quelle tâche commencer.</p>
""",
    faq=[
        ("Les valeurs par défaut sont-elles des moyennes du marché ?",
         "Non. Ce sont des hypothèses de départ, choisies pour que l'outil soit utilisable immédiatement — "
         "et à remplacer par vos chiffres."),
        ("Mes données sont-elles envoyées quelque part ?",
         "Non. Le calcul se fait dans votre navigateur, rien n'est transmis, aucun compte n'est demandé."),
        ("Le calculateur peut-il mesurer un gain de COURTIA ?",
         "Non, et il ne le prétend pas : il mesure l'existant. La part récupérable se fixe dans le "
         "calculateur de retour sur investissement, et c'est vous qui la choisissez."),
    ],
)

PAGES["fr/outils/calculateur-roi-courtia"] = fpage(
    chemin="fr/outils/calculateur-roi-courtia",
    intention="Le responsable qui veut savoir combien d'heures il doit réellement récupérer pour que "
              "l'abonnement soit couvert.",
    liens=[("fr/outils/calculateur-temps-administratif", "Le calculateur de temps administratif"),
           ("fr/mesurer-temps-administratif-cabinet", "Le protocole de mesure"),
           ("fr/gagner-du-temps-courtier-assurance", "Le cluster gagner du temps"),
           ("fr/tarifs-logiciel-courtier", "Les tarifs publics")],
    motscles=["calculateur roi logiciel courtier", "rentabilité crm assurance", "seuil de rentabilité logiciel courtage"],
    titre="Calculateur de retour sur investissement — COURTIA",
    description="Un calcul transparent : coût administratif actuel, part de temps récupérable que vous "
                "choisissez, seuil de rentabilité en heures, trois scénarios. Formules affichées.",
    h1="Retour sur investissement : le calcul, sans promesse",
    corps="""
<p>La plupart des pages de « ROI » posent une hypothèse invisible puis annoncent un résultat spectaculaire.
Ici, c'est l'inverse : <strong>la seule hypothèse est celle que vous choisissez</strong> — la part de
temps administratif que vous jugez réellement récupérable. Tout le reste est de l'arithmétique, affichée
étape par étape.</p>
"""
    + SCRIPT_ROI
    + """
<h2>Pourquoi commencer par le seuil, pas par le gain</h2>
<p>La question utile n'est pas « combien vais-je gagner ? » mais « <strong>combien d'heures par mois dois-je
récupérer pour que l'abonnement soit couvert ?</strong> ». Ce seuil est un fait arithmétique : abonnement
divisé par votre coût horaire. Si le seuil vous paraît atteignable, la décision se discute ; s'il ne l'est
pas, aucune promesse marketing ne le rendra atteignable.</p>
<p>Pour estimer le temps administratif de départ, utilisez le
<a href="/fr/outils/calculateur-temps-administratif">calculateur de temps administratif</a> : ses
résultats s'importent ici en une valeur, que vous restez libre de corriger.</p>

<h2>Ce que ce calcul ne dit pas</h2>
<p>Il ne dit rien de la qualité du service, de la satisfaction des clients, ni du temps que vous passerez à
apprendre un nouvel outil — trois éléments réels dans une décision, et absents de toute formule. Il ne dit
pas non plus si vous récupérerez la part que vous avez choisie : c'est une hypothèse, la vôtre, et elle est
affichée comme telle.</p>
""",
    faq=[
        ("Le tarif pré-rempli est-il le bon ?",
         "Le montant pré-rempli correspond au tarif public de l'offre Starter en France ; remplacez-le si "
         "vous examinez une autre offre. Les tarifs publics sont sur la page tarifs."),
        ("Le produit change-t-il la part récupérable ?",
         "Non : c'est votre hypothèse. Le produit décrit ce qu'il fait réellement sur chaque tâche, à "
         "vous de juger ce que cela change chez vous."),
        ("Puis-je utiliser ce calculateur pour comparer deux outils ?",
         "Oui : c'est de l'arithmétique. Remplacez le montant de l'abonnement et la part de temps "
         "récupérable que vous estimez pour chaque solution."),
    ],
)


PAGES["fr/outils/"] = fpage(
    chemin="fr/outils/",
    intention="Le responsable qui cherche un outil de calcul utile et qui veut savoir ce qu'il fait des "
              "ses données avant de l'utiliser.",
    liens=[("fr/outils/calculateur-temps-administratif", "Calculateur de temps administratif"),
           ("fr/outils/calculateur-roi-courtia", "Calculateur de retour sur investissement"),
           ("fr/outils/diagnostic-automatisation-cabinet", "Diagnostic d'automatisation du cabinet"),
           ("fr/workflows-courtier-assurance", "La bibliothèque de processus"),
           ("fr/gagner-du-temps-courtier-assurance", "Gagner du temps au cabinet")],
    motscles=["outils gratuits courtier assurance", "calculateur cabinet courtage", "diagnostic automatisation assurance"],
    titre="Outils gratuits pour cabinet de courtage — COURTIA",
    description="Trois outils utilisables sans compte et sans transmission de données : temps "
                "administratif, retour sur investissement, diagnostic d'automatisation. Formules "
                "affichées.",
    h1="Trois outils gratuits, utilisables sans compte",
    corps="""
<p>Ces outils existent pour une raison simple : avant d'automatiser quoi que ce soit, il faut savoir ce qui
se passe réellement dans le cabinet. Ils ne vendent rien, ne demandent aucun compte et n'envoient aucune
donnée : le calcul se fait dans votre navigateur.</p>

<h2>Les trois outils</h2>
<ul>
<li><a href="/fr/outils/calculateur-temps-administratif">Calculateur de temps administratif</a> — entrez vos
volumes et vos minutes : temps hebdomadaire, mensuel, coût estimé, postes les plus lourds.</li>
<li><a href="/fr/outils/calculateur-roi-courtia">Calculateur de retour sur investissement</a> — vous
choisissez la part de temps récupérable, l'outil calcule le seuil de rentabilité et trois scénarios.</li>
<li><a href="/fr/outils/diagnostic-automatisation-cabinet">Diagnostic d'automatisation</a> — dix questions
sur vos frictions, et un classement des priorités avec la fonction correspondante.</li>
</ul>

<h2>Ce que ces outils ne font pas</h2>
<p>Ils n'estiment aucun gain par eux-mêmes : les valeurs pré-remplies sont des hypothèses de départ à
corriger, et les formules sont écrites sur chaque page. Aucun résultat n'est présenté comme une mesure de
marché — nous n'avons pas de données sur le temps des cabinets et nous ne les inventerons pas.</p>

<h2>Par quoi commencer</h2>
<ol>
<li><strong>Mesurer</strong> : le <a href="/fr/mesurer-temps-administratif-cabinet">protocole de mesure</a>
tient en une semaine de relevés, sans logiciel.</li>
<li><strong>Chiffrer</strong> : passez les relevés dans le calculateur de temps administratif.</li>
<li><strong>Prioriser</strong> : utilisez le diagnostic pour savoir par quelle tâche commencer.</li>
<li><strong>Décider</strong> : le calculateur de retour sur investissement traduit le tout en seuil de
rentabilité — un fait arithmétique, pas une promesse.</li>
</ol>
""",
    faq=[
        ("Faut-il un compte pour utiliser ces outils ?",
         "Non, aucun. Aucune adresse électronique n'est demandée."),
        ("Les données saisies sont-elles conservées ?",
         "Non : le calcul s'exécute dans votre navigateur et rien n'est transmis."),
        ("Les résultats sont-ils des moyennes du marché ?",
         "Non. Ils viennent uniquement des nombres que vous saisissez ; les valeurs par défaut sont des "
         "hypothèses de départ, signalées comme telles."),
    ],
)
