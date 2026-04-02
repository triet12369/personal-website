import type { HeroNebulaConfig } from '../StarBackground/types';

/**
 * Edit this object to swap the hero astrophoto or tune its blending.
 *
 *   src              — path inside /public, e.g. '/hero/ic1805.jpg'
 *   photoOpacity     — how bright the photo appears (0–1)
 *   proceduralBlend  — how much the procedural nebula overlays the photo (0=none, 1=full)
 *   proceduralBlendMode — composite operation: 'screen' | 'normal' | 'lighter'
 *   fit             — image sizing: 'cover' (default) | 'contain' | 'fill'
 *   creditText       — attribution string shown in the hero bottom-right
 *
 * To swap the image: change `src` to '/hero/starless.png' (or drop a new file
 * in public/hero/ and point to it here). No other changes needed.
 */
export const HERO_NEBULA_CONFIG: HeroNebulaConfig = {
  src: '/hero/IC1805-20251103-starless.jpg',
  // src: '/hero/starless.png',
  photoOpacity: 0.6,
  creditText: 'Heart Nebula, taken from my backyard',
  proceduralBlend: 0.35,
  proceduralBlendMode: 'lighter',
  fit: 'cover',
};
