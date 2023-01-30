//common across

import { MantineThemeOverride } from '@mantine/core';

export const COLOR_PANTONE = 'pantone' as const;

export const COLOR_PANTONE_ARRAY = [
  '#f6f4f3',
  '#e3dfdb',
  '#d1cac3',
  '#beb5ab',
  '#aca093',
  '#9a8b7b',
  '#847665',
  '#6c6053',
  '#544b40',
  '#3c362e',
] as const;

const MY_DEFAULT_THEME: MantineThemeOverride = {
  fontFamily:
    '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji',
  colors: {
    [COLOR_PANTONE]: COLOR_PANTONE_ARRAY as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ],
  },
  primaryColor: COLOR_PANTONE,
  loader: 'dots',
  globalStyles: (theme) => {
    const darkBg = theme.fn.darken(COLOR_PANTONE_ARRAY[9], 0.5);
    const lightBg = COLOR_PANTONE_ARRAY[0];
    const backgroundColor = theme.colorScheme === 'dark' ? darkBg : lightBg;
    return {
      body: {
        transitionProperty: 'color, background-color',
        transitionDuration: '300ms',
        transitionTimingFunction: theme.transitionTimingFunction,
        backgroundColor,
        /**
         * global variables
         */
        '--backgroundColor': backgroundColor,
        '--lightBg': lightBg,
        '--darkBg': darkBg,
      },
    };
  },
};

export default MY_DEFAULT_THEME;
