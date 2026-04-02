import type { HeroNebulaConfig } from '../StarBackground/types';

/**
 * Edit this object to swap the hero astrophoto or tune its blending.
 *
 *   src              — path inside /public, e.g. '/hero/ic1805.jpg'
 *   photoOpacity     — how bright the photo appears (0–1)
 *   proceduralBlend  — how much the procedural nebula overlays the photo (0=none, 1=full)
 *   proceduralBlendMode — composite operation: 'screen' | 'normal' | 'lighter'
 *   fit             — image sizing: 'cover' (default) | 'contain' | 'fill'
 *   edgeFadeX       — 0–0.5 fraction of width faded on left & right edges (0 = off, 0.15 = gentle)
 *   edgeFadeY       — 0–0.5 fraction of height faded on top & bottom edges (0 = off, 0.15 = gentle)
 *   creditText       — attribution string shown in the hero bottom-right
 *
 * To swap the image: change `src` to '/hero/starless.png' (or drop a new file
 * in public/hero/ and point to it here). No other changes needed.
 */
export const HERO_NEBULA_CONFIG: HeroNebulaConfig = {
  src: '/hero/IC1805-20251103-starless.jpg',
  // src: '/hero/starless.png',
  photoOpacity: 0.7,
  creditText: 'Heart Nebula, taken from my backyard',
  proceduralBlend: 0.8,
  proceduralBlendMode: 'screen',
  fit: 'contain',
  // edgeFadeX: 0,    // 0–0.5 — left/right fade fraction. 0 = off (default).
  edgeFadeY: 0.18, // gentle top/bottom fade so the photo dissolves into the star field
  edgeFadeX: 0.4, // gentle left/right fade so the photo dissolves into the star field
};
