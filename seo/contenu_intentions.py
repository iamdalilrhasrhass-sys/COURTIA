#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pages à forte intention commerciale.

Chaque page couvre une intention distincte des pages existantes (aucune cannibalisation) :
- /logiciel-courtier-assurance : choisir un logiciel métier (périmètre, modules, critères)
- /logiciel-courtage-assurance : le flux courtage devis -> contrat -> commission
- /automatisation-courtier-assurance : ce qui peut être automatisé, ce qui doit rester humain
Les intentions déjà couvertes ailleurs (CRM courtier, portefeuille, relances, documents,
renouvellements, courtier indépendant, cabinet, Suisse) sont redirigées vers la page canonique
existante plutôt que dupliquées.
"""
from contenu_core import section, ul, p, tableau, etapes, bascule


def pages_intentions():
    P = []

    P.append(dict(
        path='/logiciel-courtage-assurance', type='money', country='FR', indexable=True,
        title="Logiciel de courtage assurance : devis, contrats, commissions | COURTIARK",
        description="Le flux d'un cabinet de courtage, étape par étape : besoin, devis, contrat, échéance, commission. "
                    "Ce que COURTIARK suit réellement dans ce flux, et ce qu'il laisse à votre métier.",
        h1="Logiciel de courtage : suivre le flux du devis à la commission",
        chapeau="Un cabinet de courtage vit d'un flux continu : un besoin, un devis, un contrat, une échéance, une "
                "commission. Ce flux se perd quand chaque étape vit dans un outil différent.",
        fil=[("Logiciel de courtage assurance", None)],
        corps=''.join([
            section("Le flux, étape par étape",
                    tableau(["Étape", "Ce qui se passe en cabinet", "Ce que COURTIARK suit"],
                            [["Besoin", "Le client exprime un besoin, souvent incomplet", "Fiche client créée, informations consignées"],
                             ["Devis", "Un ou plusieurs devis sont préparés et transmis", "Registre des devis et étape en cours"],
                             ["Décision", "Le client accepte, négocie ou disparaît", "Suivi des relances et des réponses"],
                             ["Contrat", "Le contrat est émis par l'assureur", "Contrat rattaché au client, avec son échéance"],
                             ["Vie du contrat", "Changements de situation, avenants, sinistres", "Historique du dossier et pièces"],
                             ["Échéance", "Le renouvellement se prépare", "Vue portefeuille et brief du matin"],
                             ["Commission", "La rémunération est attendue puis encaissée", "Suivi des commissions et rétrocessions"]])),
            section("Où le flux se casse dans la pratique",
                    ul(["Le devis part et personne ne sait s'il a été lu.",
                        "Le contrat est émis mais l'échéance n'est enregistrée nulle part.",
                        "Le client change de situation et le dossier ne le reflète pas.",
                        "La commission est attendue mais rattachée à aucun dossier."])),
            section("Ce qui reste votre métier",
                    p("Le conseil, la négociation avec l'assureur, l'analyse des garanties et la relation client ne se "
                      "délèguent pas à un logiciel. COURTIARK organise le suivi de ce que vous décidez, et garde la "
                      "trace de vos décisions.")),
            section("Mettre un flux en place sans tout changer",
                    etapes([("Semaine 1", "Importer le portefeuille existant et cadrer les dossiers."),
                            ("Semaine 2", "Enregistrer les échéances et les devis en cours."),
                            ("Semaine 3", "Activer les relances et les listes de travail quotidiennes."),
                            ("Ensuite", "Ajuster la méthode selon ce que les listes font remonter.")])
                    + p("Essai de 7 jours sans carte bancaire ; France 89 € ou 159 € HT/mois, Suisse 199 ou 349 CHF HT/mois.")),
        ]),
        faq=[("Le logiciel génère-t-il les devis ?",
              "COURTIARK suit les devis et leur étape ; la production du document tarifaire dépend de votre outil d'assurance."),
             ("Peut-on suivre un contrat sans échéance connue ?",
              "Oui, mais l'intérêt est limité : l'échéance est ce qui permet de préparer le renouvellement. Sans elle, le "
              "contrat reste invisible jusqu'au contact du client."),
             ("Les commissions sont-elles calculées automatiquement ?",
              "Le suivi et le calcul d'appoint existent ; les barèmes restent ceux de vos conventions avec les assureurs.")],
        lire=[("Logiciel courtier assurance : les critères", "/logiciel-courtier-assurance"),
              ("Gestion des contrats", "/fonctionnalites/gestion-contrats"),
              ("Renouvellements", "/fonctionnalites/renouvellements-assurance"),
              ("Guide : suivre les renouvellements", "/guides/automatiser-renouvellements-assurance")],
    ))

    P.append(dict(
        path='/automatisation-courtier-assurance', type='money', country='FR', indexable=True,
        title="Automatisation courtier assurance : ce qui est possible, ce qui doit rester humain | COURTIARK",
        description="Automatiser un cabinet de courtage sans casser la relation client : les tâches répétitives à "
                    "traiter, celles qui ne doivent jamais être automatisées, et ce que COURTIARK fait réellement.",
        h1="Automatisation d'un cabinet de courtage : la frontière",
        chapeau="Automatiser, dans un cabinet d'assurance, ce n'est pas envoyer des messages en série. C'est faire en "
                "sorte qu'aucune action nécessaire ne dépende de la mémoire d'une personne.",
        fil=[("Automatisation courtier assurance", None)],
        corps=''.join([
            section("Les tâches qui peuvent être organisées automatiquement",
                    tableau(["Tâche", "Ce que l'outil peut faire", "Ce qui reste humain"],
                            [["Repérer un devis sans suite", "Le faire remonter dans une liste de travail", "Décider du contenu et du moment de la relance"],
                             ["Signaler une pièce manquante", "Marquer le dossier comme incomplet et préparer le lien de dépôt", "Demander la pièce au client"],
                             ["Voir une échéance approcher", "Remonter le contrat dans la vue portefeuille et le brief du matin", "Préparer et mener le rendez-vous"],
                             ["Préparer un message", "Proposer un texte à partir du dossier", "Relire, corriger, envoyer"],
                             ["Lire un document", "Extraire les informations et les proposer avec leur origine", "Valider ou corriger avant écriture"]])),
            section("Les tâches à ne jamais automatiser",
                    ul(["Envoyer un message au client sans relecture humaine.",
                        "Décider d'un conseil ou d'une garantie.",
                        "Modifier un contrat ou une échéance sans validation.",
                        "Contacter une personne qui s'est opposée à tout contact."])),
            section("Avant / après, sur un cas réel de cabinet",
                    bascule(ul(["Le devis part et on attend",
                                "La pièce manquante est redemandée trois fois",
                                "L'échéance se découvre à l'arrivée",
                                "Le reporting se reconstitue en fin d'année"]),
                            ul(["Les devis sans suite apparaissent dans une liste",
                                "Le dossier incomplet le dit lui-même",
                                "Les échéances sont visibles 90 jours avant",
                                "L'activité se lit dans les données du cabinet"])),
                    ),
            section("Combien ça coûte et ce que ça ne promet pas",
                    p("France : 89 € ou 159 € HT/mois ; Suisse : 199 ou 349 CHF HT/mois ; essai de 7 jours. "
                      "Nous n'annonçons aucun pourcentage de temps gagné : cette mesure dépend de votre organisation, "
                      "et nous ne disposons pas de donnée représentative.")
                    + '<p><a href="/outils/calculateur-productivite-courtier">Estimer la charge administrative de votre cabinet</a></p>'),
        ]),
        faq=[("COURTIARK envoie-t-il des relances automatiquement ?",
              "Non. L'outil organise les rappels et les listes de travail ; l'envoi reste une action du cabinet."),
             ("Peut-on automatiser la lecture des documents ?",
              "ARK peut lire un document et proposer les informations détectées avec leur origine ; rien n'est écrit sans validation."),
             ("L'automatisation remplace-t-elle un collaborateur ?",
              "Non : elle supprime les oublis et les recherches, pas le travail de conseil.")],
        lire=[("Automatisation des relances", "/fonctionnalites/automatisation-relances"),
              ("Comparatif : automatisation ou gestion manuelle", "/fr/comparatif/automatisation-vs-gestion-manuelle"),
              ("WhatsApp dans un cabinet de courtage", "/fr/whatsapp-courtier-assurance"),
              ("Assistant ARK", "/fonctionnalites/assistant-ark"),
              ("Guide : réduire la saisie manuelle", "/guides/reduire-saisie-manuelle-courtier"),
              ("Comparatif : tableur ou CRM courtier", "/comparatifs/excel-vs-crm-courtier-assurance")],
    ))

    P.append(dict(
        path='/tarifs', type='money', country='FR', indexable=True,
        title="Tarifs COURTIARK — CRM courtier assurance, France et Suisse",
        description="Tarifs COURTIARK : France 89 € ou 159 € HT/mois, Suisse 199 ou 349 CHF HT/mois. "
                    "Essai de 7 jours sans carte bancaire, aucune donnée supprimée à l'expiration.",
        h1="Tarifs",
        chapeau="Un abonnement par utilisateur et par mois, un essai de 7 jours sans carte bancaire, et une "
                "facturation dans la devise du marché du cabinet.",
        fil=[("Tarifs", None)],
        corps=''.join([
            section("France",
                    tableau(["Offre", "Prix", "Pour qui", "Ce qui change"],
                            [["Starter", "89 € HT/mois", "Courtier indépendant",
                              "Dossiers clients, contrats, échéances, documents, relances, ARK."],
                             ["Pro", "159 € HT/mois", "Cabinet avec plusieurs collaborateurs",
                              "Tout le Starter, plus la gestion d'équipe, les rôles et le reporting d'activité."],
                             ["Cabinet", "Sur devis", "Structures et volumes spécifiques",
                              "Reprise de données accompagnée et besoins particuliers."]])
                    + p("Tarifs hors taxes, facturés en euros. Paiement par carte bancaire via notre prestataire de paiement.")),
            section("Suisse",
                    tableau(["Offre", "Prix", "Pour qui"],
                            [["Indépendant", "199 CHF HT/mois", "Intermédiaire seul"],
                             ["Cabinet", "349 CHF HT/mois", "Cabinet avec plusieurs collaborateurs"],
                             ["Sur devis", "Sur devis", "Structures et volumes spécifiques"]])
                    + p("Tarifs hors taxes, facturés en francs suisses.")),
            section("L'essai",
                    ul(["7 jours, sans carte bancaire.",
                        "À l'expiration, aucune donnée n'est supprimée : le compte reste consultable, les écritures sont suspendues.",
                        "Aucun engagement de durée : vous pouvez arrêter en fin de période.",
                        "Questions sur l'offre : contact@courtiark.fr."])),
            section("Ce que le prix ne cache pas",
                    p("Toutes les fonctions décrites sur ce site sont incluses dans l'offre correspondante : il n'y a pas "
                      "de module métier verrouillé en supplément. Nous ne facturons ni la reprise d'un fichier standard, "
                      "ni l'export de vos données.")),
        ]),
        faq=[("Y a-t-il des frais d'installation ?",
              "Non pour un démarrage standard. Une reprise de données complexe est chiffrée dans l'offre Cabinet, avant tout engagement."),
             ("Le prix dépend-il du nombre de dossiers ?",
              "Non : le nombre de dossiers clients n'est pas un critère de facturation. L'offre dépend du nombre d'utilisateurs du cabinet."),
             ("Que se passe-t-il après l'essai de 7 jours ?",
              "Le compte reste accessible en lecture ; les fonctions d'écriture sont suspendues jusqu'à la souscription. Rien n'est supprimé."),
             ("Peut-on changer d'offre en cours de route ?",
              "Oui, à la hausse comme à la baisse, au moment du renouvellement de la période.")],
        lire=[("Le CRM courtier assurance", "/crm-courtier-assurance"),
              ("Logiciel courtier assurance : les critères", "/logiciel-courtier-assurance"),
              ("COURTIARK en Suisse", "/suisse"),
              ("Essai et démonstration", "/demo")],
        cta_final=('/register', "Démarrer l'essai de 7 jours"),
    ))
    return P

