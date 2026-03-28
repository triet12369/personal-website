import type { MDXRemoteProps } from 'next-mdx-remote';

import { FortuneCookieWidget } from '../../content/blog/hello-world/FortuneCookieWidget';
import { WeatherWidget } from '../../content/blog/hello-world/WeatherWidget';

/**
 * Per-post component registrations.
 *
 * To add custom components for a new post:
 *   1. Create src/components/Blog/posts/<slug>/YourComponent.tsx
 *   2. Add an entry below:  '<slug>': { YourComponent }
 *
 * Components registered here are merged with the global MDXComponents at
 * render time, so they are only available inside that specific post.
 */
export const POST_COMPONENTS: Record<string, MDXRemoteProps['components']> = {
  'hello-world': { WeatherWidget, FortuneCookieWidget },
};
