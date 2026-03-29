import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useMediaQuery } from '@mantine/hooks';

import { useAdminAuth } from '../../hooks/useAdminAuth';
import { Comment, useComments } from '../../hooks/useComments';
import { useUserIdentity } from '../../hooks/useUserIdentity';
import styles from './Comments.module.scss';

// ── Tree building ──────────────────────────────────────────────────────────────

type CommentNode = Comment & { children: CommentNode[] };

function buildTree(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, children: [] });
  }

  for (const node of Array.from(map.values())) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ── Reusable comment form ──────────────────────────────────────────────────────

type CommentFormProps = {
  onSubmit: (input: { author_name: string; body: string }) => Promise<unknown>;
  onCancel?: () => void;
  submitLabel?: string;
  defaultAuthorName?: string | null;
  /** When true the name field is read-only — used for the admin whose name is configured server-side. */
  lockAuthorName?: boolean;
  /** Called with the submitted name after a successful post — used to auto-detect name changes. */
  onAfterSubmit?: (authorName: string) => void;
};

const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  onCancel,
  submitLabel = 'Post comment',
  defaultAuthorName,
  lockAuthorName = false,
  onAfterSubmit,
}) => {
  const [authorName, setAuthorName] = useState(defaultAuthorName ?? '');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when the default name changes (e.g. after an "Edit name" save).
  useEffect(() => {
    if (defaultAuthorName) setAuthorName(defaultAuthorName);
  }, [defaultAuthorName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ author_name: authorName, body });
      onAfterSubmit?.(authorName);
      setAuthorName(defaultAuthorName ?? '');
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <input
        className={styles.input}
        type="text"
        placeholder="Your name"
        value={authorName}
        onChange={lockAuthorName ? undefined : (e) => setAuthorName(e.target.value)}
        required
        maxLength={80}
        disabled={submitting || lockAuthorName}
        autoComplete="name"
        readOnly={lockAuthorName}
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
      <div className={styles.formActions}>
        {onCancel && (
          <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
        <button
          className={styles.submit}
          type="submit"
          disabled={submitting || !authorName.trim() || !body.trim()}
        >
          {submitting ? 'Posting…' : submitLabel}
        </button>
      </div>
    </form>
  );
};

// ── Author line with owner badge, name-history tooltip, edit-name button ──────

type CommentAuthorProps = {
  comment: CommentNode;
  onUpdateName: (newName: string) => Promise<void>;
  onSaveName: (name: string) => void;
};

const CommentAuthor: React.FC<CommentAuthorProps> = ({ comment, onUpdateName, onSaveName }) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.display_name);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const badgeRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Keep edit value fresh if the display_name changes via an optimistic update.
  useEffect(() => {
    if (!editing) setEditValue(comment.display_name);
  }, [comment.display_name, editing]);

  const handleBadgeMouseEnter = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipPos({ top: rect.bottom + 6, left: rect.left });
      setTooltipVisible(true);
    }
  };

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onUpdateName(trimmed);
      onSaveName(trimmed);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className={styles.nameEdit}>
        <input
          className={styles.nameEditInput}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          maxLength={80}
          disabled={saving}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
        <button
          type="button"
          className={styles.submit}
          onClick={handleSave}
          disabled={saving || !editValue.trim()}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => setEditing(false)}
          disabled={saving}
        >
          Cancel
        </button>
        {saveError && <span className={styles.error}>{saveError}</span>}
      </div>
    );
  }

  return (
    <div className={styles.authorWrapper}>
      <span className={styles.author}>{comment.display_name}</span>

      {comment.is_owner && (
        <span className={styles.ownerBadge}>(Owner)</span>
      )}

      {comment.name_history.length > 0 && !comment.is_owner && (
        <>
          <span
            ref={badgeRef}
            className={styles.nameHistoryBadge}
            onMouseEnter={handleBadgeMouseEnter}
            onMouseLeave={() => setTooltipVisible(false)}
          >
            ↻
          </span>
          {mounted && tooltipVisible && createPortal(
            <div
              className={styles.nameHistoryTooltip}
              style={{ top: tooltipPos.top, left: tooltipPos.left }}
            >
              <span className={styles.nameHistoryTitle}>Previously known as:</span>
              {comment.name_history.map((name, i) => (
                <span key={i} className={styles.nameHistoryItem}>{name}</span>
              ))}
            </div>,
            document.body,
          )}
        </>
      )}

      {comment.is_mine && !comment.is_owner && (
        <button
          type="button"
          className={styles.editNameBtn}
          onClick={() => { setEditValue(comment.display_name); setEditing(true); }}
        >
          Edit name
        </button>
      )}
    </div>
  );
};

// ── Single comment node (recursive) ───────────────────────────────────────────

type CommentNodeProps = {
  node: CommentNode;
  depth: number;
  onReply: (parentId: string, input: { author_name: string; body: string }) => Promise<Comment>;
  onDelete: (id: string) => Promise<void>;
  onUpdateName: (newName: string) => Promise<void>;
  onSaveName: (name: string) => void;
  onNameUsed: (name: string) => void;
  isAdmin: boolean;
  defaultAuthorName: string | null;
  lockAuthorName: boolean;
  userToken: string;
  maxDepth: number;
};

const CommentNodeView: React.FC<CommentNodeProps> = ({
  node,
  depth,
  onReply,
  onDelete,
  onUpdateName,
  onSaveName,
  onNameUsed,
  isAdmin,
  defaultAuthorName,
  lockAuthorName,
  userToken,
  maxDepth,
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleReply = async (input: { author_name: string; body: string }) => {
    await onReply(node.id, { ...input, ...(userToken ? { user_token: userToken } : {}) });
    setShowReplyForm(false);
  };

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await onDelete(node.id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const visualDepth = Math.min(depth, maxDepth);

  return (
    <div className={styles.commentWrapper}>
      <div className={styles.comment}>
        <div className={styles.meta}>
          <CommentAuthor
            comment={node}
            onUpdateName={onUpdateName}
            onSaveName={onSaveName}
          />
          <time className={styles.date} dateTime={node.created_at}>
            {new Date(node.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </time>
        </div>
        <p className={styles.body}>{node.body}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.replyBtn}
            onClick={() => setShowReplyForm((v) => !v)}
          >
            {showReplyForm ? 'Cancel' : 'Reply'}
          </button>
          {isAdmin && (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={handleDelete}
              aria-label="Delete comment"
            >
              Delete
            </button>
          )}
        </div>
        {deleteError && <p className={styles.error}>{deleteError}</p>}
      </div>

      {showReplyForm && (
        <div className={styles.replyForm}>
          <CommentForm
            onSubmit={handleReply}
            onAfterSubmit={onNameUsed}
            onCancel={() => setShowReplyForm(false)}
            submitLabel="Post reply"
            defaultAuthorName={defaultAuthorName}
            lockAuthorName={lockAuthorName}
          />
        </div>
      )}

      {node.children.length > 0 && (
        <div className={visualDepth < maxDepth ? styles.childrenList : styles.childrenListFlat}>
          {node.children.map((child) => (
            <CommentNodeView
              key={child.id}
              node={child}
              depth={depth + 1}
              onReply={onReply}
              onDelete={onDelete}
              onUpdateName={onUpdateName}
              onSaveName={onSaveName}
              onNameUsed={onNameUsed}
              isAdmin={isAdmin}
              defaultAuthorName={defaultAuthorName}
              lockAuthorName={lockAuthorName}
              userToken={userToken}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main section ───────────────────────────────────────────────────────────────

type Props = { slug: string };

export const Comments: React.FC<Props> = ({ slug }) => {
  const { token, savedName, saveName } = useUserIdentity();
  const isMobile = useMediaQuery('(max-width: 480px)', true);
  // Desktop allows up to 5 levels; mobile caps at 3 to prevent overflow.
  const maxDepth = isMobile ? 3 : 5;
  // Pass `undefined` while token is empty (still loading from localStorage) so
  // useComments defers its fetch until the identity is known — single request.
  const { comments, loading, post, reply, deleteComment, updateName } = useComments(
    slug,
    token || undefined,
  );
  const { isAdmin, adminName } = useAdminAuth();

  // Admin name takes precedence; fall back to the user's saved display name.
  const defaultAuthorName = adminName ?? savedName ?? null;

  // When a non-admin posts with a name different from the one saved in localStorage,
  // treat it as an intentional name change and propagate it.
  const onNameUsed = (name: string) => {
    const trimmed = name.trim();
    if (isAdmin || !token || !trimmed || trimmed === savedName) return;
    updateName(trimmed).catch(() => {});
    saveName(trimmed);
  };

  const handlePost = (input: { author_name: string; body: string }) =>
    post({ ...input, ...(token ? { user_token: token } : {}) });

  const tree = buildTree(comments);

  return (
    <section className={styles.root}>
      <h2 className={styles.heading}>Comments</h2>

      <CommentForm onSubmit={handlePost} onAfterSubmit={onNameUsed} defaultAuthorName={defaultAuthorName} lockAuthorName={!!adminName} />

      <div className={styles.list}>
        {loading && <p className={styles.empty}>Loading comments…</p>}
        {!loading && comments.length === 0 && (
          <p className={styles.empty}>No comments yet. Be the first!</p>
        )}
        {tree.map((node) => (
          <CommentNodeView
            key={node.id}
            node={node}
            depth={0}
            onReply={reply}
            onDelete={deleteComment}
            onUpdateName={updateName}
            onSaveName={saveName}
            onNameUsed={onNameUsed}
            isAdmin={isAdmin}
            defaultAuthorName={defaultAuthorName}
            lockAuthorName={!!adminName}
            userToken={token}
            maxDepth={maxDepth}
          />
        ))}
      </div>
    </section>
  );
};

