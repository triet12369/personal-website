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
 * Nebula bitmap layers passed from the hook to the WebGL renderer.
 * Single packed bitmap: R = S II / layer-0, G = H-α / layer-1, B = O III / layer-2.
 * Both dark (SHO) and light (pantone) palettes are applied by the shader at runtime.
 */
export interface NebulaProps {
  nebula: ImageBitmap | null;
  nebulaPalette: NebulaPalette;
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
