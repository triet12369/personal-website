import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { createStyles, keyframes } from '@mantine/core';
import { useRouter } from 'next/router';
import React, {
  forwardRef,
  MouseEventHandler,
  ReactNode,
  useEffect,
  useState,
} from 'react';

import { hoverStyles, linkStyles } from '../../styles/globalStyles';
import { filterTransientProps } from '../../utils/filterTransientProps';

export type INavLabelProps = {
  isDropdown: boolean;
  href?: string;
  onClick?: MouseEventHandler; // passed down from Link component
  children: ReactNode;
};

const useLabelStyles = createStyles((theme, labelProps: INavLabelProps) => ({
  labelWrapper: {
    display: 'flex',
    justifyContent: 'center',
    width: labelProps.isDropdown ? '100%' : '',
    minWidth: '50px',
    padding: '10px 15px',
    borderRadius: '5px',
    textTransform: 'uppercase',
    fontWeight: 500,
    letterSpacing: '0.1rem',
    color: theme.colors[theme.primaryColor][8],
    '&:hover': {
      backgroundColor: theme.colors[theme.primaryColor][0],
      cursor: 'pointer',
      transition: 'background-color 500ms ease',
    },
    '&.active': {
      color: theme.colors[theme.primaryColor][9],
      borderRadius: 0,
      borderTop: `2px solid ${theme.colors[theme.primaryColor][9]}`,
      borderBottom: `2px solid ${theme.colors[theme.primaryColor][9]}`,
      padding: '10px 15px 8px 15px', // minus 2px from border size
      fontWeight: 800,
    },
  },
}));

export const NavLabel = forwardRef((props: INavLabelProps, ref) => {
  const { children, href } = props;
  const router = useRouter();
  const { classes, cx } = useLabelStyles(props);
  const processedHref = href && href.split('?')[0];
  const isActive = processedHref ? router.asPath === href : false;

  // useEffect(() => {
  //   if (router.isReady) {
  //     setClassName(cx(classes.labelWrapper, isActive && 'active'));
  //   }
  // }, [classes.labelWrapper, cx, isActive, router.isReady]);

  return (
    <StyledLabel href={href} $isActive={isActive}>
      {children}
      <div className="animator" />
    </StyledLabel>
  );
});

NavLabel.displayName = 'NavLabel';

const animation = keyframes`
  0% {
    opacity: 0;
    transform: translateX(-200%);
  }
  100% {
    opacity: 1;
    transform: translateX(0%);
  }
`;

const StyledLabel = styled('a', filterTransientProps)<{ $isActive?: boolean }>`
  ${linkStyles}
  ${hoverStyles}
  min-width: 50px;
  border-radius: 5px;
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 0.1rem;
  overflow: hidden;

  ${(props) =>
    props.$isActive &&
    css`
      .animator {
        animation: ${animation} 600ms ease forwards;
      }
    `}

  .animator {
    transition: transform 300ms ease;
    opacity: 0;
    width: 100%;
    border-bottom: 2px solid;
  }
`;
