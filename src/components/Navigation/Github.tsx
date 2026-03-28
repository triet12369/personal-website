import Link from 'next/link';
import React from 'react';
import { AiFillGithub } from 'react-icons/ai';

import styles from './Github.module.scss';

export const Github = () => {
  return (
    <Link href="https://github.com/triet12369" passHref>
      <a className={styles.link}>
        <AiFillGithub fontSize="2rem" />
      </a>
    </Link>
  );
};
