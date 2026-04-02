/**
 * Image optimization script — converts public/ images to WebP.
 *
 * Phase 0: Backs up originals to src/assets/images/ (idempotent).
 * Phase 1: Converts each asset to WebP with format-appropriate settings.
 *
 * Run once before updating source references:
 *   npm run optimize:images
 *
 * Special cases:
 *   moon_displacement.jpg  → lossless WebP (displacement/bump-map; lossy artifacts
 *                            cause visible glitches in Three.js bumpScale rendering)
 *   *.gif                  → skipped (animated GIF conversion out of scope)
 *   favicons / iss_icon    → skipped (browser/OS compat requirements; already tiny)
 */

import sharp from 'sharp';
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const BACKUP = join(ROOT, 'src', 'assets', 'images');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function backup(srcAbs) {
  const rel = relative(PUBLIC, srcAbs);
  const dest = join(BACKUP, rel);
  if (existsSync(dest)) return; // idempotent — never overwrite a saved original
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(srcAbs, dest);
  console.log(`  backed up → src/assets/images/${rel}`);
}

async function convert(srcAbs, opts = {}) {
  const { lossless = false, quality = 85 } = opts;
  const _ext = extname(srcAbs).toLowerCase();
  const src = relative(ROOT, srcAbs);
  const dest = srcAbs.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  const destRel = relative(ROOT, dest);

  if (existsSync(dest)) {
    console.log(`  skip (exists) ${destRel}`);
    return;
  }

  const sizeBefore = statSync(srcAbs).size;
  await sharp(srcAbs).webp({ lossless, quality }).toFile(dest);
  const sizeAfter = statSync(dest).size;
  const pct = (((sizeBefore - sizeAfter) / sizeBefore) * 100).toFixed(1);
  console.log(
    `  ${src} → ${destRel}  (${(sizeBefore / 1024).toFixed(0)} KB → ${(sizeAfter / 1024).toFixed(0)} KB, −${pct}%)`,
  );
}

/** Recursively find files matching extensions under dir. */
function findFiles(dir, exts) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, exts));
    } else if (exts.includes(extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

// ─── Phase 0: Backup ─────────────────────────────────────────────────────────

console.log('\n── Phase 0: Backing up originals to src/assets/images/ ──────────\n');

const backupTargets = [
  ...findFiles(join(PUBLIC, 'hero'), ['.jpg', '.jpeg', '.png']),
  ...findFiles(join(PUBLIC, 'nebula'), ['.png']),
  ...findFiles(join(PUBLIC, 'textures'), ['.jpg', '.jpeg', '.png']),
  ...findFiles(join(PUBLIC, 'content'), ['.jpg', '.jpeg', '.png']),
];

for (const f of backupTargets) backup(f);

// ─── Phase 1: Convert ─────────────────────────────────────────────────────────

console.log('\n── Phase 1: Converting to WebP ──────────────────────────────────\n');

// Hero astrophotos — large images; lossy q85 is indistinguishable at display size
console.log('Hero astrophotos:');
for (const f of findFiles(join(PUBLIC, 'hero'), ['.jpg', '.jpeg', '.png'])) {
  await convert(f, { quality: 85 });
}

// Nebula PNGs — procedural fBm data used as raw shader inputs; lossless preserves
// exact channel values to avoid banding artifacts when color gradients are applied.
console.log('\nNebula textures:');
for (const f of findFiles(join(PUBLIC, 'nebula'), ['.png'])) {
  await convert(f, { lossless: true });
}

// Earth / Moon textures
console.log('\nGlobe textures:');
const textureDir = join(PUBLIC, 'textures');
for (const f of findFiles(textureDir, ['.jpg', '.jpeg', '.png'])) {
  const name = basename(f);
  if (name === 'moon_displacement.jpg') {
    // Lossless: this is a bump/height-map — lossy artifacts produce bumping glitches
    await convert(f, { lossless: true });
  } else {
    await convert(f, { quality: 85 });
  }
}

// Content covers (blog, projects)
console.log('\nContent covers:');
for (const f of findFiles(join(PUBLIC, 'content'), ['.jpg', '.jpeg', '.png'])) {
  await convert(f, { quality: 85 });
}

console.log('\n── Done ─────────────────────────────────────────────────────────\n');
console.log('Next steps:');
console.log('  1. Verify output visually: npm run dev');
console.log('  2. Commit src/assets/images/ originals + new .webp files');
console.log('  3. Remove old .jpg/.png files from public/ once satisfied');
