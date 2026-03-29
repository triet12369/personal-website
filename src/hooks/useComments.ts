import { useEffect, useState } from 'react';

export type Comment = {
  id: string;
  author_name: string;
  /** Resolved display name — from user_profiles if the user has one, else author_name. */
  display_name: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  /** Set by the server; only true for the site owner's comments. */
  is_owner: boolean;
  /** True when this comment was posted by the viewer's browser identity. */
  is_mine: boolean;
  /** Previous display names for this comment's author, most-recent first. */
  name_history: string[];
};

type PostInput = {
  author_name: string;
  body: string;
  user_token?: string;
};

/**
 * Fetches and manages comments for a post.
 *
 * @param slug       Post slug.
 * @param viewerToken  The browser's user_token from useUserIdentity.
 *                     Pass `undefined` while the token is still loading to
 *                     delay the initial fetch (avoids a double-request).
 */
export function useComments(slug: string, viewerToken?: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait until the identity token has been read from localStorage.
    if (viewerToken === undefined) return;

    setLoading(true);
    fetch(`/api/comments/${slug}`, {
      headers: viewerToken ? { 'X-Viewer-Token': viewerToken } : {},
    })
      .then((r) => r.json())
      .then((data: { comments?: Comment[] }) => setComments(data.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, viewerToken]);

  const post = async (input: PostInput): Promise<Comment> => {
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
    setComments((prev) => [...prev, data.comment]);
    return data.comment;
  };

  const reply = async (parentId: string, input: PostInput): Promise<Comment> => {
    const res = await fetch(`/api/comments/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, parent_id: parentId }),
    });

    if (!res.ok) {
      const err: { error?: string } = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Failed to post reply');
    }

    const data: { comment: Comment } = await res.json();
    setComments((prev) => [...prev, data.comment]);
    return data.comment;
  };

  const deleteComment = async (id: string): Promise<void> => {
    const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });

    if (!res.ok) {
      const err: { error?: string } = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Failed to delete comment');
    }

    // Optimistically remove the deleted comment and all its descendants.
    setComments((prev) => {
      const idsToRemove = new Set<string>();
      const collectDescendants = (parentId: string) => {
        for (const c of prev) {
          if (c.parent_id === parentId) {
            idsToRemove.add(c.id);
            collectDescendants(c.id);
          }
        }
      };
      idsToRemove.add(id);
      collectDescendants(id);
      return prev.filter((c) => !idsToRemove.has(c.id));
    });
  };

  /**
   * Updates the display name for all comments belonging to the viewer.
   * Makes the server call then applies an optimistic state update so the UI
   * reflects the change immediately without a re-fetch.
   */
  const updateName = async (newName: string): Promise<void> => {
    if (!viewerToken) throw new Error('No viewer token');

    const res = await fetch(`/api/users/${encodeURIComponent(viewerToken)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: newName }),
    });

    if (!res.ok) {
      const err: { error?: string } = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Failed to update name');
    }

    // Optimistically update all comments owned by this viewer.
    setComments((prev) =>
      prev.map((c) => {
        if (!c.is_mine) return c;
        const newHistory =
          c.display_name && c.display_name !== newName
            ? [c.display_name, ...c.name_history]
            : c.name_history;
        return { ...c, display_name: newName, name_history: newHistory };
      }),
    );
  };

  return { comments, loading, post, reply, deleteComment, updateName };
}
