-- ============================================================================
-- 103 — Tables du pipeline (kanban) : déclarées par le code, créées par personne
--
-- CONSTAT MESURÉ (20/09/2026) sur une base reconstruite (40 migrations, 0 erreur) :
--   GET /api/kanban  ->  500  « relation "kanban_boards" does not exist »
--
-- backend/src/routes/kanban.js lit et écrit `kanban_boards` et `kanban_cards`
-- depuis l'origine, mais AUCUNE migration, ni schema.sql, ni backend/sql/ ne les
-- créait : le pipeline était donc inaccessible sur toute base neuve (et le reste
-- pour tout cabinet, la route étant en plus verrouillée par une clé de plan
-- inexistante — corrigée séparément dans services/planService.js).
--
-- Les colonnes reprennent exactement ce que le code utilise :
--   kanban_boards : courtier_id (propriétaire), name, columns (JSONB, colonnes du
--                   tableau), created_at
--   kanban_cards  : board_id, column_id, client_id (facultatif), title,
--                   description, position, created_at/updated_at
-- ============================================================================

CREATE TABLE IF NOT EXISTS kanban_boards (
  id SERIAL PRIMARY KEY,
  courtier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kanban_boards_courtier ON kanban_boards(courtier_id);

CREATE TABLE IF NOT EXISTS kanban_cards (
  id SERIAL PRIMARY KEY,
  board_id INTEGER NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
  column_id VARCHAR(80) NOT NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kanban_cards_board ON kanban_cards(board_id, position);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_client ON kanban_cards(client_id);
