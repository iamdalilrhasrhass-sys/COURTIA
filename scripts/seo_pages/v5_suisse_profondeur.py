#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v5_suisse_profondeur.py — deux actifs suisses décidés par TypeSafe/JEV, réellement suisses.

Décisions : `passQ_suisse` — outils suisses true 0,82 ; processus suisses true 0,84 ; stratégie
« profondeur ciblée » (confiance 1,0, contre le volume). Ces deux pages ne sont PAS des traductions :
elles traitent des situations qui n'existent pas en France (journal de conseil, pièces dans une autre
langue, reprise de portefeuille entre intermédiaires) et des montants en francs.
"""
PAGES = {}


def fpage(chemin=None, intention=None, liens=None, motscles=None, **kw):
    kw.pop("chemin", None)
    kw["fil"] = [("Accueil", "/"), ("Suisse", "/ch"), (kw["h1"][:44], "/" + chemin.strip("/"))]
    kw["maillage"] = [(titre, "/" + url.strip("/"), "à lire aussi") for url, titre in (liens or [])]
    return kw


PAGES["ch/workflows-courtier-assurance-suisse"] = fpage(
    marche="CH",
    chemin="ch/workflows-courtier-assurance-suisse",
    intention="Le cabinet romand qui veut poser des processus adaptés au marché suisse, pas une copie "
              "des processus français.",
    liens=[("ch/logiciel-intermediaire-assurance-suisse", "L'intermédiation en Suisse"),
           ("ch/conformite-intermediaire-assurance-lsa-finma", "Le cadre LSA et FINMA"),
           ("ch/import-portefeuille-courtier-assurance-suisse", "Reprendre un portefeuille"),
           ("ch/gestion-commissions-courtier-assurance-suisse", "Les rétrocessions en francs"),
           ("fr/workflows-courtier-assurance", "La bibliothèque de processus (France)")],
    motscles=["processus courtier suisse", "processus intermédiaire assurance", "organisation cabinet courtage suisse"],
    titre="Processus pour courtiers en Suisse — COURTIA",
    description="Cinq processus propres au marché suisse : reprise de portefeuille, journal de conseil, "
                "pièces multilingues, déclaration de sinistre, rétrocessions en francs.",
    h1="Cinq processus propres au marché suisse",
    corps="""
<p>Les processus d'un cabinet romand ne sont pas ceux d'un cabinet français avec d'autres montants : le
cadre, les documents attendus et parfois la langue des pièces changent. Ces cinq processus traitent des
situations qui se posent réellement ici.</p>

<h2>1. Reprendre un portefeuille venant d'un autre intermédiaire</h2>
<p><strong>Déclencheur :</strong> un client — ou un portefeuille entier — arrive d'un autre
intermédiaire. <strong>Ce qui change en Suisse :</strong> l'identification de l'entité se fait sur des
traits stables (raison sociale, UID, canton) plutôt que sur une adresse, et l'historique du conseil
antérieur n'est pas toujours transmissible. <strong>Étapes :</strong> identifier les clients, reprendre
les contrats avec leurs échéances, reconstituer les pièces, puis traiter les dossiers sans historique.
<strong>Point de rupture :</strong> importer les contrats sans les dates, ce qui oblige à revenir sur
chaque dossier. <strong>Ce que COURTIA fait :</strong> import d'un fichier, rattachement au dossier,
échéances et pièces ensuite. <strong>Ce qui reste humain :</strong> juger ce qui est reprenable et ce qui
doit être redemandé au client.</p>

<h2>2. Tenir le journal de conseil</h2>
<p><strong>Déclencheur :</strong> chaque entretien de conseil, chaque proposition remise.
<strong>Étapes :</strong> enregistrer la situation du client, le conseil exposé, les documents remis, et
la date. <strong>Point de rupture :</strong> un journal tenu « plus tard » ne se reconstitue pas.
<strong>Ce que COURTIA fait :</strong> checklist des points attendus par client, suivi des documents
remis, journal des opérations consultable. <strong>Ce qui reste humain :</strong> la qualification des
obligations applicables et la rédaction du conseil.</p>

<h2>3. Collecter des pièces qui ne sont pas en français</h2>
<p><strong>Déclencheur :</strong> une demande de pièces auprès d'un client alémanique, tessinois, ou
d'une compagnie qui communique dans une autre langue. <strong>Étapes :</strong> demander par lien, suivre
l'état pièce par pièce, conserver le document tel qu'il a été reçu, sans le traduire.
<strong>Point de rupture :</strong> une pièce reçue dans une autre langue est rangée dans un dossier
local au lieu du dossier client. <strong>Ce que COURTIA fait :</strong> demande par lien, réception dans
le dossier, extraction des données sur les types pris en charge. <strong>Ce qui reste humain :</strong>
comprendre le document et juger s'il répond à la demande.</p>

<h2>4. Suivre une déclaration de sinistre</h2>
<p><strong>Déclencheur :</strong> annonce d'un sinistre. <strong>Étapes :</strong> ouvrir le sinistre dans
le dossier, accompagner la déclaration, constituer les pièces, suivre l'expertise, clore et vérifier les
conséquences sur la prime. <strong>Point de rupture :</strong> le dossier vit dans la boîte mail et
personne ne sait où il en est. <strong>Ce que COURTIA fait :</strong> sinistre rattaché au client et au
contrat, état suivi, pièces conservées, résumé de situation. <strong>Ce qui reste humain :</strong> le
contact avec l'assureur et l'expert.</p>

<h2>5. Rapprocher les rétrocessions</h2>
<p><strong>Déclencheur :</strong> réception d'un décompte d'une compagnie ou d'un partenaire.
<strong>Étapes :</strong> comparer le décompte au suivi du cabinet, en francs, contrat par contrat,
et identifier les écarts. <strong>Point de rupture :</strong> un rapprochement fait une fois par an
laisse passer les écarts anciens. <strong>Ce que COURTIA fait :</strong> règles de commission, calcul par
contrat et par période, import du décompte, statistiques d'écart. <strong>Ce qui reste humain :</strong>
la réclamation auprès de la compagnie ou du partenaire.</p>

<h2>Comment adapter ces processus</h2>
<p>Comme pour la bibliothèque française : nommer le déclencheur, écrire le point de rupture, décider de la
trace. La différence suisse tient à deux éléments — la langue possible des pièces et l'identification
stable des entités — qui doivent apparaître dans vos processus, pas seulement dans vos outils.</p>
""",
    faq=[
        ("Ces processus remplacent-ils la bibliothèque française ?",
         "Non : ils traitent ce qui est spécifique au marché suisse. Le socle (nouveau prospect, relance de "
         "devis, renouvellement) reste valable, avec les nuances décrites ici."),
        ("Faut-il traduire les pièces reçues en allemand ?",
         "Non : une pièce est conservée telle qu'elle a été reçue. La compréhension est un travail humain ; "
         "le dossier garde l'original."),
        ("Ces processus sont-ils conformes au cadre suisse ?",
         "Ils sont organisationnels : ils ne qualifient aucune obligation. Le cadre (LSA, FINMA, nLPD) doit "
         "être interprété par le cabinet et, au besoin, par son conseil."),
    ],
)

PAGES["ch/outils/calculateur-temps-administratif-suisse"] = fpage(
    marche="CH",
    chemin="ch/outils/calculateur-temps-administratif-suisse",
    intention="Le responsable romand qui veut chiffrer son temps administratif en francs, avec ses "
              "propres nombres.",
    liens=[("ch/workflows-courtier-assurance-suisse", "Les processus suisses"),
           ("ch/gestion-cabinet-courtage-suisse", "La gestion du cabinet suisse"),
           ("ch/tarifs-logiciel-courtier-chf", "Les tarifs en CHF"),
           ("fr/outils/calculateur-temps-administratif", "Le calculateur France (version EUR)")],
    motscles=["calculateur temps administratif suisse", "coût administratif cabinet courtage chf", "productivité courtier suisse"],
    titre="Calculateur du temps administratif en Suisse (CHF) — COURTIA",
    description="Le même calcul qu'en France, en francs suisses : volumes, minutes par opération, coût "
                "horaire, temps hebdomadaire et mensuel. Hypothèses visibles et modifiables.",
    h1="Calculer le temps administratif d'un cabinet suisse",
    corps="""
<p>Ce calculateur fait exactement la même chose que la version française, en francs : il transforme vos
volumes et vos minutes en heures par semaine, par mois, et en coût — avec un coût horaire que
<strong>vous</strong> fixez. Aucune moyenne de marché suisse n'est appliquée : nous n'en avons pas, et
nous ne l'inventerons pas.</p>
<div class="section" id="outil-temps-ch">
<style>
#outil-temps-ch label{display:block;margin:10px 0 2px;font-weight:600}
#outil-temps-ch input{width:120px;padding:4px}
#outil-temps-ch .aide{font-size:.9em;color:#555}
#outil-temps-ch .res{margin-top:18px;padding:12px;border-left:3px solid #1f6feb;background:#f6f8fa}
#outil-temps-ch table{border-collapse:collapse;width:100%;margin-top:10px}
#outil-temps-ch th,#outil-temps-ch td{border:1px solid #ddd;padding:6px;text-align:left;font-size:.95em}
</style>
<label for="tch-clients">Clients actifs</label>
<input id="tch-clients" type="number" min="0" value="250">
<label for="tch-relances">Relances par mois</label>
<input id="tch-relances" type="number" min="0" value="30">
<label for="tch-appels">Appels entrants par semaine</label>
<input id="tch-appels" type="number" min="0" value="20">
<label for="tch-documents">Documents reçus par mois</label>
<input id="tch-documents" type="number" min="0" value="50">
<label for="tch-renouv">Renouvellements par an</label>
<input id="tch-renouv" type="number" min="0" value="200">
<label for="tch-decomptes">Décomptes de commissions à rapprocher par trimestre</label>
<input id="tch-decomptes" type="number" min="0" value="6">
<label for="tch-equipe">Personnes concernées</label>
<input id="tch-equipe" type="number" min="1" value="2">
<label for="tch-cout">Coût horaire chargé (CHF)</label>
<input id="tch-cout" type="number" min="0" value="70">
<label for="tch-relance-min">Minutes par relance</label>
<input id="tch-relance-min" type="number" min="0" step="0.5" value="6">
<label for="tch-appel-min">Minutes par appel (recherche comprise)</label>
<input id="tch-appel-min" type="number" min="0" step="0.5" value="7">
<label for="tch-doc-min">Minutes par document</label>
<input id="tch-doc-min" type="number" min="0" step="0.5" value="5">
<label for="tch-renouv-min">Minutes par renouvellement</label>
<input id="tch-renouv-min" type="number" min="0" step="0.5" value="25">
<label for="tch-decompte-min">Minutes par décompte rapproché</label>
<input id="tch-decompte-min" type="number" min="0" step="0.5" value="45">
<button id="tch-calc" type="button">Calculer</button>
<div class="res" id="tch-resultat" aria-live="polite">
  <p>Entrez vos nombres puis lancez le calcul. Les formules sont écrites sous le tableau.</p>
</div>
</div>
<script>
(function(){
  var $=function(id){return document.getElementById(id)};
  var n=function(id){var v=parseFloat($(id).value);return isNaN(v)||v<0?0:v};
  var fr=function(v){return v.toLocaleString('fr-CH',{maximumFractionDigits:1})};
  function calculer(){
    var cout=n('tch-cout'), equipe=Math.max(1,n('tch-equipe'));
    var lignes=[
      {t:'Relances', hebdo:n('tch-relances')/4.33, min:n('tch-relance-min')},
      {t:'Appels entrants', hebdo:n('tch-appels'), min:n('tch-appel-min')},
      {t:'Documents', hebdo:n('tch-documents')/4.33, min:n('tch-doc-min')},
      {t:'Renouvellements', hebdo:n('tch-renouv')/52, min:n('tch-renouv-min')},
      {t:'Décomptes de commissions', hebdo:n('tch-decomptes')/13, min:n('tch-decompte-min')}
    ];
    var total=0, html='<table><tr><th>Tâche</th><th>Volume / semaine</th><th>Minutes / unité</th><th>Heures / semaine</th></tr>';
    lignes.forEach(function(l){var h=(l.hebdo*l.min)/60; total+=h;
      html+='<tr><td>'+l.t+'</td><td>'+fr(l.hebdo)+'</td><td>'+fr(l.min)+'</td><td>'+fr(h)+'</td></tr>';});
    html+='</table>';
    html+='<p><strong>Total :</strong> '+fr(total)+' heures par semaine, soit '+fr(total*4.33)+' heures par mois.</p>';
    html+='<p><strong>Coût estimé :</strong> '+fr(total*4.33*cout)+' CHF par mois, au coût horaire de '+fr(cout)+' CHF que vous avez fixé.</p>';
    html+='<p><strong>Par personne :</strong> '+fr(total/equipe)+' heures par semaine pour '+fr(equipe)+' personne(s).</p>';
    html+='<p class="aide">Ces montants ne mesurent que vos saisies. Aucune moyenne suisse n\\'est appliquée, aucune économie n\\'est promise.</p>';
    $('tch-resultat').innerHTML=html;
  }
  $('tch-calc').addEventListener('click',calculer);
})();
</script>

<h2>Les formules</h2>
<ul>
<li>Heures par semaine = volume hebdomadaire × minutes par unité ÷ 60.</li>
<li>Total mensuel = total hebdomadaire × 4,33 · Coût mensuel = total mensuel × coût horaire saisi.</li>
<li>Volumes mensuels ramenés à la semaine (÷ 4,33) et annuels ramenés à la semaine (÷ 52).</li>
</ul>

<h2>Ce que cette page ne fait pas</h2>
<p>Elle ne dit rien du temps récupérable ni du prix d'un logiciel : c'est le rôle du
<a href="/ch/tarifs-logiciel-courtier-chf">calcul de seuil</a>, avec la grille suisse. Les nombres
pré-remplis sont des hypothèses de départ à corriger — les vôtres décrivent votre cabinet, les nôtres ne
décrivent rien.</p>
""",
    faq=[
        ("Les valeurs par défaut sont-elles des moyennes suisses ?",
         "Non : ce sont des hypothèses de départ, à remplacer par vos propres valeurs."),
        ("Pourquoi un coût horaire en francs ?",
         "Parce que les salaires et les charges d'un cabinet suisse se raisonnent en francs : le calcul "
         "reste le même, la devise change."),
        ("Mes données sortent-elles du navigateur ?",
         "Non : le calcul est local, rien n'est transmis et aucun compte n'est nécessaire."),
    ],
)
