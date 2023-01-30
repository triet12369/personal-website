/* eslint-disable @next/next/no-before-interactive-script-outside-document */
import { MantineProvider } from '@mantine/core';
import { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';

import { TITLE_PREFIX } from '../config';
import { COLOR_PANTONE_ARRAY } from '../config/theme';
import { ThemeProvider } from '../providers/ThemeProvider';
import { LS_KEYS } from '../stores/localStorage';

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
      {/* https://stackoverflow.com/questions/71277655/prevent-page-flash-in-next-js-12-with-tailwind-css-class-based-dark-mode */}
      <Script id="init-theme" strategy="beforeInteractive">
        {`const theme = localStorage.getItem('${LS_KEYS.THEME}') || 'light';
          if (theme === 'dark') {
            const htmlEl = document.querySelector('html');
            if (htmlEl) {
              htmlEl.classList.add('dark');
              htmlEl.style.backgroundColor = '${COLOR_PANTONE_ARRAY[9]}';
            }
        }`}
      </Script>

      <ThemeProvider>
        <Component {...pageProps} />
      </ThemeProvider>
    </>
  );
}
