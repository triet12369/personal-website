import { useComputedColorScheme } from '@mantine/core';
import type React from 'react';
import { useEffect, useRef } from 'react';

import styles from './StarBackground.module.scss';
import {
  STAR_DENSITY,
  STAR_COUNT_MAX,
  STAR_GLOW_FACTOR,
  STAR_CANVAS_GLOW_SCALE,
  STAR_BLOOM_FACTOR,
  STAR_BLOOM_STRENGTH,
  STAR_TWINKLE_AMPLITUDE,
  STAR_TWINKLE_CHANCE,
  STAR_TWINKLE_BURST_CYCLES,
  SHOOT_MAX_COUNT,
  SHOOT_SPAWN_INTERVAL,
  SHOOT_SPAWN_CHANCE,
  SHOOT_FADE_IN,
  SHOOT_FADE_OUT,
  SHOOT_GLOW_RADIUS,
  SHOOT_LINE_WIDTH,
  EXPLOSION_RING_EXPAND,
  EXPLOSION_RING_FADE,
  EXPLOSION_PARTICLE_DRAG,
  EXPLOSION_PARTICLE_GRAVITY,
  DEBUG_FRAMETIME,
  NEBULA_ENABLED,
  NEBULA_OPACITY,
  NEBULA_OPACITY_LIGHT,
  NEBULA_WEIGHT_HYDROGEN,
  NEBULA_WEIGHT_SO_HI,
  NEBULA_WEIGHT_SO_LO,
  NEBULA_WEIGHT_RGB_HI,
  NEBULA_WEIGHT_RGB_MID,
  NEBULA_WEIGHT_RGB_LO,
} from './config';
import { DARK_PALETTE, LIGHT_PALETTE } from './palettes';
import {
  makeStars,
  spawnExplosion,
  spawnShootingStar,
  drawFrameHUD,
  HUD_SAMPLES,
} from './helpers';
import type { NebulaProps, Palette, Star, ShootingStar, Explosion } from './types';

export const StarBackgroundCanvas: React.FC<NebulaProps> = ({
  nebula,
  nebulaPalette,
  heroNebula,
  heroBitmap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const colorScheme = useComputedColorScheme('dark', { getInitialValueInEffect: true });
  const paletteRef = useRef<Palette>(DARK_PALETTE);
  const colorSchemeRef = useRef(colorScheme);
  const nebulaPaletteRef = useRef(nebulaPalette);
  const nebulaRef = useRef<NebulaProps>({ nebula, nebulaPalette });

  // Keep nebula bitmaps accessible inside the RAF loop without restarting it
  useEffect(() => {
    nebulaRef.current = { nebula, nebulaPalette };
    nebulaPaletteRef.current = nebulaPalette;
  }, [nebula, nebulaPalette]);

  // Hero astrophoto ref — accessible inside RAF without restarting the loop
  const heroRef = useRef({ heroNebula, heroBitmap });
  useEffect(() => {
    heroRef.current = { heroNebula, heroBitmap };
  }, [heroNebula, heroBitmap]);

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

    // Offscreen canvas holding the per-pixel colour-decomposed nebula.
    // Recomputed once whenever the source bitmap or colour scheme changes.
    let nebulaComposed: HTMLCanvasElement | null = null;
    let nebulaComposedKind: string | null = null;

    function resize() {
      w = el.offsetWidth;
      h = el.offsetHeight;
      el.width = w;
      el.height = h;
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    }

    resize();
    // Build stars once using screen dimensions so mobile browser chrome show/hide
    // (which changes window.innerHeight) never causes a blank region of sky.
    const starsW = Math.max(w, screen.availWidth || w);
    const starsH = Math.max(h, screen.availHeight || h);
    const starCount = Math.min(
      STAR_COUNT_MAX,
      Math.round((STAR_DENSITY * starsW * starsH) / 1_000_000),
    );
    stars = makeStars(starCount, starsW, starsH, paletteRef.current.maxStarAlpha);
    window.addEventListener('resize', onResize);

    // SHO weights: H-α always dominant, S II / O III randomly ordered.
    const soFlip = Math.random() < 0.5;
    const shoWeights: [number, number, number] = [
      soFlip ? NEBULA_WEIGHT_SO_LO : NEBULA_WEIGHT_SO_HI,
      NEBULA_WEIGHT_HYDROGEN,
      soFlip ? NEBULA_WEIGHT_SO_HI : NEBULA_WEIGHT_SO_LO,
    ];
    // RGB weights: shuffle HI/MID/LO randomly across all three channels.
    const rgbOrd = [0, 1, 2].sort(() => Math.random() - 0.5);
    const rgbNebWeights: [number, number, number] = [0, 0, 0];
    rgbNebWeights[rgbOrd[0]] = NEBULA_WEIGHT_RGB_HI;
    rgbNebWeights[rgbOrd[1]] = NEBULA_WEIGHT_RGB_MID;
    rgbNebWeights[rgbOrd[2]] = NEBULA_WEIGHT_RGB_LO;

    // ── Gradient helpers (mirrors nebula.frag.ts) ─────────────────────────────
    const THRESHOLD = 0.1;
    function nebulaAlpha(v: number): number {
      return Math.max(0, (v - THRESHOLD) / (1 - THRESHOLD));
    }
    function lerp(a: number, b: number, t: number): number {
      return a + (b - a) * t;
    }
    function lerpRGB(
      a: [number, number, number],
      b: [number, number, number],
      t: number,
    ): [number, number, number] {
      return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    }
    function clamp01(v: number): number {
      return Math.max(0, Math.min(1, v));
    }

    function darkS2(v: number): [number, number, number] {
      const stops: [number, [number, number, number]][] = [
        [0.38, [0.196, 0.02, 0.0]],
        [0.52, [0.51, 0.118, 0.02]],
        [0.65, [0.824, 0.314, 0.039]],
        [0.8, [0.941, 0.569, 0.157]],
        [1.0, [1.0, 0.784, 0.353]],
      ];
      if (v <= stops[0][0]) return stops[0][1];
      for (let i = 1; i < stops.length; i++) {
        if (v <= stops[i][0])
          return lerpRGB(
            stops[i - 1][1],
            stops[i][1],
            (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]),
          );
      }
      return stops[stops.length - 1][1];
    }
    function darkHa(v: number): [number, number, number] {
      const stops: [number, [number, number, number]][] = [
        [0.38, [0.0, 0.137, 0.039]],
        [0.52, [0.039, 0.353, 0.118]],
        [0.65, [0.098, 0.588, 0.216]],
        [0.8, [0.275, 0.784, 0.353]],
        [1.0, [0.549, 0.902, 0.549]],
      ];
      if (v <= stops[0][0]) return stops[0][1];
      for (let i = 1; i < stops.length; i++) {
        if (v <= stops[i][0])
          return lerpRGB(
            stops[i - 1][1],
            stops[i][1],
            (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]),
          );
      }
      return stops[stops.length - 1][1];
    }
    function darkO3(v: number): [number, number, number] {
      const stops: [number, [number, number, number]][] = [
        [0.38, [0.0, 0.059, 0.216]],
        [0.52, [0.039, 0.216, 0.51]],
        [0.65, [0.078, 0.451, 0.784]],
        [0.8, [0.157, 0.667, 0.902]],
        [1.0, [0.392, 0.843, 1.0]],
      ];
      if (v <= stops[0][0]) return stops[0][1];
      for (let i = 1; i < stops.length; i++) {
        if (v <= stops[i][0])
          return lerpRGB(
            stops[i - 1][1],
            stops[i][1],
            (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]),
          );
      }
      return stops[stops.length - 1][1];
    }
    function lightL0(v: number): [number, number, number] {
      const stops: [number, [number, number, number]][] = [
        [0.38, [0.675, 0.627, 0.576]],
        [0.65, [0.82, 0.792, 0.765]],
        [1.0, [0.965, 0.957, 0.953]],
      ];
      if (v <= stops[0][0]) return stops[0][1];
      for (let i = 1; i < stops.length; i++) {
        if (v <= stops[i][0])
          return lerpRGB(
            stops[i - 1][1],
            stops[i][1],
            (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]),
          );
      }
      return stops[stops.length - 1][1];
    }
    function lightL1(v: number): [number, number, number] {
      const stops: [number, [number, number, number]][] = [
        [0.38, [0.424, 0.376, 0.325]],
        [0.65, [0.604, 0.545, 0.482]],
        [1.0, [0.89, 0.875, 0.859]],
      ];
      if (v <= stops[0][0]) return stops[0][1];
      for (let i = 1; i < stops.length; i++) {
        if (v <= stops[i][0])
          return lerpRGB(
            stops[i - 1][1],
            stops[i][1],
            (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]),
          );
      }
      return stops[stops.length - 1][1];
    }
    function lightL2(v: number): [number, number, number] {
      const stops: [number, [number, number, number]][] = [
        [0.38, [0.604, 0.545, 0.482]],
        [0.65, [0.745, 0.71, 0.671]],
        [1.0, [0.89, 0.875, 0.859]],
      ];
      if (v <= stops[0][0]) return stops[0][1];
      for (let i = 1; i < stops.length; i++) {
        if (v <= stops[i][0])
          return lerpRGB(
            stops[i - 1][1],
            stops[i][1],
            (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]),
          );
      }
      return stops[stops.length - 1][1];
    }

    function rgbR(v: number): [number, number, number] {
      const stops: [number, [number, number, number]][] = [
        [0.38, [0.235, 0.02, 0.02]],
        [0.52, [0.588, 0.078, 0.039]],
        [0.65, [0.863, 0.255, 0.059]],
        [0.8, [0.961, 0.471, 0.118]],
        [1.0, [1, 0.745, 0.235]],
      ];
      if (v <= stops[0][0]) return stops[0][1];
      for (let i = 1; i < stops.length; i++) {
        if (v <= stops[i][0])
          return lerpRGB(
            stops[i - 1][1],
            stops[i][1],
            (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]),
          );
      }
      return stops[stops.length - 1][1];
    }
    function rgbG(v: number): [number, number, number] {
      const stops: [number, [number, number, number]][] = [
        [0.38, [0.02, 0.137, 0.02]],
        [0.52, [0.059, 0.392, 0.078]],
        [0.65, [0.137, 0.706, 0.157]],
        [0.8, [0.451, 0.902, 0.235]],
        [1.0, [0.765, 1, 0.392]],
      ];
      if (v <= stops[0][0]) return stops[0][1];
      for (let i = 1; i < stops.length; i++) {
        if (v <= stops[i][0])
          return lerpRGB(
            stops[i - 1][1],
            stops[i][1],
            (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]),
          );
      }
      return stops[stops.length - 1][1];
    }
    function rgbB(v: number): [number, number, number] {
      const stops: [number, [number, number, number]][] = [
        [0.38, [0.078, 0, 0.235]],
        [0.52, [0.196, 0.059, 0.608]],
        [0.65, [0.275, 0.196, 0.863]],
        [0.8, [0.353, 0.529, 1]],
        [1.0, [0.471, 0.824, 1]],
      ];
      if (v <= stops[0][0]) return stops[0][1];
      for (let i = 1; i < stops.length; i++) {
        if (v <= stops[i][0])
          return lerpRGB(
            stops[i - 1][1],
            stops[i][1],
            (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]),
          );
      }
      return stops[stops.length - 1][1];
    }

    // Decompose the packed R/G/B noise bitmap into per-pixel RGBA using the
    // colour gradients matching the GLSL shader.  Called once per bitmap/scheme change.
    function decomposeNebula(
      bitmap: ImageBitmap,
      w0: number,
      w1: number,
      w2: number,
      dark: boolean,
      nebPalette: 'sho' | 'rgb',
    ): HTMLCanvasElement {
      const off = document.createElement('canvas');
      off.width = bitmap.width;
      off.height = bitmap.height;
      const octx = off.getContext('2d')!;
      octx.drawImage(bitmap, 0, 0);
      const imgData = octx.getImageData(0, 0, bitmap.width, bitmap.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const v0 = d[i] / 255;
        const v1 = d[i + 1] / 255;
        const v2 = d[i + 2] / 255;
        const a0 = nebulaAlpha(v0) * w0;
        const a1 = nebulaAlpha(v1) * w1;
        const a2 = nebulaAlpha(v2) * w2;
        const col0 = dark ? (nebPalette === 'rgb' ? rgbR(v0) : darkS2(v0)) : lightL0(v0);
        const col1 = dark ? (nebPalette === 'rgb' ? rgbG(v1) : darkHa(v1)) : lightL1(v1);
        const col2 = dark ? (nebPalette === 'rgb' ? rgbB(v2) : darkO3(v2)) : lightL2(v2);
        const r = clamp01(col0[0] * a0 + col1[0] * a1 + col2[0] * a2);
        const g = clamp01(col0[1] * a0 + col1[1] * a1 + col2[1] * a2);
        const b = clamp01(col0[2] * a0 + col1[2] * a1 + col2[2] * a2);
        const a = clamp01(Math.max(a0, a1, a2));
        d[i] = r * 255;
        d[i + 1] = g * 255;
        d[i + 2] = b * 255;
        d[i + 3] = a * 255;
      }
      octx.putImageData(imgData, 0, 0);
      return off;
    }

    const frameTimes = new Float64Array(HUD_SAMPLES);
    const wallTimes = new Float64Array(HUD_SAMPLES);
    let frameIdx = 0;
    let hudFilled = false;
    let lastWall = performance.now();

    function draw(_now: DOMHighResTimeStamp) {
      // Measure only the work inside draw(), not the vsync wait before it.
      // This gives a true CPU cost that is comparable across renderers regardless
      // of monitor refresh rate.
      const t0 = performance.now();
      const wallDelta = t0 - lastWall;
      lastWall = t0;

      const palette = paletteRef.current;
      const isDark = colorSchemeRef.current === 'dark';

      c.clearRect(0, 0, w, h);

      // ── Nebula (decomposed packed texture) ─────────────────────────────
      if (NEBULA_ENABLED) {
        const hero = heroRef.current.heroNebula;
        const hBmp = heroRef.current.heroBitmap;

        // ── Hero astrophoto base layer ──────────────────────────────────
        if (hero && hBmp) {
          const hImgAR = hBmp.width / hBmp.height;
          const hCanAR = w / h;
          const fit = hero.fit ?? 'cover';
          c.globalAlpha = hero.photoOpacity ?? 0.75;

          if (fit === 'fill') {
            // Stretch to fill — no aspect ratio preservation
            c.drawImage(hBmp, 0, 0, hBmp.width, hBmp.height, 0, 0, w, h);
          } else if (fit === 'contain') {
            // Scale to fit entirely — letterbox/pillarbox with transparent gaps
            let dw: number, dh: number, dx: number, dy: number;
            if (hCanAR >= hImgAR) {
              dh = h;
              dw = h * hImgAR;
              dy = 0;
              dx = (w - dw) / 2;
            } else {
              dw = w;
              dh = w / hImgAR;
              dx = 0;
              dy = (h - dh) / 2;
            }
            c.drawImage(hBmp, 0, 0, hBmp.width, hBmp.height, dx, dy, dw, dh);
          } else {
            // cover (default) — scale to fill, crop the overflow
            let hSx: number, hSy: number, hSw: number, hSh: number;
            if (hCanAR >= hImgAR) {
              hSw = hBmp.width;
              hSh = hBmp.width / hCanAR;
              hSx = 0;
              hSy = (hBmp.height - hSh) / 2;
            } else {
              hSh = hBmp.height;
              hSw = hBmp.height * hCanAR;
              hSy = 0;
              hSx = (hBmp.width - hSw) / 2;
            }
            c.drawImage(hBmp, hSx, hSy, hSw, hSh, 0, 0, w, h);
          }

          c.globalAlpha = 1;
        }

        // ── Procedural nebula (screen-blended over hero, normal mode without) ─
        const bitmap = nebulaRef.current.nebula;
        if (bitmap) {
          const kind = isDark ? `dark-${nebulaPaletteRef.current}` : 'light';
          if (nebulaComposedKind !== kind || !nebulaComposed) {
            const nebulaW =
              nebulaPaletteRef.current === 'rgb' ? rgbNebWeights : shoWeights;
            nebulaComposed = decomposeNebula(
              bitmap,
              nebulaW[0],
              nebulaW[1],
              nebulaW[2],
              isDark,
              nebulaPaletteRef.current,
            );
            nebulaComposedKind = kind;
          }
          const baseOpacity = isDark ? NEBULA_OPACITY : NEBULA_OPACITY_LIGHT;
          const procOpacity = hero
            ? (hero.proceduralBlend ?? 0.35) * baseOpacity
            : baseOpacity;
          if (hero && hBmp) {
            // Map 'normal' to Canvas 2D's 'source-over' (CSS uses 'normal', Canvas uses 'source-over')
            const blendMode = (
              hero.proceduralBlendMode === 'normal'
                ? 'source-over'
                : (hero.proceduralBlendMode ?? 'screen')
            ) as GlobalCompositeOperation;
            c.globalCompositeOperation = blendMode;
          }
          c.globalAlpha = procOpacity;
          // Cover-crop: preserve texture aspect ratio, center-crop the overflow.
          const texW = nebulaComposed.width;
          const texH = nebulaComposed.height;
          const canvasAR = w / h;
          const textureAR = texW / texH;
          let sx: number, sy: number, sw: number, sh: number;
          if (canvasAR >= textureAR) {
            sw = texW;
            sh = texW / canvasAR;
            sx = 0;
            sy = (texH - sh) / 2;
          } else {
            sh = texH;
            sw = texH * canvasAR;
            sy = 0;
            sx = (texW - sw) / 2;
          }
          c.drawImage(nebulaComposed, sx, sy, sw, sh, 0, 0, w, h);
          c.globalAlpha = 1;
          c.globalCompositeOperation = 'source-over';
        }
      }

      // ── Static stars (twinkle bursts) ─────────────────────────────────────
      const dt = Math.min(wallDelta, 100) / 1000;
      // Pass 1 — update twinkle alpha only (no drawing yet)
      for (const s of stars) {
        if (s.twinkleActive) {
          s.twinklePhase += s.twinkleSpeed * dt;
          if (s.twinklePhase >= STAR_TWINKLE_BURST_CYCLES * Math.PI * 2) {
            s.twinklePhase = 0;
            s.twinkleActive = false;
            s.alpha = s.baseAlpha;
          } else {
            s.alpha = Math.max(
              0,
              Math.min(
                palette.maxStarAlpha,
                s.baseAlpha + STAR_TWINKLE_AMPLITUDE * Math.sin(s.twinklePhase),
              ),
            );
          }
        } else {
          s.alpha = s.baseAlpha;
          if (Math.random() < STAR_TWINKLE_CHANCE * dt) {
            s.twinkleActive = true;
            s.twinklePhase = 0;
          }
        }
      }

      // ── Star→nebula illumination (WebGL-only — skipped for Canvas renderer) ──

      // Pass 2 — draw star glows
      for (const s of stars) {
        const glowR = s.r * STAR_GLOW_FACTOR * STAR_CANVAS_GLOW_SCALE;
        const grad = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
        if (isDark) {
          const [cr, cg, cb] = s.color;
          grad.addColorStop(0, `rgba(${cr},${cg},${cb},${s.alpha})`);
          grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},${(s.alpha * 0.6).toFixed(3)}`);
          grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        } else {
          grad.addColorStop(0, palette.starColor(s.alpha));
          grad.addColorStop(0.5, palette.starColor(s.alpha * 0.6));
          grad.addColorStop(1, palette.starColor(0));
        }
        c.beginPath();
        c.arc(s.x, s.y, glowR, 0, Math.PI * 2);
        c.fillStyle = grad;
        c.fill();
      }

      // ── Bloom pass (additive) ─────────────────────────────────────────────
      c.globalCompositeOperation = 'lighter';
      for (const s of stars) {
        const bloomR =
          s.r * STAR_GLOW_FACTOR * STAR_CANVAS_GLOW_SCALE * STAR_BLOOM_FACTOR;
        const bloomA = s.alpha * STAR_BLOOM_STRENGTH;
        const grad = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, bloomR);
        if (isDark) {
          const [cr, cg, cb] = s.color;
          grad.addColorStop(0, `rgba(${cr},${cg},${cb},${bloomA.toFixed(3)})`);
          grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        } else {
          grad.addColorStop(0, palette.starColor(bloomA));
          grad.addColorStop(1, palette.starColor(0));
        }
        c.beginPath();
        c.arc(s.x, s.y, bloomR, 0, Math.PI * 2);
        c.fillStyle = grad;
        c.fill();
      }
      c.globalCompositeOperation = 'source-over';

      // ── Spawn shooting stars ───────────────────────────────────────────────
      spawnTimer += dt;
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
          ss.alpha += SHOOT_FADE_IN * dt;
          if (ss.alpha >= ss.maxAlpha) {
            ss.alpha = ss.maxAlpha;
            ss.state = 'hold';
          }
        } else if (ss.state === 'hold') {
          if (Math.hypot(ss.x, ss.y) > Math.min(w, h) * ss.holdDistFrac) {
            ss.state = 'out';
          }
        } else {
          ss.alpha -= SHOOT_FADE_OUT * dt;
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

        const trailSecs = ss.trailLength / (Math.hypot(ss.vx, ss.vy) || 1);
        const tailX = ss.x - ss.vx * trailSecs;
        const tailY = ss.y - ss.vy * trailSecs;

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

        ss.x += ss.vx * dt;
        ss.y += ss.vy * dt;
      }

      // ── Draw explosions ────────────────────────────────────────────────────
      for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];

        // Expanding shockwave ring
        if (exp.ringAlpha > 0) {
          exp.ring += EXPLOSION_RING_EXPAND * dt;
          exp.ringAlpha -= EXPLOSION_RING_FADE * dt;
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
          p.alpha -= p.decay * dt;
          if (p.alpha <= 0) {
            exp.particles.splice(j, 1);
            continue;
          }
          const drag = EXPLOSION_PARTICLE_DRAG ** dt;
          p.vx *= drag;
          p.vy *= drag;
          p.vy += EXPLOSION_PARTICLE_GRAVITY * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
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
      wallTimes[frameIdx] = wallDelta;
      frameIdx = (frameIdx + 1) % HUD_SAMPLES;
      if (frameIdx === 0) hudFilled = true;
      const sampleCount = hudFilled ? HUD_SAMPLES : Math.max(1, frameIdx);
      let sumWork = 0,
        sumWall = 0;
      for (let i = 0; i < sampleCount; i++) {
        sumWork += frameTimes[i];
        sumWall += wallTimes[i];
      }
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
