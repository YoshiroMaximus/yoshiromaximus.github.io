CREATE TABLE IF NOT EXISTS run_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'normal',
  seed TEXT NOT NULL DEFAULT '',
  coins INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_run_scores_by_score ON run_scores(mode, difficulty, score DESC);
CREATE INDEX IF NOT EXISTS idx_run_scores_by_seed ON run_scores(seed, score DESC);
