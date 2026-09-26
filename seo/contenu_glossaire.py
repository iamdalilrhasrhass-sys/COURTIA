#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Glossaire du courtage d'assurance (France et Suisse).

Definitions courtes et factuelles, rattachees aux pages qui les approfondissent.
Sources officielles citees en pied de page. Aucune definition inventee : les notions
reglementaires sont formulees de maniere prudente et verifiable.
"""
from contenu_core import section, p, ul

TERMES = [
    ("Courtier en assurance", "Intermédiaire qui présente des contrats d'assurance et agit, selon les cas, pour le "
     "compte du client ou comme intermédiaire d'assurance. Son activité est encadrée par le droit des intermédiaires.",
     [("Le CRM courtier assurance", "/crm-courtier-assurance")]),
    ("Intermédiaire d'assurance", "Professionnel qui met en relation un client et un assureur, ou qui présente des "
     "contrats. En France, l'activité d'intermédiation est définie par le Code des assurances ; en Suisse, elle "
     "relève de la loi sur le contrat d'assurance (LSA).",
     [("COURTIARK en France", "/france"), ("COURTIARK en Suisse", "/suisse")]),
    ("DDA (directive sur la distribution d'assurances)", "Cadre européen transposé en droit français qui organise la "
     "distribution d'assurance : informations précontractuelles, recueil des besoins et exigences du client, "
     "motivation du conseil, formation des distributeurs.",
     [("Guide : devoir de conseil et suivi du dossier", "/guides/devoir-de-conseil-suivi-dossier")]),
    ("Devoir de conseil", "Obligation, pour le distributeur, de proposer un contrat cohérent avec les besoins et "
     "exigences exprimés par le client, et de pouvoir expliquer ce qui a motivé ce conseil.",
     [("Guide : devoir de conseil", "/guides/devoir-de-conseil-suivi-dossier")]),
    ("ORIAS", "Registre unique des intermédiaires en assurance, banque et finance en France. L'immatriculation au "
     "registre est une condition d'exercice de l'activité d'intermédiaire.",
     [("COURTIARK en France", "/france")]),
    ("ACPR", "Autorité de contrôle prudentiel et de résolution : supervise le secteur de la banque et de l'assurance "
     "en France. Elle ne remplace pas les obligations propres à chaque intermédiaire.",
     [("COURTIARK en France", "/france")]),
    ("RGPD", "Règlement européen sur la protection des données. Il encadre la collecte et l'usage des données "
     "personnelles : finalité, minimisation, sécurité, droits des personnes. Les données de santé relèvent de "
     "catégories particulières.",
     [("Guide : données clients France et Suisse", "/guides/donnees-clients-assurance-france-suisse"),
      ("Confidentialité", "/confidentialite")]),
    ("IARD", "Assurances « incendie, accidents et risques divers » : les assurances de biens et de responsabilité "
     "(habitation, automobile, multirisque professionnelle, responsabilité civile).",
     [("Branches d'assurance", "/assurances")]),
    ("Prévoyance", "Couverture des conséquences financières d'événements de la vie (décès, invalidité, arrêt de "
     "travail). Elle peut être individuelle ou collective, et s'articule avec les régimes obligatoires.",
     [("Assurances : prévoyance", "/assurances/prevoyance")]),
    ("RC Pro (responsabilité civile professionnelle)", "Garantie qui couvre les conséquences des dommages causés à "
     "des tiers dans l'exercice d'une activité professionnelle.",
     [("Assurances : RC professionnelle", "/assurances/rc-pro")]),
    ("Portefeuille d'assurance", "Ensemble des contrats suivis par un cabinet pour ses clients, avec leurs échéances, "
     "leurs garanties et leurs documents. C'est l'actif central d'un cabinet de courtage.",
     [("Gestion de portefeuille d'assurance", "/fonctionnalites/gestion-portefeuille-assurance"),
      ("Guide : organiser un portefeuille", "/guides/organiser-portefeuille-assurance")]),
    ("Renouvellement", "Échéance annuelle d'un contrat, moment où l'assuré et le cabinet réexaminent la couverture. "
     "C'est une étape de conseil, pas une formalité administrative.",
     [("Renouvellements", "/fonctionnalites/renouvellements-assurance"),
      ("Checklist renouvellement", "/outils/checklist-renouvellement-assurance")]),
    ("Devis d'assurance", "Proposition de garanties et de prix transmise à un client. Son suivi (relance, réponse, "
     "décision) détermine une part importante de l'activité commerciale du cabinet.",
     [("Relance de devis", "/fonctionnalites/relance-devis-assurance")]),
    ("Commission et rétrocession", "Rémunération versée au distributeur pour la distribution d'un contrat. En "
     "Suisse, on parle volontiers de commission ou de rétrocession ; la transparence sur ces rémunérations relève "
     "des obligations propres à l'intermédiaire.",
     [("Suivi des commissions", "/crm-courtier-assurance")]),
    ("LSA (loi sur le contrat d'assurance)", "Loi suisse qui régit le contrat d'assurance et le statut des "
     "intermédiaires d'assurance, y compris les exigences d'inscription selon leur statut.",
     [("COURTIARK en Suisse", "/suisse")]),
    ("FINMA", "Autorité fédérale de surveillance des marchés financiers en Suisse. Elle surveille notamment les "
     "acteurs de l'assurance ; le registre des intermédiaires permet de vérifier le statut d'un intermédiaire.",
     [("COURTIARK en Suisse", "/suisse"), ("Genève", "/suisse/geneve")]),
    ("LPD / nLPD", "Cadre suisse de protection des données, révisé ces dernières années : transparence sur le "
     "traitement, droits des personnes, obligations de sécurité, sous-traitance encadrée.",
     [("Guide : données clients France et Suisse", "/guides/donnees-clients-assurance-france-suisse")]),
    ("LAMal et LCA", "La LAMal régit l'assurance-maladie obligatoire ; la LCA encadre l'assurance-vie et les "
     " assurances complémentaires. La distinction est structurante pour un cabinet suisse.",
     [("Assurances : mutuelle et complémentaire santé", "/assurances/mutuelle-sante")]),
    ("LPP et 3e pilier", "En Suisse, la prévoyance professionnelle (LPP, deuxième pilier) et la prévoyance "
     "individuelle liée ou libre (troisième pilier) : deux cadres distincts du suivi client.",
     [("Assurances : prévoyance", "/assurances/prevoyance")]),
]


def pages_glossaire():
    entete = ['<nav aria-label="Sommaire du glossaire"><ul>']
    for terme, _, _ in TERMES:
        ancre = terme.split(' ')[0].strip('(),').lower().replace('/', '')
        entete.append(f'<li><a href="#{ancre}">{terme}</a></li>')
    entete.append('</ul></nav>')
    corps = section("Sommaire", ''.join(entete))
    blocs = []
    for terme, definition, liens in TERMES:
        ancre = terme.split(' ')[0].strip('(),').lower().replace('/', '')
        liste = ''.join(f'<li><a href="{c}">{t}</a></li>' for t, c in liens)
        blocs.append(f'<h2 id="{ancre}">{terme}</h2><div class="section"><p>{definition}</p>'
                     f'<p class="doux">À approfondir :</p><ul>{liste}</ul></div>')
    corps += ''.join(blocs)
    return [dict(
        path='/glossaire', type='guide', country='FR', indexable=True,
        title="Glossaire du courtage d'assurance : France et Suisse | COURTIARK",
        description="Les termes du courtage d'assurance, définis simplement : intermédiaire, DDA, devoir de conseil, "
                    "ORIAS, RGPD, IARD, prévoyance, RC Pro, LSA, FINMA, LPD. Chaque définition renvoie à sa page.",
        h1="Glossaire du courtage d'assurance",
        chapeau="Dix-neuf notions que tout cabinet de courtage manipule, avec pour chacune une définition courte et "
                "les pages qui l'approfondissent.",
        fil=[("Glossaire", None)],
        corps=corps + section(
            "Sources",
            p('Les notions réglementaires sont formulées à partir de sources officielles : '
              '<a href="https://www.orias.fr/" rel="nofollow noopener" target="_blank">orias.fr</a> · '
              '<a href="https://www.legifrance.gouv.fr/" rel="nofollow noopener" target="_blank">legifrance.gouv.fr</a> · '
              '<a href="https://www.cnil.fr/" rel="nofollow noopener" target="_blank">cnil.fr</a> · '
              '<a href="https://www.finma.ch/fr/" rel="nofollow noopener" target="_blank">finma.ch</a> · '
              '<a href="https://www.fedlex.admin.ch/fr/cc/internal-law" rel="nofollow noopener" target="_blank">fedlex.admin.ch</a>. '
              'Ce glossaire est documentaire : il ne constitue pas un conseil juridique.')),
        faq=[("Pourquoi définir ces termes sur un site de logiciel ?",
              "Parce qu'un cabinet de courtage nous évalue sur le vocabulaire qu'il emploie tous les jours : un outil qui "
              "ignore la différence entre LAMal et LCA, ou entre devis et contrat, se voit immédiatement."),
             ("Ces définitions remplacent-elles une formation réglementaire ?",
              "Non. Elles servent à se comprendre, pas à remplacer les obligations de formation et de conseil du cabinet.")],
        lire=[("Guide : devoir de conseil", "/guides/devoir-de-conseil-suivi-dossier"),
              ("Guide : données clients France et Suisse", "/guides/donnees-clients-assurance-france-suisse"),
              ("Le CRM courtier assurance", "/crm-courtier-assurance")],
    )]
