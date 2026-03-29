import { useComputedColorScheme } from '@mantine/core';
import React, { useEffect, useRef } from 'react';

import styles from './StarBackground.module.scss';
import {
  STAR_COUNT, STAR_TWINKLE_AMPLITUDE,
  SHOOT_MAX_COUNT, SHOOT_SPAWN_INTERVAL, SHOOT_SPAWN_CHANCE,
  SHOOT_FADE_IN, SHOOT_FADE_OUT, SHOOT_GLOW_RADIUS, SHOOT_LINE_WIDTH,
  EXPLOSION_RING_EXPAND, EXPLOSION_RING_FADE,
  EXPLOSION_PARTICLE_DRAG, EXPLOSION_PARTICLE_GRAVITY,
  DEBUG_FRAMETIME,
  NEBULA_ENABLED, NEBULA_OPACITY, NEBULA_OPACITY_LIGHT,
  NEBULA_WEIGHT_HYDROGEN, NEBULA_WEIGHT_SO_HI, NEBULA_WEIGHT_SO_LO,
} from './config';
import { DARK_PALETTE, LIGHT_PALETTE } from './palettes';
import { makeStars, spawnExplosion, spawnShootingStar, drawFrameHUD, HUD_SAMPLES } from './helpers';
import type { NebulaProps, Palette, Star, ShootingStar, Explosion } from './types';

export const StarBackgroundCanvas: React.FC<NebulaProps> = ({ nebulaDark, nebulaLight }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const colorScheme    = useComputedColorScheme('dark', { getInitialValueInEffect: true });
  const paletteRef     = useRef<Palette>(DARK_PALETTE);
  const colorSchemeRef = useRef(colorScheme);
  const nebulaRef      = useRef<NebulaProps>({ nebulaDark, nebulaLight });

  // Keep nebula bitmaps accessible inside the RAF loop without restarting it
  useEffect(() => {
    nebulaRef.current = { nebulaDark, nebulaLight };
  }, [nebulaDark, nebulaLight]);

  // Swap palette immediately without restarting the animation loop
  useEffect(() => {
    paletteRef.current     = colorScheme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
    colorSchemeRef.current = colorScheme;
  }, [colorScheme]);

  // Animation loop — runs once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const el: HTMLCanvasElement      = canvas;
    const c: CanvasRenderingContext2D = ctx;

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    const shootingStars: ShootingStar[] = [];
    const explosions:    Explosion[]    = [];
    let spawnTimer = 0;

    // Offscreen canvas for nebula — layers are composited here with 'lighter',
    // then the combined result is drawn at normalised opacity so the total
    // intensity matches the WebGL shader's MAX-alpha approach.
    const nebulaCanvas = document.createElement('canvas');
    let nebCtx = nebulaCanvas.getContext('2d')!;

    function resize() {
      w = el.offsetWidth;
      h = el.offsetHeight;
      el.width  = w;
      el.height = h;
      nebulaCanvas.width  = w;
      nebulaCanvas.height = h;
      stars = makeStars(STAR_COUNT, w, h, paletteRef.current.maxStarAlpha);
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    }

    resize();
    window.addEventListener('resize', onResize);

    // Randomise S II / O III prominence once per page load (mirrors WebGL)
    const soFlip      = Math.random() < 0.5;
    const nebulaWeights = [
      soFlip ? NEBULA_WEIGHT_SO_LO : NEBULA_WEIGHT_SO_HI,
      NEBULA_WEIGHT_HYDROGEN,
      soFlip ? NEBULA_WEIGHT_SO_HI : NEBULA_WEIGHT_SO_LO,
    ];
    // Normalise: divide by sum-of-weights so total intensity ≈ 1× (matches
    // the WebGL shader which uses MAX-alpha rather than summed alpha).
    const nebulaWeightSum = nebulaWeights.reduce((s, v) => s + v, 0);

    const frameTimes = new Float64Array(HUD_SAMPLES);
    const wallTimes  = new Float64Array(HUD_SAMPLES);
    let frameIdx  = 0;
    let hudFilled = false;
    let lastWall  = performance.now();

    function draw(now: DOMHighResTimeStamp) {
      // Measure only the work inside draw(), not the vsync wait before it.
      // This gives a true CPU cost that is comparable across renderers regardless
      // of monitor refresh rate.
      const t0 = performance.now();
      const wallDelta = t0 - lastWall;
      lastWall = t0;

      const palette = paletteRef.current;
      const isDark  = colorSchemeRef.current === 'dark';

      c.clearRect(0, 0, w, h);

      // ── Nebula layers (additive compositing, normalised) ──────────────────
      if (NEBULA_ENABLED) {
        const bitmaps = isDark ? nebulaRef.current.nebulaDark : nebulaRef.current.nebulaLight;
        if (bitmaps && bitmaps.length > 0) {
          const opacity = isDark ? NEBULA_OPACITY : NEBULA_OPACITY_LIGHT;
          // Blend layers additively into the offscreen buffer
          nebCtx.clearRect(0, 0, w, h);
          nebCtx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < bitmaps.length; i++) {
            nebCtx.globalAlpha = nebulaWeights[i] ?? 1;
            nebCtx.drawImage(bitmaps[i], 0, 0, w, h);
          }
          // Draw the combined offscreen result at normalised opacity
          c.globalAlpha = opacity / nebulaWeightSum;
          c.drawImage(nebulaCanvas, 0, 0);
          c.globalAlpha = 1;
        }
      }

      // ── Static stars (twinkle) ─────────────────────────────────────────────
      for (const s of stars) {
        s.alpha += s.twinkleSpeed * s.twinkleDir;
        if (
          s.alpha >= s.baseAlpha + STAR_TWINKLE_AMPLITUDE ||
          s.alpha <= s.baseAlpha - STAR_TWINKLE_AMPLITUDE
        ) {
          s.twinkleDir = (s.twinkleDir * -1) as 1 | -1;
        }
        s.alpha = Math.max(0, Math.min(palette.maxStarAlpha, s.alpha));

        c.beginPath();
        c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        c.fillStyle = isDark
          ? `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${s.alpha})`
          : palette.starColor(s.alpha);
        c.fill();
      }

      // ── Spawn shooting stars ───────────────────────────────────────────────
      spawnTimer++;
      if (spawnTimer >= SHOOT_SPAWN_INTERVAL && shootingStars.length < SHOOT_MAX_COUNT) {
        if (Math.random() < SHOOT_SPAWN_CHANCE) {
          shootingStars.push(spawnShootingStar(w, h, palette.maxShootAlpha));
        }
        spawnTimer = 0;
      }

      // ── Draw & update shooting stars ───────────────────────────────────────
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];

        if (ss.state === 'in') {
          ss.alpha += SHOOT_FADE_IN;
          if (ss.alpha >= ss.maxAlpha) {
            ss.alpha = ss.maxAlpha;
            ss.state = 'hold';
          }
        } else if (ss.state === 'hold') {
          if (Math.hypot(ss.x, ss.y) > Math.min(w, h) * ss.holdDistFrac) {
            ss.state = 'out';
          }
        } else {
          ss.alpha -= SHOOT_FADE_OUT;
        }

        // Trigger explosion when the star first crosses the canvas edge
        if (!ss.exploded && (ss.x >= w || ss.y >= h)) {
          ss.exploded = true;
          explosions.push(spawnExplosion(Math.min(ss.x, w), Math.min(ss.y, h), isDark));
        }

        if (ss.alpha <= 0 || ss.x > w + 20 || ss.y > h + 20) {
          shootingStars.splice(i, 1);
          continue;
        }

        const tailX = ss.x - ss.vx * (ss.trailLength / 14);
        const tailY = ss.y - ss.vy * (ss.trailLength / 14);

        const grad = c.createLinearGradient(tailX, tailY, ss.x, ss.y);
        grad.addColorStop(0,   palette.shootTail(0));
        grad.addColorStop(0.7, palette.shootTail(ss.alpha * 0.6));
        grad.addColorStop(1,   palette.shootColor(ss.alpha));

        c.beginPath();
        c.moveTo(tailX, tailY);
        c.lineTo(ss.x, ss.y);
        c.strokeStyle = grad;
        c.lineWidth   = SHOOT_LINE_WIDTH;
        c.lineCap     = 'round';
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

      // ── Draw explosions ────────────────────────────────────────────────────
      for (let i = explosions.length - 1; i >= 0; i--) {
        const exp    = explosions[i];

        // Expanding shockwave ring
        if (exp.ringAlpha > 0) {
          exp.ring     += EXPLOSION_RING_EXPAND;
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
          p.vy += EXPLOSION_PARTICLE_GRAVITY;
          p.x  += p.vx;
          p.y  += p.vy;
          c.beginPath();
          c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          c.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${p.alpha})`;
          c.fill();
        }

        if (exp.particles.length === 0 && exp.ringAlpha <= 0) {
          explosions.splice(i, 1);
        }
      }

      // Stamp the end of the actual rendering work (excludes vsync wait).
      const workMs = performance.now() - t0;
      frameTimes[frameIdx] = workMs;
      wallTimes[frameIdx]  = wallDelta;
      frameIdx = (frameIdx + 1) % HUD_SAMPLES;
      if (frameIdx === 0) hudFilled = true;
      const sampleCount = hudFilled ? HUD_SAMPLES : Math.max(1, frameIdx);
      let sumWork = 0, sumWall = 0;
      for (let i = 0; i < sampleCount; i++) { sumWork += frameTimes[i]; sumWall += wallTimes[i]; }
      const avgWork = sumWork / sampleCount;
      const avgWall = sumWall / sampleCount;

      if (DEBUG_FRAMETIME) drawFrameHUD(c, w, h, avgWall, avgWork);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} />;
};
