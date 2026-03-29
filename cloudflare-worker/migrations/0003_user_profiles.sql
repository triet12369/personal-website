-- Migration 0003: user identity profiles and name history
-- Enables per-browser identity via a localStorage UUID token.
-- All past display names are recorded so a history tooltip can be shown.

CREATE TABLE IF NOT EXISTS user_profiles (
  token        TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_name_history (
  id         TEXT PRIMARY KEY,
  token      TEXT NOT NULL,
  name       TEXT NOT NULL,
  changed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS user_name_history_token_idx ON user_name_history (token, changed_at);

ALTER TABLE comments ADD COLUMN user_token TEXT;
ALTER TABLE comments ADD COLUMN is_owner   INTEGER NOT NULL DEFAULT 0;
