import { useRouter } from 'next/router';
import React, { forwardRef, MouseEventHandler, ReactNode } from 'react';

import styles from './NavLabel.module.scss';

export type INavLabelProps = {
  isDropdown: boolean;
  href?: string;
  onClick?: MouseEventHandler; // passed down from Link component
  children: ReactNode;
};

export const NavLabel = forwardRef((props: INavLabelProps, ref) => {
  const { children, href, onClick } = props;
  const router = useRouter();
  const processedHref = href && href.split('?')[0];
  const isActive = processedHref ? router.asPath === href : false;

  return (
    <a
      href={href}
      onClick={onClick}
      ref={ref as React.Ref<HTMLAnchorElement>}
      className={`${styles.label}${isActive ? ` ${styles.active}` : ''}`}
    >
      {children}
    </a>
  );
});

NavLabel.displayName = 'NavLabel';
