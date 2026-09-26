#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pages d'entite et de transparence : kit presse, politique editoriale, sources.

Aucune affirmation non verifiable : les informations de societe sont celles deja publiees
(pages mentions legales / contact), les sources citees sont celles verifiees dans
docs/seo/authority100/05_FRANCE_REGULATORY_MAP.csv et 06_SWITZERLAND_REGULATORY_MAP.csv.
"""
from contenu_core import section, ul, p, tableau, figure

DESCRIPTION_50 = ("COURTIARK est un CRM et cockpit IA pour les courtiers en assurance : portefeuille, "
                  "contrats, documents, relances et renouvellements dans un seul outil, en France et en Suisse.")
DESCRIPTION_150 = ("COURTIARK est un logiciel de gestion conçu pour les cabinets de courtage en assurance. "
                   "Il centralise le portefeuille (clients, prospects, contrats, échéances), organise les "
                   "documents de chaque dossier, suit les relances et les renouvellements, et documente la "
                   "trace du conseil donné. Un assistant, ARK, lit les pièces déposées et propose les "
                   "informations qu'il y trouve avec leur origine : rien n'est écrit sans validation du cabinet. "
                   "COURTIARK est conçu pour les usages des cabinets en France et en Suisse. Démonstration "
                   "publique accessible sans inscription, essai de 7 jours sans carte bancaire.")


def pages_entite():
    return [
        dict(
            path='/presse', type='trust', country='FR', indexable=True,
            title="Kit presse COURTIARK — logos, chiffres et contact | COURTIARK",
            description=("Kit presse COURTIARK : description de l'entreprise, chiffres cles de l'etude 2026 sur le "
                         "courtage, captures produit, contact presse."),
            h1="Kit presse",
            chapeau=("Tout ce qu'il faut pour parler de COURTIARK correctement : description, chiffres "
                     "vérifiables, visuels, et un contact qui répond."),
            fil=[("Presse", None)],
            corps=''.join([
                section("Description courte (50 mots)",
                        p(DESCRIPTION_50)),
                section("Description longue (150 mots)",
                        p(DESCRIPTION_150)),
                section("Chiffres clés, avec leur source",
                        tableau(["Chiffre", "Valeur", "Source et date"],
                                [["Entreprises de courtage d'assurance en France", "43 240",
                                  "SIRENE (DINUM), code 66.22Z, extraction du 18/09/2026"],
                                 ["Part de l'Île-de-France", "23,2 % du total",
                                  "calcul COURTIARK sur la même extraction"],
                                 ["Entreprises déclarant plus d'un établissement", "6 157",
                                  "même extraction SIRENE"],
                                 ["Essai gratuit", "7 jours, sans carte bancaire",
                                  "conditions affichées sur la page des tarifs"],
                                 ["Marches servis", "France et Suisse",
                                  "pages marché du site"]]),
                        ),
                section("Visuels disponibles",
                        tableau(["Fichier", "Usage", "Format"],
                                [["/og-courtiark.png", "image de partage et illustration d'article", "PNG, 1200x630"],
                                 ["/icon-512.png", "logo pour les annuaires et les fiches produit", "PNG 512x512"],
                                 ["/favicon.svg", "logo vectoriel", "SVG"],
                                 ["/img/produit/courtiark-*.webp", "captures produit (7 écrans, environnement de démonstration)", "WebP 1440x900"]])
                        + p("Les captures proviennent de l'environnement de démonstration public : cabinet fictif, "
                            "données synthétiques, aucun client réel visible. Si vous avez besoin d'un format ou "
                            "d'un recadrage précis, demandez-le.")),
                section("Études publiées",
                        ul(["Cartographie du courtage en assurance en France — édition 2026 : "
                            '<a href="/etudes/courtage-assurance-france-2026">l\'étude</a>, sa '
                            '<a href="/etudes/methodologie-cartographie-courtage-france">méthodologie</a> et le '
                            '<a href="/donnees/courtage-france-2026.csv">jeu de données agrégé</a>.',
                            "Réutilisation autorisée avec la mention : « Source : COURTIARK, calculs à partir des "
                            "données SIRENE du 18/09/2026 »."])),
                section("Comment nous nous décrivons (et ce que nous ne dirons pas)",
                        ul(["Nous ne nous présentons pas comme leader, numéro un ou meilleur logiciel : nous n'avons "
                            "aucune mesure indépendante qui le démontre.",
                            "Nous ne publions aucun témoignage client : aucun client n'a encore autorisé de citation.",
                            "Nous n'affichons aucune note d'avis : il n'existe pas encore d'avis vérifiable."])
                        + p("Si un jour ces éléments existent, ils figureront ici avec leur source.")),
                section("Contact presse",
                        p("Écrire à <b>contact@courtiark.fr</b> en indiquant le média, votre échéance et l'angle "
                          "souhaité. Les demandes de chiffres par région ou par département sont traitées à partir "
                          "du jeu de données public.")),
            ]),
            faq=[("Puis-je citer vos chiffres ?",
                  "Oui, avec la mention de source et la date d'extraction (18/09/2026)."),
                 ("Avez-vous des visuels de marque ?",
                  "Oui : image de partage PNG, icône 512x512 et logo SVG, listés ci-dessus.")],
            lire=[("Études", "/etudes"), ("À propos", "/a-propos"), ("Contact", "/contact")],
        ),
        dict(
            path='/politique-editoriale', type='trust', country='FR', indexable=True,
            title="Politique éditoriale de COURTIARK — sources, dates, corrections | COURTIARK",
            description=("Comment nous écrivons, ce que nous citons, comment nous corrigeons et comment l'IA est "
                         "utilisée dans la production de nos contenus."),
            h1="Politique éditoriale",
            chapeau=("Nos règles d'écriture, nos sources, nos corrections — et la place exacte de l'outil dans "
                     "la production de nos contenus."),
            fil=[("Politique éditoriale", None)],
            corps=''.join([
                section("Ce que nous publions",
                        ul(["Des contenus qui répondent à une question réelle d'un cabinet de courtage : "
                            "organisation, suivi des dossiers, conformité, outillage.",
                            "Des données que nous pouvons recalculer : chaque chiffre publié est produit par un "
                            "script reproductible, et non recopié.",
                            "Des limites explicites : ce qu'un chiffre ne dit pas est écrit dans la page qui "
                            "le publie."])),
                section("Nos sources",
                        ul(["Réglementation : sources officielles uniquement (ACPR, ORIAS, CNIL, Légifrance, "
                            "EUR-Lex ; FINMA, Fedlex, PFPDT côté suisse), citées et vérifiées périodiquement.",
                            "Données de marché : base SIRENE (annuaire des entreprises, DINUM), avec code "
                            "d'activité, date d'extraction et méthode.",
                            "Produit : nos pages fonctionnalités ne décrivent que des fonctions présentes dans "
                            "le logiciel, vérifiées dans le code avant publication."])
                        + p('<a href="/sources">Voir la liste complète de nos sources</a>')),
                section("Dates et mises à jour",
                        ul(["Chaque page réglementaire porte la date de dernière vérification de ses sources.",
                            "Une étude publiée n'est pas réécrite : une nouvelle édition est publiée séparément, "
                            "l'ancienne reste archivée en l'état.",
                            "Une date n'est mise à jour que si le contenu a réellement été revu."])),
                section("Corrections",
                        ul(["Une erreur signalée est vérifiée puis corrigée, et la correction est décrite dans le "
                            "journal des versions.",
                            "Si une correction change un chiffre publié, nous l'indiquons explicitement : "
                            "nous ne modifions pas silencieusement une donnée historique."])
                        + p('<a href="/changelog">Journal des corrections</a>')),
                section("Place de l'outil dans nos contenus",
                        ul(["Les contenus sont écrits par l'équipe COURTIARK ; aucun texte n'est publié sans "
                            "relecture humaine.",
                            "Un assistant peut être utilisé pour la préparation ; aucune publication automatique "
                            "n'existe sur ce site.",
                            "Aucun contenu n'est commandé à un tiers, aucun lien n'est acheté, aucun avis n'est "
                            "sollicité contre contrepartie."])),
                section("Ce que nous ne faisons pas",
                        ul(["Nous ne publions pas de chiffres de gain (« X heures gagnées ») sans mesure réelle "
                            "chez un client.",
                            "Nous ne publions aucun témoignage, logo client ou note d'avis sans autorisation.",
                            "Nous ne reproduisons pas de texte réglementaire à la place d'une source officielle : "
                            "nous renvoyons à la source."])),
            ]),
            faq=[("Vos contenus sont-ils écrits par une IA ?",
                  "L'équipe prépare et relit les contenus ; un assistant peut aider à la préparation, mais rien "
                  "n'est publié sans relecture humaine, et aucun contenu n'est généré puis mis en ligne "
                  "automatiquement."),
                 ("Comment signaler une erreur ?",
                  "Par e-mail à contact@courtiark.fr, en indiquant la page et l'élément concerné. Une correction "
                  "est décrite dans le journal des versions quand elle change un chiffre ou une affirmation.")],
            lire=[("Nos sources", "/sources"), ("Journal des versions", "/changelog"), ("À propos", "/a-propos")],
        ),
        dict(
            path='/sources', type='trust', country='FR', indexable=True,
            title="Nos sources — réglementation assurance France et Suisse | COURTIARK",
            description=("Les sources officielles que nous citons pour la France et la Suisse, avec leur état de "
                         "vérification."),
            h1="Nos sources",
            chapeau=("Nous ne reformulons pas les textes réglementaires : nous renvoyons aux sources officielles, "
                     "et nous notons quand nous les avons vérifiées pour la dernière fois."),
            fil=[("Sources", None)],
            corps=''.join([
                section("France",
                        tableau(["Sujet", "Autorité", "Source", "Vérification"],
                                [["Devoir de conseil et distribution", "ACPR", '<a href="https://acpr.banque-france.fr/" rel="noopener">acpr.banque-france.fr</a>', "accessible (26/09/2026)"],
                                 ["Registre des intermédiaires", "ORIAS", '<a href="https://www.orias.fr/" rel="noopener">orias.fr</a>', "accessible (26/09/2026)"],
                                 ["Textes législatifs et réglementaires", "Légifrance", '<a href="https://www.legifrance.gouv.fr/" rel="noopener">legifrance.gouv.fr</a>', "refus aux robots (403) : vérifié en navigateur"],
                                 ["Textes européens", "EUR-Lex", '<a href="https://eur-lex.europa.eu/" rel="noopener">eur-lex.europa.eu</a>', "réponse 202 (contrôle anti-robot)"],
                                 ["Données personnelles", "CNIL", '<a href="https://www.cnil.fr/" rel="noopener">cnil.fr</a>', "accessible (26/09/2026)"]]),
                        ),
                section("Suisse",
                        tableau(["Sujet", "Autorité", "Source", "Vérification"],
                                [["Surveillance des marchés financiers", "FINMA", '<a href="https://www.finma.ch/" rel="noopener">finma.ch</a>', "refus au serveur (400) depuis notre infrastructure : site accessible en navigateur"],
                                 ["Loi sur le contrat d'assurance", "Fedlex", '<a href="https://www.fedlex.admin.ch/" rel="noopener">fedlex.admin.ch</a>', "accessible (26/09/2026)"],
                                 ["Protection des données", "PFPDT", '<a href="https://www.edoeb.admin.ch/" rel="noopener">edoeb.admin.ch</a>', "accessible (26/09/2026)"]])
                        + p("Deux sources (Légifrance, FINMA) refusent les requêtes automatisées venant de notre "
                            "infrastructure : nous l'écrivons plutôt que d'afficher une vérification que nous "
                            "n'avons pas pu faire.")),
                section("Données de marché",
                        tableau(["Jeu de données", "Source", "Date", "Usage"],
                                [["Établissements et entreprises de courtage (code 66.22Z)", "SIRENE — annuaire des entreprises (DINUM)", "18/09/2026",
                                  '<a href="/etudes/courtage-assurance-france-2026">étude 2026</a> et <a href="/france/densite-courtage">densité du courtage</a>']])
                        + p("Réutilisation de nos agrégats : possible avec la mention « Source : COURTIARK, calculs "
                            "à partir des données SIRENE du 18/09/2026 ». Les données brutes restent soumises aux "
                            "conditions de la source.")),
                section("Ce que nous ne faisons pas",
                        p("Nous ne publions aucune affirmation réglementaire sans source officielle, et nous ne "
                          "présentons aucune certification : COURTIARK est un logiciel de gestion, il n'est "
                          "certifié par aucun régulateur et ne remplace pas l'analyse adaptée à votre cabinet.")),
            ]),
            faq=[("Pourquoi citer les sources au lieu de recopier les textes ?",
                  "Parce qu'un texte réglementaire se lit à sa source, dans sa version en vigueur. Recopier "
                  "introduit un risque d'erreur et de désuétude."),
                 ("Vérifiez-vous ces liens ?",
                  "Oui, par requête HTTP, et nous notons le résultat réel — y compris quand un site refuse les "
                  "requêtes automatisées.")],
            lire=[("Politique éditoriale", "/politique-editoriale"), ("Conformité", "/conformite/controle-acpr-courtier"),
                  ("Sécurité", "/securite")],
        ),
    ]
