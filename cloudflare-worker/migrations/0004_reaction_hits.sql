-- Migration 0004: deduplication table for reactions.
-- One reaction increment per IP per emoji per day per slug (same pattern as view_hits).
-- Raw IPs are never stored — only a daily-rotating SHA-256 hash.
CREATE TABLE IF NOT EXISTS reaction_hits (
  slug    TEXT NOT NULL,
  emoji   TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  date    TEXT NOT NULL,
  PRIMARY KEY (slug, emoji, ip_hash, date)
);
