import React from 'react';
import { BsGithub } from 'react-icons/bs';

import { FullName } from '../FlipName/FullName';

import styles from './Footer.module.scss';

const CURRENT_YEAR = new Date().getFullYear();

export const Footer: React.FC = () => (
  <footer className={styles.footer}>
    <span>© {CURRENT_YEAR} <FullName /></span>
    <a
      href="https://github.com/triet12369"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="GitHub"
      className={styles.iconLink}
    >
      <BsGithub size={16} />
    </a>
  </footer>
);
