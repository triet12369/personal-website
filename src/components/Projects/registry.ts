import { MDXRemoteProps } from 'next-mdx-remote';

import { Project } from '../../types';

export const PROJECT_COMPONENTS: Record<string, MDXRemoteProps['components']> = {};

/**
 * Override the click behaviour for a specific project card.
 * If a handler is registered for a slug, the title renders as a button
 * (no navigation) and calls the handler with the full project object.
 *
 * Example:
 *   PROJECT_CLICK_HANDLERS['tamsquare-realty'] = (project) => { ... };
 */
export const PROJECT_CLICK_HANDLERS: Record<string, (project: Project) => void> = {};
