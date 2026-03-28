import { useComputedColorScheme } from '@mantine/core';
import React, { useEffect, useRef } from 'react';

import styles from './StarBackground.module.scss';

// ─── Config ──────────────────────────────────────────────────────────────────

// Stars
const STAR_COUNT             = 180;
const STAR_RADIUS_MIN        = 0.3;
const STAR_RADIUS_MAX        = 1.6;
const STAR_TWINKLE_SPEED_MIN = 0.003;
const STAR_TWINKLE_SPEED_MAX = 0.011;
const STAR_TWINKLE_AMPLITUDE = 0.2;

// Shooting stars
const SHOOT_MAX_COUNT       = 4;
const SHOOT_SPAWN_INTERVAL  = 80;   // frames between spawn attempts
const SHOOT_SPAWN_CHANCE    = 0.3;  // probability per attempt
const SHOOT_ANGLE_MIN       = 20;   // degrees
const SHOOT_ANGLE_MAX       = 40;   // degrees
const SHOOT_SPEED_MIN       = 9;
const SHOOT_SPEED_MAX       = 16;
const SHOOT_TRAIL_MIN       = 160;
const SHOOT_TRAIL_MAX       = 360;
const SHOOT_FADE_IN              = 0.04;
const SHOOT_HOLD_DIST_FRAC_MIN   = 0.5; // fraction of min(w,h) before fade-out (min)
const SHOOT_HOLD_DIST_FRAC_MAX   = 1; // fraction of min(w,h) before fade-out (max)
const SHOOT_FADE_OUT        = 0.015;
const SHOOT_GLOW_RADIUS     = 3.5;
const SHOOT_LINE_WIDTH      = 1.5;

// Explosions
const EXPLOSION_PARTICLE_COUNT   = 32;
const EXPLOSION_SPEED_MIN        = 0.4;
const EXPLOSION_SPEED_MAX        = 5.5;
const EXPLOSION_ALPHA_MIN        = 0.55;
const EXPLOSION_ALPHA_MAX        = 1.0;
const EXPLOSION_DECAY_MIN        = 0.011;
const EXPLOSION_DECAY_MAX        = 0.026;
const EXPLOSION_RADIUS_MIN       = 0.4;
const EXPLOSION_RADIUS_MAX       = 2.4;
const EXPLOSION_RING_INIT_ALPHA  = 0.75;
const EXPLOSION_RING_EXPAND      = 3.5;
const EXPLOSION_RING_FADE        = 0.032;
const EXPLOSION_PARTICLE_DRAG    = 0.97;
const EXPLOSION_PARTICLE_GRAVITY = 0.03;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Star {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleDir: 1 | -1;
  color: [number, number, number]; // RGB
}

interface ShootingStar {
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

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  r: number;
  color: [number, number, number];
}

interface Explosion {
  x: number;
  y: number;
  particles: ExplosionParticle[];
  ring: number;
  ringAlpha: number;
}

interface Palette {
  starColor: (alpha: number) => string;
  shootColor: (alpha: number) => string;
  shootTail: (alpha: number) => string;
  maxStarAlpha: number;
  maxShootAlpha: number;
}

// ─── Palettes ─────────────────────────────────────────────────────────────────

const DARK_PALETTE: Palette = {
  starColor: (a) => `rgba(220,230,255,${a})`,
  shootColor: (a) => `rgba(200,230,255,${a})`,
  shootTail: (a) => `rgba(180,220,255,${a})`,
  maxStarAlpha: 0.75,
  maxShootAlpha: 0.85,
};

// Warm dark stars for the light (parchment) background
const LIGHT_PALETTE: Palette = {
  starColor: (a) => `rgba(50,40,28,${a})`,
  shootColor: (a) => `rgba(70,55,38,${a})`,
  shootTail: (a) => `rgba(100,80,55,${a})`,
  maxStarAlpha: 0.55,
  maxShootAlpha: 0.7,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// Star spectral colors (no green): weighted toward white/blue-white
// Weights: white 55%, blue-white 20%, yellow-white 10%, yellow 7%, orange 5%, red 3%
const STAR_COLORS: Array<[number, number, number]> = [
  [220, 230, 255], // blue-white (O/B type)
  [200, 215, 255], // blue-white variant
  [255, 255, 255], // pure white (A type)
  [240, 240, 255], // white with slight blue
  [255, 255, 240], // white with slight yellow
  [255, 250, 210], // yellow-white (F type)
  [255, 240, 160], // yellow (G type)
  [255, 200, 100], // orange (K type)
  [255, 160, 100], // orange-red
  [255, 120, 100], // red (M type)
];
const STAR_COLOR_WEIGHTS = [18, 15, 12, 10, 10, 10, 7, 5, 2, 1]; // sums to 90 (adjust for white majority)

function pickStarColor(): [number, number, number] {
  const total = STAR_COLOR_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < STAR_COLORS.length; i++) {
    r -= STAR_COLOR_WEIGHTS[i];
    if (r <= 0) return STAR_COLORS[i];
  }
  return STAR_COLORS[0];
}

function makeStars(count: number, w: number, h: number, palette: Palette): Star[] {
  return Array.from({ length: count }, () => {
    const baseAlpha = rand(0.15, palette.maxStarAlpha);
    return {
      x: rand(0, w),
      y: rand(0, h),
      r: rand(STAR_RADIUS_MIN, STAR_RADIUS_MAX),
      baseAlpha,
      alpha: baseAlpha,
      twinkleSpeed: rand(STAR_TWINKLE_SPEED_MIN, STAR_TWINKLE_SPEED_MAX),
      twinkleDir: Math.random() > 0.5 ? 1 : -1,
      color: pickStarColor(),
    };
  });
}

const EXPLOSION_COLORS_DARK: Array<[number, number, number]> = [
  [200, 230, 255],
  [220, 240, 255],
  [255, 255, 255],
  [255, 230, 160],
  [255, 190, 90],
  [255, 140, 80],
];
const EXPLOSION_COLORS_LIGHT: Array<[number, number, number]> = [
  [80, 60, 40],
  [130, 100, 55],
  [180, 140, 80],
  [210, 170, 100],
];

function spawnExplosion(x: number, y: number, isDark: boolean): Explosion {
  const colors = isDark ? EXPLOSION_COLORS_DARK : EXPLOSION_COLORS_LIGHT;
  const particles: ExplosionParticle[] = Array.from({ length: EXPLOSION_PARTICLE_COUNT }, () => {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(EXPLOSION_SPEED_MIN, EXPLOSION_SPEED_MAX);
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: rand(EXPLOSION_ALPHA_MIN, EXPLOSION_ALPHA_MAX),
      decay: rand(EXPLOSION_DECAY_MIN, EXPLOSION_DECAY_MAX),
      r: rand(EXPLOSION_RADIUS_MIN, EXPLOSION_RADIUS_MAX),
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  });
  return { x, y, particles, ring: 0, ringAlpha: EXPLOSION_RING_INIT_ALPHA };
}

function spawnShootingStar(w: number, h: number, palette: Palette): ShootingStar {
  const angleDeg = rand(SHOOT_ANGLE_MIN, SHOOT_ANGLE_MAX);
  const angleRad = (angleDeg * Math.PI) / 180;
  const speed = rand(SHOOT_SPEED_MIN, SHOOT_SPEED_MAX);
  const vx = Math.cos(angleRad) * speed;
  const vy = Math.sin(angleRad) * speed;

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
    vx,
    vy,
    trailLength: rand(SHOOT_TRAIL_MIN, SHOOT_TRAIL_MAX),
    alpha: 0,
    maxAlpha: rand(0.55, palette.maxShootAlpha),
    holdDistFrac: rand(SHOOT_HOLD_DIST_FRAC_MIN, SHOOT_HOLD_DIST_FRAC_MAX),
    state: 'in',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface StarBackgroundProps {
  blur?: boolean;
}

export const StarBackground: React.FC<StarBackgroundProps> = ({ blur = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const colorScheme = useComputedColorScheme('dark', { getInitialValueInEffect: true });
  const paletteRef = useRef<Palette>(DARK_PALETTE);
  const colorSchemeRef = useRef(colorScheme);

  // Swap palette immediately without restarting the animation loop
  useEffect(() => {
    paletteRef.current = colorScheme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
    colorSchemeRef.current = colorScheme;
  }, [colorScheme]);

  // Animation loop — runs once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const el: HTMLCanvasElement = canvas;
    const c: CanvasRenderingContext2D = ctx;

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    const shootingStars: ShootingStar[] = [];
    const explosions: Explosion[] = [];
    let spawnTimer = 0;

    function resize() {
      w = el.offsetWidth;
      h = el.offsetHeight;
      el.width = w;
      el.height = h;
      stars = makeStars(STAR_COUNT, w, h, paletteRef.current);
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    }

    resize();
    window.addEventListener('resize', onResize);

    function draw() {
      const palette = paletteRef.current;

      // Transparent background — body/layout handles the page color
      c.clearRect(0, 0, w, h);

      // Static stars (twinkle)
      for (const s of stars) {
        s.alpha += s.twinkleSpeed * s.twinkleDir;
        if (s.alpha >= s.baseAlpha + STAR_TWINKLE_AMPLITUDE || s.alpha <= s.baseAlpha - STAR_TWINKLE_AMPLITUDE) {
          s.twinkleDir = (s.twinkleDir * -1) as 1 | -1;
        }
        s.alpha = Math.max(0, Math.min(palette.maxStarAlpha, s.alpha));

        c.beginPath();
        c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        c.fillStyle = colorSchemeRef.current === 'dark'
          ? `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${s.alpha})`
          : palette.starColor(s.alpha);
        c.fill();
      }

      // Spawn shooting stars
      spawnTimer++;
      if (spawnTimer >= SHOOT_SPAWN_INTERVAL && shootingStars.length < SHOOT_MAX_COUNT) {
        if (Math.random() < SHOOT_SPAWN_CHANCE) {
          shootingStars.push(spawnShootingStar(w, h, palette));
        }
        spawnTimer = 0;
      }

      // Draw & update shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];

        if (ss.state === 'in') {
          ss.alpha += SHOOT_FADE_IN;
          if (ss.alpha >= ss.maxAlpha) {
            ss.alpha = ss.maxAlpha;
            ss.state = 'hold';
          }
        } else if (ss.state === 'hold') {
          const distFromStart = Math.hypot(ss.x, ss.y);
          if (distFromStart > Math.min(w, h) * ss.holdDistFrac) {
            ss.state = 'out';
          }
        } else {
          ss.alpha -= SHOOT_FADE_OUT;
        }

        // Trigger explosion the moment the star first crosses the canvas edge
        if (!ss.exploded && (ss.x >= w || ss.y >= h)) {
          ss.exploded = true;
          explosions.push(
            spawnExplosion(
              Math.min(ss.x, w),
              Math.min(ss.y, h),
              colorSchemeRef.current === 'dark',
            ),
          );
        }

        if (ss.alpha <= 0 || ss.x > w + 20 || ss.y > h + 20) {
          shootingStars.splice(i, 1);
          continue;
        }

        const tailX = ss.x - ss.vx * (ss.trailLength / 14);
        const tailY = ss.y - ss.vy * (ss.trailLength / 14);

        const grad = c.createLinearGradient(tailX, tailY, ss.x, ss.y);
        grad.addColorStop(0, palette.shootTail(0));
        grad.addColorStop(0.7, palette.shootTail(ss.alpha * 0.6));
        grad.addColorStop(1, palette.shootColor(ss.alpha));

        c.beginPath();
        c.moveTo(tailX, tailY);
        c.lineTo(ss.x, ss.y);
        c.strokeStyle = grad;
        c.lineWidth = SHOOT_LINE_WIDTH;
        c.lineCap = 'round';
        c.stroke();

        const glow = c.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, SHOOT_GLOW_RADIUS);
        glow.addColorStop(0, palette.shootColor(ss.alpha));
        glow.addColorStop(1, palette.shootColor(0));
        c.beginPath();
        c.arc(ss.x, ss.y, SHOOT_GLOW_RADIUS, 0, Math.PI * 2);
        c.fillStyle = glow;
        c.fill();

        ss.x += ss.vx;
        ss.y += ss.vy;
      }

      // Draw explosions
      for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        const isDark = colorSchemeRef.current === 'dark';

        // Expanding shockwave ring
        if (exp.ringAlpha > 0) {
          exp.ring += EXPLOSION_RING_EXPAND;
          exp.ringAlpha -= EXPLOSION_RING_FADE;
          c.beginPath();
          c.arc(exp.x, exp.y, exp.ring, 0, Math.PI * 2);
          c.strokeStyle = isDark
            ? `rgba(180,220,255,${Math.max(0, exp.ringAlpha)})`
            : `rgba(110,85,50,${Math.max(0, exp.ringAlpha)})`;
          c.lineWidth = 1.2;
          c.stroke();
        }

        // Particles
        for (let j = exp.particles.length - 1; j >= 0; j--) {
          const p = exp.particles[j];
          p.alpha -= p.decay;
          if (p.alpha <= 0) { exp.particles.splice(j, 1); continue; }
          p.vx *= EXPLOSION_PARTICLE_DRAG;
          p.vy *= EXPLOSION_PARTICLE_DRAG;
          p.vy += EXPLOSION_PARTICLE_GRAVITY; // gentle gravity
          p.x += p.vx;
          p.y += p.vy;
          c.beginPath();
          c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          c.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${p.alpha})`;
          c.fill();
        }

        if (exp.particles.length === 0 && exp.ringAlpha <= 0) {
          explosions.splice(i, 1);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={`${styles.canvas}${blur ? ` ${styles.blurred}` : ''}`} />;
};
