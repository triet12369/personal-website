import styled from '@emotion/styled';
import { Group } from '@mantine/core';
import Link from 'next/link';
import React, { FC } from 'react';

import { ROUTES } from '../../routes';
import { ThemeSwitcher } from '../Theme/ThemeSwitcher';

import { NavLabel } from './NavLabel';

type INavBarProps = {
  isDropdown: boolean;
};

export const NavBar: FC<INavBarProps> = (props) => {
  const { isDropdown } = props;

  return (
    <StyledGroup position="right" spacing="md">
      <ThemeSwitcher />
      <Link key={ROUTES.HOME.label} href={ROUTES.HOME.href} passHref>
        <NavLabel isDropdown={isDropdown}>{ROUTES.HOME.label}</NavLabel>
      </Link>
      <Link key={ROUTES.PROJECTS.label} href={ROUTES.PROJECTS.href} passHref>
        <NavLabel isDropdown={isDropdown}>{ROUTES.PROJECTS.label}</NavLabel>
      </Link>
    </StyledGroup>
  );
};

const StyledGroup = styled(Group)`
  position: absolute;
  right: 0;
`;
