import { useEffect, useState } from 'react';

type Reaction = { emoji: string; count: number };

export function useReactions(slug: string) {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    fetch(`/api/reactions/${slug}`)
      .then((r) => r.json())
      .then((data: { reactions?: Reaction[] }) => setReactions(data.reactions ?? []))
      .catch(() => {});
  }, [slug]);

  const react = async (emoji: string) => {
    // Optimistic update immediately, then sync with server response.
    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      if (existing) {
        return prev.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1 } : r));
      }
      return [...prev, { emoji, count: 1 }];
    });

    try {
      const res = await fetch(`/api/reactions/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      const data: { reactions?: Reaction[] } = await res.json();
      if (data.reactions) setReactions(data.reactions);
    } catch {
      // Optimistic update stands if the request fails.
    }
  };

  return { reactions, react };
}
