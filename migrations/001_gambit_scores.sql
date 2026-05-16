CREATE TABLE IF NOT EXISTS gambit_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  mode TEXT NOT NULL,
  depth INTEGER NOT NULL,
  gold INTEGER NOT NULL,
  gambits TEXT NOT NULL DEFAULT '[]',
  won INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_scores_by_score ON gambit_scores(mode, difficulty, score DESC);
