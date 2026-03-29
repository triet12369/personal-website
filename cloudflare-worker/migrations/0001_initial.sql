-- Migration 0001: initial schema
-- This is the baseline migration that creates all tables from scratch.

CREATE TABLE IF NOT EXISTS views (
  slug  TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

-- Deduplication: one view increment per IP per day per slug.
-- Raw IPs are never stored — only a daily-rotating SHA-256 hash.
CREATE TABLE IF NOT EXISTS view_hits (
  slug    TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  date    TEXT NOT NULL,
  PRIMARY KEY (slug, ip_hash, date)
);

CREATE TABLE IF NOT EXISTS reactions (
  slug  TEXT NOT NULL,
  emoji TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (slug, emoji)
);

CREATE TABLE IF NOT EXISTS comments (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL,
  author_name TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  approved    INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS comments_slug_idx ON comments (slug, approved, created_at);
