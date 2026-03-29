import React from 'react';

import { useViews } from '../../hooks/useViews';
import styles from './ViewCount.module.scss';

type Props = {
  slug: string;
  /** When true, sends POST on mount to record a view (use only on detail pages). */
  increment?: boolean;
};

export const ViewCount: React.FC<Props> = ({ slug, increment = false }) => {
  const { count } = useViews(slug, increment);
  if (count === null) return null;

  return (
    <span className={styles.root} aria-label={`${count} views`}>
      {count} {count === 1 ? 'view' : 'views'}
    </span>
  );
};
