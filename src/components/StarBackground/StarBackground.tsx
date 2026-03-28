import { useComputedColorScheme } from '@mantine/core';
import React, { useEffect, useRef } from 'react';

import styles from './StarBackground.module.scss';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Star {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleDir: 1 | -1;
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

function makeStars(count: number, w: number, h: number, palette: Palette): Star[] {
  return Array.from({ length: count }, () => {
    const baseAlpha = rand(0.15, palette.maxStarAlpha);
    return {
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.3, 1.6),
      baseAlpha,
      alpha: baseAlpha,
      twinkleSpeed: rand(0.003, 0.011),
      twinkleDir: Math.random() > 0.5 ? 1 : -1,
    };
  });
}

function spawnShootingStar(w: number, h: number, palette: Palette): ShootingStar {
  const angleDeg = rand(20, 40);
  const angleRad = (angleDeg * Math.PI) / 180;
  const speed = rand(9, 16);
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
    trailLength: rand(160, 360),
    alpha: 0,
    maxAlpha: rand(0.55, palette.maxShootAlpha),
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

  // Swap palette immediately without restarting the animation loop
  useEffect(() => {
    paletteRef.current = colorScheme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
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
    const MAX_SHOOTING = 4;
    const shootingStars: ShootingStar[] = [];
    let spawnTimer = 0;
    const SPAWN_INTERVAL = 90;

    function resize() {
      w = el.offsetWidth;
      h = el.offsetHeight;
      el.width = w;
      el.height = h;
      stars = makeStars(180, w, h, paletteRef.current);
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
        if (s.alpha >= s.baseAlpha + 0.2 || s.alpha <= s.baseAlpha - 0.2) {
          s.twinkleDir = (s.twinkleDir * -1) as 1 | -1;
        }
        s.alpha = Math.max(0, Math.min(palette.maxStarAlpha, s.alpha));

        c.beginPath();
        c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        c.fillStyle = palette.starColor(s.alpha);
        c.fill();
      }

      // Spawn shooting stars
      spawnTimer++;
      if (spawnTimer >= SPAWN_INTERVAL && shootingStars.length < MAX_SHOOTING) {
        if (Math.random() < 0.3) {
          shootingStars.push(spawnShootingStar(w, h, palette));
        }
        spawnTimer = 0;
      }

      // Draw & update shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];

        if (ss.state === 'in') {
          ss.alpha += 0.04;
          if (ss.alpha >= ss.maxAlpha) {
            ss.alpha = ss.maxAlpha;
            ss.state = 'hold';
          }
        } else if (ss.state === 'hold') {
          const distFromStart = Math.hypot(ss.x, ss.y);
          if (distFromStart > Math.min(w, h) * 0.4) {
            ss.state = 'out';
          }
        } else {
          ss.alpha -= 0.015;
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
        c.lineWidth = 1.5;
        c.lineCap = 'round';
        c.stroke();

        const glow = c.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, 3.5);
        glow.addColorStop(0, palette.shootColor(ss.alpha));
        glow.addColorStop(1, palette.shootColor(0));
        c.beginPath();
        c.arc(ss.x, ss.y, 3.5, 0, Math.PI * 2);
        c.fillStyle = glow;
        c.fill();

        ss.x += ss.vx;
        ss.y += ss.vy;
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
