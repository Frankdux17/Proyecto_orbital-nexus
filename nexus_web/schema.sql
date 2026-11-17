CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'explorer' CHECK (role IN ('explorer', 'admin')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS missions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  program     TEXT    NOT NULL,
  destination TEXT    NOT NULL,
  objective   TEXT    NOT NULL DEFAULT '',
  mass_kg     REAL    NOT NULL,
  budget_musd REAL    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'borrador',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_missions_user ON missions (user_id);
