import {
  ActionIcon,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import React from 'react';
import { BsFillMoonStarsFill, BsSunFill } from 'react-icons/bs';

export const ThemeSwitcher = () => {
  const { toggleColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  });

  return (
    <Tooltip
      label={
        computedColorScheme === 'light' ? 'Activate dark mode' : 'Activate light mode'
      }
    >
      <ActionIcon onClick={() => toggleColorScheme()} style={{ color: 'inherit' }}>
        {computedColorScheme === 'light' ? <BsFillMoonStarsFill /> : <BsSunFill />}
      </ActionIcon>
    </Tooltip>
  );
};
