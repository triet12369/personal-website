import { Group } from '@mantine/core';
import Link from 'next/link';
import React, { FC } from 'react';

import { ROUTES } from '../../routes';
import { ThemeSwitcher } from '../Theme/ThemeSwitcher';

import styles from './NavBar.module.scss';
import { NavLabel } from './NavLabel';

type INavBarProps = {
  isDropdown: boolean;
};

export const NavBar: FC<INavBarProps> = (props) => {
  const { isDropdown } = props;

  return (
    <Group justify="flex-end" gap="md" className={styles.group}>
      <ThemeSwitcher />
      <Link key={ROUTES.HOME.label} href={ROUTES.HOME.href} passHref>
        <NavLabel isDropdown={isDropdown}>{ROUTES.HOME.label}</NavLabel>
      </Link>
      <Link key={ROUTES.BLOG.label} href={ROUTES.BLOG.href} passHref>
        <NavLabel isDropdown={isDropdown}>{ROUTES.BLOG.label}</NavLabel>
      </Link>
      <Link key={ROUTES.PROJECTS.label} href={ROUTES.PROJECTS.href} passHref>
        <NavLabel isDropdown={isDropdown}>{ROUTES.PROJECTS.label}</NavLabel>
      </Link>
    </Group>
  );
};
