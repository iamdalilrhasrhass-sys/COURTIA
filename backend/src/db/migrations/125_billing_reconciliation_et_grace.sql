-- 125_billing_reconciliation_et_grace.sql
--
-- POURQUOI CETTE MIGRATION (défauts mesurés le 22/09/2026, audit Stripe) :
--   1. aucun job ne comparait Stripe et la base : un webhook perdu laissait un
--      cabinet payant sans droits sans que rien ne le signale. On ajoute de quoi
--      CONSERVER le rapport d'une réconciliation (observabilité), jamais de quoi
--      décider à la place de l'exploitant.
--   2. `past_due` était toléré sans borne et SANS DATE de début : impossible de
--      calculer un délai de grâce. On ajoute `past_due_since`.
--   3. les webhooks arrivent dans le désordre (Stripe rejoue, les tentatives se
--      croisent) : on ajoute de quoi mémoriser le DERNIER événement appliqué par
--      abonnement (`last_event_created_at`, `last_event_id`) pour ne jamais
--      écraser un état plus récent par un événement en retard.
--
-- La migration est idempotente (`IF NOT EXISTS`) : elle peut être rejouée.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_event_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_event_id TEXT;

COMMENT ON COLUMN public.subscriptions.past_due_since IS
  'Date de DÉBUT de l''impayé (posée au premier statut past_due, effacée dès le retour en actif). Sert au calcul du délai de grâce configurable (BILLING_GRACE_DAYS) ; tant qu''aucune durée commerciale n''est configurée, l''accès n''est pas coupé.';
COMMENT ON COLUMN public.subscriptions.last_event_created_at IS
  'Horodatage (Stripe `created`) du dernier événement réellement appliqué à cet abonnement. Un événement plus ancien n''écrase rien : c''est la protection contre les webhooks en retard.';
COMMENT ON COLUMN public.subscriptions.last_event_id IS
  'Identifiant du dernier événement appliqué (journalisation et diagnostic).';

CREATE TABLE IF NOT EXISTS public.billing_reconciliation_runs (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  mode VARCHAR(32) NOT NULL DEFAULT 'manuel',
  clients_examines INTEGER NOT NULL DEFAULT 0,
  abonnements_examines INTEGER NOT NULL DEFAULT 0,
  corrections INTEGER NOT NULL DEFAULT 0,
  erreurs INTEGER NOT NULL DEFAULT 0,
  report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_reconciliation_runs_started
  ON public.billing_reconciliation_runs(started_at DESC);

COMMENT ON TABLE public.billing_reconciliation_runs IS
  'Historique des réconciliations Stripe -> base. Le rapport détaillé (JSON) sert à prouver ce qui a été corrigé, sans jamais supprimer d''abonnement ni de donnée client.';
