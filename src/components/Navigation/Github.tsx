import Link from 'next/link';
import React from 'react';
import { AiFillGithub } from 'react-icons/ai';

import styles from './Github.module.scss';

export const Github = () => {
  return (
    <Link href="https://github.com/triet12369" passHref legacyBehavior>
      <a className={styles.link} target="_blank" rel="noopener noreferrer">
        <AiFillGithub fontSize="2rem" />
      </a>
    </Link>
  );
};
