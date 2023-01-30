import { ColorScheme } from '@mantine/core';

export const LS_PREFIX = 'TCPAGE_';

/**
 * Local Storage keys
 */
export const LS_KEYS = {
  THEME: `${LS_PREFIX}THEME`,
} as const;

export const getCurrentTheme = (): ColorScheme | null => {
  if (typeof localStorage === 'undefined') return null;
  const theme = localStorage.getItem(LS_KEYS.THEME);
  if (theme === 'light' || theme === 'dark') return theme;
  return null;
};

export const setCurrentTheme = (scheme: ColorScheme) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LS_KEYS.THEME, scheme);
};
