import { createTheme } from '@mantine/core';

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

const MY_DEFAULT_THEME = createTheme({
  fontFamily: "'Raleway', -apple-system, BlinkMacSystemFont, sans-serif",
  fontFamilyMonospace: "'Raleway', monospace",
  headings: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontWeight: '400',
  },
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
  components: {
    Modal: {
      styles: {
        // Use dvh so full-screen modals respect mobile browser chrome
        inner: { height: '100dvh' },
        content: { maxHeight: '100dvh' },
      },
    },
  },
});

export default MY_DEFAULT_THEME;
