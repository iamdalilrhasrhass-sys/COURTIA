# Localisation Suisse alémanique (de-CH) et italienne (it-CH) — plan, terminologie, bloquage qualité

Décision TypeSafe/JEV du 22/09/2026 (passe A, `secteurs_geographiques_suisses`) :
**`documenter_seulement`** — 0,71 de probabilité, confiance 0,62. Autrement dit : préparer, ne pas
publier. La passe F (red team Suisse) confirme que l'absence de contenu alémanique est un manque
réel (0,44) mais avec une confiance faible (0,33), et la règle de qualité de COURTIA interdit la
traduction automatique.

## 1. Pourquoi ne pas publier maintenant

Les 19 pages suisses françaises ont été écrites avec le vocabulaire du marché (preneur d'assurance,
intermédiaire, journal de conseil, canton, UID) et un contenu propre. Une traduction automatique
produirait l'inverse : un français traduit mot à mot, avec des termes qui n'ont pas cours en Suisse
alémanique, et un texte identique à la version romande — exactement le motif que nous avons retiré de
l'index en France (1 065 pages locales en `noindex`).

Trois conditions doivent être réunies avant toute publication en allemand ou en italien :

1. **Terminologie vérifiée** avec des sources du marché : les termes d'assurance et de courtage
   diffèrent réellement (voir §2), et une erreur de vocabulaire est immédiatement visible pour un
   professionnel.
2. **Contenu propre**, pas une traduction : obligations, pratique des compagnies, rôle des courtiers
   grossistes et organisation des cabinets diffèrent entre la Suisse romande et alémanique.
3. **Relecture par un professionnel** du marché visé. Sans cela, nous préférons ne rien publier.

## 2. Terminologie à vérifier avant toute rédaction (pistes, à valider)

| Français (CH-romand) | Allemand (à valider) | Italien (à valider) |
|---|---|---|
| intermédiaire d'assurance | Versicherungsvermittler | intermediario assicurativo |
| courtier en assurance | Versicherungsbroker / -makler | broker assicurativo |
| preneur d'assurance | Versicherungsnehmer | contraente |
| journal de conseil | Beratungsprotokoll | verbale di consulenza |
| registre FINMA | FINMA-Register | registro FINMA |
| UID | UID (Unternehmens-Identifikationsnummer) | IDI (numero d'identificazione delle imprese) |
| prime | Prämie | premio |
| échéance | Verfall / Ablauf | scadenza |
| décompte de courtage | Courtage-Abrechnung | liquidazione provvigioni |

> Cette table est un **point de départ de travail**, pas une traduction validée. Chaque terme doit
> être confronté à des sources du marché (éditeurs suisses alémaniques, associations
> professionnelles, publications spécialisées) avant d'être utilisé sur une page publique.

## 3. Architecture prévue (identique en structure, différente en contenu)

```
/de/                                     hub alémanique
/de/versicherungsbroker-software         pilier commercial
/de/crm-versicherungsbroker              dossier client et journal de conseil
/de/automatisierung-versicherungsbroker   automatisation du cabinet
/de/beratungsprotokoll                   journal de conseil et obligations d'information
/de/finma-register-versicherungsvermittler  registre et cadre applicable

/it/                                     hub italien (Tessin)
/it/software-broker-assicurativo         pilier commercial
/it/crm-broker-assicurativo              dossier client
/it/registro-finma-intermediario         cadre applicable
```

## 4. `hreflang` : la règle de mise en œuvre

- Les pages françaises existantes ne changent pas : `hreflang="fr-CH"` sur les pages `/ch/…`,
  référencement croisé automatique une fois les versions `de` et `it` publiées.
- Les nouvelles versions porteront `hreflang="de-CH"` et `hreflang="it-CH"`, avec un
  `x-default` pointant sur la version française tant qu'elle reste la plus complète.
- Aucun `hreflang` ne sera posé tant que la page cible n'existe pas réellement : un `hreflang` vers
  une page absente est une erreur technique, pas un plan.

## 5. Ce qui débloquerait la localisation

1. Un relecteur professionnel du marché alémanique (puis tessinois), ou
2. des sources terminologiques officielles et récentes du marché suisse alémanique, permettant une
   rédaction sourcée, ou
3. l'autorisation d'une relecture externe rémunérée (dépense → décision du dirigeant).

Tant qu'aucune de ces conditions n'est remplie, le silo suisse reste francophone, et cette page
documente le blocage plutôt que de le masquer.
