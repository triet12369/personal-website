import { Group } from '@mantine/core';
import Head from 'next/head';
import React, { FC, PropsWithChildren, useEffect, useState } from 'react';

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
  blurBackground?: boolean;
  disableNebula?: boolean;
};

export const Layout: FC<PropsWithChildren<LayoutProps>> = (props) => {
  const { title, blurBackground, disableNebula } = props;
  const [scrolled, setScrolled] = useState(false);
  // const layoutRef = useBackgroundSwipe();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main className={styles.layout}>
      <StarBackground nebulaDisabled={disableNebula} />
      <Head>{title && <title>{`${TITLE_PREFIX} | ${title}`}</title>}</Head>
      <header className={`${styles.header}${scrolled ? ` ${styles.headerScrolled}` : ''}`}>
        <Group gap="md" align="center" justify="center">
          <NameText />
          <Github />
        </Group>
        <NavBar isDropdown={false} />
      </header>
      <div className={blurBackground ? styles.contentBlur : undefined} style={{ position: 'relative' }}>
        {props.children}
      </div>
      <Footer />
    </main>
  );
};
