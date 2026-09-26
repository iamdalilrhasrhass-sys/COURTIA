#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vague géographique : villes et régions (France + Suisse romande).

Chaque page porte un contenu propre a la zone :
- France : nombre d'etablissements de courtage et densite pour 10 000 habitants issus de
  notre extraction SIRENE (code NAF 66.22Z, extraction du 19/09/2026) croisee avec les
  populations INSEE, plus l'enjeu d'organisation propre a la taille du marche local ;
- Suisse : structure du marche local (types de clients, saisonnalite, frontalier,
  canton), sans aucun chiffre invente.

Aucune page ne reprend le contenu d'une autre : le controle d'indexabilite refuse les
pages trop proches (seo/gate.py).
"""
from contenu_core import section, ul, p, tableau, etapes

SIRENE = ('Données : base SIRENE (code NAF 66.22Z — agents et courtiers d\'assurances), extraction du '
          '19/09/2026 ; populations INSEE. Chiffres reproductibles, détail sur la page '
          '<a href="/fr/densite-courtage-grandes-villes-france">densité du courtage en France</a>.')

# ville, departement, region, etablissements, population, densite, enjeux specifiques
VILLES_FR = [
    dict(slug='paris', nom='Paris', dept='Paris', region='Île-de-France', etabs=4347, pop=2103778, dens=20.7,
         angle="Paris cumule la plus forte densité de courtage du pays dans notre relevé : 20,7 établissements pour "
               "10 000 habitants, très au-dessus de la moyenne des autres villes. Un cabinet parisien travaille donc "
               "dans un marché saturé où la différenciation ne vient plus du produit vendu mais du suivi.",
         enjeux=["Un portefeuille souvent composé de clientèle mixte : professions libérales, dirigeants, entreprises.",
                 "Des clients qui changent de situation fréquemment (mobilité, création d'activité) : les mises à jour de dossier s'accumulent.",
                 "Une pression sur les délais de réponse, dans un marché où plusieurs cabinets peuvent être consultés en parallèle."],
                  tableau_local=[['Clientèle mixte (particuliers, dirigeants, entreprises)', "Un dossier client unique, avec l'historique des échanges et des contrats"], ['Changements de situation fréquents', 'Mise à jour consignée : ce qui a changé, quand, avec quelle pièce'], ['Réactivité attendue', 'Brief du matin et dossiers en attente visibles dès la connexion'], ['Plusieurs collaborateurs', 'Rôles distincts et cloisonnement des données par cabinet']],
         dossiers=['Un dirigeant qui change de société : sa prévoyance doit être réexaminée sans repartir de zéro', 'Une profession libérale qui ouvre un second cabinet : les deux activités doivent rester lisibles dans le même dossier', 'Une PME qui déménage : les contrats de choses et la RC doivent être repris avec la date du changement'],
faq=[("Un cabinet parisien a-t-il besoin d'un CRM spécifique ?",
               "Dans un marché aussi dense, le suivi documenté fait la différence : contrats, échéances et pièces du dossier "
               "doivent être retrouvables en quelques secondes, par plusieurs personnes, sans dépendre d'un tableur."),
              ("Combien de cabinets de courtage compte Paris ?",
               "Notre relevé SIRENE du 19/09/2026 recense 4 347 établissements dont l'activité déclarée correspond au "
               "courtage d'assurances (NAF 66.22Z) dans la commune.")]),
    dict(slug='lyon', nom='Lyon', dept='Rhône', region='Auvergne-Rhône-Alpes', etabs=634, pop=519127, dens=12.2,
         angle="Lyon combine une densité élevée (12,2 pour 10 000 habitants) et un tissu économique de PME et de "
               "professions libérales. Le cabinet lyonnais suit à la fois des particuliers exigeants et des entreprises "
               "dont les contrats évoluent avec l'activité.",
         enjeux=["Des dossiers entreprises (multirisque, RC professionnelle) dont les échéances ne tombent pas aux mêmes dates.",
                 "Une concurrence régionale forte avec des cabinets de taille comparable : le temps de réaction est un argument commercial.",
                 "Des équipes souvent réduites qui cumulent production et administration."],
                  tableau_local=[['Portefeuille mixte particuliers / entreprises', 'Contrats et échéances rattachés au client, quelle que soit la branche'], ['Échéances désynchronisées', 'Vue portefeuille pour préparer chaque renouvellement au bon moment'], ['Petite équipe polyvalente', "Une seule saisie, partagée, au lieu d'un tableur par collaborateur"], ['Devis à suivre', 'Registre des devis et repérage de ceux restés sans réponse']],
         dossiers=['Une PME lyonnaise qui recrute : le contrat de prévoyance doit être revalorisé', 'Un client qui ajoute un véhicule professionnel : le dossier doit refléter la flotte réelle', 'Un devis resté sans réponse trois semaines : la relance doit être visible, pas oubliée'],
faq=[("Pourquoi un cabinet lyonnais suit-il difficilement ses échéances ?",
               "Parce que les contrats entreprises et particuliers n'ont pas de rythme commun : sans vue consolidée des "
               "échéances, la préparation du renouvellement se fait au dernier moment."),
              ("Combien d'établissements de courtage à Lyon ?",
               "634 établissements relevant du courtage d'assurances (NAF 66.22Z) dans notre extraction du 19/09/2026, "
               "pour 519 127 habitants.")]),
    dict(slug='marseille', nom='Marseille', dept='Bouches-du-Rhône', region="Provence-Alpes-Côte d'Azur",
         etabs=632, pop=886040, dens=7.1,
         angle="Marseille affiche une densité plus faible que Lyon (7,1 pour 10 000 habitants) pour une population "
               "supérieure : le marché est vaste et fragmenté, avec beaucoup de très petites structures et un tissu "
               "artisanal et commercial étendu.",
         enjeux=["Un portefeuille dispersé géographiquement, entre quartiers et communes voisines.",
                 "Des clients artisans et commerçants dont les besoins suivent l'activité, avec des périodes creuses.",
                 "Peu de cabinets structurés : l'organisation interne devient un avantage compétitif direct."],
                  tableau_local=[['Portefeuille dispersé', 'Recherche par client, par immatriculation ou par tag, sans fouiller un fichier'], ['Clients artisans et commerçants', "Historique du dossier pour suivre l'évolution de l'activité"], ['Très petites structures', 'Aucune procédure lourde à installer : dossier, échéances, pièces, relances'], ['Pièces difficiles à récupérer', 'Lien de dépôt client, sans création de compte']],
         dossiers=['Un commerçant qui ferme une boutique et en ouvre une autre : deux lieux, un seul dossier', 'Un artisan qui change de statut : le contrat doit suivre la nouvelle situation', "Un client qui n'a jamais envoyé son attestation : la pièce manquante doit remonter d'elle-même"],
faq=[("Un marché moins dense est-il plus facile pour un cabinet ?",
               "Moins dense ne veut pas dire plus simple : avec 632 établissements et une population proche de 900 000 habitants, "
               "la difficulté est de tenir un portefeuille dispersé sans perdre le fil des échéances et des pièces."),
              ("Les artisans et commerçants demandent-ils un suivi particulier ?",
               "Leur activité varie : les contrats doivent être réévalués quand l'entreprise change de taille, de locaux ou "
               "d'activité, ce qui suppose un historique de dossier à jour.")]),
    dict(slug='toulouse', nom='Toulouse', dept='Haute-Garonne', region='Occitanie', etabs=477, pop=514819, dens=9.3,
         angle="Toulouse mêle un tissu technologique et aéronautique, des professions libérales nombreuses et une "
               "population étudiante et jeune : les besoins en prévoyance et en assurances de personnes y sont "
               "structurellement importants.",
         enjeux=["Des dossiers de prévoyance et de santé qui demandent un suivi documentaire rigoureux.",
                 "Des clients mobiles (mutation professionnelle) dont les contrats doivent être réexaminés souvent.",
                 "Une concurrence importante sur les jeunes actifs, où la réactivité fait la conversion."],
                  tableau_local=[['Dossiers de prévoyance et de santé', "Suivi du dossier et des pièces, avec l'historique des décisions"], ['Clients mobiles professionnellement', "Consignation des changements de situation au fil de l'eau"], ['Volume de devis élevé', 'Repérage des devis en attente et des relances à faire'], ['Jeunes actifs', 'Parcours de suivi léger : un dossier, des contrats, des échéances']],
         dossiers=["Un ingénieur muté à l'étranger : sa prévoyance doit être revue avant le départ", "Un couple qui s'installe : les deux dossiers doivent rester distincts et reliés", "Un devis santé envoyé à un jeune actif : sans relance, l'affaire se perd"],
faq=[("Pourquoi la prévoyance demande-t-elle plus de suivi administratif ?",
               "Parce que la situation du client (famille, activité, revenus) détermine le contrat : chaque changement "
               "significatif doit être retrouvé dans le dossier pour conseiller de nouveau."),
              ("Combien d'établissements de courtage à Toulouse ?",
               "477 établissements (NAF 66.22Z) dans notre extraction du 19/09/2026, pour 514 819 habitants.")]),
    dict(slug='bordeaux', nom='Bordeaux', dept='Gironde', region='Nouvelle-Aquitaine', etabs=398, pop=267991, dens=14.9,
         angle="Bordeaux présente l'une des densités les plus élevées de notre relevé (14,9 pour 10 000 habitants) "
               "pour une population modérée : peu de cabinets, mais beaucoup d'établissements de courtage, ce qui "
               "signifie des structures souvent petites et un marché où tout le monde se connaît.",
         enjeux=["Des cabinets de petite taille où une seule absence suffit à bloquer le suivi.",
                 "Un tissu économique mixte : professions de santé, secteur viticole, entreprises de services.",
                 "Des clients qui attendent un interlocuteur unique et une continuité de service."],
                  tableau_local=[['Cabinet de petite taille', "Un dossier partagé qui ne dépend pas d'une seule personne"], ['Absences bloquantes', 'Les échéances et les relances restent visibles par tous'], ['Tissu économique mixte', 'Tags et segments pour retrouver rapidement une clientèle (santé, viticole, services)'], ['Continuité de service', 'Historique complet pour reprendre un dossier sans appeler le collègue']],
         dossiers=["Le titulaire s'absente une semaine : les échéances doivent rester visibles", "Un client viticole dont l'exploitation change de forme : contrat et pièces à reprendre", "Un dossier repris par un associé : tout doit être dans l'outil, pas dans une mémoire"],
faq=[("Que signifie une densité de 14,9 pour un cabinet bordelais ?",
               "Qu'il y a proportionnellement beaucoup d'établissements de courtage pour la population : la différenciation "
               "se joue sur la qualité du suivi et la mémoire du dossier, pas sur l'abondance de prospects."),
              ("Un petit cabinet peut-il tenir un portefeuille dense ?",
               "Oui, à condition que l'information ne dépende pas d'une seule personne : c'est exactement ce que règle une "
               "fiche client partagée avec échéances et documents.")]),
    dict(slug='lille', nom='Lille', dept='Nord', region='Hauts-de-France', etabs=190, pop=238246, dens=8.0,
         angle="Lille se situe dans une métropole transfrontalière : la proximité belge crée des situations de "
               "clients travaillant ou résidant de part et d'autre de la frontière, avec des contrats qui ne relèvent "
               "pas toujours du même cadre.",
         enjeux=["Des dossiers transfrontaliers dont la cohérence doit être vérifiable.",
                 "Un tissu de PME industrielles et logistiques avec des contrats de choses et de flottes.",
                 "Des échéances contractuelles souvent groupées en début d'année civile."],
                  tableau_local=[['Dossiers transfrontaliers', 'La situation réelle du client est consignée, avec les pièces qui la justifient'], ['PME industrielles et logistiques', 'Contrats de choses et de flotte rattachés au dossier entreprise'], ["Échéances groupées en début d'année", 'Vue portefeuille pour étaler la préparation des renouvellements'], ['Multi-sites', 'Un client, plusieurs implantations, un seul historique']],
         dossiers=['Un salarié qui travaille en Belgique : sa situation doit être documentée dans le dossier', "Une PME logistique qui renouvelle sa flotte : les contrats doivent suivre l'inventaire réel", 'Cinq renouvellements dans la même semaine de janvier : la préparation doit démarrer en décembre'],
faq=[("Comment suivre un client qui travaille en Belgique ?",
               "En gardant dans le même dossier son statut, ses contrats et les pièces associées : le cadre applicable "
               "dépend de sa situation réelle, et le cabinet doit pouvoir le reconstituer."),
              ("Combien d'établissements de courtage à Lille ?",
               "190 établissements (NAF 66.22Z) dans notre extraction du 19/09/2026, pour 238 246 habitants.")]),
    dict(slug='nantes', nom='Nantes', dept='Loire-Atlantique', region='Pays de la Loire', etabs=282, pop=327734,
         dens=8.6,
         angle="Nantes fait partie des métropoles qui gagnent des habitants chaque année : un cabinet nantais suit un "
               "portefeuille en croissance, avec beaucoup de primo-souscriptions et un besoin de structuration rapide.",
         enjeux=["Un portefeuille jeune : les dossiers arrivent vite et doivent être cadrés dès l'ouverture.",
                 "Des professions libérales et des PME de services en développement.",
                 "Un risque de désorganisation quand le volume augmente plus vite que les procédures."],
                  tableau_local=[['Portefeuille en croissance', "Cadrage du dossier dès l'ouverture : identité, contrats, échéances, pièces"], ['Primo-souscriptions nombreuses', 'Parcours simple pour ouvrir un dossier propre en quelques minutes'], ['Professions libérales et PME de services', "Suivi des évolutions d'activité et des contrats associés"], ['Volume qui augmente', 'Listes de travail quotidiennes au lieu de rattrapages périodiques']],
         dossiers=['Une nouvelle cliente qui arrive avec trois contrats existants : tout doit entrer dans un dossier unique', 'Une PME de services qui double son effectif : prévoyance et RC à réexaminer', 'Un volume qui double en six mois : sans structure, le suivi devient du rattrapage'],
faq=[("Par où commencer quand le portefeuille grossit vite ?",
               "Par la structure du dossier : identité, contrats, échéances, pièces. Une fois ces quatre blocs tenus, "
               "le volume devient gérable sans embaucher."),
              ("Combien d'établissements de courtage à Nantes ?",
               "282 établissements (NAF 66.22Z) dans notre extraction du 19/09/2026, pour 327 734 habitants.")]),
    dict(slug='strasbourg', nom='Strasbourg', dept='Bas-Rhin', region='Grand Est', etabs=209, pop=293771, dens=7.1,
         angle="Strasbourg est une métropole bilingue, siège d'institutions européennes : les cabinets y côtoient des "
               "clients francophones et germanophones, ainsi que des professionnels en mobilité internationale.",
         enjeux=["Des dossiers à cheval sur deux langues de correspondance.",
                 "Des clients fonctionnaires européens ou salariés d'organisations internationales, avec des garanties spécifiques.",
                 "Une exigence de rigueur documentaire élevée dans ce type de clientèle."],
                  tableau_local=[['Clients francophones et germanophones', "Le contenu des messages reste libre ; l'historique reste lisible par tous"], ["Salariés d'organisations internationales", 'Garanties spécifiques consignées et documents rattachés'], ['Exigence documentaire élevée', 'Pièces collectées par lien et classées dans le dossier'], ['Clients en mobilité', "Changements de situation suivis au fil de l'eau"]],
         dossiers=["Un fonctionnaire européen qui change d'organisation : ses garanties doivent être revues", "Un dossier tenu en allemand repris par un collègue francophone : l'historique doit être compréhensible", "Un client qui part à l'étranger : les dates et les décisions doivent être tracées"],
faq=[("Faut-il gérer plusieurs langues dans le dossier client ?",
               "Le contenu des messages reste libre : ce qui compte est que l'historique et les pièces restent lisibles "
               "par le collaborateur qui reprend le dossier."),
              ("Combien d'établissements de courtage à Strasbourg ?",
               "209 établissements (NAF 66.22Z) dans notre extraction du 19/09/2026, pour 293 771 habitants.")]),
    dict(slug='montpellier', nom='Montpellier', dept='Hérault', region='Occitanie', etabs=233, pop=310240, dens=7.5,
         angle="Montpellier combine une croissance démographique forte et un tissu de très petites entreprises : les "
               "cabinets y suivent beaucoup de clients indépendants dont l'activité change souvent.",
         enjeux=["Des clients indépendants et micro-entrepreneurs, avec des contrats à réviser fréquemment.",
                 "Un volume de devis élevé pour des montants modestes : la relance devient un enjeu de rentabilité.",
                 "Une concurrence locale active sur les professions de santé."],
                  tableau_local=[['Indépendants et micro-entreprises', "Contrats à réviser quand l'activité évolue"], ['Devis de faible montant, nombreux', "Relances organisées : c'est là que se joue la rentabilité"], ['Professions de santé', 'Suivi documentaire et échéances de prévoyance'], ['Petite équipe', "Aucune tâche administrative ne dépend d'une seule personne"]],
         dossiers=["Une masseuse-kinésithérapeute qui s'installe : premier contrat, premières échéances", 'Dix devis envoyés, deux réponses : les huit autres doivent remonter en relance', 'Un indépendant qui embauche : sa prévoyance doit être réévaluée'],
faq=[("Pourquoi la relance est-elle critique pour un cabinet montpelliérain ?",
               "Quand les primes sont modestes, le coût d'acquisition pèse : un devis non relancé est une perte sèche, "
               "alors qu'une relance organisée coûte quelques minutes."),
              ("Combien d'établissements de courtage à Montpellier ?",
               "233 établissements (NAF 66.22Z) dans notre extraction du 19/09/2026, pour 310 240 habitants.")]),
    dict(slug='nice', nom='Nice', dept='Alpes-Maritimes', region="Provence-Alpes-Côte d'Azur", etabs=505, pop=357737,
         dens=14.1,
         angle="Nice affiche une densité très élevée (14,1 pour 10 000 habitants) avec une clientèle marquée par la "
               "part des retraités et des résidents secondaires : beaucoup de dossiers, beaucoup de propriétaires, "
               "et des clients souvent absents une partie de l'année.",
         enjeux=["Des clients difficiles à joindre à certaines périodes : la trace des échanges devient essentielle.",
                 "Des biens immobiliers multiples (résidence principale et secondaire) à couvrir.",
                 "Une proportion importante de clients seniors, avec des questions de prévoyance et de transmission."],
                  tableau_local=[["Clients absents une partie de l'année", 'Chaque demande et chaque réponse est tracée dans le dossier'], ['Résidence principale et secondaire', 'Les biens couverts sont rattachés au même client, sans confusion'], ['Clientèle senior', "Suivi des échéances et des questions de transmission, sans perte d'historique"], ['Volume de dossiers élevé', 'Recherche rapide et listes de travail quotidiennes']],
         dossiers=["Un client à l'étranger six mois par an : à son retour, le dossier doit dire où on en était", 'Un couple propriétaire de deux logements : les deux doivent être couverts sans doublon', "Un client de 70 ans qui souhaite revoir sa prévoyance : l'historique doit être complet"],
faq=[("Comment suivre des clients absents une partie de l'année ?",
               "En consignant chaque échange et chaque demande dans le dossier : à la reprise du contact, le cabinet "
               "sait exactement où en était le dossier."),
              ("Combien d'établissements de courtage à Nice ?",
               "505 établissements (NAF 66.22Z) dans notre extraction du 19/09/2026, pour 357 737 habitants.")]),
]

# villes suisses : structure de marche, sans chiffre invente
VILLES_CH = [
    dict(slug='nyon', nom='Nyon', canton='Vaud', angle="Nyon est marquée par la proximité immédiate de Genève et par "
         "une population largement frontalière : un cabinet y suit des clients dont l'employeur, le lieu de travail et "
         "le lieu de résidence ne relèvent pas du même pays.",
         enjeux=["Des situations transfrontalières où le contrat doit correspondre à la réalité du quotidien du client.",
                 "Un tissu de PME locales et d'entreprises de services liées à l'axe Genève-Lausanne.",
                 "Des clients qui changent souvent d'employeur et donc de cadre d'assurance."],
                  tableau_local=[['Clients frontaliers', 'La situation réelle (lieu de travail, résidence, régime) est consignée dans le dossier'], ["Changements d'employeur", "Historique des modifications, sans repartir d'une feuille blanche"], ["PME de l'axe lémanique", 'Contrats et échéances rattachés au dossier entreprise'], ['Suivi à distance', 'Documents collectés par lien, échanges datés']],
         dossiers=["Un frontalier qui change d'employeur genevois : sa couverture doit être revérifiée", 'Une PME de Nyon qui engage son premier salarié : prévoyance et RC à mettre en place', 'Un client qui déménage de Genève à Nyon : le dossier doit dire ce qui a changé et quand'],
faq=[("Un cabinet de Nyon doit-il traiter différemment les frontaliers ?",
               "Oui : la couverture dépend de la situation réelle (lieu de travail, régime applicable), ce qui suppose "
               "un dossier à jour et un historique des changements de situation.")]),
    dict(slug='vevey', nom='Vevey', canton='Vaud', angle="Vevey vit au rythme de l'industrie agroalimentaire et de "
         "l'hôtellerie-restauration : les dossiers d'entreprise y côtoient des clients saisonniers, avec des besoins "
         "qui varient fortement selon la période.",
         enjeux=["Des entreprises dont l'effectif varie selon la saison, avec des contrats à ajuster.",
                 "Des clients salariés du secteur hôtelier, souvent nouveaux en Suisse.",
                 "Des échéances groupées sur les périodes de basse activité."],
                  tableau_local=[['Entreprises à effectif variable', "Contrats suivis avec les variations d'effectif, saison par saison"], ['Clients nouveaux en Suisse', "Parcours d'ouverture de dossier clair, pièces rattachées"], ['Hôtellerie et restauration', "Risques de l'exploitation consignés dans le dossier"], ['Périodes de basse activité', 'Renouvellements préparés pendant les creux, pas pendant les pics']],
         dossiers=['Un hôtel qui double son effectif en été : le contrat doit suivre la réalité', 'Un salarié qui obtient son permis et change de situation : son dossier doit être mis à jour', 'Un renouvellement à préparer en novembre : la vue des échéances doit le faire remonter'],
faq=[("Pourquoi les dossiers saisonniers demandent-ils un suivi particulier ?",
               "Parce qu'un même client peut changer de statut plusieurs fois dans l'année : sans historique, le cabinet "
               "repart de zéro à chaque contact.")]),
    dict(slug='montreux', nom='Montreux', canton='Vaud', angle="Montreux combine tourisme, événementiel et résidences "
         "secondaires : les dossiers y mêlent biens immobiliers de valeur, exploitation d'hébergements et clientèle "
         "internationale absente une partie de l'année.",
         enjeux=["Des biens et des activités à couvrir sur plusieurs sites.",
                 "Des clients joignables par intermittence, ce qui exige une trace écrite des échanges.",
                 "Des entreprises événementielles dont les besoins varient d'un événement à l'autre."],
                  tableau_local=[["Propriétaires absents une partie de l'année", 'Historique des échanges pour reprendre le fil au bon moment'], ['Biens et activités sur plusieurs sites', 'Un client, plusieurs objets couverts, sans confusion'], ['Entreprises événementielles', 'Besoins consignés événement par événement'], ['Clientèle internationale', 'Documents rattachés au dossier, accessibles à tout moment']],
         dossiers=["Un propriétaire résidant à l'étranger : le dossier doit permettre de reprendre sans rappeler l'historique", "Un organisateur d'événements : chaque édition doit laisser une trace exploitable", 'Deux biens à Montreux et un à Lausanne : les couvertures doivent rester distinctes'],
faq=[("Comment gérer des clients présents seulement une partie de l'année ?",
               "En documentant chaque demande et chaque réponse dans le dossier, pour que la reprise du contact se "
               "fasse sans dépendre de la mémoire d'un collaborateur.")]),
    dict(slug='sion', nom='Sion', canton='Valais', angle="Sion est le centre administratif et économique d'un canton "
         "où dominent les PME, le tourisme et la construction : un cabinet valaisan suit des entreprises dont "
         "l'activité est saisonnière et géographiquement dispersée.",
         enjeux=["Des chantiers et des sites multiples, avec des risques à couvrir localement.",
                 "Des entreprises familiales dont la transmission soulève des questions de prévoyance.",
                 "Des distances importantes entre clients : le suivi à distance devient la norme."],
                  tableau_local=[['Chantiers dispersés', 'Un client, plusieurs sites, un seul historique de dossier'], ['Activités saisonnières', "Besoins réévalués au rythme de l'exploitation, tracés dans l'outil"], ['Entreprises familiales', 'Suivi dans la durée, y compris les questions de transmission'], ['Clients éloignés', 'Documents collectés à distance, rendez-vous consignés']],
         dossiers=['Une entreprise de construction avec trois chantiers : les risques doivent être suivis site par site', 'Une exploitation touristique qui ferme en intersaison : les échéances doivent être anticipées', "Un gérant qui prépare la reprise par son fils : l'historique du dossier devient la base du conseil"],
faq=[("Un cabinet valaisan peut-il suivre ses clients sans se déplacer ?",
               "Les échanges et les pièces peuvent se suivre à distance ; le déplacement reste utile pour la relation, "
               "pas pour l'administration du dossier.")]),
    dict(slug='neuchatel', nom='Neuchâtel', canton='Neuchâtel', angle="Neuchâtel est un canton industriel : horlogerie, "
         "microtechnique et sous-traitance. Les cabinets y suivent des entreprises avec des contrats de choses, de "
         "responsabilité et de prévoyance liés à des activités précises.",
         enjeux=["Des activités techniques dont les risques changent avec les procédés et les marchés.",
                 "Des clients qui sous-traitent et doivent pouvoir justifier leurs couvertures.",
                 "Une prévoyance professionnelle à suivre dans la durée."],
                  tableau_local=[['Activités techniques', "Risques consignés avec l'évolution des procédés et des marchés"], ['Sous-traitance', 'Couvertures justifiables, documents rattachés au dossier'], ['Prévoyance professionnelle', 'Suivi des contrats dans la durée, avec les échéances'], ['Clients qui changent de marché', 'Historique exploitable pour réévaluer le besoin']],
         dossiers=['Une société horlogère qui automatise une ligne : ses risques changent', "Un sous-traitant qui doit prouver sa couverture à un donneur d'ordre", "Un cadre qui approche de la retraite : prévoyance à réexaminer avec l'historique du dossier"],
faq=[("Pourquoi les dossiers industriels demandent-ils un historique ?",
               "Parce que les risques évoluent avec l'activité : sans mémoire du dossier, l'évaluation du besoin "
               "repart d'une feuille blanche à chaque rendez-vous.")]),
    dict(slug='fribourg', nom='Fribourg', canton='Fribourg', angle="Fribourg est un canton bilingue, avec un tissu "
         "d'agriculture, d'agroalimentaire et de PME : un cabinet y travaille avec des clients francophones et "
         "germanophones, et parfois les deux dans la même famille.",
         enjeux=["Des dossiers à cheval sur deux langues de correspondance.",
                 "Des exploitations et des entreprises familiales, avec des questions de succession.",
                 "Des clients répartis entre zones rurales et agglomérations."],
                  tableau_local=[['Clients francophones et germanophones', 'Contenu libre, dossier lisible par tout collaborateur'], ['Entreprises familiales', 'Suivi des transmissions et des changements de génération'], ['Zones rurales et agglomérations', 'Portefeuille segmenté, relances organisées selon la proximité'], ['Exploitations agricoles', "Contrats liés à l'exploitation et à ses évolutions"]],
         dossiers=['Une exploitation qui se diversifie : les risques ne sont plus les mêmes', "Une reprise d'entreprise familiale : tout l'historique doit être disponible", 'Un client germanophone repris par un collègue francophone : le dossier doit rester exploitable'],
faq=[("Le bilinguisme change-t-il le suivi des dossiers ?",
               "Le contenu des messages reste libre ; ce qui compte est que le dossier soit compréhensible par tout "
               "collaborateur qui le reprend, quelle que soit la langue d'origine.")]),
    dict(slug='vaud', nom='Canton de Vaud', canton='Vaud', kind='canton',
         angle="Le canton de Vaud associe une métropole (Lausanne), un axe lémanique dense (Nyon, Vevey, Montreux) et "
               "des zones plus rurales. Un cabinet vaudois n'a pas le même portefeuille selon son implantation, mais "
               "il affronte partout la même question : comment tenir un suivi homogène sur des clients très différents.",
         enjeux=["Des portefeuilles hétérogènes selon la zone d'implantation.",
                 "Une pression concurrentielle forte sur l'arc lémanique.",
                 "Une exigence de traçabilité identique pour tous les dossiers, quelle que soit leur taille."],
                  tableau_local=[['Portefeuilles hétérogènes', 'Même méthode de dossier pour tous les clients, quelle que soit la zone'], ['Arc lémanique concurrentiel', 'Réactivité et suivi documenté comme arguments de fidélisation'], ['Exigence de traçabilité uniforme', 'Historique, pièces et décisions disponibles par dossier'], ['Plusieurs collaborateurs', 'Rôles et cloisonnement par cabinet']],
         dossiers=['Un cabinet qui ouvre une seconde implantation : les dossiers doivent rester accessibles aux deux équipes', 'Un client vaudois suivi depuis Lausanne qui déménage à Nyon : le dossier ne doit pas être recréé', "Une revue de portefeuille annuelle : les échéances doivent être visibles à l'avance"],
faq=[("Un cabinet vaudois doit-il adapter ses procédures par zone ?",
               "Les procédures peuvent rester communes (dossier, échéances, pièces) ; c'est la composition du "
               "portefeuille qui change, pas la méthode.")]),
    dict(slug='valais', nom='Canton du Valais', canton='Valais', kind='canton',
         angle="Le Valais combine tourisme de montagne, construction et PME. Les dossiers y sont marqués par la "
               "saisonnalité et par la dispersion géographique : beaucoup de clients, peu de proximité, et des "
               "périodes où l'activité se concentre.",
         enjeux=["Des activités saisonnières dont les couvertures doivent suivre la réalité de l'exploitation.",
                 "Des déplacements coûteux en temps : le suivi à distance devient un gain direct.",
                 "Des entreprises familiales avec des enjeux de transmission."],
                  tableau_local=[['Activités saisonnières', 'Besoins réévalués saison par saison, avec trace des décisions'], ['Dispersion géographique', 'Suivi à distance : documents par lien, relances tracées'], ['Construction et tourisme', "Risques d'exploitation consignés par client"], ['Entreprises familiales', 'Historique dans la durée, y compris les transmissions']],
         dossiers=["Une station qui prépare sa saison d'hiver en octobre : les couvertures doivent être prêtes avant l'ouverture", 'Une PME du bâtiment avec deux sites en vallée : un dossier, deux implantations', 'Un client qui vend son exploitation : les contrats à résilier doivent être identifiés'],
faq=[("Pourquoi la saisonnalité complique-t-elle le suivi valaisan ?",
               "Parce que les besoins des clients touristiques et de la construction se réévaluent à chaque saison : "
               "sans vue consolidée des échéances, le cabinet court après les dates.")]),
    dict(slug='suisse-romande', nom='Suisse romande', canton='Romandie', kind='romandie',
         angle="La Suisse romande réunit six cantons francophones (Genève, Vaud, Valais, Neuchâtel, Fribourg, Jura) "
               "aux structures économiques différentes. Les cabinets qui y opèrent partagent une contrainte commune : "
               "le vocabulaire et les repères ne sont pas ceux du marché français voisin.",
         enjeux=["Un cadre propre : loi sur le contrat d'assurance, surveillance prudentielle, protection des données.",
                 "Des marchés locaux très différents d'un canton à l'autre.",
                 "Des cabinets souvent de petite taille, où chaque collaborateur porte plusieurs rôles."],
                  tableau_local=[['Six cantons, six réalités', 'Un dossier client par personne, avec sa situation et ses contrats'], ['Vocabulaire suisse', 'Contrats, échéances et repères consignés selon le marché local'], ['Petites structures', 'Une méthode unique, applicable sans informaticien'], ['Suivi à distance', 'Documents collectés par lien, échanges horodatés']],
         dossiers=["Un cabinet qui suit des clients dans deux cantons : la même méthode doit s'appliquer partout", "Un client qui passe d'un canton à l'autre : l'historique doit suivre", "Un nouveau collaborateur qui reprend un portefeuille : tout doit être dans l'outil"],
faq=[("Un cabinet français qui s'installe en Suisse romande doit-il changer d'outil ?",
               "Il doit surtout changer de repères : le vocabulaire, les échéances et les obligations d'information "
               "diffèrent. L'outil doit permettre de consigner ces éléments par dossier.")]),
]


def _bloc_marche(chiffres_html, enjeux, angle):
    return (section("Le marché local", p(angle) + chiffres_html)
            + section("Ce que cela change pour l'organisation du cabinet", ul(enjeux)))


def pages_villes():
    P = []
    for v in VILLES_FR:
        chiffres = (p(f"<b>{v['nom']}</b> : {v['etabs']:,} établissements de courtage d'assurances recensés, "
                      f"{v['pop']:,} habitants, soit <b>{str(v['dens']).replace('.', ',')} établissements pour 10 000 "
                      f"habitants</b> (département : {v['dept']}, région : {v['region']}).").replace(',', ' ')
                    + p(SIRENE))
        P.append(dict(
            path=f"/france/{v['slug']}", type='geo', country='FR', zone=v['nom'], indexable=True,
            title=f"Logiciel courtier assurance à {v['nom']} | CRM pour cabinets | COURTIARK",
            description=f"COURTIARK à {v['nom']} : CRM et cockpit IA pour cabinets de courtage en assurance. "
                        f"Portefeuille, contrats, relances, documents. {v['etabs']} établissements de courtage dans la commune. Essai 7 jours.",
            h1=f"Logiciel de courtage assurance à {v['nom']}",
            chapeau=f"Un cabinet de courtage à {v['nom']} tient son portefeuille avec des dossiers dispersés : "
                    f"contrats, échéances, pièces et relances. COURTIARK réunit ce suivi dans un seul outil.",
            fil=[("France", "/france"), (v['nom'], None)],
            corps=_bloc_marche(chiffres, v['enjeux'], v['angle'])
            + section("Ce que cela implique concrètement dans l'outil", tableau(["Situation locale", "Réponse de COURTIARK"], v['tableau_local']))
            + section("Cas concrets dans un cabinet à " + v['nom'], ul([f"<b>Exemple {i+1}</b> — {d}" for i, d in enumerate(v['dossiers'])]))
            + section("Cadre français",
                      p("Le cabinet agit comme intermédiaire d'assurance : immatriculation au registre unique (ORIAS), "
                        "devoir de conseil et information précontractuelle (DDA), protection des données (RGPD). "
                        "Les repères détaillés et leurs sources sont sur la page "
                        '<a href="/france">COURTIARK en France</a>.'))
            + section("Démarrer",
                      p("Essai de 7 jours, sans carte bancaire. France : Starter 89 € HT/mois, Pro 159 € HT/mois. "
                        "Un import permet de repartir d'un fichier existant plutôt que de ressaisir les dossiers.")),
            faq=v['faq'] + [("COURTIARK est-il utilisé par des cabinets à " + v['nom'] + " ?",
                             "Nous ne publions pas de nombre de cabinets par ville : ce chiffre évolue et nous ne "
                             "communiquons pas de donnée que nous ne pouvons pas vérifier publiquement.")],
            lire=[("Le CRM courtier assurance", "/crm-courtier-assurance"),
                  ("Gestion de portefeuille", "/fonctionnalites/gestion-portefeuille-assurance"),
                  ("Relance de devis", "/fonctionnalites/relance-devis-assurance"),
                  ("Densité du courtage en France", "/fr/densite-courtage-grandes-villes-france"),
                  ("COURTIARK en France", "/france")],
        ))
    for v in VILLES_CH:
        nom = v['nom']
        P.append(dict(
            path=f"/suisse/{v['slug']}", type='geo', country='CH', zone=nom, indexable=True,
            title=f"Logiciel courtier assurance {nom} | CRM pour cabinets | COURTIARK",
            description=f"COURTIARK à {nom} ({v['canton']}) : CRM et cockpit IA pour intermédiaires d'assurance. "
                        f"Portefeuille, contrats, échéances, documents, commissions. Facturation CHF, essai 7 jours.",
            h1=f"Logiciel de courtage assurance à {nom}",
            chapeau=f"Un cabinet d'intermédiation d'assurance à {nom} doit suivre des dossiers dont les besoins "
                    f"changent avec l'activité et la saison. COURTIARK organise ce suivi et le rend partageable.",
            fil=[("Suisse", "/suisse"), (nom, None)],
            corps=_bloc_marche('', v['enjeux'], v['angle'])
            + section("Ce que cela implique concrètement dans l'outil", tableau(["Situation locale", "Réponse de COURTIARK"], v['tableau_local']))
            + section("Cas concrets dans un cabinet à " + nom, ul([f"<b>Exemple {i+1}</b> — {d}" for i, d in enumerate(v['dossiers'])]))
            + section("Cadre suisse",
                      p("L'activité relève de la loi sur le contrat d'assurance et, selon le statut de l'intermédiaire, "
                        "d'exigences d'inscription et d'information sous surveillance prudentielle. Les repères et leurs "
                        'sources sont sur la page <a href="/suisse">COURTIARK en Suisse</a>.'))
            + section("Démarrer en Suisse romande",
                      p("Essai de 7 jours sans carte bancaire. Facturation en francs suisses : Indépendant 199 CHF HT/mois, "
                        "Cabinet 349 CHF HT/mois.")),
            faq=v['faq'] + [("Le produit est-il disponible en allemand ?",
                             "Non : l'interface et les pages publiques sont en français. Nous ne l'annonçons donc pas "
                             "comme disponible en Suisse alémanique.")],
            lire=[("COURTIARK en Suisse", "/suisse"), ("CRM courtier assurance en Suisse", "/suisse/crm-courtier-assurance"),
                  ("Genève", "/suisse/geneve"), ("Lausanne", "/suisse/lausanne"),
                  ("Suisse romande", "/suisse/suisse-romande")],
        ))
    return P
