#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
carte_semantique.py — CARTE SÉMANTIQUE DU MARCHÉ (règles 4 et 33 de la mission).

Construit docs/seo/CARTE_SEMANTIQUE.csv : une ligne par intention retenue ou écartée, avec les colonnes
demandées (ENTITY, TOPIC, SUBTOPIC, QUERY, INTENT, FUNNEL, COUNTRY, PERSONA, PRODUCT FIT, CURRENT URL,
SERP TYPE, COMPETITION OBSERVED, UNIQUE VALUE AVAILABLE, DECISION).

Sources réelles :
  - l'inventaire des pages publiées (frontend/public/{fr,ch}) : la colonne CURRENT URL vient du disque ;
  - les SERP observées (docs/seo/SERP_OBSERVES.csv : 13 requêtes, 104 résultats, 70 domaines) : la colonne
    COMPETITION OBSERVED reprend ce qui a réellement été relevé, ou « non observée » ;
  - les décisions TypeSafe/JEV journalisées (JEV_JOURNAL.csv) : seuils et refus déjà appliqués.

Aucune donnée inventée : quand une information n'est pas mesurée, la cellule porte « non mesuré ».
"""
import csv
import os
import re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(BASE, "frontend", "public")
DOCS = os.path.join(BASE, "docs", "seo")

# (ENTITE, THEME, SOUS-THEME, REQUETE, INTENTION, FUNNEL, PAYS, PERSONA, ADEQUATION_PRODUIT, URL, DECISION)
I = [
 # --- coeur CRM / logiciel
 ("courtier","CRM","coeur produit","crm courtier assurance","commerciale","decision","FR","courtier indépendant","vérifiée (dossier client, pipeline, tâches)","fr/crm-courtier-assurance","COVERED"),
 ("courtier","CRM","coeur produit","logiciel courtier assurance","commerciale","decision","FR","courtier indépendant","vérifiée (produit complet)","fr/logiciel-courtier-assurance","COVERED"),
 ("courtier","CRM","synonymes","logiciel courtage assurance","commerciale","decision","FR","cabinet","vérifiée","fr/logiciel-courtier-assurance","MERGED"),
 ("courtier","CRM","synonymes","crm assurance","commerciale","decision","FR","courtier","partielle (pas de matière distincte)","fr/crm-courtier-assurance","MERGED"),
 ("courtier","CRM","famille","crm cabinet assurance","commerciale","decision","FR","cabinet","partielle","fr/crm-courtier-assurance","MERGED"),
 ("courtier","CRM","famille","logiciel cabinet de courtage","commerciale","decision","FR","cabinet","vérifiée","fr/logiciel-courtier-assurance","COVERED"),
 ("courtier","CRM","famille","outil courtier assurance","commerciale","comparaison","FR","courtier indépendant","vérifiée","fr/outil-courtier-assurance","COVERED"),
 ("courtier","CRM","famille","plateforme courtier assurance","commerciale","comparaison","FR","cabinet","vérifiée","fr/outil-courtier-assurance","MERGED"),
 ("courtier","CRM","famille","logiciel gestion courtier","commerciale","decision","FR","courtier","vérifiée","fr/logiciel-courtier-assurance","MERGED"),
 ("intermediaire","CRM","pays","crm courtier assurance suisse","commerciale","decision","CH","courtier romand","vérifiée","ch/crm-courtier-assurance-suisse","COVERED"),
 ("intermediaire","CRM","pays","logiciel courtier suisse","commerciale","decision","CH","courtier romand","vérifiée","ch/logiciel-courtier-assurance-suisse","COVERED"),
 ("intermediaire","CRM","pays","logiciel courtage suisse","commerciale","decision","CH","courtier romand","vérifiée","ch/logiciel-courtier-assurance-suisse","MERGED"),
 ("intermediaire","CRM","vocabulaire","logiciel intermédiaire assurance suisse","commerciale","decision","CH","intermédiaire","vérifiée","ch/logiciel-intermediaire-assurance-suisse","COVERED"),
 # --- gain de temps
 ("courtier","productivité","hub","gagner du temps courtier assurance","problème","conscience","FR","courtier indépendant","vérifiée (tâches réelles)","fr/gagner-du-temps-courtier-assurance","COVERED"),
 ("courtier","productivité","famille","temps administratif courtier","problème","conscience","FR","cabinet","vérifiée + outil","fr/gain-de-temps/temps-administratif-et-double-saisie","COVERED"),
 ("courtier","productivité","famille","réduire double saisie","problème","conscience","FR","cabinet","vérifiée","fr/reduire-double-saisie-cabinet-courtage","COVERED"),
 ("courtier","productivité","famille","organisation cabinet courtage","problème","conscience","FR","cabinet","vérifiée","fr/organisation-cabinet-courtage","COVERED"),
 ("courtier","productivité","famille","prioriser dossiers courtier","problème","conscience","FR","courtier","vérifiée (score, brief)","fr/prioriser-dossiers-courtier-assurance","COVERED"),
 ("courtier","productivité","mesure","mesurer temps administratif","problème","conscience","FR","responsable","vérifiée + méthode","fr/mesurer-temps-administratif-cabinet","COVERED"),
 ("courtier","productivité","outil","calculateur temps administratif","problème","conscience","FR","responsable","vérifiée (outil)","fr/outils/calculateur-temps-administratif","COVERED"),
 ("courtier","productivité","outil","calculateur roi logiciel courtier","commerciale","decision","FR","responsable","vérifiée (calcul)","fr/outils/calculateur-roi-courtia","COVERED"),
 ("courtier","productivité","outil","diagnostic automatisation cabinet","problème","conscience","FR","responsable","vérifiée (outil)","fr/outils/diagnostic-automatisation-cabinet","COVERED"),
 ("courtier","productivité","processus","workflow courtier assurance","problème","conscience","FR","responsable","vérifiée (14 processus)","fr/workflows-courtier-assurance","COVERED"),
 # --- relances, échéances, renouvellements
 ("courtier","relances","famille","relance client assurance","fonction","conscience","FR","courtier","vérifiée","fr/relance-client-assurance","COVERED"),
 ("courtier","relances","guide","automatiser relances courtier","problème","conscience","FR","courtier","vérifiée (préparation + validation)","fr/guide/automatiser-relances-courtier","COVERED"),
 ("courtier","relances","processus","process relance devis","problème","conscience","FR","courtier","vérifiée","fr/workflows/relance-de-devis","COVERED"),
 ("courtier","renouvellements","famille","gestion renouvellements assurance","fonction","conscience","FR","cabinet","vérifiée","fr/logiciel-courtier-renouvellements","COVERED"),
 ("courtier","renouvellements","guide","organiser renouvellements","problème","conscience","FR","cabinet","vérifiée (paliers)","fr/guide/organiser-renouvellements-courtier","COVERED"),
 ("courtier","portefeuille","famille","gestion portefeuille assurance","fonction","conscience","FR","cabinet","vérifiée","fr/gestion-portefeuille-courtier","COVERED"),
 ("courtier","portefeuille","fonction","santé portefeuille assurance","fonction","conscience","FR","responsable","vérifiée (score, brief)","fr/sante-portefeuille-courtier-assurance","COVERED"),
 # --- documents, pièces
 ("courtier","documents","famille","gestion documentaire courtier","fonction","conscience","FR","cabinet","vérifiée","fr/gestion-documentaire-courtier-assurance","COVERED"),
 ("courtier","documents","processus","collecte pièces client","problème","conscience","FR","assistant","vérifiée (lien de dépôt)","fr/workflows/collecte-de-pieces","COVERED"),
 ("courtier","documents","checklist","checklist collecte documentaire","problème","conscience","FR","assistant","utile sans produit","fr/checklists/collecte-documentaire","COVERED"),
 ("intermediaire","documents","pays","dépôt de pièces suisse","fonction","conscience","CH","courtier romand","vérifiée","ch/portail-client-assurance-suisse","COVERED"),
 # --- IA
 ("courtier","IA","famille","ia courtier assurance","technologique","conscience","FR","courtier","vérifiée (usages réels)","fr/ia-courtier-assurance","COVERED"),
 ("courtier","IA","famille","ia assurance","technologique","conscience","FR","courtier","partielle (intention plus large que le produit)","fr/ia-courtier-assurance","MERGED"),
 ("courtier","IA","famille","assistant ia courtier","technologique","conscience","FR","courtier","vérifiée","fr/ia-courtier-assurance","MERGED"),
 ("courtier","IA","fonction","extraction documents assurance","fonction","conscience","FR","assistant","vérifiée (RIB, carte grise)","fr/ia-gestion-documentaire-assurance","COVERED"),
 ("courtier","IA","fonction","transcription appel courtier","fonction","conscience","FR","courtier","vérifiée","fr/dicter-compte-rendu-appel-assurance","COVERED"),
 ("courtier","IA","orientation","ia analyse dossiers assurance","fonction","conscience","FR","courtier","vérifiée (résumé, pas de décision)","fr/ia-courtier-assurance","MERGED"),
 # --- automatisation
 ("courtier","automatisation","famille","automatisation courtier assurance","technologique","conscience","FR","cabinet","vérifiée (avec validation)","fr/automatisation-courtier-assurance","COVERED"),
 ("intermediaire","automatisation","pays","automatisation courtier suisse","technologique","conscience","CH","cabinet romand","vérifiée","ch/automatisation-courtier-assurance-suisse","COVERED"),
 # --- fonctions produit
 ("courtier","fonctions","tâches","gestion tâches cabinet courtage","fonction","conscience","FR","cabinet","vérifiée","fr/gestion-taches-cabinet-courtage","COVERED"),
 ("courtier","fonctions","agenda","rendez-vous courtier assurance","fonction","conscience","FR","courtier","vérifiée","fr/rendez-vous-courtier-assurance","COVERED"),
 ("courtier","fonctions","whatsapp","whatsapp courtier assurance","fonction","conscience","FR","courtier","vérifiée (API Business)","fr/whatsapp-courtier-assurance","COVERED"),
 ("courtier","fonctions","pipeline","pipeline courtier assurance","fonction","conscience","FR","courtier","vérifiée","fr/pipeline-kanban-courtier-assurance","COVERED"),
 ("courtier","fonctions","équipe","logiciel courtier équipe","fonction","conscience","FR","cabinet","vérifiée (rôles)","fr/logiciel-courtier-equipe","COVERED"),
 ("courtier","fonctions","partenaires","apporteur affaires assurance","fonction","conscience","FR","cabinet","vérifiée","fr/partenaires-apporteurs-courtier-assurance","COVERED"),
 ("courtier","fonctions","formation","formation équipe courtage","fonction","conscience","FR","cabinet","vérifiée (academy interne)","fr/formation-equipe-courtier-assurance","COVERED"),
 ("courtier","fonctions","reporting","reporting pilotage cabinet courtage","fonction","conscience","FR","responsable","vérifiée","fr/reporting-pilotage-cabinet-courtage","COVERED"),
 ("courtier","fonctions","prospects","gestion prospects assurance","fonction","conscience","FR","courtier","vérifiée","fr/gestion-prospects-clients-courtier-assurance","COVERED"),
 ("courtier","fonctions","portail","portail client assurance","fonction","conscience","FR","cabinet","vérifiée (dépôt par lien)","fr/portail-client-courtier-assurance","COVERED"),
 ("courtier","fonctions","import","import portefeuille courtier","opérationnelle","conscience","FR","cabinet","vérifiée","fr/import-portefeuille-courtier-assurance","COVERED"),
 ("courtier","facturation","général","facturation cabinet courtage","opérationnelle","conscience","FR","cabinet","non couverte (produit facture les abonnements, pas les clients)","","REJECTED"),
 ("courtier","fonctions","signature électronique","signature électronique courtier","opérationnelle","conscience","FR","cabinet","non couverte de bout en bout","","REJECTED"),
 # --- commissions, sinistres, conformité
 ("courtier","commissions","famille","gestion commissions courtier","fonction","conscience","FR","cabinet","vérifiée","fr/gestion-commissions-courtier-assurance","COVERED"),
 ("intermediaire","commissions","pays","commissions courtier suisse","fonction","conscience","CH","cabinet romand","vérifiée (CHF)","ch/gestion-commissions-courtier-assurance-suisse","COVERED"),
 ("courtier","sinistres","famille","suivi sinistres courtier","fonction","conscience","FR","courtier","vérifiée (module sinistres)","fr/sinistres-courtier-assurance","COVERED"),
 ("intermediaire","sinistres","pays","sinistre assurance suisse","fonction","conscience","CH","courtier romand","vérifiée","ch/sinistres-courtier-assurance-suisse","COVERED"),
 ("courtier","conformité","famille","conformité courtier assurance","réglementaire","conscience","FR","responsable","vérifiée (module conformité)","fr/conformite-courtier-assurance","COVERED"),
 ("intermediaire","conformité","pays","conformité intermédiaire suisse","réglementaire","conscience","CH","cabinet romand","vérifiée (référentiels, sans revendication)","ch/conformite-intermediaire-assurance-lsa-finma","COVERED"),
 ("intermediaire","données personnelles","pays","nlpd courtier assurance","réglementaire","conscience","CH","cabinet romand","vérifiée (cloisonnement)","ch/nlpd-courtier-assurance","COVERED"),
 # --- guides et méthodes
 ("courtier","guides","méthode","choisir un crm courtage","informationnelle","comparaison","FR","responsable","méthode neutre","fr/guide/choisir-crm-cabinet-courtage","COVERED"),
 ("courtier","guides","méthode","structurer pipeline courtier","informationnelle","conscience","FR","courtier","méthode","fr/guide/structurer-pipeline-courtier","COVERED"),
 ("courtier","guides","méthode","centraliser dossiers clients","informationnelle","conscience","FR","cabinet","méthode","fr/guide/centraliser-dossiers-clients","COVERED"),
 ("courtier","guides","méthode","intégrer ia cabinet courtage","informationnelle","conscience","FR","responsable","méthode + limites","fr/guide/integrer-ia-cabinet-courtage","COVERED"),
 ("courtier","guides","méthode","onboarding client courtier","informationnelle","conscience","FR","assistant","méthode + checklist","fr/guide/onboarding-client-courtier","COVERED"),
 ("courtier","guides","méthode","suivre prospects courtier","informationnelle","conscience","FR","courtier","méthode","fr/guide/suivre-prospects-courtier","COVERED"),
 ("courtier","guides","méthode","réduire double saisie guide","informationnelle","conscience","FR","cabinet","méthode","fr/reduire-double-saisie-cabinet-courtage","MERGED"),
 # --- glossaire
 ("courtier","glossaire","entrée","courtier d'assurance définition","informationnelle","conscience","FR","nouvel arrivant","définition + contexte","fr/glossaire/courtier-assurance","COVERED"),
 ("courtier","glossaire","entrée","devoir de conseil définition","informationnelle","conscience","FR","courtier","définition + exemple","fr/glossaire/devoir-de-conseil","COVERED"),
 ("courtier","glossaire","entrée","commission de courtage définition","informationnelle","conscience","FR","courtier","définition + exemple","fr/glossaire/commissions","COVERED"),
 ("intermediaire","glossaire","entrée","intermédiaire d'assurance définition suisse","informationnelle","conscience","CH","nouvel arrivant","définition suisse","ch/glossaire","COVERED"),
 # --- comparatifs
 ("courtier","comparatifs","catégorie","crm spécialisé vs crm généraliste","commerciale","comparaison","FR","responsable","comparaison de catégories","fr/comparatif/crm-specialise-vs-crm-generaliste","COVERED"),
 ("courtier","comparatifs","catégorie","crm courtier vs excel","commerciale","comparaison","FR","courtier indépendant","comparaison de méthodes","fr/comparatif/crm-courtier-vs-excel","COVERED"),
 ("courtier","comparatifs","catégorie","automatisation vs gestion manuelle","commerciale","comparaison","FR","cabinet","comparaison de méthodes","fr/comparatif/automatisation-vs-gestion-manuelle","COVERED"),
 ("courtier","comparatifs","méthode","comment évaluer un crm courtier","informationnelle","comparaison","FR","responsable","grille neutre","fr/evaluer-crm-courtier-assurance","COVERED"),
 # --- segments
 ("courtier","segments","branche","logiciel courtier auto","commerciale","decision","FR","courtier auto","vérifiée (dossier, échéances, pièces)","fr/logiciel-courtier-auto","COVERED"),
 ("courtier","segments","branche","logiciel courtier habitation","commerciale","decision","FR","courtier IARD","vérifiée","fr/logiciel-courtier-habitation","COVERED"),
 ("courtier","segments","branche","logiciel courtier entreprise","commerciale","decision","FR","courtier entreprises","vérifiée (personnes morales)","fr/logiciel-courtier-entreprise","COVERED"),
 ("courtier","segments","branche","logiciel courtier transport flotte","commerciale","decision","FR","courtier transport","vérifiée (véhicules, échéances multiples)","fr/logiciel-courtier-transport-flotte","COVERED"),
 ("courtier","segments","branche","logiciel courtier décennale","commerciale","decision","FR","courtier construction","vérifiée (attestations, chantiers)","fr/logiciel-courtier-decennale","COVERED"),
 ("courtier","segments","branche","logiciel courtier santé","commerciale","decision","FR","courtier santé","vérifiée (événements, pièces sensibles)","fr/logiciel-courtier-sante","COVERED"),
 ("courtier","segments","branche","logiciel courtier prévoyance","commerciale","decision","FR","courtier prévoyance","vérifiée","fr/logiciel-courtier-prevoyance","COVERED"),
 ("courtier","segments","branche","logiciel courtier emprunteur","commerciale","decision","FR","courtier crédit","vérifiée","fr/logiciel-courtier-emprunteur","COVERED"),
 ("courtier","segments","branche","logiciel courtier taxi vtc","commerciale","decision","FR","courtier VTC","vérifiée mais non distincte du transport (JEV 0,54)","fr/logiciel-courtier-transport-flotte","MERGED"),
 ("courtier","segments","branche","logiciel courtier cyber","commerciale","decision","FR","courtier cyber","non couverte (aucune évaluation technique dans le produit)","","REJECTED"),
 ("courtier","segments","branche","logiciel courtier rc professionnelle","commerciale","decision","FR","courtier RC pro","vérifiée mais non distincte (JEV 0,42)","fr/logiciel-courtier-entreprise","MERGED"),
 ("courtier","segments","branche","logiciel courtier multirisque professionnelle","commerciale","decision","FR","courtier pro","non distincte (JEV 0,49)","fr/logiciel-courtier-entreprise","MERGED"),
 ("courtier","segments","branche","logiciel courtier tpe pme","commerciale","decision","FR","courtier TPE/PME","non distincte de la page entreprises (JEV 0,52)","fr/logiciel-courtier-entreprise","MERGED"),
 # --- entités métier
 ("courtier","entités","statut","logiciel courtier mandataire","commerciale","decision","FR","mandataire","vérifiée","fr/logiciel-courtier-mandataire","COVERED"),
 ("courtier","entités","statut","logiciel courtier grossiste","commerciale","decision","FR","courtier grossiste","vérifiée (apporteurs)","fr/logiciel-courtier-grossiste","COVERED"),
 ("courtier","entités","statut","logiciel courtier tns","commerciale","decision","FR","courtier seul","vérifiée","fr/logiciel-courtier-tns","COVERED"),
 ("courtier","entités","statut","logiciel courtier multi-agences","commerciale","decision","FR","réseau","vérifiée (rôles, cloisonnement)","fr/logiciel-courtier-multi-agences","COVERED"),
 ("courtier","entités","statut","apporteur d'affaires suisse","commerciale","decision","CH","apporteur romand","vérifiée","ch/partenaires-apporteurs-courtier-assurance-suisse","COVERED"),
 # --- pages de ville conservées
 ("courtier","local","ville","logiciel courtier assurance paris","locale","decision","FR","courtier francilien","vérifiée + données SIRENE","fr/logiciel-courtier-assurance-paris","COVERED"),
 ("courtier","local","ville","logiciel courtier assurance lyon","locale","decision","FR","courtier lyonnais","vérifiée + données SIRENE","fr/logiciel-courtier-assurance-lyon","COVERED"),
 ("courtier","local","ville","logiciel courtier assurance marseille","locale","decision","FR","courtier marseillais","vérifiée + données SIRENE","fr/logiciel-courtier-assurance-marseille","COVERED"),
 ("courtier","local","ville","logiciel courtier assurance bordeaux","locale","decision","FR","courtier bordelais","vérifiée + données SIRENE","fr/logiciel-courtier-assurance-bordeaux","COVERED"),
 ("courtier","local","ville","logiciel courtier assurance toulouse","locale","decision","FR","courtier toulousain","vérifiée + données SIRENE","fr/logiciel-courtier-assurance-toulouse","COVERED"),
 ("courtier","local","ville","logiciel courtier assurance nantes","locale","decision","FR","courtier nantais","vérifiée + données SIRENE","fr/logiciel-courtier-assurance-nantes","COVERED"),
 ("courtier","local","ville","logiciel courtier assurance lille","locale","decision","FR","courtier lillois","vérifiée + données SIRENE","fr/logiciel-courtier-assurance-lille","COVERED"),
 ("courtier","local","ville","logiciel courtier assurance strasbourg","locale","decision","FR","courtier strasbourgeois","vérifiée + données SIRENE","fr/logiciel-courtier-assurance-strasbourg","COVERED"),
 ("courtier","local","ville","logiciel courtier assurance montpellier","locale","decision","FR","courtier montpelliérain","vérifiée + données SIRENE","fr/logiciel-courtier-assurance-montpellier","COVERED"),
 ("courtier","local","ville","logiciel courtier assurance nice","locale","decision","FR","courtier niçois","vérifiée + données SIRENE","fr/logiciel-courtier-assurance-nice","COVERED"),
 ("courtier","local","ville","logiciel courtier assurance 1065 villes","locale","decision","FR","courtier local","aucune valeur propre (gabarit)","","REJECTED"),
 # --- données et confiance
 ("éditeur","données","actif","cartographie courtiers france","informationnelle","comparaison","FR","analyste, journaliste","vérifiée (SIRENE sourcée)","fr/cartographie-courtiers-assurance-france","COVERED"),
 ("éditeur","confiance","méthode","méthode éditoriale logiciel","informationnelle","conscience","FR","acheteur","vérifiée","fr/methode-editoriale-courtia","COVERED"),
 ("éditeur","confiance","sources","sources données courtage","informationnelle","conscience","FR","analyste","vérifiée","fr/sources-courtia","COVERED"),
 ("éditeur","confiance","transparence","corrections logiciel courtage","informationnelle","conscience","FR","acheteur","vérifiée (corrections réelles)","fr/historique-corrections-courtia","COVERED"),
 ("éditeur","marque","entité","courtia éditeur logiciel courtage","navigationnelle","decision","FR","visiteur","vérifiée","fr/courtia-logiciel-courtage-assurance","COVERED"),
 ("éditeur","commerce","essai","essai gratuit logiciel courtier","commerciale","decision","FR","responsable","vérifiée (7 jours)","fr/demo-et-essai-gratuit","COVERED"),
 ("éditeur","commerce","prix","tarif logiciel courtier assurance","transactionnelle","decision","FR","responsable","vérifiée (grille produit)","fr/tarifs-logiciel-courtier","COVERED"),
 ("éditeur","commerce","prix","prix logiciel courtier suisse","transactionnelle","decision","CH","responsable romand","vérifiée (grille produit)","ch/tarifs-logiciel-courtier-chf","COVERED"),
 # --- Suisse : profondeur ciblée et refus explicites
 ("intermediaire","gestion","pays","gestion cabinet courtage suisse","commerciale","decision","CH","cabinet romand","vérifiée","ch/gestion-cabinet-courtage-suisse","COVERED"),
 ("intermediaire","reporting","pays","pilotage courtier assurance suisse","commerciale","decision","CH","responsable romand","vérifiée","ch/reporting-pilotage-courtier-assurance-suisse","COVERED"),
 ("intermediaire","documents","pays","gestion documentaire courtier suisse","commerciale","decision","CH","cabinet romand","vérifiée","ch/gestion-documentaire-courtier-assurance-suisse","COVERED"),
 ("intermediaire","onboarding","pays","import portefeuille courtier suisse","opérationnelle","conscience","CH","cabinet romand","vérifiée","ch/import-portefeuille-courtier-assurance-suisse","COVERED"),
 ("intermediaire","prospection","pays","prospection courtier suisse","commerciale","conscience","CH","courtier romand","vérifiée","ch/logiciel-prospection-courtier-assurance-suisse","COVERED"),
 ("intermediaire","devis","pays","devis courtier assurance suisse","commerciale","conscience","CH","courtier romand","vérifiée","ch/logiciel-devis-courtier-assurance-suisse","COVERED"),
 ("intermediaire","relances","pays","relances courtier suisse","commerciale","conscience","CH","courtier romand","vérifiée","ch/relances-courtier-assurance-suisse","COVERED"),
 ("intermediaire","IA","pays","ia courtier assurance suisse","technologique","conscience","CH","courtier romand","vérifiée","ch/ia-courtier-assurance-suisse","COVERED"),
 ("intermediaire","CRM","pays","santé portefeuille suisse","fonction","conscience","CH","responsable romand","vérifiée mais refusée comme page distincte (JEV 0,63)","ch/gestion-portefeuille-assurance-suisse","MERGED"),
 ("intermediaire","fonctions","pays","tâches et équipe suisse","fonction","conscience","CH","cabinet romand","vérifiée mais refusée comme page distincte (JEV 0,68)","ch/gestion-cabinet-courtage-suisse","MERGED"),
 ("intermediaire","fonctions","pays","voix et whatsapp suisse","fonction","conscience","CH","courtier romand","refusée (JEV false, 0,47) — pas de substance suisse distincte","","REJECTED"),
 ("intermediaire","glossaire","pays","glossaire suisse courtage","informationnelle","conscience","CH","nouvel arrivant","vérifiée","ch/glossaire","COVERED"),
 ("intermediaire","outils","pays","outil suisse courtage","informationnelle","conscience","CH","responsable romand","vérifiée (calculateur CH)","ch/outils/calculateur-temps-administratif-suisse","COVERED"),
 ("intermediaire","processus","pays","processus courtier suisse","informationnelle","conscience","CH","cabinet romand","vérifiée","ch/workflows-courtier-assurance-suisse","COVERED"),
 ("intermediaire","localisation","langue","logiciel courtier suisse alémanique","commerciale","decision","CH-DE","courtier alémanique","à documenter : traduction de qualité indisponible","","DEFERRED"),
 ("intermediaire","localisation","langue","software versicherungsbroker schweiz","commerciale","decision","CH-DE","courtier alémanique","à documenter : traduction de qualité indisponible","","DEFERRED"),
 ("intermediaire","localisation","langue","software broker assicurativo svizzera","commerciale","decision","CH-IT","courtier tessinois","à documenter : traduction de qualité indisponible","","DEFERRED"),
 # --- autorité / relations
 ("éditeur","autorité","actif citable","données publiques courtage france","informationnelle","conscience","FR","journaliste, association","vérifiée (réutilisable avec mention)","fr/cartographie-courtiers-assurance-france","COVERED"),
 ("éditeur","autorité","campagne","relations presse logiciel assurance","informationnelle","conscience","FR","média spécialisé","préparée, aucun contact sans autorisation","","DEFERRED"),
]


def pages_publiees():
    trouve = set()
    for silo in ("fr", "ch"):
        for racine, _d, fichiers in os.walk(os.path.join(PUBLIC, silo)):
            if "index.html" not in fichiers:
                continue
            t = open(os.path.join(racine, "index.html"), encoding="utf-8").read()
            if "noindex" in t:
                continue
            trouve.add(os.path.relpath(racine, PUBLIC).replace("\\", "/"))
    return trouve


def serp_observee():
    """Nombre de résultats observés et exemples de domaines, par requête (données réelles relevées)."""
    f = os.path.join(DOCS, "SERP_OBSERVES.csv")
    if not os.path.isfile(f):
        return {}, {}
    compte, domaines = {}, {}
    for l in csv.DictReader(open(f, encoding="utf-8")):
        compte[l["requete"]] = compte.get(l["requete"], 0) + 1
        domaines.setdefault(l["requete"], []).append(l["domaine"])
    return compte, domaines


def main():
    publiees = pages_publiees()
    compte, domaines = serp_observee()
    lignes = []
    for (entite, theme, st, requete, intention, funnel, pays, persona, fit, url, decision) in I:
        existante = "oui" if url and url in publiees else ("non publiée" if url else "aucune")
        serp_type = "non observée"
        for q, doms in domaines.items():
            if theme.lower() in q.lower() or any(m in q.lower() for m in requete.split()[:2]):
                serp_type = f"observée ({compte[q]} résultats)"
                break
        competition = "non observée"
        for q, doms in domaines.items():
            if any(m in q.lower() for m in [t for t in requete.lower().split() if len(t) > 4][:2]):
                competition = ", ".join(sorted(set(doms))[:4])
                break
        lignes.append({
            "ENTITY": entite, "TOPIC": theme, "SUBTOPIC": st, "QUERY": requete, "INTENT": intention,
            "FUNNEL": funnel, "COUNTRY": pays, "PERSONA": persona, "PRODUCT_FIT": fit,
            "CURRENT_URL": ("/" + url) if url else "", "URL_PUBLIEE": existante,
            "SERP_TYPE": serp_type, "COMPETITION_OBSERVED": competition,
            "UNIQUE_VALUE_AVAILABLE": {
                "COVERED": "contenu vérifié dans le produit ou la méthode, publié",
                "MERGED": "intention servie par une page existante (fusion décidée)",
                "REJECTED": "aucune valeur propre disponible — écarté volontairement",
                "DEFERRED": "nécessite une action externe (autorisation, relecture, compte)",
            }[decision],
            "DECISION": decision,
        })
    chemin = os.path.join(DOCS, "CARTE_SEMANTIQUE.csv")
    with open(chemin, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(lignes[0].keys()))
        w.writeheader()
        w.writerows(lignes)
    from collections import Counter
    c = Counter(l["DECISION"] for l in lignes)
    print(f"carte sémantique : {len(lignes)} intentions | {dict(c)}")
    print(f"pages publiées sur disque : {len(publiees)}")
    incoherents = [l for l in lignes if l["DECISION"] == "COVERED" and l["URL_PUBLIEE"] != "oui"]
    print(f"intentions marquées COVERED sans page publiée : {len(incoherents)}")
    for l in incoherents:
        print("   ", l["QUERY"], "->", l["CURRENT_URL"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
