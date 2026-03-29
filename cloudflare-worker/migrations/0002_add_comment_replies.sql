-- Migration 0002: add reply threading to comments
-- Adds a self-referencing parent_id column to support unlimited nesting.

ALTER TABLE comments ADD COLUMN parent_id TEXT REFERENCES comments(id);

CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments (parent_id);
