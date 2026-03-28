import { Group } from '@mantine/core';
import Link from 'next/link';
import React, { FC, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ROUTES } from '../../routes';
import { ThemeSwitcher } from '../Theme/ThemeSwitcher';

import { LanguageSwitcher } from './LanguageSwitcher';
import styles from './NavBar.module.scss';
import { NavLabel } from './NavLabel';

type INavBarProps = {
  isDropdown: boolean;
};

export const NavBar: FC<INavBarProps> = (props) => {
  const { isDropdown } = props;
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = (
    <>
      <Link key={ROUTES.HOME.label} href={ROUTES.HOME.href} passHref onClick={() => setIsOpen(false)}>
        <NavLabel isDropdown={isDropdown}>{t('nav.home')}</NavLabel>
      </Link>
      <Link key={ROUTES.BLOG.label} href={ROUTES.BLOG.href} passHref onClick={() => setIsOpen(false)}>
        <NavLabel isDropdown={isDropdown}>{t('nav.blog')}</NavLabel>
      </Link>
      <Link key={ROUTES.PROJECTS.label} href={ROUTES.PROJECTS.href} passHref onClick={() => setIsOpen(false)}>
        <NavLabel isDropdown={isDropdown}>{t('nav.projects')}</NavLabel>
      </Link>
    </>
  );

  return (
    <div ref={menuRef} className={styles.container}>
      {/* Desktop nav */}
      <Group justify="flex-end" gap="md" className={styles.desktopGroup} visibleFrom="sm">
        <ThemeSwitcher />
        <LanguageSwitcher />
        {navLinks}
      </Group>

      {/* Mobile: utility icons always visible + burger */}
      <Group gap="xs" align="center" className={styles.mobileRow} hiddenFrom="sm">
        <ThemeSwitcher />
        <LanguageSwitcher />
        <button
          className={styles.burger}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          <span className={`${styles.burgerLine} ${isOpen ? styles.burgerLineTop : ''}`} />
          <span className={`${styles.burgerLine} ${isOpen ? styles.burgerLineMid : ''}`} />
          <span className={`${styles.burgerLine} ${isOpen ? styles.burgerLineBot : ''}`} />
        </button>
      </Group>

      {/* Mobile dropdown */}
      {isOpen && (
        <div className={styles.dropdown}>
          {navLinks}
        </div>
      )}
    </div>
  );
};
