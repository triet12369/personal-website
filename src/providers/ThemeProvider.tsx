import { MantineProvider, localStorageColorSchemeManager } from '@mantine/core';
import React, { FC, PropsWithChildren } from 'react';

import MY_DEFAULT_THEME from '../config/theme';
import { LS_KEYS } from '../stores/localStorage';

const colorSchemeManager = localStorageColorSchemeManager({ key: LS_KEYS.THEME });

export const ThemeProvider: FC<PropsWithChildren> = (props) => {
  return (
    <MantineProvider
      theme={MY_DEFAULT_THEME}
      colorSchemeManager={colorSchemeManager}
      defaultColorScheme="dark"
    >
      {props.children}
    </MantineProvider>
  );
};
