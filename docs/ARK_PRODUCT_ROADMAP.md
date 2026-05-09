# ARK Product Roadmap

## ARK V1 (actuel)

- Dashboard: priorités journalières actionnables
- Morning Brief: plan de journée
- PR9 V1 proactive: `/api/ark/morning-brief` génère au maximum 5 cartes structurées avec action, priorité et cible métier.
- Scoring risque client déterministe: silence, échéance proche, tâches en retard, messages non répondus, mono-contrat.
- Budget ARK: `ark_budgets` + `ark_runs`, cap mensuel par utilisateur/cabinet V1 et suspension propre en 402 si hard cap atteint.
- Recommandations persistées: `ark_recommendations` avec actions `act` / `dismiss`.
- Fallback local: si `ANTHROPIC_API_KEY` est absent, ARK reste utile sans planter et affiche un mode local.
- Signaux intégrations: agenda/WhatsApp affichés quand disponibles
- Fiche client: recommandations de relance et opportunités
- Timeline interactions multi-canaux (agenda, WhatsApp, tâches, contrats)
- Tâches: source ARK visible quand applicable
- Rapports: activité ARK + signaux portefeuille

## ARK V2 (prochaine étape)

- recommandations multi-équipement plus fines
- scoring rétention explicable par segment
- orchestration relances multi-canal validées humainement
- priorisation intra-journée selon fenêtres de contact

## ARK Costs tracking

- exploitation `/admin/costs`
- export CSV mensuel
- alerting seuil budget mensuel
- variables: `ANTHROPIC_API_KEY`, `ARK_DEFAULT_MODEL`, `ARK_LIGHT_MODEL`
- coût stocké en micro-euros dans `ark_runs.cost_micro_eur`

## Conformité

- logs actionnables sans fuite de secrets
- validation humaine pour actions sensibles
- alignement RGPD prospection B2B
- ARK assiste le courtier: aucune recommandation ne remplace le devoir de conseil ou la décision humaine.
