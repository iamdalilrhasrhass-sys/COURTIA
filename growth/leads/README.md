# Growth Leads — COURTIA

Pipeline local pour structurer une base prospects courtiers France en mode RGPD-first.

## Arborescence

- `data/` : entrées intermédiaires
- `exports/` : fichiers livrables CSV
- `scripts/` : normalisation, scoring, déduplication, export, validation RGPD
- `schema.md` : schéma de référence
- `sources.md` : cadre des sources publiques
- `RGPD_PROSPECTION.md` : règles de prospection B2B

## Workflow recommandé

1. Import manuel d'un CSV source
2. Normalisation
3. Scoring
4. Déduplication
5. Export final
6. Validation RGPD

## Commandes

```bash
node growth/leads/scripts/import_manual_csv.js <path_source_csv>
node growth/leads/scripts/normalize_leads.js
node growth/leads/scripts/score_leads.js
node growth/leads/scripts/dedupe_leads.js
node growth/leads/scripts/export_leads_csv.js
node growth/leads/scripts/validate_rgpd_fields.js
```

## Important

- Les fichiers `courtia_leads_sample.csv`, `courtia_leads_scored.csv` et `courtia_leads_priority_A.csv`
  sont fournis pour valider le pipeline et sont marqués `SAMPLE_DO_NOT_CONTACT`.
- Ne jamais traiter ces samples comme des leads réels.
