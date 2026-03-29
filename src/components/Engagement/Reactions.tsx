import React from 'react';

import { useReactions } from '../../hooks/useReactions';
import styles from './Reactions.module.scss';

const EMOJIS = ['👍', '❤️', '🔥', '🤔', '👏'] as const;

type Props = { slug: string };

export const Reactions: React.FC<Props> = ({ slug }) => {
  const { reactions, react } = useReactions(slug);

  return (
    <div className={styles.root} aria-label="Reactions">
      {EMOJIS.map((emoji) => {
        const count = reactions.find((r) => r.emoji === emoji)?.count ?? 0;
        return (
          <button
            key={emoji}
            type="button"
            className={styles.button}
            onClick={() => react(emoji)}
            aria-label={`React with ${emoji}${count > 0 ? `, ${count} so far` : ''}`}
          >
            <span className={styles.emoji}>{emoji}</span>
            {count > 0 && <span className={styles.count}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
};
