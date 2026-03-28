import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { Head, Html, Main, NextScript } from 'next/document';

import { LS_KEYS } from '../stores/localStorage';

export default function Document() {
  return (
    <Html lang="en" {...mantineHtmlProps}>
      <Head>
        <ColorSchemeScript defaultColorScheme="light" localStorageKey={LS_KEYS.THEME} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
