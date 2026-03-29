import { useEffect, useState } from 'react';

/**
 * Fetch (and optionally increment) the view count for a slug.
 *
 * @param increment - When true, sends a POST on mount (increments the counter).
 *                    When false (default), sends a GET (read-only).
 *                    Use `increment=true` only on detail pages, not in listing components.
 */
export function useViews(slug: string, increment = false) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const method = increment ? 'POST' : 'GET';
    fetch(`/api/views/${slug}`, { method })
      .then((r) => r.json())
      .then((data: { count?: number }) => setCount(data.count ?? null))
      .catch(() => {
        // Silently fail — view count is non-critical.
      });
  }, [slug, increment]);

  return { count };
}
