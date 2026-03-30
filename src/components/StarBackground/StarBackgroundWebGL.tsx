import { useComputedColorScheme } from '@mantine/core';
import React, { useEffect, useRef } from 'react';

import styles from './StarBackground.module.scss';
import {
  STAR_DENSITY, STAR_COUNT_MAX, STAR_GLOW_FACTOR, STAR_TWINKLE_AMPLITUDE, STAR_TWINKLE_CHANCE, STAR_TWINKLE_BURST_CYCLES,
  SHOOT_MAX_COUNT, SHOOT_SPAWN_INTERVAL, SHOOT_SPAWN_CHANCE,
  SHOOT_FADE_IN, SHOOT_FADE_OUT, SHOOT_GLOW_RADIUS, SHOOT_LINE_WIDTH,
  EXPLOSION_PARTICLE_COUNT,
  EXPLOSION_RING_EXPAND, EXPLOSION_RING_FADE,
  EXPLOSION_PARTICLE_DRAG, EXPLOSION_PARTICLE_GRAVITY,
  DEBUG_FRAMETIME,
  NEBULA_ENABLED, NEBULA_OPACITY, NEBULA_OPACITY_LIGHT,
  NEBULA_WEIGHT_HYDROGEN, NEBULA_WEIGHT_SO_HI, NEBULA_WEIGHT_SO_LO,
} from './config';
import { DARK_RGB_PALETTE, LIGHT_RGB_PALETTE } from './palettes';
import { makeStars, spawnExplosion, spawnShootingStar, drawFrameHUD, HUD_SAMPLES } from './helpers';
import type { NebulaProps, RGBPalette, Star, ShootingStar, Explosion } from './types';
import POINT_VERT  from './shaders/point.vert';
import POINT_FRAG  from './shaders/point.frag';
import GEOM_VERT   from './shaders/geom.vert';
import GEOM_FRAG   from './shaders/geom.frag';
import NEBULA_VERT from './shaders/nebula.vert';
import NEBULA_FRAG from './shaders/nebula.frag';

// ─── GL helpers ───────────────────────────────────────────────────────────────

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vert: string, frag: string): WebGLProgram {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER,   vert));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(`Program link error: ${gl.getProgramInfoLog(prog)}`);
  }
  return prog;
}

// ─── Component ────────────────────────────────────────────────────────────────

const RING_SEGS = 64;
// Preallocate ring buffer: 2 * (RING_SEGS + 1) vertices × 6 floats
const RING_VERT_COUNT = 2 * (RING_SEGS + 1);

export const StarBackgroundWebGL: React.FC<NebulaProps> = ({ nebula }) => {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const overlayRef     = useRef<HTMLCanvasElement>(null);
  const rafRef         = useRef<number>(0);
  const colorScheme    = useComputedColorScheme('dark', { getInitialValueInEffect: true });
  const paletteRef     = useRef<RGBPalette>(DARK_RGB_PALETTE);
  const colorSchemeRef = useRef(colorScheme);

  // Keep nebula bitmaps accessible inside the RAF loop without restarting it
  const nebulaRef = useRef<NebulaProps>({ nebula });
  useEffect(() => {
    nebulaRef.current = { nebula };
  }, [nebula]);

  // Swap palette immediately without restarting the animation loop
  useEffect(() => {
    paletteRef.current     = colorScheme === 'dark' ? DARK_RGB_PALETTE : LIGHT_RGB_PALETTE;
    colorSchemeRef.current = colorScheme;
  }, [colorScheme]);

  // Animation loop — runs once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rawGl = canvas.getContext('webgl', {
      alpha:              true,
      premultipliedAlpha: true,
      antialias:          false,
    }) as WebGLRenderingContext | null;
    if (!rawGl) return;

    // Non-null typed aliases — TypeScript doesn't propagate narrowing into closures,
    // so we capture the narrowed values as explicitly-typed consts (same pattern as
    // StarBackgroundCanvas which uses `const el: HTMLCanvasElement = canvas`).
    const el: HTMLCanvasElement     = canvas;
    const gl: WebGLRenderingContext = rawGl;

    // Overlay 2D canvas for the debug HUD (null when overlayRef is not mounted)
    const overlayCtx = overlayRef.current?.getContext('2d') ?? null;

    let pointProg:  WebGLProgram;
    let geomProg:   WebGLProgram;
    let nebulaProg: WebGLProgram | null = null;
    try {
      pointProg  = createProgram(gl, POINT_VERT,  POINT_FRAG);
      geomProg   = createProgram(gl, GEOM_VERT,   GEOM_FRAG);
      if (NEBULA_ENABLED) {
        nebulaProg = createProgram(gl, NEBULA_VERT, NEBULA_FRAG);
      }
    } catch {
      return;
    }

    // Attribute / uniform locations
    const pLoc = {
      pos:   gl.getAttribLocation(pointProg,  'a_pos'),
      color: gl.getAttribLocation(pointProg,  'a_color'),
      size:  gl.getAttribLocation(pointProg,  'a_size'),
      res:   gl.getUniformLocation(pointProg, 'u_res')!,
    };
    const gLoc = {
      pos:   gl.getAttribLocation(geomProg,  'a_pos'),
      color: gl.getAttribLocation(geomProg,  'a_color'),
      res:   gl.getUniformLocation(geomProg, 'u_res')!,
    };
    // Nebula program locations cached once (looked up every frame otherwise)
    const nLoc = nebulaProg ? {
      pos:      gl.getAttribLocation(nebulaProg,  'a_pos'),
      nebula:   gl.getUniformLocation(nebulaProg, 'u_nebula')!,
      opacity:  gl.getUniformLocation(nebulaProg, 'u_opacity')!,
      light:    gl.getUniformLocation(nebulaProg, 'u_light')!,
      w0:       gl.getUniformLocation(nebulaProg, 'u_w0')!,
      w1:       gl.getUniformLocation(nebulaProg, 'u_w1')!,
      w2:       gl.getUniformLocation(nebulaProg, 'u_w2')!,
      uvOffset: gl.getUniformLocation(nebulaProg, 'u_uv_offset')!,
      uvScale:  gl.getUniformLocation(nebulaProg, 'u_uv_scale')!,
    } : null;

    // Randomly assign S II / O III prominence — H-α always wins.
    // Each page load one of S/O is more prominent than the other.
    const soFlipped = Math.random() < 0.5;
    const nebulaW0 = soFlipped ? NEBULA_WEIGHT_SO_LO : NEBULA_WEIGHT_SO_HI;  // S II
    const nebulaW1 = NEBULA_WEIGHT_HYDROGEN;                                  // H-α
    const nebulaW2 = soFlipped ? NEBULA_WEIGHT_SO_HI : NEBULA_WEIGHT_SO_LO;  // O III

    const ptBuf     = gl.createBuffer()!;
    const geomBuf   = gl.createBuffer()!;

    // ── Nebula fullscreen quad (static, uploaded once) ────────────────────────
    // NDC corners: bottom-left, bottom-right, top-left, top-right (TRIANGLE_STRIP)
    const nebulaQuadBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, nebulaQuadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1,  1, -1,  -1, 1,  1, 1]), gl.STATIC_DRAW);

    // Single packed texture (null until bitmap arrives; re-uploaded on theme switch)
    let nebulaTex: WebGLTexture | null = null;
    let nebulaKind: 'dark' | 'light' | null = null;

    // Guard: check max texture size so we don't exceed GPU limits
    const maxTexSize: number = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

    gl.enable(gl.BLEND);
    // Premultiplied-alpha blending (canvas is premultipliedAlpha: true)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // ── Per-frame scratch buffers (preallocated, no GC pressure) ─────────────
    // Points: [x, y, r, g, b, a, size] × N
    // Worst-case size is max(stars, particles-per-frame). Particles can stack across
    // multiple simultaneous explosions (one per shooting star), so we size for that.
    const PT_MAX  = Math.max(STAR_COUNT_MAX, SHOOT_MAX_COUNT * EXPLOSION_PARTICLE_COUNT);
    const ptData    = new Float32Array(PT_MAX * 7);
    // Trails: 6 verts × 6 floats per shooting star
    const trailData = new Float32Array(SHOOT_MAX_COUNT * 6 * 6);
    // Ring: 2*(RING_SEGS+1) verts × 6 floats — reused per explosion
    const ringData  = new Float32Array(RING_VERT_COUNT * 6);

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    const shootingStars: ShootingStar[] = [];
    const explosions:    Explosion[]    = [];
    let spawnTimer = 0;

    function resize() {
      w = el.offsetWidth;
      h = el.offsetHeight;
      el.width  = w;
      el.height = h;
      gl.viewport(0, 0, w, h);
      if (overlayRef.current) { overlayRef.current.width = w; overlayRef.current.height = h; }
      const starCount = Math.min(STAR_COUNT_MAX, Math.round(STAR_DENSITY * w * h / 1_000_000));
      stars = makeStars(starCount, w, h, paletteRef.current.maxStarAlpha);
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    }

    resize();
    window.addEventListener('resize', onResize);

    // ── Draw helpers ──────────────────────────────────────────────────────────

    function drawPoints(data: Float32Array, count: number) {
      if (count === 0) return;
      gl.useProgram(pointProg);
      gl.uniform2f(pLoc.res, w, h);
      gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf);
      gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * 7), gl.DYNAMIC_DRAW);
      const stride = 7 * 4;
      gl.enableVertexAttribArray(pLoc.pos);
      gl.vertexAttribPointer(pLoc.pos,   2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(pLoc.color);
      gl.vertexAttribPointer(pLoc.color, 4, gl.FLOAT, false, stride, 2 * 4);
      gl.enableVertexAttribArray(pLoc.size);
      gl.vertexAttribPointer(pLoc.size,  1, gl.FLOAT, false, stride, 6 * 4);
      gl.drawArrays(gl.POINTS, 0, count);
    }

    function drawGeom(data: Float32Array, count: number, mode: number) {
      if (count === 0) return;
      gl.useProgram(geomProg);
      gl.uniform2f(gLoc.res, w, h);
      gl.bindBuffer(gl.ARRAY_BUFFER, geomBuf);
      gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * 6), gl.DYNAMIC_DRAW);
      // Disable pointProg's size attrib so it doesn't read stale data
      if (pLoc.size >= 0) gl.disableVertexAttribArray(pLoc.size);
      const stride = 6 * 4;
      gl.enableVertexAttribArray(gLoc.pos);
      gl.vertexAttribPointer(gLoc.pos,   2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(gLoc.color);
      gl.vertexAttribPointer(gLoc.color, 4, gl.FLOAT, false, stride, 2 * 4);
      gl.drawArrays(mode, 0, count);
    }

    // ── Main draw loop ────────────────────────────────────────────────────────

    const frameTimes = new Float64Array(HUD_SAMPLES);
    const wallTimes  = new Float64Array(HUD_SAMPLES);
    let frameIdx  = 0;
    let hudFilled = false;
    let lastWall  = performance.now();

    function draw(_now: DOMHighResTimeStamp) {
      // Measure only the work inside draw(), not the vsync wait before it.
      const t0 = performance.now();
      const wallDelta = t0 - lastWall;
      lastWall = t0;

      const palette = paletteRef.current;
      const isDark  = colorSchemeRef.current === 'dark';
      const scheme  = isDark ? 'dark' : 'light';

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // ── Nebula ─────────────────────────────────────────────────────────────
      if (NEBULA_ENABLED && nebulaProg && nLoc) {
        const bitmap = nebulaRef.current.nebula;

        if (bitmap && scheme !== nebulaKind) {
          // Lazy-upload: create / re-upload the packed texture on first use
          if (bitmap.width <= maxTexSize && bitmap.height <= maxTexSize) {
            if (!nebulaTex) nebulaTex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, nebulaTex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.bindTexture(gl.TEXTURE_2D, null);
          }
          nebulaKind = scheme;
        }

        if (nebulaTex) {
          gl.useProgram(nebulaProg);

          // Cover-crop UV: preserve texture aspect ratio, center-crop the overflow.
          const texW = nebulaRef.current.nebula!.width;
          const texH = nebulaRef.current.nebula!.height;
          const canvasAR  = w / h;
          const textureAR = texW / texH;
          let uvScaleX: number, uvScaleY: number, uvOffX: number, uvOffY: number;
          if (canvasAR >= textureAR) {
            // Canvas is wider — texture fills width, crop height
            uvScaleX = 1.0;
            uvScaleY = textureAR / canvasAR;
            uvOffX   = 0.0;
            uvOffY   = (1.0 - uvScaleY) / 2.0;
          } else {
            // Canvas is taller — texture fills height, crop width
            uvScaleY = 1.0;
            uvScaleX = canvasAR / textureAR;
            uvOffY   = 0.0;
            uvOffX   = (1.0 - uvScaleX) / 2.0;
          }

          // Bind packed texture to TEXTURE0
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, nebulaTex);
          gl.uniform1i(nLoc.nebula, 0);
          gl.uniform1f(nLoc.opacity, isDark ? NEBULA_OPACITY : NEBULA_OPACITY_LIGHT);
          gl.uniform1f(nLoc.light,   isDark ? 0.0 : 1.0);
          gl.uniform1f(nLoc.w0, nebulaW0);
          gl.uniform1f(nLoc.w1, nebulaW1);
          gl.uniform1f(nLoc.w2, nebulaW2);
          gl.uniform2f(nLoc.uvOffset, uvOffX, uvOffY);
          gl.uniform2f(nLoc.uvScale,  uvScaleX, uvScaleY);

          gl.bindBuffer(gl.ARRAY_BUFFER, nebulaQuadBuf);
          gl.enableVertexAttribArray(nLoc.pos);
          gl.vertexAttribPointer(nLoc.pos, 2, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          gl.disableVertexAttribArray(nLoc.pos);

          gl.bindTexture(gl.TEXTURE_2D, null);
        }
      }

      // ── Stars ────────────────────────────────────────────────────────────
      const dt = Math.min(wallDelta, 100) / 1000;
      let sn = 0;
      for (const s of stars) {
        if (s.twinkleActive) {
          s.twinklePhase += s.twinkleSpeed * dt;
          if (s.twinklePhase >= STAR_TWINKLE_BURST_CYCLES * Math.PI * 2) {
            s.twinklePhase  = 0;
            s.twinkleActive = false;
            s.alpha         = s.baseAlpha;
          } else {
            s.alpha = Math.max(0, Math.min(palette.maxStarAlpha,
              s.baseAlpha + STAR_TWINKLE_AMPLITUDE * Math.sin(s.twinklePhase)));
          }
        } else {
          s.alpha = s.baseAlpha;
          if (Math.random() < STAR_TWINKLE_CHANCE * dt) {
            s.twinkleActive = true;
            s.twinklePhase  = 0;
          }
        }

        // In dark mode use each star's individual spectral colour;
        // in light mode use the unified warm palette colour.
        const [sr, sg, sb] = isDark
          ? [s.color[0] / 255, s.color[1] / 255, s.color[2] / 255]
          : palette.starRGB;

        const b = sn * 7;
        ptData[b]     = s.x;
        ptData[b + 1] = s.y;
        ptData[b + 2] = sr;
        ptData[b + 3] = sg;
        ptData[b + 4] = sb;
        ptData[b + 5] = s.alpha;
        ptData[b + 6] = s.r * STAR_GLOW_FACTOR * 2;
        sn++;
      }
      drawPoints(ptData, sn);

      // ── Spawn shooting stars ───────────────────────────────────────────────
      spawnTimer++;
      if (spawnTimer >= SHOOT_SPAWN_INTERVAL && shootingStars.length < SHOOT_MAX_COUNT) {
        if (Math.random() < SHOOT_SPAWN_CHANCE) {
          shootingStars.push(spawnShootingStar(w, h, palette.maxShootAlpha));
        }
        spawnTimer = 0;
      }

      // ── Update shooting stars, build trail geometry & glow points ──────────
      let trailVerts = 0;
      let glowN      = 0;

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];

        if (ss.state === 'in') {
          ss.alpha += SHOOT_FADE_IN;
          if (ss.alpha >= ss.maxAlpha) { ss.alpha = ss.maxAlpha; ss.state = 'hold'; }
        } else if (ss.state === 'hold') {
          if (Math.hypot(ss.x, ss.y) > Math.min(w, h) * ss.holdDistFrac) ss.state = 'out';
        } else {
          ss.alpha -= SHOOT_FADE_OUT;
        }

        if (!ss.exploded && (ss.x >= w || ss.y >= h)) {
          ss.exploded = true;
          explosions.push(spawnExplosion(Math.min(ss.x, w), Math.min(ss.y, h), isDark));
        }

        if (ss.alpha <= 0 || ss.x > w + 20 || ss.y > h + 20) {
          shootingStars.splice(i, 1);
          continue;
        }

        // ── Trail quad (2 triangles, 6 vertices) ───────────────────────────
        const tailX  = ss.x - ss.vx * (ss.trailLength / 14);
        const tailY  = ss.y - ss.vy * (ss.trailLength / 14);
        const speed  = Math.hypot(ss.vx, ss.vy);
        const hw     = SHOOT_LINE_WIDTH / 2;
        const px     = (-ss.vy / speed) * hw;
        const py     = (ss.vx  / speed) * hw;

        const [tr, tg, tb] = palette.shootTailRGB;
        const [hr, hg, hb] = palette.shootColorRGB;
        const a            = ss.alpha;

        // 4 corner positions: v0=tail-perp, v1=tail+perp, v2=head-perp, v3=head+perp
        // Two triangles: (v0,v2,v1), (v1,v2,v3)
        type V = [number, number, number, number, number, number];
        const corners: [V, V, V, V] = [
          [tailX - px, tailY - py, tr, tg, tb, 0],
          [tailX + px, tailY + py, tr, tg, tb, 0],
          [ss.x  - px, ss.y  - py, hr, hg, hb, a],
          [ss.x  + px, ss.y  + py, hr, hg, hb, a],
        ];
        for (const vi of [0, 2, 1, 1, 2, 3] as const) {
          const v  = corners[vi];
          const tb2 = trailVerts * 6;
          trailData[tb2]     = v[0]; trailData[tb2 + 1] = v[1];
          trailData[tb2 + 2] = v[2]; trailData[tb2 + 3] = v[3];
          trailData[tb2 + 4] = v[4]; trailData[tb2 + 5] = v[5];
          trailVerts++;
        }

        // ── Glow point ─────────────────────────────────────────────────────
        const gb = glowN * 7;
        ptData[gb]     = ss.x;  ptData[gb + 1] = ss.y;
        ptData[gb + 2] = hr;    ptData[gb + 3] = hg;   ptData[gb + 4] = hb;
        ptData[gb + 5] = a;     ptData[gb + 6] = SHOOT_GLOW_RADIUS * 2;
        glowN++;

        ss.x += ss.vx;
        ss.y += ss.vy;
      }

      // Draw all trails in one call, then all glows
      drawGeom(trailData, trailVerts, gl.TRIANGLES);
      drawPoints(ptData, glowN);

      // ── Explosions ─────────────────────────────────────────────────────────
      let particleN = 0;

      for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        const [rr, rg, rb] = palette.ringRGB;

        // Expanding shockwave ring (triangle-strip annulus, per-explosion draw call)
        if (exp.ringAlpha > 0) {
          exp.ring     += EXPLOSION_RING_EXPAND;
          exp.ringAlpha -= EXPLOSION_RING_FADE;
          const ra      = Math.max(0, exp.ringAlpha);
          const rw      = 0.6; // half-width matching the canvas lineWidth=1.2
          const innerR  = Math.max(0, exp.ring - rw);
          const outerR  = exp.ring + rw;

          for (let s = 0; s <= RING_SEGS; s++) {
            const angle = (s / RING_SEGS) * Math.PI * 2;
            const cos   = Math.cos(angle);
            const sin   = Math.sin(angle);
            // inner vertex
            let b = s * 2 * 6;
            ringData[b]     = exp.x + cos * innerR; ringData[b + 1] = exp.y + sin * innerR;
            ringData[b + 2] = rr;  ringData[b + 3] = rg;  ringData[b + 4] = rb; ringData[b + 5] = ra;
            // outer vertex
            b += 6;
            ringData[b]     = exp.x + cos * outerR; ringData[b + 1] = exp.y + sin * outerR;
            ringData[b + 2] = rr;  ringData[b + 3] = rg;  ringData[b + 4] = rb; ringData[b + 5] = ra;
          }
          drawGeom(ringData, RING_VERT_COUNT, gl.TRIANGLE_STRIP);
        }

        // Particles (batched together after the loop)
        for (let j = exp.particles.length - 1; j >= 0; j--) {
          const p = exp.particles[j];
          p.alpha -= p.decay;
          if (p.alpha <= 0) { exp.particles.splice(j, 1); continue; }
          p.vx *= EXPLOSION_PARTICLE_DRAG;
          p.vy *= EXPLOSION_PARTICLE_DRAG;
          p.vy += EXPLOSION_PARTICLE_GRAVITY;
          p.x  += p.vx;
          p.y  += p.vy;

          const pb = particleN * 7;
          ptData[pb]     = p.x;              ptData[pb + 1] = p.y;
          ptData[pb + 2] = p.color[0] / 255; ptData[pb + 3] = p.color[1] / 255;
          ptData[pb + 4] = p.color[2] / 255; ptData[pb + 5] = p.alpha;
          ptData[pb + 6] = p.r * 2;
          particleN++;
        }

        if (exp.particles.length === 0 && exp.ringAlpha <= 0) {
          explosions.splice(i, 1);
        }
      }

      drawPoints(ptData, particleN);

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

      if (DEBUG_FRAMETIME && overlayCtx) {
        overlayCtx.clearRect(0, 0, w, h);
        drawFrameHUD(overlayCtx, w, h, avgWall, avgWork);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      gl.deleteBuffer(ptBuf);
      gl.deleteBuffer(geomBuf);
      gl.deleteBuffer(nebulaQuadBuf);
      if (nebulaTex) gl.deleteTexture(nebulaTex);
      gl.deleteProgram(pointProg);
      gl.deleteProgram(geomProg);
      if (nebulaProg) gl.deleteProgram(nebulaProg);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} />
      <canvas ref={overlayRef} className={styles.overlay} />
    </>
  );
};
