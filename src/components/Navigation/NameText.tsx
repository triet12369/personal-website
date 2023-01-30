import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { useMantineTheme } from '@mantine/core';
import Link from 'next/link';
import React from 'react';

import { ROUTES } from '../../routes';
import { hoverStyles, linkStyles } from '../../styles/globalStyles';

export const NameText = () => {
  return (
    <Link href={ROUTES.HOME.href} passHref>
      <StyledText>Triet Cao</StyledText>
    </Link>
  );
};

const StyledText = styled('a')`
  ${linkStyles}
  ${hoverStyles}
  display: flex;
  align-items: center;
  color: inherit;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 400;
  font-family: monospace, sans-serif;
  letter-spacing: 3px;
  text-transform: uppercase;
`;
