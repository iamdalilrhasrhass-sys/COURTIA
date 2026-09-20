# Réconciliation du schéma — migrations 104, 105, 106

Date : 20/09/2026. Dépôt : `/srv/courtia` (branche `demo/real-courtia-guided`).

## 1. Le défaut constaté

La procédure officielle de reconstruction du dépôt

```
scripts/db_rebuild.sh <base>
  = database/schema.sql  (+ 42 fichiers de backend/src/db/migrations, 0 échec, 158 tables)
```

produisait une base que **le code ne pouvait pas utiliser** :

| Mesure (base reconstruite, 158 tables, 0 migration rouge) | Avant | Après |
|---|---|---|
| `scripts/audit_tables_code.py` (tables lues par le code, absentes) | **36** | **0** |
| `scripts/audit_colonnes_code.py` (colonnes utilisées, absentes) | **11** sur 3 tables | **0** |
| Symptôme de départ | `GET /api/auth/me` → **500** `relation "broker_profiles" does not exist` | `GET /api/auth/me` → **200** |
| Tables dans la base | 158 | **196** |

Deux causes, deux classes de correctif — on n'a corrigé que la classe, jamais l'instance,
et **aucune migration historique n'a été éditée** (la production les a déjà appliquées).

## 2. Cause A — un dossier de migrations que rien n'applique

Le dépôt contient **trois** dossiers de migrations :

| Dossier | Fichiers | Appliqué par |
|---|---|---|
| `backend/src/db/migrations` | 42 → **45** | `scripts/db_rebuild.sh`, `backend/scripts/migrate.js` |
| `backend/sql/migrations` | 9 | rejoués par `101_tables_lots_non_appliques.sql` |
| `backend/migrations` | 2 | **AUCUN outil** |

`backend/migrations/20260502_billing_legal_foundation.sql` et
`backend/migrations/20260502_import_jobs.sql` définissaient **15 tables lues par le code**
et créées par rien du tout. Leur DDL existait déjà : il suffisait de la rejouer dans le
dossier réellement appliqué → **`104_tables_billing_legal_import.sql`**.

Preuve que la DDL rejouée n'est pas une interprétation : le code crée lui-même **les mêmes
tables à l'exécution**, colonne par colonne (`backend/src/services/billingService.js:13-200`
pour le lot facturation/légal, `backend/src/services/importService.js:15-45` pour les
imports). Les deux versions ont été comparées avant rejeu.

## 3. Cause B — des tables lues par le code et définies par aucun fichier SQL

25 tables relevées par `scripts/audit_tables_code.py` (puis `/root/ark/detail_tables.py`
pour lire la requête réelle qui les cite). Leur DDL n'existe nulle part dans le dépôt :
elle a été **écrite colonne par colonne à partir des requêtes du code** —
`INSERT INTO t (...)` (liste de colonnes), `UPDATE t SET a = ...`, et `alias.colonne`
dont l'alias est lié dans la même requête. Chaque table et chaque colonne porte sa preuve
`fichier:ligne` en commentaire dans `105_tables_manquantes_code.sql`.

Types déduits de l'usage (jamais devinés) :

| Indice dans le code | Type retenu | Exemple |
|---|---|---|
| `COUNT(*) FILTER (WHERE completed = true)` | `BOOLEAN` | `ark_actions.completed` |
| `NOW() + ($5 \|\| ' days')::INTERVAL` | `TIMESTAMPTZ` | `taches.due_date` |
| `data->>'score'` | `JSONB` | `ark_signals.data` |
| `JSON.stringify(x)` passé en `$n` sans cast | `JSONB` | `dda_audits.checks` |
| `user_id` d'un courtier / `activity.userId` | `INTEGER` | `broker_profiles.user_id` |
| `SUM(valeur_estimee)`, `ORDER BY estimated_impact DESC` | `NUMERIC` | `opportunities.valeur_estimee` |
| `ORDER BY echeance ASC NULLS LAST` (et colonne horodatée) | `TIMESTAMPTZ` | `taches.echeance` |
| valeur lue dans les deux graphies (`priorite` **et** `priority`) | `TEXT` | `taches.priorite` |

Contraintes d'unicité **exigées par le code** (un `ON CONFLICT (colonne)` échoue sans
index unique) — chacune a sa preuve :

| Table | Index unique | Requête qui l'impose |
|---|---|---|
| `tags` | `(courtier_id, name)` | `tags.js:53` |
| `user_email_settings` | `(user_id)` | `emailParser.js:54` |
| `portfolio_preferences` | `(user_id)` | `portfolio.js:488` |
| `dda_audits` | `(client_id)` | `ddaAudit.js:311` |
| `broker_profiles` | `(user_id)` | `auth.js:93` (SELECT puis UPDATE/INSERT) |
| `parsed_emails` | `(message_id)` | `emailParser.js:141` (test d'existence avant insert) |
| `benchmarks_cache` | `(metric_key)` | `analytics.js:223` (lecture par clé) |

## 4. Cause C — tables existantes, colonnes manquantes

`scripts/audit_colonnes_code.py` relevait **11 colonnes** absentes sur 3 tables pourtant
existantes (`opportunites` 7, `client_documents` 2, `quote_requests` 2) →
**`106_colonnes_reclamees_par_le_code.sql`**.

## 5. Correctif de fond : un `NOT NULL` que personne ne remplit

`signature_requests` (créée par `017_v1_yousign_signature.sql`) est **la seule table du lot
qui préexistait** ; le fichier orphelin la redéclarait avec `organization_id INTEGER NOT
NULL`, or **le seul `INSERT` du dépôt** (`signatures.js:66-68`) ne fournit pas cette
colonne : toute demande de signature aurait échoué en 500. La migration 104 déclare la
colonne facultative (`ALTER COLUMN ... DROP NOT NULL`, idempotent) — même classe de
correctif que `102_appointments_organizer_id_facultatif.sql`.

## 6. Idempotence et non-régression en production

- `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` **hors** des `CREATE TABLE`,
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` ;
- les `CREATE TABLE IF NOT EXISTS` de tables déjà présentes (`signature_requests`,
  `claims`) sont complétés par des `ALTER ... ADD COLUMN IF NOT EXISTS` pour que les index
  posés ensuite ne dépendent jamais d'une préexistence supposée ;
- **rejeu mesuré** des 3 migrations sur une base déjà migrée : 0 erreur ;
- aucun `NOT NULL` ajouté sur une colonne que le code n'alimente pas ; aucune migration
  historique modifiée.

## 7. Preuves exécutées (20/09/2026)

| Contrôle | Résultat |
|---|---|
| `scripts/db_rebuild.sh courtia_recon_105` | 45 migrations, **0 rouge**, **196 tables** (avant : 42 / 158) |
| `scripts/audit_tables_code.py` | **0** table manquante |
| `scripts/audit_colonnes_code.py` | **0** colonne manquante |
| `scripts/check_sql_postgres.py` | 0 constat sur les 3 nouvelles migrations (12 constats préexistants dans `101_...`) |
| `GET /api/auth/me` après inscription | **200** (le symptôme de départ était 500) |
| `qa_onboarding.py` | 11/11 |
| `qa_parcours_client.py` | 15/15 |
| `qa_documents.py` | 13/13 |
| `qa_taches_kanban_ark.py` | 19/19 |
| `qa_essai_cycle.py <base>` (2ᵉ argument obligatoire) | **32/32** |
| `npx jest` | 29 suites, **96 tests, 0 échec** |

## 8. Objets écartés faute de preuve (rien n'est inventé)

- **`title`** (table `taches`) : vu uniquement comme **alias** `titre as title`
  (`ark.js:260`) — la vraie colonne est `titre`. Non créée.
- **`status` / `priority` / `due_date`** : créés pour `taches` **uniquement** parce qu'ils
  existent ailleurs comme vraies colonnes (`adminSuperAdmin.js:504` `t.status != 'done'`,
  `arkVoice.js:254` `INSERT (... priority, due_date ...)`), pas à cause des alias.
- **`generated_at`** (`portfolio_insights`) : alias calculé (`portfolioSchema.js:32`),
  pas une colonne. La table déclare `created_at`, que `portfolioSchema.js:4` retient comme
  colonne d'horodatage valide → le code l'utilise automatiquement.
- **`notes.user_id`**, **`contrats.date_echeance`**, **`client_conformite.*` autres champs** :
  aucune requête ne les cite → non créés.
- **`client_conformite.capacite_evaluee` / `questionnaire_besoins_signe` /
  `devoir_conseil_rempli`** : testés par leur véracité (`||`) et non comparés à un
  booléen ; typés `BOOLEAN` d'après le nom (participe passé = drapeau). Type **non
  contredit** par le code, mais non prouvé par une comparaison booléenne explicite.
- **`claims`** (`contract_id`, `ark_summary`) : table déjà présente via `database/schema.sql`,
  rejouée à l'identique et gardée.
- Divergence **relevée et non corrigée** : `backend/migrations/20260502_billing_legal_foundation.sql`
  sème les plans `starter/pro/premium`, le code (`billingService.js:65`) sème aussi
  `cabinet` (`ON CONFLICT (code) DO UPDATE`). La migration rejoue le fichier du dépôt tel
  quel ; le plan `cabinet` est ajouté par le code au premier passage.

## 9. Faux positifs de l'outil d'audit (corrigés dans l'outil, pas dans la base)

`scripts/audit_tables_code.py` signalait 3 « tables » qui sont en réalité des **colonnes
ou des alias** ; le script a été corrigé (deux écarts ajoutés) :

| Signalé | Réalité | Preuve |
|---|---|---|
| `ecriture_date` | colonne de `accounting_entries` | `fecService.js:266` (`FROM accounting_entries`) + `EXTRACT(YEAR FROM ecriture_date)` |
| `sent_at` | colonne de `reach_messages` | `reach.js:1349` `EXTRACT(DOW FROM sent_at)` sous `FROM reach_messages` |
| `q` | **alias** de `quotes` | `hamon.js:25` `FROM quotes q` |

Écarts ajoutés : (1) un identifiant lié comme alias dans la même requête est écarté ;
(2) un `FROM` situé **à l'intérieur d'un appel de fonction** (`EXTRACT(... FROM x)`) est
écarté — la remontée s'arrête à la parenthèse ouvrante non fermée et ne rejette une table
que si elle est précédée d'un nom de fonction connu, pour ne pas perdre les sous-requêtes
légitimes (`IN (SELECT ... FROM vraie_table ...)`).

## 10. Fichiers

| Fichier | Contenu |
|---|---|
| `backend/src/db/migrations/104_tables_billing_legal_import.sql` | rejeu des 2 fichiers orphelins + colonnes de `signature_requests` réclamées par le code + `organization_id` rendu facultatif |
| `backend/src/db/migrations/105_tables_manquantes_code.sql` | 25 tables lues par le code, DDL écrite depuis les requêtes (preuves en commentaire) |
| `backend/src/db/migrations/106_colonnes_reclamees_par_le_code.sql` | 11 colonnes sur `opportunites`, `client_documents`, `quote_requests` |
| `backend/src/db/migrations/README_RECONCILIATION_104.md` | ce rapport |
| `scripts/audit_tables_code.py` | + 2 écarts de faux positifs (alias, `FROM` dans un appel de fonction) |
