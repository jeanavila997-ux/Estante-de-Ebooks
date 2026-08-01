export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  note        TEXT,
  theme       TEXT,
  sort_order  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ebooks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  kind         TEXT,
  description  TEXT,
  file_path    TEXT,
  cover_color  TEXT,
  status       TEXT DEFAULT 'rascunho' CHECK(status IN ('rascunho','pronto','publicado','verificar')),
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ebooks_category ON ebooks(category_id);
CREATE INDEX IF NOT EXISTS idx_ebooks_status   ON ebooks(status);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT DEFAULT 'user' CHECK(role IN ('admin','user')),
  theme         TEXT DEFAULT 'light',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login    DATETIME
);

CREATE TABLE IF NOT EXISTS user_ebooks (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ebook_id   INTEGER NOT NULL REFERENCES ebooks(id) ON DELETE CASCADE,
  progress   INTEGER DEFAULT 0,
  last_read  DATETIME,
  PRIMARY KEY (user_id, ebook_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;