# COURTIA — Documents métier DDA

## Objectif

COURTIA aide les courtiers à structurer et tracer les documents métier liés au devoir de conseil :

- FIC — Fiche d'information et de conseil
- Mandat de courtage
- Devoir de conseil
- Attestation / synthèse client

COURTIA ne garantit pas à lui seul la conformité réglementaire complète. Le courtier reste responsable de la validation, de l'adéquation du conseil et de la remise des documents au client.

## Activation

La fonctionnalité est contrôlée par le feature flag :

```txt
v1_dda_documents
```

Si le flag est désactivé pour un cabinet, l'API renvoie un refus propre et l'interface doit afficher un état non destructif.

## Prérequis cabinet

Avant de générer un document, le cabinet doit renseigner au minimum :

- numéro ORIAS
- nom du cabinet
- téléphone ou email de contact

Les informations sont accessibles depuis :

```txt
/parametres#conformite
```

Sans ORIAS, la génération est bloquée avec un message utilisateur clair.

## Routes API

```txt
GET /api/documents
POST /api/documents/generate
GET /api/documents/:id/download
POST /api/documents/:id/archive
```

Payload minimal de génération :

```json
{
  "client_id": 123,
  "type": "fic"
}
```

Types acceptés :

```txt
fic
mandat_courtage
devoir_conseil
attestation
```

## Stockage

La V1 stocke le PDF généré dans la table `documents_blob` avec :

- `document_id`
- `content`
- `mime_type`
- `file_name`

Le document métier est référencé dans `documents`.

## Journalisation

Chaque action importante est tracée :

- table `document_activity_log`
- table transversale `audit_log`

Actions actuelles :

- `generated`
- `archived`

## Statuts

```txt
draft
generated
sent_to_sign
signed
refused
expired
archived
```

La signature électronique Yousign est prévue dans la PR suivante.

## Tests manuels

1. Se connecter comme courtier.
2. Aller dans `/parametres#conformite`.
3. Renseigner ORIAS et infos cabinet.
4. Aller dans `/clients/:id`.
5. Onglet documents.
6. Générer une FIC.
7. Télécharger le PDF.
8. Vérifier la présence du document dans `/documents`, onglet `Documents DDA`.
9. Archiver si nécessaire.

## Limites V1

- PDF simple généré côté backend via PDFKit.
- Pas encore de DOCX natif.
- Pas encore de signature Yousign active dans cette PR.
- Pas d'analyse juridique automatique du contenu.

