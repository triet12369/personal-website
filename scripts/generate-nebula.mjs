/**
 * Perlin fBm nebula texture generator — build-time script.
 *
 * Generates NEBULA_BAKED_COUNT variants × 2 themes × NEBULA_LAYER_COUNT layers
 * = NEBULA_BAKED_COUNT × 6 PNG files written to public/nebula/.
 *
 * File naming: {theme}-{variant}-{layer}.png
 *   e.g.  dark-0-0.png  (dark theme, variant 0, S II layer)
 *         light-3-2.png  (light theme, variant 3, oxygen layer)
 *
 * Run once after changing any constant below:
 *   npm run generate:nebula
 *
 * ⚠  Keep constants below in sync with:
 *    src/components/StarBackground/config.ts
 */

import { mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const NEBULA_BAKED_COUNT = 12; // number of variants to bake
const NEBULA_LAYER_COUNT = 3; // independent noise layers packed into R/G/B channels
const NEBULA_BAKED_WIDTH = 1920; // bake resolution (stretched to fit screen at runtime)
const NEBULA_BAKED_HEIGHT = 1080;

const NEBULA_OCTAVES = 8; // number of fBm noise layers — more = finer cloud detail, slower generation
const NEBULA_SCALE = 2; // base noise frequency — lower = larger cloud formations, higher = tighter wisps
const NEBULA_PERSISTENCE = 0.45; // amplitude falloff per octave (0–1) — lower = smoother/softer clouds
const NEBULA_LACUNARITY = 2.0; // frequency multiplier per octave — 2.0 doubles detail each layer
const NEBULA_SEED = 42; // base RNG seed; each variant offsets by index × 31337, each layer by prime × 7919
const NEBULA_BLUR_PASSES = 1; // box-blur passes after noise sampling — 1 preserves nebula edge sharpness
// Domain warp strength — how much a secondary fBm field distorts the primary sample coordinates.
// Higher = more turbulent twisted filaments (nebula-like); 0 = plain fBm (aurora-like).
const NEBULA_WARP_STRENGTH = 0.55;

// ⚠ NEBULA_THRESHOLD is intentionally NOT applied here — raw fBm values [0,1]
// are stored directly in R/G/B channels so the shader can apply threshold and
// colour gradients in full precision without double-quantisation.

// ─── Perlin fBm noise ─────────────────────────────────────────────────────────

function buildPerm(seed) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = (seed ^ 0xdeadbeef) >>> 0;
  const lcg = () => {
    s = Math.imul(1664525, s) + 1013904223;
    return (s >>> 0) / 0x100000000;
  };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(lcg() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + t * (b - a);

function grad(hash, x, y) {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) !== 0 ? -u : u) + ((h & 2) !== 0 ? -v : v);
}

function perlin2(perm, x, y) {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);
  const aa = perm[perm[xi] + yi];
  const ab = perm[perm[xi] + yi + 1];
  const ba = perm[perm[xi + 1] + yi];
  const bb = perm[perm[xi + 1] + yi + 1];
  return lerp(
    lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
    lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
    v,
  );
}

function fbm(perm, x, y) {
  let value = 0,
    amplitude = 1,
    frequency = NEBULA_SCALE,
    maxVal = 0;
  for (let i = 0; i < NEBULA_OCTAVES; i++) {
    value += perlin2(perm, x * frequency, y * frequency) * amplitude;
    maxVal += amplitude;
    amplitude *= NEBULA_PERSISTENCE;
    frequency *= NEBULA_LACUNARITY;
  }
  return (value / maxVal) * 0.5 + 0.5;
}

/**
 * Domain-warped fBm: distorts the sample coordinates using two independent fBm
 * fields before sampling the final noise. This produces the twisted filaments
 * and pillar-like structures characteristic of emission nebulae.
 *
 * warpPerm0/1 are the permutation tables for the two warp fields — they must
 * differ from `perm` so the warp and the detail are independent.
 */
function warpedFbm(perm, warpPerm0, warpPerm1, x, y) {
  // First warp pass — shift coords by a low-frequency fBm field
  const wx = fbm(warpPerm0, x + 0.0, y + 0.0) - 0.5;
  const wy = fbm(warpPerm1, x + 5.2, y + 1.3) - 0.5;
  const x1 = x + NEBULA_WARP_STRENGTH * wx;
  const y1 = y + NEBULA_WARP_STRENGTH * wy;
  // Second warp pass — feeds warped coords back in for extra turbulence
  const wx2 = fbm(warpPerm0, x1 + 1.7, y1 + 9.2) - 0.5;
  const wy2 = fbm(warpPerm1, x1 + 8.3, y1 + 2.8) - 0.5;
  const x2 = x1 + NEBULA_WARP_STRENGTH * 0.5 * wx2;
  const y2 = y1 + NEBULA_WARP_STRENGTH * 0.5 * wy2;
  return fbm(perm, x2, y2);
}

// ─── Color interpolation (kept for reference / future use) ──────────────────

// (Colour gradient logic has moved to runtime shaders / canvas decompose step)

// ─── Box blur ─────────────────────────────────────────────────────────────────

function boxBlur(src, w, h) {
  const dst = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        count = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const nx = Math.min(Math.max(x + kx, 0), w - 1);
          const ny = Math.min(Math.max(y + ky, 0), h - 1);
          const i = (ny * w + nx) * 4;
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
          a += src[i + 3];
          count++;
        }
      }
      const o = (y * w + x) * 4;
      dst[o] = r / count;
      dst[o + 1] = g / count;
      dst[o + 2] = b / count;
      dst[o + 3] = a / count;
    }
  }
  return dst;
}

// ─── Texture generation ───────────────────────────────────────────────────────

/**
 * Generates one packed RGBA texture for a single variant.
 * R = layer 0 (S II / warm)  — raw fBm value × 255
 * G = layer 1 (H-α / deep)  — raw fBm value × 255
 * B = layer 2 (O III / mid) — raw fBm value × 255
 * A = 255 (fully opaque — threshold & colour are applied by the shader at runtime)
 *
 * The same packed texture is used for both dark (SHO) and light (pantone) themes;
 * the shader selects the colour palette via u_light uniform.
 */
function generatePackedTexture(seedBase, width, height) {
  // Each layer uses a distinct seed offset so the noise fields are independent
  const perms = [
    buildPerm(seedBase),
    buildPerm(seedBase + 7919),
    buildPerm(seedBase + 15838),
  ];
  // Two extra permutation tables used exclusively for domain warp displacement fields
  const warpPerms = [buildPerm(seedBase + 23757), buildPerm(seedBase + 31676)];
  let pixels = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const i = (y * width + x) * 4;
      pixels[i] = Math.round(
        warpedFbm(perms[0], warpPerms[0], warpPerms[1], nx, ny) * 255,
      ); // R = S II / layer 0
      pixels[i + 1] = Math.round(
        warpedFbm(perms[1], warpPerms[1], warpPerms[0], nx, ny) * 255,
      ); // G = H-α / layer 1
      pixels[i + 2] = Math.round(
        warpedFbm(perms[2], warpPerms[0], warpPerms[1], nx, ny) * 255,
      ); // B = O III / layer 2
      pixels[i + 3] = 255; // A = fully opaque
    }
  }

  for (let p = 0; p < NEBULA_BLUR_PASSES; p++) {
    pixels = boxBlur(pixels, width, height);
  }

  return pixels;
}

// PNG encoder removed — output is now WebP via sharp (see Phase 3 of optimize-images plan).

// ─── Main ─────────────────────────────────────────────────────────────────────

const outDir = join(__dirname, '..', 'public', 'nebula');
mkdirSync(outDir, { recursive: true });

// Clean up any old nebula files before generating fresh ones
for (const f of readdirSync(outDir)) {
  if (f.endsWith('.png') || f.endsWith('.webp')) rmSync(join(outDir, f));
}

// One packed texture per variant (shared by dark + light; shader selects palette).
// File naming: {variant}.webp  e.g. 0.webp, 1.webp … 11.webp
const total = NEBULA_BAKED_COUNT;
let done = 0;

for (let v = 0; v < NEBULA_BAKED_COUNT; v++) {
  const variantSeed = NEBULA_SEED + v * 31337;
  const filename = `${v}.webp`;

  process.stdout.write(`[${++done}/${total}] ${filename} ... `);
  const t0 = Date.now();
  const pixels = generatePackedTexture(
    variantSeed,
    NEBULA_BAKED_WIDTH,
    NEBULA_BAKED_HEIGHT,
  );
  // q90 lossless-preferred: fBm values in R/G/B are precision-sensitive for shader palettes;
  // lossless WebP keeps exact channel values while still beating PNG in size.
  const webp = await sharp(
    Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength),
    {
      raw: { width: NEBULA_BAKED_WIDTH, height: NEBULA_BAKED_HEIGHT, channels: 4 },
    },
  )
    .webp({ lossless: true })
    .toBuffer();
  writeFileSync(join(outDir, filename), webp);
  console.log(`done (${Date.now() - t0}ms, ${(webp.length / 1024).toFixed(0)} KB)`);
}

console.log(`\nWrote ${total} packed nebula textures to public/nebula/`);
console.log(
  `Each file encodes ${NEBULA_LAYER_COUNT} independent noise layers in R/G/B channels.`,
);
console.log(
  `Colour palettes (SHO dark + pantone light) are applied at runtime by the shader.`,
);
