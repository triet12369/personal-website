import styled from '@emotion/styled';
import Link from 'next/link';
import React from 'react';
import { AiFillGithub } from 'react-icons/ai';

import { hoverStyles } from '../../styles/globalStyles';
export const Github = () => {
  return (
    <Link href="https://github.com/triet12369" passHref>
      <StyledLink>
        <AiFillGithub fontSize="2rem" />
      </StyledLink>
    </Link>
  );
};

const StyledLink = styled('a')`
  cursor: pointer;
  color: inherit;
  height: 100%;
  display: flex;
  align-items: center;
  ${hoverStyles}
`;
