# Ontologie du marché « courtier en assurance » — COURTIA

Construite le 22/09/2026 pour décider **quelles intersections méritent une URL** et lesquelles n'en
méritent pas. Chaque statut est justifié : soit une page publiée, soit un refus argumenté.

Règle appliquée (dans le code, pas dans le modèle) : une page n'est créée que si
**(1)** le jugement TypeSafe/JEV estime l'intention distincte avec une probabilité ≥ 0,70 **ET**
**(2)** le produit couvre réellement le sujet (vérification dans le code). Aucune exception.

## 1. Dimensions de l'ontologie

| Dimension | Valeurs |
|---|---|
| Métier | courtier généraliste · courtier IARD · santé · prévoyance · emprunteur · mutuelle · TNS/indépendants · grossiste · mandataire · multi-agences |
| Problème | gagner du temps · réduire l'administratif · ne rien laisser passer · retrouver l'information · prioriser |
| Fonction | dossier client · contrats/échéances · devis · relances · pièces · commissions · documents · tâches · pilotage · conformité |
| Produit | logiciel de courtage · CRM courtier · automatisation · assistant IA |
| IA | briefing · synthèse · priorisation · préparation d'appel · brouillons · lecture de pièces · veille · voix |
| Réglementation | France : ORIAS, DDA, devoir de conseil, LCB-FT, RGPD · Suisse : LSA, registre FINMA, nLPD |
| Segment | courtier seul · cabinet 2-10 · structure multi-agences · réseau |
| Type d'assurance | auto · habitation · flotte · RC pro · santé · prévoyance · emprunteur |
| Taille de cabinet | 1 · 2-5 · 6-10 · 11-20 · 20+ |
| Pays / langue | France (EUR, fr-FR) · Suisse romande (CHF, fr-CH) · Suisse alémanique et italienne (non publié) |
| Intention | commerciale-outil · problème · fonction · IA · réglementaire · comparaison · méthode |
| Étape | découvrir · comparer · essayer · mettre en place · exploiter |

## 2. Décisions par intersection candidate (appel `ontologie_et_frictions`, 22/09/2026)

| Intersection candidate | Jugement JEV (`noul`) | Couverture produit | Statut |
|---|---|---|---|
| Devis d'assurance (France) | distincte — 0,75 | oui (parcours devis, registre, signature) | **PUBLIÉE** `/fr/logiciel-devis-courtier-assurance` |
| Mesurer le temps administratif | distincte — 0,77 | oui (méthode non chiffrée) | **PUBLIÉE** `/fr/mesurer-temps-administratif-cabinet` |
| Sinistres (France) | distincte — 0,69 (sous le seuil) | oui (suivi de sinistres dans le code) | **REFUSÉE pour l'instant** — à réévaluer par un appel dédié |
| Conformité produit (France) | distincte — 0,51 | oui | **REFUSÉE** (sous le seuil ; les 10 guides réglementaires couvrent déjà l'intention) |
| Migration / changement de logiciel | distincte — 0,57 | oui (import de portefeuille) | **REFUSÉE** (sous le seuil) |
| Courtier indépendant (persona) | distincte — 0,51 | oui | **REFUSÉE** (sous le seuil ; les pages métier et commerciales le couvrent) |
| Migration (Suisse) | distincte — 0,58 | oui | **REFUSÉE** (sous le seuil) |
| Portail client | non distincte — 0,42 | oui | **REFUSÉE** (intention non distincte) |
| Sinistres (Suisse) | non distincte — 0,47 | oui | **REFUSÉE** |
| Appels d'offres / mandats (Suisse) | non distincte — 0,33 | **non** (pas dans le produit) | **REFUSÉE deux fois** : intention faible et sujet non couvert par COURTIA |
| Pages géographiques de masse | NON — 0,37 (« existe-t-il une déclinaison à valeur propre réelle à grande échelle ? ») | — | **INTERDITE** : aucune génération en série |

## 3. Pourquoi l'ontologie ne produit pas de pages

L'ontologie sert d'abord à **refuser**. Sur onze intersections examinées, deux ont été publiées et
neuf refusées. C'est le résultat attendu : un marché n'a pas besoin de cent pages, il a besoin des
pages qui répondent à une intention distincte avec un produit qui tient la promesse.
