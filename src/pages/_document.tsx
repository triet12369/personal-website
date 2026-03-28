import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { Head, Html, Main, NextScript } from 'next/document';

import { LS_KEYS } from '../stores/localStorage';

export default function Document() {
  return (
    <Html lang="en" {...mantineHtmlProps}>
      <Head>
        <ColorSchemeScript defaultColorScheme="dark" localStorageKey={LS_KEYS.THEME} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Raleway:ital,wght@0,200;0,300;0,400;0,500;0,600;1,300&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
