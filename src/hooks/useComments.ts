import { useEffect, useState } from 'react';

export type Comment = {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
};

export function useComments(slug: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/comments/${slug}`)
      .then((r) => r.json())
      .then((data: { comments?: Comment[] }) => setComments(data.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const post = async (input: { author_name: string; body: string }): Promise<Comment> => {
    const res = await fetch(`/api/comments/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const err: { error?: string } = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Failed to post comment');
    }

    const data: { comment: Comment } = await res.json();
    setComments((prev) => [data.comment, ...prev]);
    return data.comment;
  };

  return { comments, loading, post };
}
