import React, { useState } from 'react';

import { useComments } from '../../hooks/useComments';
import styles from './Comments.module.scss';

type Props = { slug: string };

export const Comments: React.FC<Props> = ({ slug }) => {
  const { comments, loading, post } = useComments(slug);
  const [authorName, setAuthorName] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await post({ author_name: authorName, body });
      setAuthorName('');
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.root}>
      <h2 className={styles.heading}>Comments</h2>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <input
          className={styles.input}
          type="text"
          placeholder="Your name"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          required
          maxLength={80}
          disabled={submitting}
          autoComplete="name"
        />
        <textarea
          className={styles.textarea}
          placeholder="Leave a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={1000}
          rows={4}
          disabled={submitting}
        />
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.submit} type="submit" disabled={submitting || !authorName.trim() || !body.trim()}>
          {submitting ? 'Posting…' : 'Post comment'}
        </button>
      </form>

      <div className={styles.list}>
        {loading && <p className={styles.empty}>Loading comments…</p>}
        {!loading && comments.length === 0 && (
          <p className={styles.empty}>No comments yet. Be the first!</p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className={styles.comment}>
            <div className={styles.meta}>
              <span className={styles.author}>{comment.author_name}</span>
              <time className={styles.date} dateTime={comment.created_at}>
                {new Date(comment.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </div>
            <p className={styles.body}>{comment.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
