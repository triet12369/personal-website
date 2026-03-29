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

import { deflateSync }             from 'zlib';
import { mkdirSync, writeFileSync, readdirSync, rmSync } from 'fs';
import { join, dirname }           from 'path';
import { fileURLToPath }           from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config (sync with config.ts) ─────────────────────────────────────────────

const NEBULA_BAKED_COUNT  = 6;    // number of variants to bake
const NEBULA_LAYER_COUNT  = 3;    // independent noise layers per variant
const NEBULA_BAKED_WIDTH  = 1920; // bake resolution (stretched to fit screen at runtime)
const NEBULA_BAKED_HEIGHT = 1080;

const NEBULA_OCTAVES      = 6;
const NEBULA_SCALE        = 1;
const NEBULA_PERSISTENCE  = 0.5;
const NEBULA_LACUNARITY   = 2.0;
const NEBULA_SEED         = 42;    // base seed; variant offsets by index, layer offsets by prime
const NEBULA_BLUR_PASSES  = 2;
const NEBULA_THRESHOLD    = 0.1;

// Hubble SHO palette — each sub-array is one layer's gradient stops
const NEBULA_DARK_LAYERS = [
  // ── S II — sulfur (red / gold channel) ──────────────────────────────────
  [
    [0.38, [50,   5,   0]],
    [0.52, [130,  30,   5]],
    [0.65, [210,  80,  10]],
    [0.80, [240, 145,  40]],
    [1.00, [255, 200,  90]],
  ],
  // ── H-α — hydrogen (green channel) ─────────────────────────────────────
  [
    [0.38, [  0,  35,  10]],
    [0.52, [ 10,  90,  30]],
    [0.65, [ 25, 150,  55]],
    [0.80, [ 70, 200,  90]],
    [1.00, [140, 230, 140]],
  ],
  // ── O III — oxygen (blue / teal channel) ────────────────────────────────
  [
    [0.38, [  0,  15,  55]],
    [0.52, [ 10,  55, 130]],
    [0.65, [ 20, 115, 200]],
    [0.80, [ 40, 170, 230]],
    [1.00, [100, 215, 255]],
  ],
];

// Pantone scale — mirrors the pantone Mantine theme (steps 0–9 light→dark)
// [246,244,243]  [227,223,219]  [209,202,195]  [190,181,171]
// [172,160,147]  [154,139,123]  [132,118,101]  [108, 96, 83]
// [ 84, 75, 64]  [ 60, 54, 46]
const NEBULA_LIGHT_LAYERS = [
  // ── warm neutral (steps 2–4, mid-light band) ─────────────────────────────
  [
    [0.38, [172, 160, 147]],   // step 4
    [0.65, [209, 202, 195]],   // step 2
    [1.00, [246, 244, 243]],   // step 0
  ],
  // ── deep warm (steps 5–7, darker mid-tone) ───────────────────────────────
  [
    [0.38, [108,  96,  83]],   // step 7
    [0.65, [154, 139, 123]],   // step 5
    [1.00, [227, 223, 219]],   // step 1
  ],
  // ── mid warm (steps 3–5, slightly richer) ────────────────────────────────
  [
    [0.38, [154, 139, 123]],   // step 5
    [0.65, [190, 181, 171]],   // step 3
    [1.00, [227, 223, 219]],   // step 1
  ],
];

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
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
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
  const u  = fade(xf);
  const v  = fade(yf);
  const aa = perm[perm[xi]     + yi];
  const ab = perm[perm[xi]     + yi + 1];
  const ba = perm[perm[xi + 1] + yi];
  const bb = perm[perm[xi + 1] + yi + 1];
  return lerp(
    lerp(grad(aa, xf,     yf),     grad(ba, xf - 1, yf),     u),
    lerp(grad(ab, xf,     yf - 1), grad(bb, xf - 1, yf - 1), u),
    v,
  );
}

function fbm(perm, x, y) {
  let value = 0, amplitude = 1, frequency = NEBULA_SCALE, maxVal = 0;
  for (let i = 0; i < NEBULA_OCTAVES; i++) {
    value    += perlin2(perm, x * frequency, y * frequency) * amplitude;
    maxVal   += amplitude;
    amplitude *= NEBULA_PERSISTENCE;
    frequency *= NEBULA_LACUNARITY;
  }
  return (value / maxVal) * 0.5 + 0.5;
}

// ─── Color interpolation ──────────────────────────────────────────────────────

function sampleStops(stops, t) {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [t0, c0] = stops[i - 1];
    const [t1, c1] = stops[i];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + f * (c1[0] - c0[0])),
        Math.round(c0[1] + f * (c1[1] - c0[1])),
        Math.round(c0[2] + f * (c1[2] - c0[2])),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

// ─── Box blur ─────────────────────────────────────────────────────────────────

function boxBlur(src, w, h) {
  const dst = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const nx = Math.min(Math.max(x + kx, 0), w - 1);
          const ny = Math.min(Math.max(y + ky, 0), h - 1);
          const i  = (ny * w + nx) * 4;
          r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3];
          count++;
        }
      }
      const o = (y * w + x) * 4;
      dst[o] = r / count; dst[o + 1] = g / count;
      dst[o + 2] = b / count; dst[o + 3] = a / count;
    }
  }
  return dst;
}

// ─── Texture generation ───────────────────────────────────────────────────────

function generateTexture(seed, stops, width, height) {
  const perm   = buildPerm(seed);
  let   pixels = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx  = x / width;
      const val = fbm(perm, nx, ny);
      const i   = (y * width + x) * 4;
      if (val < NEBULA_THRESHOLD) continue; // alpha stays 0
      const alpha = ((val - NEBULA_THRESHOLD) / (1 - NEBULA_THRESHOLD)) * 255;
      const [r, g, b] = sampleStops(stops, val);
      pixels[i]     = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = Math.round(alpha);
    }
  }

  for (let p = 0; p < NEBULA_BLUR_PASSES; p++) {
    pixels = boxBlur(pixels, width, height);
  }

  return pixels;
}

// ─── PNG encoder ─────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf  = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(pixels, width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const stride = width * 4;
  const raw    = Buffer.alloc(height * (1 + stride));
  const pixBuf = Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength);
  for (let y = 0; y < height; y++) {
    raw[y * (1 + stride)] = 0;
    pixBuf.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride);
  }

  const idat = deflateSync(raw, { level: 6 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const outDir = join(__dirname, '..', 'public', 'nebula');
mkdirSync(outDir, { recursive: true });

// Clean up any old nebula PNGs before generating fresh ones
for (const f of readdirSync(outDir)) {
  if (f.endsWith('.png')) rmSync(join(outDir, f));
}

const themes = [
  { name: 'dark',  layers: NEBULA_DARK_LAYERS },
  { name: 'light', layers: NEBULA_LIGHT_LAYERS },
];

const total = NEBULA_BAKED_COUNT * themes.length * NEBULA_LAYER_COUNT;
let   done  = 0;

for (let v = 0; v < NEBULA_BAKED_COUNT; v++) {
  // Each variant has a unique base seed; each layer within the variant uses a
  // distinct prime offset so the noise fields are visually independent.
  const variantSeed = NEBULA_SEED + v * 31337;

  for (const { name, layers } of themes) {
    for (let l = 0; l < NEBULA_LAYER_COUNT; l++) {
      const layerSeed = variantSeed + l * 7919;
      const filename  = `${name}-${v}-${l}.png`;

      process.stdout.write(`[${++done}/${total}] ${filename} ... `);
      const t0     = Date.now();
      const pixels = generateTexture(layerSeed, layers[l], NEBULA_BAKED_WIDTH, NEBULA_BAKED_HEIGHT);
      const png    = encodePNG(pixels, NEBULA_BAKED_WIDTH, NEBULA_BAKED_HEIGHT);
      writeFileSync(join(outDir, filename), png);
      console.log(`done (${Date.now() - t0}ms, ${(png.length / 1024).toFixed(0)} KB)`);
    }
  }
}

console.log(`\nWrote ${total} nebula layer textures to public/nebula/`);
