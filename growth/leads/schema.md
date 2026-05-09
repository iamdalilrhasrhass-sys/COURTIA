# Schéma leads COURTIA

Colonnes CSV/JSON normalisées:

- `company_name`
- `contact_name`
- `role`
- `email`
- `phone`
- `website`
- `city`
- `postal_code`
- `department`
- `region`
- `orias_number`
- `specialties`
- `company_size_estimate`
- `source_url`
- `source_name`
- `source_date`
- `lead_score`
- `fit_reason`
- `recommended_offer`
- `status`
- `last_contacted_at`
- `opt_out`
- `notes`

## Valeurs recommandées

- `status`: `a_contacter` | `contacte` | `demo_prevue` | `gagne` | `perdu` | `opt_out`
- `recommended_offer`: `Starter` | `Pro` | `Cabinet/Premium`
- `opt_out`: `true` ou `false`

## Convention données inconnues

- si non disponible: champ vide ou `unknown`
- ne jamais inventer une donnée de contact
- toute ligne sans source publique est non exploitable commercialement
