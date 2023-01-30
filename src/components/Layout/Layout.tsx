import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { clsx, Group, useMantineColorScheme } from '@mantine/core';
import Head from 'next/head';
import React, { FC, PropsWithChildren } from 'react';

import { TITLE_PREFIX } from '../../config';
import { Github } from '../Navigation/Github';
import { NameText } from '../Navigation/NameText';
import { NavBar } from '../Navigation/NavBar';

type LayoutProps = {
  title?: string;
};

export const Layout: FC<PropsWithChildren<LayoutProps>> = (props) => {
  const { title } = props;
  const { colorScheme } = useMantineColorScheme();
  return (
    <StyledLayout
      className={clsx(colorScheme === 'dark' ? 'animate-to-dark' : 'animate-to-light')}
    >
      <Head>{title && <title>{`${TITLE_PREFIX} | ${title}`}</title>}</Head>
      <StyledHeader>
        <Group spacing="md" align="center" position="center" sx={{ width: '100%' }}>
          <NameText />
          <Github />
        </Group>
        <NavBar isDropdown={false} />
      </StyledHeader>
      {props.children}
      <StyledFooter>My footer</StyledFooter>
    </StyledLayout>
  );
};

const StyledLayout = styled('main')`
  display: grid;
  min-height: 100vh;
  min-height: 100dvh;
  grid-template-rows: auto 1fr auto;
  background-color: transparent;
  background-image: repeating-linear-gradient(
    var(--lightBg),
    var(--lightBg),
    var(--darkBg),
    var(--darkBg)
  );
  background-size: 400% 400%;
  background-position: ${(props) =>
    props.theme.colorScheme === 'light' ? 'top' : 'bottom'};
  transition: background-position 500ms ease;
`;

const StyledHeader = styled('header')`
  position: relative;
  --padding: ${(props) => props.theme.spacing.md}px;
  margin: var(--padding);
  display: flex;
  flex-grow: 1;
  align-items: center;
`;

const StyledFooter = styled('footer')`
  ${(props) =>
    props.theme.colorScheme === 'light'
      ? `color: ${props.theme.colors.dark[0]};
          background-color: ${props.theme.colors.pantone[7]};`
      : `color: ${props.theme.colors.dark[0]};
          background-color: ${props.theme.colors.pantone[7]};`}
`;
