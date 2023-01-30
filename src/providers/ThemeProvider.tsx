import { ColorScheme, ColorSchemeProvider, MantineProvider } from '@mantine/core';
import React, { FC, PropsWithChildren, useCallback, useEffect, useState } from 'react';

import MY_DEFAULT_THEME from '../config/theme';
import { getCurrentTheme, setCurrentTheme } from '../stores/localStorage';

export const ThemeProvider: FC<PropsWithChildren> = (props) => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    getCurrentTheme() || 'light',
  );
  const [mounted, setMounted] = useState(false);

  const toggleColorScheme = useCallback((value: ColorScheme) => {
    setColorScheme((oldScheme) => {
      const newValue = value || oldScheme === 'dark' ? 'light' : 'dark';
      setCurrentTheme(newValue);
      return newValue;
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <></>;

  return (
    <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
      <MantineProvider
        withGlobalStyles
        withNormalizeCSS
        theme={{
          /** Put your mantine theme override here */
          colorScheme,
          ...MY_DEFAULT_THEME,
        }}
      >
        {props.children}
      </MantineProvider>
    </ColorSchemeProvider>
  );
};
