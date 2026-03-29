// ─── Debug & renderer selection ────────────────────────────────────────────────

/** Show a frametime / FPS overlay in the top-right corner of the canvas. */
export const DEBUG_FRAMETIME = false;

/**
 * 'auto'   — use WebGL when available, fall back to Canvas 2D
 * 'webgl'  — always use WebGL (no fallback)
 * 'canvas' — always use Canvas 2D
 */
export const RENDERER: 'auto' | 'webgl' | 'canvas' = 'auto';

// ─── Stars ────────────────────────────────────────────────────────────────────

export const STAR_COUNT             = 360;
export const STAR_RADIUS_MIN        = 0.3;
export const STAR_RADIUS_MAX        = 2.0;
export const STAR_TWINKLE_SPEED_MIN = 0.003;
export const STAR_TWINKLE_SPEED_MAX = 0.011;
export const STAR_TWINKLE_AMPLITUDE = 0.2;

// ─── Shooting stars ───────────────────────────────────────────────────────────

export const SHOOT_MAX_COUNT            = 4;
export const SHOOT_SPAWN_INTERVAL       = 80;   // frames between spawn attempts
export const SHOOT_SPAWN_CHANCE         = 0.3;  // probability per attempt
export const SHOOT_ANGLE_MIN            = 20;   // degrees
export const SHOOT_ANGLE_MAX            = 40;   // degrees
export const SHOOT_SPEED_MIN            = 9;
export const SHOOT_SPEED_MAX            = 16;
export const SHOOT_TRAIL_MIN            = 160;
export const SHOOT_TRAIL_MAX            = 360;
export const SHOOT_FADE_IN              = 0.04;
export const SHOOT_HOLD_DIST_FRAC_MIN   = 0.5;  // fraction of min(w,h) before fade-out (min)
export const SHOOT_HOLD_DIST_FRAC_MAX   = 1;    // fraction of min(w,h) before fade-out (max)
export const SHOOT_FADE_OUT             = 0.015;
export const SHOOT_GLOW_RADIUS          = 3.5;
export const SHOOT_LINE_WIDTH           = 1.5;

// ─── Explosions ───────────────────────────────────────────────────────────────

export const EXPLOSION_PARTICLE_COUNT   = 32;
export const EXPLOSION_SPEED_MIN        = 0.4;
export const EXPLOSION_SPEED_MAX        = 5.5;
export const EXPLOSION_ALPHA_MIN        = 0.55;
export const EXPLOSION_ALPHA_MAX        = 1.0;
export const EXPLOSION_DECAY_MIN        = 0.011;
export const EXPLOSION_DECAY_MAX        = 0.026;
export const EXPLOSION_RADIUS_MIN       = 0.4;
export const EXPLOSION_RADIUS_MAX       = 2.4;
export const EXPLOSION_RING_INIT_ALPHA  = 0.75;
export const EXPLOSION_RING_EXPAND      = 3.5;
export const EXPLOSION_RING_FADE        = 0.032;
export const EXPLOSION_PARTICLE_DRAG    = 0.97;
export const EXPLOSION_PARTICLE_GRAVITY = 0.03;
