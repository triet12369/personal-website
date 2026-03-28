import confetti from 'canvas-confetti';
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
export const PROJECT_CLICK_HANDLERS: Record<string, (project: Project) => void> = {
  'personal-website': () => {
    const count = 150;
    const spread = 55;
    const y = 0.6;

    // left side — shoots inward
    confetti({ particleCount: count, spread, angle: 60, origin: { x: 0, y } });
    // right side — shoots inward
    confetti({ particleCount: count, spread, angle: 120, origin: { x: 1, y } });
  },
};
