import {
  ActionIcon,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BsFillMoonStarsFill, BsSunFill } from 'react-icons/bs';

export const ThemeSwitcher = () => {
  const { toggleColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  });
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <Tooltip
      label={
        !mounted || computedColorScheme === 'light'
          ? t('theme.activateDark')
          : t('theme.activateLight')
      }
    >
      <ActionIcon
        onClick={() => toggleColorScheme()}
        style={{ color: 'inherit' }}
        variant="transparent"
        suppressHydrationWarning
      >
        {!mounted || computedColorScheme === 'light' ? <BsFillMoonStarsFill /> : <BsSunFill />}
      </ActionIcon>
    </Tooltip>
  );
};
