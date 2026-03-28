import { Group } from '@mantine/core';
import Head from 'next/head';
import React, { FC, PropsWithChildren } from 'react';

import { TITLE_PREFIX } from '../../config';
import { Github } from '../Navigation/Github';
import { NameText } from '../Navigation/NameText';
import { NavBar } from '../Navigation/NavBar';
import { StarBackground } from '../StarBackground/StarBackground';

import { Footer } from './Footer';
import styles from './Layout.module.scss';
// import { useBackgroundSwipe } from './useBackgroundSwipe';

type LayoutProps = {
  title?: string;
};

export const Layout: FC<PropsWithChildren<LayoutProps>> = (props) => {
  const { title } = props;
  // const layoutRef = useBackgroundSwipe();

  return (
    <main className={styles.layout}>
      <StarBackground />
      <Head>{title && <title>{`${TITLE_PREFIX} | ${title}`}</title>}</Head>
      <header className={styles.header}>
        <Group gap="md" align="center" justify="center">
          <NameText />
          <Github />
        </Group>
        <NavBar isDropdown={false} />
      </header>
      {props.children}
      <Footer />
    </main>
  );
};
