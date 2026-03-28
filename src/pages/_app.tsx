/* eslint-disable @next/next/no-before-interactive-script-outside-document */
import '@mantine/core/styles.css';
import '../styles/global.css';

import { AppProps } from 'next/app';
import Head from 'next/head';

import { TITLE_PREFIX } from '../config';
import { LanguageProvider } from '../providers/LanguageProvider';
import { ThemeProvider } from '../providers/ThemeProvider';

export default function App(props: AppProps) {
  const { Component, pageProps } = props;

  return (
    <>
      <Head>
        <title>{TITLE_PREFIX}</title>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width"
        />
      </Head>
      <ThemeProvider>
        <LanguageProvider>
          <Component {...pageProps} />
        </LanguageProvider>
      </ThemeProvider>
    </>
  );
}
