import { css } from '@emotion/react';

export const linkStyles = css`
  &:visited {
    text-decoration: none;
    color: inherit;
  }
  &:link {
    text-decoration: none;
    color: inherit;
  }
`;

export const hoverStyles = css`
  &:hover {
    filter: brightness(1.2);
  }
`;
