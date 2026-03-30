import {
  STAR_RADIUS_MIN, STAR_RADIUS_MAX, STAR_RADIUS_EXPONENT,
  STAR_TWINKLE_SPEED_MIN, STAR_TWINKLE_SPEED_MAX,
  SHOOT_ANGLE_MIN, SHOOT_ANGLE_MAX,
  SHOOT_SPEED_MIN, SHOOT_SPEED_MAX,
  SHOOT_TRAIL_MIN, SHOOT_TRAIL_MAX,
  SHOOT_HOLD_DIST_FRAC_MIN, SHOOT_HOLD_DIST_FRAC_MAX,
  EXPLOSION_PARTICLE_COUNT,
  EXPLOSION_SPEED_MIN, EXPLOSION_SPEED_MAX,
  EXPLOSION_ALPHA_MIN, EXPLOSION_ALPHA_MAX,
  EXPLOSION_DECAY_MIN, EXPLOSION_DECAY_MAX,
  EXPLOSION_RADIUS_MIN, EXPLOSION_RADIUS_MAX,
  EXPLOSION_RING_INIT_ALPHA,
} from './config';
import type { Star, ShootingStar, Explosion, ExplosionParticle } from './types';

// ─── Utilities ────────────────────────────────────────────────────────────────

export function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// ─── Star spectral colors ─────────────────────────────────────────────────────
// One entry per OBAFGKM spectral class. Weights are derived from the Yale
// Bright Star Catalogue (all naked-eye stars, ~9 000 entries), which reflects
// the visibility-weighted distribution a real observer would see:
//   O ≈ 0.4 %  B ≈ 14.6 %  A ≈ 27.3 %  F ≈ 20.4 %  G ≈ 16.4 %  K ≈ 17.1 %  M ≈ 3.9 %
// Colors are approximate blackbody chromaticities for each class.

// Each color is lerped ~30% toward its perceived luminance gray to simulate
// mild atmospheric desaturation (scintillation + dispersion whitening).
const STAR_COLORS: Array<[number, number, number]> = [
  [162, 178, 255], // O  — ~30 000–50 000 K  intense blue
  [191, 207, 255], // B  — ~10 000–30 000 K  blue-white
  [222, 232, 255], // A  —  ~7 500–10 000 K  white with blue tint
  [255, 251, 225], // F  —  ~6 000– 7 500 K  yellow-white
  [255, 241, 181], // G  —  ~5 200– 6 000 K  yellow (solar)
  [255, 205, 132], // K  —  ~3 700– 5 200 K  orange
  [255, 143, 124], // M  —  ~2 400– 3 700 K  red
];

//                          O   B   A   F   G   K   M
const STAR_COLOR_WEIGHTS = [ 1, 15, 27, 20, 16, 17,  4];
const STAR_COLOR_TOTAL   = STAR_COLOR_WEIGHTS.reduce((a, b) => a + b, 0);

export function pickStarColor(): [number, number, number] {
  let r = Math.random() * STAR_COLOR_TOTAL;
  for (let i = 0; i < STAR_COLORS.length; i++) {
    r -= STAR_COLOR_WEIGHTS[i];
    if (r <= 0) return STAR_COLORS[i];
  }
  return STAR_COLORS[0];
}

// ─── Factory functions ────────────────────────────────────────────────────────

// Minimum alpha for the log-uniform brightness distribution.
const STAR_ALPHA_MIN = 0.4;

export function makeStars(count: number, w: number, h: number, maxAlpha: number): Star[] {
  return Array.from({ length: count }, () => {
    // Log-uniform distribution: equal star counts per magnitude interval.
    // Models the fact that faint stars vastly outnumber bright ones (N ∝ f^-3/2).
    const minA = Math.min(STAR_ALPHA_MIN, maxAlpha);
    const baseAlpha = minA * Math.pow(maxAlpha / minA, Math.random());
    return {
      x:            rand(0, w),
      y:            rand(0, h),
      r:            STAR_RADIUS_MIN + (STAR_RADIUS_MAX - STAR_RADIUS_MIN) * Math.pow(Math.random(), STAR_RADIUS_EXPONENT),
      baseAlpha,
      alpha:        baseAlpha,
      twinkleSpeed:  rand(STAR_TWINKLE_SPEED_MIN, STAR_TWINKLE_SPEED_MAX),
      twinklePhase:  0,
      twinkleActive: false,
      color:         pickStarColor(),
    };
  });
}

const EXPLOSION_COLORS_DARK: Array<[number, number, number]> = [
  [200, 230, 255],
  [220, 240, 255],
  [255, 255, 255],
  [255, 230, 160],
  [255, 190,  90],
  [255, 140,  80],
];

const EXPLOSION_COLORS_LIGHT: Array<[number, number, number]> = [
  [ 80,  60,  40],
  [130, 100,  55],
  [180, 140,  80],
  [210, 170, 100],
];

export function spawnExplosion(x: number, y: number, isDark: boolean): Explosion {
  const colors = isDark ? EXPLOSION_COLORS_DARK : EXPLOSION_COLORS_LIGHT;
  const particles: ExplosionParticle[] = Array.from({ length: EXPLOSION_PARTICLE_COUNT }, () => {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(EXPLOSION_SPEED_MIN, EXPLOSION_SPEED_MAX);
    return {
      x,
      y,
      vx:    Math.cos(angle) * speed,
      vy:    Math.sin(angle) * speed,
      alpha: rand(EXPLOSION_ALPHA_MIN, EXPLOSION_ALPHA_MAX),
      decay: rand(EXPLOSION_DECAY_MIN, EXPLOSION_DECAY_MAX),
      r:     rand(EXPLOSION_RADIUS_MIN, EXPLOSION_RADIUS_MAX),
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  });
  return { x, y, particles, ring: 0, ringAlpha: EXPLOSION_RING_INIT_ALPHA };
}

export function spawnShootingStar(w: number, h: number, maxShootAlpha: number): ShootingStar {
  const angleDeg = rand(SHOOT_ANGLE_MIN, SHOOT_ANGLE_MAX);
  const angleRad = (angleDeg * Math.PI) / 180;
  const speed    = rand(SHOOT_SPEED_MIN, SHOOT_SPEED_MAX);

  let x: number, y: number;
  if (Math.random() < 0.6) {
    x = rand(0, w * 0.7);
    y = rand(-20, h * 0.3);
  } else {
    x = rand(-20, w * 0.2);
    y = rand(0, h * 0.5);
  }

  return {
    x,
    y,
    vx:           Math.cos(angleRad) * speed,
    vy:           Math.sin(angleRad) * speed,
    trailLength:  rand(SHOOT_TRAIL_MIN, SHOOT_TRAIL_MAX),
    alpha:        0,
    maxAlpha:     rand(0.55, maxShootAlpha),
    holdDistFrac: rand(SHOOT_HOLD_DIST_FRAC_MIN, SHOOT_HOLD_DIST_FRAC_MAX),
    state:        'in',
  };
}

// ─── Debug HUD ────────────────────────────────────────────────────────────────

/** Number of frames to average for the frametime display. */
export const HUD_SAMPLES = 30;

/** Draw a debug overlay in the top-right corner of a 2D canvas.
 * `fpsMs`  — rolling average wall-clock delta between frames (actual FPS).
 * `workMs` — rolling average CPU time spent inside draw() (excludes vsync wait).
 */
export function drawFrameHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  fpsMs: number,
  workMs: number,
): void {
  const fps    = fpsMs  > 0 ? (1000 / fpsMs ).toFixed(1) : '---';
  const lines  = [
    `fps  ${fps.padStart(7)}`,
    `cpu  ${workMs.toFixed(2).padStart(7)} ms`,
  ];
  const fh  = 12;
  const lh  = fh + 4;
  const pad = 6;
  ctx.save();
  ctx.font = `${fh}px monospace`;
  const tw = Math.max(...lines.map(l => ctx.measureText(l).width));
  const bh = lh * lines.length + pad;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(w - tw - pad * 2 - 4, 8, tw + pad * 2, bh + pad);
  ctx.fillStyle = '#00ff88';
  lines.forEach((line, i) => {
    ctx.fillText(line, w - tw - pad - 4, 8 + pad + fh + i * lh);
  });
  ctx.restore();
}
