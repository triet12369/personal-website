import React, { CSSProperties, useEffect, useState } from 'react';

import styles from './FlipName.module.scss';

type FlipNameProps = {
  names: string[];
  /** Milliseconds between flips. Default: 3000 */
  interval?: number;
  style?: CSSProperties;
  className?: string;
};

export const FlipName: React.FC<FlipNameProps> = ({
  names,
  interval = 3000,
  style,
  className,
}) => {
  const [index, setIndex] = useState(0);
  const [flip, setFlip] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % names.length);
      setFlip((f) => f + 1);
    }, interval);
    return () => clearInterval(id);
  }, [interval, names.length]);

  const prev = (index - 1 + names.length) % names.length;
  const isFirst = flip === 0;

  return (
    <span className={[styles.wrapper, className].filter(Boolean).join(' ')} style={style}>
      {!isFirst && (
        <span key={`out-${flip}`} className={styles.exit} aria-hidden="true">
          {names[prev]}
        </span>
      )}
      <span key={`in-${flip}`} className={isFirst ? styles.static : styles.enter}>
        {names[index]}
      </span>
    </span>
  );
};
