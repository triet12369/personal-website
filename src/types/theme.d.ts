/* eslint-disable @typescript-eslint/no-empty-interface */
import '@emotion/react';
import type { DefaultMantineColor, MantineTheme } from '@mantine/core';

// type MyMantineThemeOverride = {
//   colors: MantineThemeOriginal['colors'] & {
//     pantone: [
//       string,
//       string,
//       string,
//       string,
//       string,
//       string,
//       string,
//       string,
//       string,
//       string,
//     ];
//   };
// };

declare module '@emotion/react' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface Theme extends MantineTheme {}
}

type ExtendedCustomColorName = 'pantone' | DefaultMantineColor;
type ExtendedCustomColors = Record<
  ExtendedCustomColorName,
  [string, string, string, string, string, string, string, string, string, string]
>;

type MantineThemeBaseExtended = Omit<MantineTheme, 'fn'> & {
  colors: ExtendedCustomColors;
};

type MantineThemeExtended = MantineTheme & {
  colors: ExtendedCustomColors;
};

declare module '@mantine/core' {
  // import '@mantine/core';

  export interface MantineThemeColorsOverride {
    colors: ExtendedCustomColors;
  }
  export interface MantineThemeColors {
    colors: ExtendedCustomColors;
  }
  export interface MantineThemeBase extends MantineThemeBaseExtended {}
  export interface MantineTheme extends MantineThemeExtended {}
}
