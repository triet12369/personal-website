import Link from 'next/link';
import React from 'react';

import { FullName } from '../FlipName/FullName';
import { ROUTES } from '../../routes';

import styles from './NameText.module.scss';

export const NameText = () => {
  return (
    <Link href={ROUTES.HOME.href} passHref legacyBehavior>
      <a className={styles.text}>
        <FullName />
      </a>
    </Link>
  );
};
