-- 125_billing_reconciliation_et_grace.down.sql
-- Retour arrière : on ne supprime QUE ce que la migration a ajouté.
-- Aucune donnée client ni aucun abonnement n'est touché.

DROP INDEX IF EXISTS public.idx_billing_reconciliation_runs_started;
DROP TABLE IF EXISTS public.billing_reconciliation_runs;

ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS last_event_id,
  DROP COLUMN IF EXISTS last_event_created_at,
  DROP COLUMN IF EXISTS past_due_since;
