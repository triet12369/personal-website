import { ActionIcon, ColorScheme, Tooltip, useMantineColorScheme } from '@mantine/core';
import React from 'react';
import { BsFillMoonStarsFill, BsSunFill } from 'react-icons/bs';

export const ThemeSwitcher = () => {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  return (
    <Tooltip label={getTooltipText(colorScheme)}>
      <ActionIcon onClick={() => toggleColorScheme()} sx={{ color: 'inherit' }}>
        {colorScheme === 'light' ? <BsFillMoonStarsFill /> : <BsSunFill />}
      </ActionIcon>
    </Tooltip>
  );
};

const getTooltipText = (scheme: ColorScheme) => {
  switch (scheme) {
    case 'dark':
      return 'Activate light mode';
    case 'light':
      return 'Activate dark mode';
  }
};
