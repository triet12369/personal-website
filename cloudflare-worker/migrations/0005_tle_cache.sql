-- Persist CelesTrak TLE data so the worker only calls upstream at most once
-- every 2 hours, regardless of how many Vercel serverless invocations occur.
CREATE TABLE IF NOT EXISTS tle_cache (
  id         TEXT PRIMARY KEY, -- satellite identifier, e.g. 'ISS'
  line1      TEXT NOT NULL,
  line2      TEXT NOT NULL,
  fetched_at TEXT NOT NULL     -- ISO 8601 UTC timestamp
);
