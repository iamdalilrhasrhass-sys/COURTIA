#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contenu : géographie (France, Suisse, Genève, Lausanne), solutions, branches d'assurance.

Sources réglementaires citées sur les pages concernées :
- France : orias.fr (registre unique des intermédiaires), legifrance.gouv.fr (Code des assurances,
  Code des relations entre le public et l'administration), cnil.fr (RGPD).
- Suisse : finma.ch (surveillance et registre des intermédiaires), fedlex.admin.ch (LSA, LPD),
  admin.ch (droit des assurances).
Aucun chiffre de performance, aucun témoignage, aucune donnée client.
"""
from contenu_core import section, ul, p, tableau, etapes, bascule

SRC_FR = ('<p class="note">Sources consultées : <a href="https://www.orias.fr/" rel="nofollow noopener" target="_blank">orias.fr</a> '
          '(registre unique des intermédiaires en assurance) · <a href="https://www.legifrance.gouv.fr/" rel="nofollow noopener" target="_blank">legifrance.gouv.fr</a> '
          '(Code des assurances) · <a href="https://www.cnil.fr/" rel="nofollow noopener" target="_blank">cnil.fr</a> (RGPD). '
          'Ces repères sont documentaires et ne constituent pas un conseil juridique.</p>')
SRC_CH = ('<p class="note">Sources consultées : <a href="https://www.finma.ch/fr/" rel="nofollow noopener" target="_blank">finma.ch</a> '
          '(surveillance et intermédiaires d\'assurance) · <a href="https://www.fedlex.admin.ch/fr/cc/internal-law" rel="nofollow noopener" target="_blank">fedlex.admin.ch</a> '
          '(loi sur le contrat d\'assurance, protection des données) · <a href="https://www.admin.ch/opc/fr/" rel="nofollow noopener" target="_blank">admin.ch</a>. '
          'Ces repères sont documentaires et ne constituent pas un conseil juridique.</p>')


def pages_geo():
    P = []

    # ---------------------------------------------------------------- HUB FRANCE
    P.append(dict(
        path='/france/', type='geo', country='FR', zone='France', indexable=True,
        title="COURTIARK en France — CRM pour courtiers en assurance | COURTIARK",
        description="COURTIARK en France : CRM et cockpit IA pour courtiers et intermédiaires en assurance. Repères DDA, ORIAS, RGPD, facturation en euros. Essai 7 jours.",
        h1="COURTIARK en France",
        chapeau="Un CRM fait pour les courtiers et intermédiaires d'assurance immatriculés en France : "
                "portefeuille, contrats, devis, documents, relances et commissions, avec les repères du cadre français.",
        fil=[("France", None)],
        corps=''.join([
            section("Ce que le marché français impose au suivi",
                    ul(["La loi impose au distributeur d'assurance un devoir de conseil documenté et une information précontractuelle claire (DDA).",
                        "L'activité d'intermédiaire suppose une immatriculation au registre unique (ORIAS).",
                        "Les données clients relèvent du RGPD, avec des exclusions fortes pour les données de santé."])
                    + SRC_FR),
            section("Ce que COURTIARK apporte",
                    tableau(["Besoin français", "Réponse COURTIARK"],
                            [["Devoir de conseil", "La fiche client, l'historique et les documents restent attachés au dossier, ce qui rend l'instruction défendable."],
                             ["Suivi des renouvellements", "Les échéances sont visibles en amont, avant l'avis de l'assureur."],
                             ["Pièces justificatives", "Collecte par lien, classée dans le dossier."],
                             ["Commisions et rétrocessions", "Suivi par dossier, avec un calculateur d'appoint."],
                             ["Prospection encadrée", "Séquences suivies, oppositions gérées, trace des contacts."]])),
            section("Prix en France",
                    tableau(["Offre", "Prix", "Cible"],
                            [["Starter", "89 € HT/mois", "Courtier indépendant qui organise son portefeuille."],
                             ["Pro", "159 € HT/mois", "Cabinet avec plusieurs collaborateurs."],
                             ["Cabinet", "Sur devis", "Volumes et besoins spécifiques, reprise de données."]])
                    + p("Essai de 7 jours sans carte bancaire. À l'expiration, aucune donnée n'est supprimée : "
                        "le compte reste consultable, les écritures sont suspendues.")),
            section("Villes et régions",
                    p("Les pages locales et régionales sont publiées progressivement, uniquement lorsqu'elles apportent "
                      "un contenu propre à la zone. Aucune page de ville vide n'est mise en ligne.")
                    + ul(['<a href="/suisse/geneve">Genève</a> et <a href="/suisse/lausanne">Lausanne</a> pour la Suisse romande.',
                          'Les agglomérations françaises seront publiées par vagues, avec un contenu local réel.'])),
            section("Et la Suisse ?",
                    p('Le marché suisse est traité séparément, avec son vocabulaire et ses repères : '
                      '<a href="/suisse/">COURTIARK en Suisse</a>.')),
        ]),
        faq=[("COURTIARK est-il immatriculé ORIAS ?",
              "ORIAS est le registre des intermédiaires d'assurance : il concerne votre activité de courtage, pas l'éditeur du logiciel. COURTIARK est un outil de gestion, il n'exerce pas d'activité d'intermédiation."),
             ("Les mentions réglementaires françaises sont-elles intégrées au produit ?",
              "Le produit intègre les repères de suivi (devoir de conseil, pièces attendues, informations à conserver). Il ne se substitue ni à votre analyse ni à un audit de conformité."),
             ("Puis-je facturer des dossiers hors France ?",
              "Le suivi d'un dossier est indépendant du marché de facturation du cabinet ; la facturation de COURTIARK existe en euros (France) et en francs suisses (Suisse).")],
        lire=[("CRM courtier assurance", "/crm-courtier-assurance"), ("Suisse", "/suisse/"),
              ("Guide : devoir de conseil et suivi", "/guides/devoir-de-conseil-suivi-dossier")]))

    # ---------------------------------------------------------------- HUB SUISSE
    P.append(dict(
        path='/suisse/', type='geo', country='CH', zone='Suisse', indexable=True,
        title="COURTIARK en Suisse — CRM pour intermédiaires d'assurance | COURTIARK",
        description="COURTIARK en Suisse romande : CRM et cockpit IA pour intermédiaires d'assurance. Repères LSA, surveillance FINMA, protection des données (LPD). Facturation en CHF.",
        h1="COURTIARK en Suisse",
        chapeau="Un outil de gestion conçu aussi pour le marché suisse : portefeuille, contrats, échéances, "
                "documents et commissions, avec les repères de la LSA et de la protection des données en Suisse.",
        fil=[("Suisse", None)],
        corps=''.join([
            section("Ce qui distingue le marché suisse",
                    ul(["L'activité d'intermédiaire d'assurance est encadrée par la loi sur le contrat d'assurance (LSA) ; selon son statut, l'intermédiaire doit satisfaire aux exigences et figurer le cas échéant au registre des intermédiaires d'assurance.",
                        "La surveillance prudentielle relève de la FINMA ; le registre public des intermédiaires permet de vérifier un statut.",
                        "La protection des données répond à un cadre fédéral propre, avec des exigences de transparence sur le traitement.",
                        "Le marché mêle assurance maladie (LAMal), assurance-vie et prévoyance (LPP, 3e pilier) et assurances de choses pour les entreprises."])
                    + SRC_CH),
            section("Ce que COURTIARK apporte à un cabinet suisse",
                    tableau(["Besoin suisse", "Réponse COURTIARK"],
                            [["Portefeuille pluriannuel", "Contrats et échéances, avec un suivi qui ne dépend pas d'un tableur."],
                             ["Clientèle entreprises (PME)", "Fiches clients entreprises et particuliers, avec tags et historique."],
                             ["Pièces et documents", "Collecte par lien, classement dans le dossier, lecture assistée par ARK."],
                             ["Prévoyance et risque", "Suivi des dossiers et des échéances, sans promesse de tarification."],
                             ["Protection des données", "Cloisonnement par cabinet, accès limité aux utilisateurs du cabinet."]])),
            section("Facturation en francs suisses",
                    tableau(["Offre (Suisse)", "Prix", "Cible"],
                            [["Indépendant", "199 CHF HT/mois", "Intermédiaire seul, portefeuille à organiser."],
                             ["Cabinet", "349 CHF HT/mois", "Cabinet avec plusieurs collaborateurs."],
                             ["Sur devis", "Sur devis", "Structures et volumes spécifiques."]])
                    + p("Essai de 7 jours sans carte bancaire.")),
            section("Suisse romande : Genève, Vaud, Valais, Neuchâtel, Fribourg",
                    ul(['<a href="/suisse/geneve">COURTIARK à Genève</a>',
                        '<a href="/suisse/lausanne">COURTIARK à Lausanne</a>',
                        'Le reste de la Romandie (Nyon, Vevey, Montreux, Sion, Neuchâtel, Fribourg) sera publié par vagues, avec un contenu propre à chaque zone.'])
                    + p("Les régions alémaniques et italophones sont documentées dans notre analyse, mais aucune page "
                        "n'est promise sans contenu vérifié.")),
            section("Voir la version suisse du CRM",
                    p('La page <a href="/suisse/crm-courtier-assurance">CRM courtier assurance en Suisse</a> détaille '
                      'le suivi, le vocabulaire et les repères.')),
        ]),
        faq=[("COURTIARK remplace-t-il l'inscription au registre des intermédiaires ?",
              "Non. L'inscription et le respect des exigences de la LSA relèvent de votre activité ; COURTIARK est un outil de gestion interne."),
             ("Le produit est-il disponible en allemand ?",
              "L'interface et les pages publiques sont en français aujourd'hui. La Suisse alémanique n'est pas encore servie dans sa langue : nous ne l'annonçons donc pas comme disponible."),
             ("Comment sont facturés les cabinets suisses ?",
              "En francs suisses, hors taxes, avec une offre Indépendant à 199 CHF et une offre Cabinet à 349 CHF par mois.")],
        lire=[("CRM courtier assurance en Suisse", "/suisse/crm-courtier-assurance"), ("Genève", "/suisse/geneve"),
              ("Lausanne", "/suisse/lausanne"), ("France", "/france/")]))

    # ---------------------------------------------------------------- CH MONEY
    P.append(dict(
        path='/suisse/crm-courtier-assurance', type='money', country='CH', indexable=True,
        title="CRM courtier assurance Suisse : portefeuille et suivi | COURTIARK",
        description="CRM pour courtiers en assurance en Suisse : clients, contrats, échéances, documents, commissions et repères LSA. Facturation en CHF, essai 7 jours.",
        h1="CRM courtier assurance en Suisse",
        chapeau="COURTIARK organise le suivi d'un cabinet d'intermédiation d'assurance en Suisse : le client, ses "
                "contrats, leurs échéances, ses documents et les actions à mener, dans un seul outil.",
        fil=[("Suisse", "/suisse/"), ("CRM courtier assurance", None)],
        alternate='/crm-courtier-assurance',
        corps=''.join([
            section("Le vocabulaire du marché suisse",
                    tableau(["Objet", "Terme et pratique en Suisse"],
                            [["Votre activité", "Intermédiaire d'assurance au sens de la LSA ; le statut (lié ou non lié à un assureur) détermine les exigences applicables."],
                             ["Votre client particulier", "Assurances de personnes (maladie selon la LAMal, accident, vie) et assurances de choses (ménage, véhicule)."],
                             ["Votre client entreprise", "Assurances d'entreprise, responsabilité civile, choses et patrimoine, prévoyance professionnelle (LPP)."],
                             ["Vos revenus", "Commissions et rétrocessions ; la transparence sur celles-ci relève de vos obligations."]])),
            section("Ce que le cabinet suit au quotidien",
                    etapes([("Brief du matin", "Ce qui a bougé et ce qu'il faut traiter aujourd'hui."),
                            ("Portefeuille", "Contrats, échéances proches, dossiers incomplets, contrats qui décrochent."),
                            ("Dossiers", "Fiche client, contrats, documents, historique des échanges."),
                            ("Commercial", "Devis en cours, relances à faire, opportunités, prospection.")]),
                    ),
            section("Repères suisses dans le produit",
                    ul(["Suivi des dossiers sans dépendre d'un tableur ni d'une mémoire individuelle.",
                        "Documents déposés par le client via un lien, rattachés au bon dossier.",
                        "Cloisonnement des données par cabinet, vérifié par des tests d'isolation en production.",
                        "Aucune donnée client revendue ni utilisée pour un autre cabinet."])
                    + SRC_CH),
            section("Prix en Suisse",
                    tableau(["Offre", "Prix", "Cible"],
                            [["Indépendant", "199 CHF HT/mois", "Intermédiaire seul."],
                             ["Cabinet", "349 CHF HT/mois", "Cabinet avec plusieurs collaborateurs."],
                             ["Sur devis", "Sur devis", "Besoins spécifiques, reprise de données."]])
                    + p("Essai 7 jours sans carte bancaire. À l'expiration, les données restent consultables.")),
        ]),
        faq=[("COURTIARK gère-t-il les assurances de personnes et de choses ?",
              "Oui : le suivi est organisé par client et par contrat, quelle que soit la branche (personnes, choses, prévoyance)."),
             ("Le produit est-il conforme à la LSA ?",
              "COURTIARK n'est pas un prestataire soumis à la LSA : c'est un logiciel de gestion. Il vous aide à documenter votre suivi ; il ne se substitue pas à vos obligations d'intermédiaire."),
             ("Puis-je travailler en francs suisses ?",
              "Oui, la facturation de COURTIARK existe en CHF (199 et 349 CHF HT par mois)."),
             ("Mes données restent-elles en Suisse ?",
              "L'hébergement et les sous-traitants utilisés sont documentés sur la page Sécurité et dans la page Sous-traitants ; nous n'affirmons pas une localisation que nous ne pouvons pas prouver.")],
        lire=[("COURTIARK en Suisse", "/suisse/"), ("Genève", "/suisse/geneve"), ("Lausanne", "/suisse/lausanne"),
              ("CRM courtier assurance (France)", "/crm-courtier-assurance")]))

    # ---------------------------------------------------------------- GENEVE
    P.append(dict(
        path='/suisse/geneve', type='geo', country='CH', zone='Genève', indexable=True,
        title="Logiciel courtier assurance Genève | CRM pour cabinets genevois | COURTIARK",
        description="COURTIARK à Genève : CRM pour cabinets de courtage en assurance. Portefeuille, contrats, documents, commissions, repères LSA. Facturation CHF, essai 7 jours.",
        h1="Logiciel de courtage assurance à Genève",
        chapeau="Genève combine clientèle privée exigeante et tissu d'entreprises : le suivi d'un cabinet s'y joue "
                "sur la réactivité et la traçabilité. COURTIARK organise les deux dans le même outil.",
        fil=[("Suisse", "/suisse/"), ("Genève", None)],
        corps=''.join([
            section("Le contexte genevois",
                    ul(["Concentration de cabinets de conseil financier et d'intermédiaires d'assurance, souvent avec une clientèle privée et internationale.",
                        "Tissu dense de PME, holdings et structures professionnelles qui demandent un suivi d'assurances d'entreprise.",
                        "Exigence de traçabilité forte : la relation client se documente, les pièces se conservent.",
                        "Proximité frontalière : un cabinet genevois côtoie des clients résidant en France voisine, avec deux cadres à connaître."])
                    + SRC_CH),
            section("Ce que COURTIARK change pour un cabinet genevois",
                    tableau(["Situation", "Ce que fait COURTIARK"],
                            [["Portefeuille privé et entreprises", "Fiches clients avec tags et historique, contrats et échéances au même endroit."],
                             ["Pièces à collecter", "Lien de dépôt client, sans création de compte."],
                             ["Suivi des échéances", "Vue portefeuille et brief du matin."],
                             ["Commissions", "Suivi par dossier, avec calculateur d'appoint."],
                             ["Prospection", "Recherche de prospects et séquences suivies."]])),
            section("Travailler avec des clients en France voisine",
                    p("Un même cabinet peut suivre des clients résidant en Suisse et en France. Le vocabulaire et les "
                      "repères diffèrent (LSA côté suisse, DDA et ORIAS côté français) : le suivi du dossier reste "
                      "commun, les informations conservées s'adaptent au marché du client.")),
            section("Démarrer à Genève",
                    p("Essai de 7 jours sans carte bancaire, facturation en CHF (199 CHF HT/mois pour un indépendant, "
                      "349 CHF HT/mois pour un cabinet). Un import permet de repartir d'un portefeuille existant.")),
        ]),
        faq=[("Faut-il être inscrit au registre des intermédiaires pour utiliser COURTIARK ?",
              "COURTIARK est un outil de gestion : il ne conditionne pas votre statut. C'est votre activité d'intermédiaire qui détermine vos obligations d'inscription."),
             ("Le cabinet peut-il suivre des clients en France ?",
              "Oui, le suivi reste commun ; les repères réglementaires à consigner diffèrent selon le marché du client."),
             ("Proposez-vous un accompagnement sur place à Genève ?",
              "La prise en main se fait à distance. Nous ne promettons pas de présence physique, ce serait faux.")],
        lire=[("COURTIARK en Suisse", "/suisse/"), ("Lausanne", "/suisse/lausanne"),
              ("CRM courtier assurance en Suisse", "/suisse/crm-courtier-assurance")]))

    # ---------------------------------------------------------------- LAUSANNE
    P.append(dict(
        path='/suisse/lausanne', type='geo', country='CH', zone='Lausanne', indexable=True,
        title="Logiciel courtier assurance Lausanne | CRM pour cabinets vaudois | COURTIARK",
        description="COURTIARK à Lausanne : CRM et cockpit IA pour cabinets de courtage en assurance du canton de Vaud. Portefeuille, échéances, documents, commissions. Essai 7 jours.",
        h1="Logiciel de courtage assurance à Lausanne",
        chapeau="Le canton de Vaud mêle clientèle privée, PME et institutions : un cabinet doit tenir un portefeuille "
                "large avec une petite équipe. COURTIARK est fait pour ce rapport entre volume et temps disponible.",
        fil=[("Suisse", "/suisse/"), ("Lausanne", None)],
        corps=''.join([
            section("Le contexte vaudois",
                    ul(["Densité de PME et de professions libérales : assurances de choses, RC et prévoyance.",
                        "Clientèle privée attentive au suivi et aux échéances.",
                        "Cabinets de petite taille où chaque collaborateur porte plusieurs rôles.",
                        "Recherche de productivité : moins de saisie, moins de relances oubliées."])
                    + SRC_CH),
            section("Ce que COURTIARK apporte dans une petite équipe",
                    ul(["Un portefeuille lisible sans recourir à un tableur.",
                        "Les dossiers incomplets remontent d'eux-mêmes.",
                        "Les relances sont rattachées au dossier au lieu de dépendre de la mémoire.",
                        "ARK prépare (lecture de document, synthèse), le courtier valide."])),
            section("Productivité : ce qui est mesurable, et ce qui ne l'est pas",
                    p("Nous n'annonçons pas de pourcentage de temps gagné : nous ne disposons pas de mesure "
                      "représentative. En revanche, l'outil rend observable ce qui était invisible — nombre de "
                      "dossiers bloqués, devis sans suite, pièces manquantes — et c'est là que le cabinet agit.")
                    + '<p><a href="/outils/calculateur-productivite-courtier">Estimer le temps administratif de votre cabinet</a></p>'),
            section("Démarrer dans le canton de Vaud",
                    p("Essai 7 jours sans carte bancaire, facturation en CHF. Import d'un portefeuille existant possible.")),
        ]),
        faq=[("COURTIARK convient-il à un cabinet d'une seule personne ?",
              "Oui : l'offre Indépendant (199 CHF HT/mois) vise précisément ce cas, et l'outil évite de dépendre d'un tableur."),
             ("Mes données Vaud sont-elles cloisonnées ?",
              "Oui : chaque cabinet ne voit que ses propres dossiers, ce qui est vérifié par des tests d'isolation exécutés en production."),
             ("Puis-je gérer plusieurs langues de correspondance ?",
              "Le contenu des messages est libre : vous rédigez dans la langue de votre client.")],
        lire=[("COURTIARK en Suisse", "/suisse/"), ("Genève", "/suisse/geneve"),
              ("Gestion de portefeuille", "/fonctionnalites/gestion-portefeuille-assurance")]))

    # ---------------------------------------------------------------- SOLUTIONS
    P.append(dict(
        path='/solutions/', type='hub', country='FR', indexable=True,
        title="Solutions par type de cabinet de courtage | COURTIARK",
        description="COURTIARK selon votre structure : courtier indépendant, cabinet de courtage, équipe commerciale ou réseau. Le même socle, des usages différents.",
        h1="Solutions selon votre structure",
        chapeau="Le même socle produit, des usages différents : un courtier seul n'organise pas son suivi comme un "
                "cabinet de dix personnes ni comme une équipe commerciale.",
        fil=[("Solutions", None)],
        corps=''.join([
            section("Choisir selon votre situation",
                    ul(['<a href="/solutions/courtier-assurance-independant">Courtier indépendant</a> — une personne, tout le portefeuille à porter.',
                        '<a href="/solutions/cabinet-courtage-assurance">Cabinet de courtage</a> — plusieurs collaborateurs, plusieurs rôles.',
                        '<a href="/solutions/equipe-commerciale-assurance">Équipe commerciale</a> — devis, relances et prospection suivis.',
                        '<a href="/solutions/reseau-courtage">Réseau de courtage</a> — plusieurs entités, un besoin de cadrage.'])),
        ]),
        faq=[],
        lire=[("Le CRM courtier assurance", "/crm-courtier-assurance"), ("Fonctionnalités", "/fonctionnalites/")]))

    def solution(chemin, titre, description, h1, chapeau, sections, faq, lire):
        return dict(path=chemin, type='solution', country='FR', title=titre, description=description, h1=h1,
                    chapeau=chapeau, fil=[("Solutions", "/solutions/"), (h1[:44].rstrip(' :'), None)],
                    corps=''.join(sections), faq=faq, lire=lire)

    P.append(solution(
        '/solutions/courtier-assurance-independant',
        "COURTIARK pour un courtier en assurance indépendant | CRM et cockpit IA",
        "Un courtier seul n'a pas de marge administrative. COURTIARK organise portefeuille, échéances, documents et relances pour une personne.",
        "Courtier en assurance indépendant",
        "Quand on est seul, le temps passé à chercher une information est du temps commercial perdu. COURTIARK "
        "supprime cette recherche et rend visibles les actions à mener.",
        [section("Ce qui coince quand on est seul",
                 ul(["Le portefeuille vit dans un tableur qui n'apprend rien.",
                     "Les documents arrivent par e-mail et se perdent.",
                     "Les échéances se découvrent au moment du renouvellement.",
                     "Les devis anciens dorment sans que personne ne les relance."])),
         section("Ce que COURTIARK fait pour un indépendant",
                 ul(["Une fiche client unique, avec contrats, échéances, documents et historique.",
                     "Une liste d'actions du jour, alimentée par les échéances et les dossiers incomplets.",
                     "Un lien de dépôt pour que le client envoie ses pièces lui-même.",
                     "ARK qui lit un document et prépare les informations, à valider par vous."])),
         section("Ce que ça change concrètement",
                 bascule(ul(["Rechercher dans trois outils", "Relancer au hasard", "Ressaisir les mêmes informations"]),
                         ul(["Un dossier, un endroit", "Relances rattachées au dossier", "Informations lues puis validées"]))),
         section("Le coût",
                 p("Offre Starter à 89 € HT/mois (France) ou Indépendant à 199 CHF HT/mois (Suisse), essai de 7 jours "
                   "sans carte bancaire."))],
        [("Est-ce trop lourd pour un courtier seul ?", "Non : c'est justement le cas d'usage le plus fréquent. L'essai de 7 jours permet de le vérifier sur vos propres dossiers."),
         ("Puis-je démarrer sans ressaisir mon portefeuille ?", "Oui, un import permet de partir d'un fichier existant."),
         ("Faut-il du matériel particulier ?", "Non : COURTIARK fonctionne dans un navigateur, sur ordinateur comme sur mobile.")],
        [("CRM courtier assurance", "/crm-courtier-assurance"), ("Gestion de portefeuille", "/fonctionnalites/gestion-portefeuille-assurance")]))

    P.append(solution(
        '/solutions/cabinet-courtage-assurance',
        "COURTIARK pour un cabinet de courtage assurance | Plusieurs collaborateurs",
        "Un cabinet de courtage doit rendre le suivi partageable : dossiers, devis, documents et commissions accessibles à l'équipe, sans mélange entre clients.",
        "Cabinet de courtage assurance",
        "Dès qu'il y a plusieurs collaborateurs, l'information doit survivre aux absences et aux départs. C'est le "
        "premier problème que règle COURTIARK.",
        [section("Les problèmes de structure",
                 ul(["Le dossier n'existe que dans la tête de celui qui l'a ouvert.",
                     "Deux collaborateurs relancent le même client, ou aucun.",
                     "Les commissions sont reconstituées en fin d'année.",
                     "Les pièces manquantes sont redemandées deux fois."])),
         section("Ce que COURTIARK met en place",
                 tableau(["Besoin du cabinet", "Réponse"],
                         [["Partage du suivi", "Fiche client unique : contrats, échéances, documents, historique."],
                          ["Rôles", "Plusieurs utilisateurs rattachés au cabinet, avec des rôles distincts."],
                          ["Cloisonnement", "Un cabinet ne voit que ses données, vérifié par tests d'isolation."],
                          ["Commissions", "Suivi par dossier et calculateur d'appoint."],
                          ["Pilotage", "Brief du matin, santé du portefeuille, rapports d'activité."]])),
         section("Encadrer sans alourdir",
                 p("L'outil ne remplace pas vos procédures internes : il les rend applicables, parce que l'état d'un "
                   "dossier est visible par tous au lieu d'être raconté."))],
        [("Combien d'utilisateurs puis-je rattacher ?", "Plusieurs utilisateurs peuvent être rattachés au cabinet avec des rôles distincts."),
         ("Les données sont-elles cloisonnées ?", "Oui, par cabinet, et ce cloisonnement est vérifié par des tests d'isolation exécutés sur la production."),
         ("Puis-je suivre les commissions par collaborateur ?", "Le suivi des commissions est rattaché aux dossiers et contrats.")],
        [("Le CRM courtier assurance", "/crm-courtier-assurance"), ("Reporting", "/fonctionnalites/reporting-courtier")]))

    P.append(solution(
        '/solutions/equipe-commerciale-assurance',
        "COURTIARK pour une équipe commerciale assurance | Devis et relances suivis",
        "Donnez à l'équipe une liste d'actions claire : devis en attente, relances à faire, prospects à travailler, résultats suivis.",
        "Équipe commerciale",
        "Une équipe commerciale sans liste commune travaille au ressenti. COURTIARK transforme l'activité en actions "
        "visibles et en résultats mesurables par le cabinet.",
        [section("Ce que l'équipe voit",
                 ul(["Les devis à relancer, rattachés au client et à l'étape en cours.",
                     "Les tâches et rendez-vous du jour.",
                     "Les prospects en séquence de contact et les réponses à traiter.",
                     "Les objectifs du cabinet et l'avancement."])),
         section("Ce que le responsable voit",
                 ul(["L'activité traitée : tâches et relances abouties.",
                     "Les devis gagnés et perdus.",
                     "Les commissions attendues.",
                     "Les dossiers bloqués depuis trop longtemps."])),
         section("Ce qui reste humain",
                 p("Aucun message n'est envoyé automatiquement, aucune décision commerciale n'est prise par l'outil. "
                   "Les séquences de prospection organisent les étapes ; l'envoi reste une action de l'équipe."))],
        [("Puis-je suivre l'activité par collaborateur ?", "Le cabinet rattache plusieurs utilisateurs avec des rôles distincts ; le pilotage s'appuie sur les dossiers et l'activité enregistrée."),
         ("Les relances sont-elles automatiques ?", "Non, elles sont organisées et tracées ; l'envoi reste humain."),
         ("Puis-je importer une liste de prospects ?", "Un import permet de partir d'un fichier existant, puis de suivre les étapes de contact.")],
        [("Prospection assurance", "/fonctionnalites/prospection-assurance"), ("Relance de devis", "/fonctionnalites/relance-devis-assurance")]))

    P.append(solution(
        '/solutions/reseau-courtage',
        "COURTIARK pour un réseau de courtage | Plusieurs entités, un cadre commun",
        "Un réseau a besoin d'un cadre commun sans mélanger les portefeuilles : structuration des dossiers, suivi des actions, remontée d'activité.",
        "Réseau de courtage",
        "Un réseau n'est pas un gros cabinet : c'est un ensemble d'entités qui doivent travailler de la même façon "
        "sans partager leurs clients. C'est un sujet de structure, pas de fonctionnalité.",
        [section("Ce qu'un réseau doit organiser",
                 ul(["Un vocabulaire commun pour les dossiers (contrats, échéances, documents, commissions).",
                     "Un cloisonnement strict entre entités.",
                     "Une remontée d'activité comparable d'une entité à l'autre.",
                     "Un accès des responsables sans exposition des portefeuilles."])),
         section("Ce que COURTIARK permet",
                 p("Le produit s'appuie sur des cabinets distincts, chacun avec ses utilisateurs et ses données. "
                   "Un réseau souhaitant un pilotage consolidé doit en discuter avec nous : nous ne promettons pas de "
                   "tableau de bord multi-entités qui n'existe pas aujourd'hui.")),
         section("Ce que nous ne promettons pas",
                 ul(["Pas de consolidation comptable automatique entre entités.",
                     "Pas de fédération d'identités externe annoncée sans mise en œuvre.",
                     "Pas de marque blanche non contractualisée."]))],
        [("Un réseau peut-il avoir plusieurs cabinets dans COURTIARK ?", "Oui, chaque cabinet est une entité distincte avec ses utilisateurs et son cloisonnement. Le pilotage consolidé fait l'objet d'un échange au cas par cas."),
         ("Les données des entités sont-elles séparées ?", "Oui, par cabinet."),
         ("Peut-on brancher nos outils existants ?", "Des intégrations existent côté produit ; nous ne promettons rien sans vérification de votre cas.")],
        [("Cabinet de courtage", "/solutions/cabinet-courtage-assurance"), ("Sécurité", "/securite")]))

    # ---------------------------------------------------------------- ASSURANCES
    P.append(dict(
        path='/assurances/', type='hub', country='FR', indexable=True,
        title="Branches d'assurance : ce que COURTIARK suit | COURTIARK",
        description="COURTIARK suit les dossiers clients et contrats, quelle que soit la branche : santé et prévoyance, auto, responsabilité civile professionnelle, multirisque.",
        h1="Branches d'assurance couvertes",
        chapeau="COURTIARK ne tarife pas : il organise le suivi. Le même socle s'applique à toutes les branches — "
                "client, contrat, échéance, documents, relances, commissions.",
        fil=[("Branches d'assurance", None)],
        corps=''.join([
            section("Ce que le produit suit réellement",
                    p("Un dossier client, un ou plusieurs contrats, une échéance, des documents, des actions de relance "
                      "et des commissions. Cette structure est la même pour une complémentaire santé, un contrat auto "
                      "ou une responsabilité civile professionnelle.")),
            section("Pages par branche",
                    ul(['<a href="/assurances/mutuelle-sante">Mutuelle et complémentaire santé</a>',
                        '<a href="/assurances/prevoyance">Prévoyance</a>',
                        '<a href="/assurances/assurance-auto">Assurance auto</a>',
                        '<a href="/assurances/rc-pro">Responsabilité civile professionnelle</a>',
                        '<a href="/assurances/multirisque-professionnelle">Multirisque professionnelle</a>'])),
            section("Ce que COURTIARK ne fait pas",
                    ul(["Il ne calcule pas de prime et n'affiche pas de tarif d'assureur.",
                        "Il ne compare pas les offres du marché : le module de comparaison fonctionne en simulation explicitement étiquetée.",
                        "Il ne se substitue pas à votre devoir de conseil."])),
        ]),
        faq=[("COURTIARK gère-t-il toutes les branches ?", "Le suivi est identique quelle que soit la branche : client, contrats, échéances, documents, relances, commissions.")],
        lire=[("Le CRM courtier assurance", "/crm-courtier-assurance"), ("Solutions", "/solutions/")]))

    def branche(chemin, titre, description, h1, chapeau, sections, faq, lire):
        return dict(path=chemin, type='vertical', country='FR', title=titre, description=description, h1=h1,
                    chapeau=chapeau, fil=[("Branches d'assurance", "/assurances/"), (h1[:44].rstrip(' :'), None)],
                    corps=''.join(sections), faq=faq, lire=lire)

    P.append(branche(
        '/assurances/mutuelle-sante',
        "Suivi des dossiers mutuelle et complémentaire santé | COURTIARK",
        "Suivez les dossiers de complémentaire santé : contrats, échéances, documents, changements de situation, sans mélanger les données de santé avec la prospection.",
        "Mutuelle et complémentaire santé",
        "Les dossiers santé demandent de la rigueur documentaire et de la discrétion. COURTIARK organise le suivi et "
        "n'utilise jamais les données de santé pour de la prospection.",
        [section("Ce qui est suivi",
                 ul(["Contrats et échéances, avec les changements de situation à retraiter.",
                     "Documents du dossier, déposés par le client via un lien.",
                     "Historique des échanges et des relances.",
                     "Commissions liées aux contrats."])),
         section("Données de santé : la règle",
                 p("Les données de santé relèvent de catégories particulières. Elles ne doivent servir qu'à ce qui est "
                   "nécessaire au dossier, et jamais à de la prospection. COURTIARK n'utilise pas ces données pour du "
                   "marketing ; la responsabilité du traitement reste celle du cabinet.")
                 + SRC_FR),
         section("Pourquoi le suivi documentaire est central",
                 p("Un dossier santé bloque souvent sur une pièce (attestation, justificatif, avenant). Le lien de "
                   "dépôt et la liste des pièces attendues évitent les allers-retours."))],
        [("COURTIARK exploite-t-il les données de santé ?", "Non : elles ne sont jamais utilisées pour de la prospection ni pour du marketing."),
         ("Puis-je suivre les échéances de complémentaires ?", "Oui, chaque contrat porte son échéance, remontée dans la vue portefeuille."),
         ("Le client peut-il déposer ses documents lui-même ?", "Oui, via un lien de dépôt, sans créer de compte.")],
        [("Gestion des documents", "/fonctionnalites/gestion-documents-assurance"), ("Renouvellements", "/fonctionnalites/renouvellements-assurance")]))

    P.append(branche(
        '/assurances/prevoyance',
        "Suivi des dossiers de prévoyance | COURTIARK",
        "Prévoyance : suivez contrats, échéances et documents clients, avec l'historique des échanges pour préparer les points de situation.",
        "Prévoyance",
        "La prévoyance se suit dans la durée : situation de famille, activité, échéances, documents. COURTIARK garde "
        "tout cela attaché au dossier pour que les points de situation se préparent vite.",
        [section("Ce qui est suivi",
                 ul(["Contrats de prévoyance et échéances, y compris en Suisse (LPP, 3e pilier).",
                     "Documents et pièces attendues.",
                     "Historique des échanges et des relances.",
                     "Commissions et rétrocessions."])),
         section("Repères prudents",
                 p("COURTIARK ne délivre aucun conseil en prévoyance et ne calcule pas de besoin de couverture. "
                   "Il organise le suivi du dossier et la préparation des échanges.")
                 + SRC_CH),
         section("Suisse : prévoyance professionnelle et individuelle",
                 p("Pour un cabinet suisse, le suivi distingue assurance-vie et prévoyance liée (LPP) de la prévoyance "
                   "individuelle ; le vocabulaire reste celui du dossier client."))],
        [("COURTIARK calcule-t-il un besoin de prévoyance ?", "Non. Aucun calcul de besoin n'est proposé : l'outil organise le suivi."),
         ("Le suivi fonctionne-t-il pour des dossiers suisses ?", "Oui, avec les repères du marché suisse."),
         ("Puis-je suivre les échéances de plusieurs contrats ?", "Oui, un client peut avoir plusieurs contrats, chacun avec son échéance.")],
        [("Renouvellements", "/fonctionnalites/renouvellements-assurance"), ("Suisse", "/suisse/")]))

    P.append(branche(
        '/assurances/assurance-auto',
        "Suivi des dossiers d'assurance auto | COURTIARK",
        "Assurance auto : suivez véhicules, contrats, échéances et sinistres déclarés dans le dossier client, avec les pièces rattachées.",
        "Assurance auto",
        "L'assurance auto génère beaucoup d'événements : achat, vente, sinistre, changement de conducteur. COURTIARK "
        "les rattache au dossier pour que le suivi reste cohérent.",
        [section("Ce qui est suivi",
                 ul(["Véhicules rattachés au client et contrats correspondants.",
                     "Échéances de renouvellement.",
                     "Pièces du dossier (carte verte, attestation, constat).",
                     "Historique des échanges et des relances.",
                     "Commissions liées aux contrats."])),
         section("Sinistres : ce que fait l'outil",
                 p("Le dossier conserve la trace des échanges et des pièces liées à un sinistre. COURTIARK ne gère pas "
                   "l'indemnisation et n'intervient pas auprès de l'assureur à votre place."))],
        [("COURTIARK gère-t-il les sinistres auto ?", "Il conserve les éléments et les échanges du dossier ; il ne traite pas l'indemnisation."),
         ("Puis-je suivre plusieurs véhicules par client ?", "Oui, les véhicules et les contrats sont rattachés au dossier client."),
         ("Les échéances remontent-elles automatiquement ?", "Les échéances portées par les contrats remontent dans la vue portefeuille et le brief du matin.")],
        [("Gestion des clients", "/fonctionnalites/gestion-clients"), ("Gestion des contrats", "/fonctionnalites/gestion-contrats")]))

    P.append(branche(
        '/assurances/rc-pro',
        "Suivi des dossiers de responsabilité civile professionnelle | COURTIARK",
        "RC professionnelle : suivez les dossiers entreprises, les échéances et les pièces, avec un historique exploitable pour les renouvellements.",
        "Responsabilité civile professionnelle",
        "Les contrats RC Pro concernent des professionnels dont l'activité change : le suivi doit suivre cette "
        "évolution, du devis au renouvellement.",
        [section("Ce qui est suivi",
                 ul(["Fiches clients entreprises, avec l'activité et les particularités.",
                     "Contrats RC Pro et échéances.",
                     "Documents (attestations, justificatifs d'activité).",
                     "Historique des échanges et des relances.",
                     "Commissions rattachées."])),
         section("Pourquoi les échéances sont critiques ici",
                 p("Une attestation RC expirée peut bloquer un chantier ou un marché. La vue portefeuille fait remonter "
                   "ces échéances avant qu'elles ne deviennent un problème."))],
        [("Puis-je suivre des clients entreprises ?", "Oui, la fiche client s'applique aux particuliers comme aux entreprises, avec tags et historique."),
         ("COURTIARK produit-il des attestations ?", "Non, il conserve les documents du dossier ; il ne génère pas de document d'assureur."),
         ("Les renouvellements sont-ils anticipés ?", "Les échéances remontent dans la vue portefeuille et le brief du matin.")],
        [("Solutions cabinet de courtage", "/solutions/cabinet-courtage-assurance"), ("Renouvellements", "/fonctionnalites/renouvellements-assurance")]))

    P.append(branche(
        '/assurances/multirisque-professionnelle',
        "Suivi des dossiers multirisque professionnelle | COURTIARK",
        "Multirisque professionnelle : suivez les dossiers PME, leurs contrats, leurs échéances et leurs documents dans un même suivi.",
        "Multirisque professionnelle",
        "Les dossiers multirisque mêlent plusieurs garanties et plusieurs interlocuteurs. COURTIARK garde le suivi "
        "lisible : un client, plusieurs contrats, une échéance par contrat.",
        [section("Ce qui est suivi",
                 ul(["Clients entreprises avec leurs sites et particularités.",
                     "Contrats multirisque et échéances, garantie par garantie.",
                     "Documents et pièces attendues.",
                     "Historique des échanges, relances et rendez-vous.",
                     "Commissions par contrat."])),
         section("Ce qui reste à votre charge",
                 p("L'analyse des garanties, la négociation avec l'assureur et le conseil au client restent votre "
                   "métier. COURTIARK organise le suivi et la traçabilité."))],
        [("Puis-je suivre plusieurs garanties par client ?", "Oui, via plusieurs contrats rattachés au même client."),
         ("Les rendez-vous sont-ils consignés ?", "Oui, le module rendez-vous permet de les rattacher au dossier."),
         ("Puis-je produire un état du portefeuille entreprises ?", "La vue portefeuille et le reporting donnent l'état des dossiers et de leur avancement.")],
        [("Solutions réseau de courtage", "/solutions/reseau-courtage"), ("Reporting", "/fonctionnalites/reporting-courtier")]))

    return P
