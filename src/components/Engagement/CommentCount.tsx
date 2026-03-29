import React from 'react';
import { FaRegComment } from 'react-icons/fa';

import { useComments } from '../../hooks/useComments';
import styles from './CommentCount.module.scss';

type Props = { slug: string };

export const CommentCount: React.FC<Props> = ({ slug }) => {
  const { comments, loading } = useComments(slug);
  if (loading) return null;

  return (
    <span className={styles.root} aria-label={`${comments.length} comments`}>
      <FaRegComment className={styles.icon} aria-hidden />
      {comments.length}
    </span>
  );
};
