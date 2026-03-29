export interface Star {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleDir: 1 | -1;
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
  starColor:    (alpha: number) => string;
  shootColor:   (alpha: number) => string;
  shootTail:    (alpha: number) => string;
  maxStarAlpha:  number;
  maxShootAlpha: number;
}

/** WebGL palette — colors as normalized [0-1] RGB tuples. */
export interface RGBPalette {
  starRGB:       readonly [number, number, number];
  shootColorRGB: readonly [number, number, number];
  shootTailRGB:  readonly [number, number, number];
  ringRGB:       readonly [number, number, number];
  maxStarAlpha:  number;
  maxShootAlpha: number;
}
