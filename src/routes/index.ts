/**
 * Define Routes configuration
 */

import { RouteItem } from '../types';

const cs = (param: RouteItem) => param;

export const ROUTES = {
  HOME: cs({
    label: 'Home',
    href: {
      pathname: '/',
    },
  }),
  BLOG: cs({
    label: 'Blog',
    href: {
      pathname: '/blog',
    },
  }),
  PROJECTS: cs({
    label: 'Projects',
    href: {
      pathname: '/projects',
    },
  }),
} as const;
