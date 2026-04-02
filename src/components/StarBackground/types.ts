import type { NebulaPalette } from './useNebulaTexture';

export type { NebulaPalette };

export interface Star {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number; // current phase in radians (0 when idle)
  twinkleActive: boolean; // whether a burst is in progress
  color: [number, number, number]; // RGB 0-255
}

export interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trailLength: number;
  alpha: number;
  maxAlpha: number;
  state: 'in' | 'hold' | 'out';
  holdDistFrac: number;
  exploded?: boolean;
}

export interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  r: number;
  color: [number, number, number]; // RGB 0-255
}

export interface Explosion {
  x: number;
  y: number;
  particles: ExplosionParticle[];
  ring: number;
  ringAlpha: number;
}

/** Canvas 2D palette — colors as CSS rgba() string factories. */
export interface Palette {
  starColor: (alpha: number) => string;
  shootColor: (alpha: number) => string;
  shootTail: (alpha: number) => string;
  maxStarAlpha: number;
  maxShootAlpha: number;
}

/**
 * Configuration for the real astrophoto that blends with the procedural nebula.
 * Change `src` to swap the image; tune `proceduralBlend` to dial up/down the
 * procedural nebula overlay that sits on top of your photo.
 */
export interface HeroNebulaConfig {
  /** Public URL of the astrophoto, e.g. '/hero/ic1805.jpg' */
  src: string;
  /** 0 = invisible → 1 = fully opaque. Default 0.75 matches the old BG_IMAGE_OPACITY. */
  photoOpacity?: number;
  /** Text shown as HTML credit in the bottom-right of the hero area. */
  creditText?: string;
  /**
   * How strongly the procedural nebula overlays the photo:
   *   0 = photo only (no procedural overlay)
   *   1 = full procedural nebula composited on top
   * Default 0.35
   */
  proceduralBlend?: number;
  /**
   * Canvas composite operation used to blend the procedural nebula on top of the photo.
   * 'screen' (default) brightens and looks natural with emission nebulae.
   * 'normal' paints the procedural nebula at `proceduralBlend` opacity (no lightening).
   * 'lighter' additive — very glowy.
   *
   * Note: in the WebGL renderer only 'screen' blend is implemented in the shader.
   * 'normal' and 'lighter' are identical to 'screen' in WebGL mode.
   */
  proceduralBlendMode?: 'screen' | 'normal' | 'lighter';
  /**
   * How the astrophoto is sized relative to the canvas — mirrors CSS object-fit.
   *   'cover'   (default) — scales to fill, cropping the overflow. No gaps.
   *   'contain'           — scales to fit entirely within the canvas. Transparent surroundings.
   *   'fill'              — stretches to exactly fill. Aspect ratio is not preserved.
   */
  fit?: 'cover' | 'contain' | 'fill';
  /**
   * Fraction of the canvas width (0–0.5) over which the left and right edges of the
   * photo fade to transparent, blending naturally into the star background.
   * 0 = hard edge (default). 0.15 is a gentle fade; 0.3 is dramatic.
   */
  edgeFadeX?: number;
  /**
   * Fraction of the canvas height (0–0.5) over which the top and bottom edges of the
   * photo fade to transparent, blending naturally into the star background.
   * 0 = hard edge (default). 0.15 is a gentle fade; 0.3 is dramatic.
   */
  edgeFadeY?: number;
}

/**
 * Nebula bitmap layers passed from the hook to the WebGL renderer.
 * Single packed bitmap: R = S II / layer-0, G = H-α / layer-1, B = O III / layer-2.
 * Both dark (SHO) and light (pantone) palettes are applied by the shader at runtime.
 */
export interface NebulaProps {
  nebula: ImageBitmap | null;
  nebulaPalette: NebulaPalette;
  heroNebula?: HeroNebulaConfig;
  heroBitmap?: ImageBitmap | null;
}

/** WebGL palette — colors as normalized [0-1] RGB tuples. */
export interface RGBPalette {
  starRGB: readonly [number, number, number];
  shootColorRGB: readonly [number, number, number];
  shootTailRGB: readonly [number, number, number];
  ringRGB: readonly [number, number, number];
  maxStarAlpha: number;
  maxShootAlpha: number;
}
