import { Group } from '@mantine/core';
import Link from 'next/link';
import React, { FC } from 'react';
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

  return (
    <Group justify="flex-end" gap="md" className={styles.group}>
      <ThemeSwitcher />
      <LanguageSwitcher />
      <Link key={ROUTES.HOME.label} href={ROUTES.HOME.href} passHref>
        <NavLabel isDropdown={isDropdown}>{t('nav.home')}</NavLabel>
      </Link>
      <Link key={ROUTES.BLOG.label} href={ROUTES.BLOG.href} passHref>
        <NavLabel isDropdown={isDropdown}>{t('nav.blog')}</NavLabel>
      </Link>
      <Link key={ROUTES.PROJECTS.label} href={ROUTES.PROJECTS.href} passHref>
        <NavLabel isDropdown={isDropdown}>{t('nav.projects')}</NavLabel>
      </Link>
    </Group>
  );
};
