import {
  ActionIcon,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BsFillMoonStarsFill, BsSunFill } from 'react-icons/bs';

export const ThemeSwitcher = () => {
  const { toggleColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  });
  const { t } = useTranslation();

  return (
    <Tooltip
      label={
        computedColorScheme === 'light'
          ? t('theme.activateDark')
          : t('theme.activateLight')
      }
    >
      <ActionIcon
        onClick={() => toggleColorScheme()}
        style={{ color: 'inherit' }}
        variant="transparent"
      >
        {computedColorScheme === 'light' ? <BsFillMoonStarsFill /> : <BsSunFill />}
      </ActionIcon>
    </Tooltip>
  );
};
