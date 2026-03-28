import { Group } from '@mantine/core';
import Head from 'next/head';
import React, { FC, PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import { TITLE_PREFIX } from '../../config';
import { Github } from '../Navigation/Github';
import { NameText } from '../Navigation/NameText';
import { NavBar } from '../Navigation/NavBar';

import styles from './Layout.module.scss';
import { useBackgroundSwipe } from './useBackgroundSwipe';

type LayoutProps = {
  title?: string;
};

export const Layout: FC<PropsWithChildren<LayoutProps>> = (props) => {
  const { title } = props;
  const layoutRef = useBackgroundSwipe();
  const { t } = useTranslation();

  return (
    <main ref={layoutRef} className={styles.layout}>
      <Head>{title && <title>{`${TITLE_PREFIX} | ${title}`}</title>}</Head>
      <header className={styles.header}>
        <Group gap="md" align="center" justify="center">
          <NameText />
          <Github />
        </Group>
        <NavBar isDropdown={false} />
      </header>
      {props.children}
      <footer className={styles.footer}>{t('layout.footer')}</footer>
    </main>
  );
};
