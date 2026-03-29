// Copies each demo's dist/ output into public/demos/<name>/ after a workspace build.
// Run via: node scripts/copy-demos.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEMOS_DIR = path.join(ROOT, 'demos');
const PUBLIC_DEMOS_DIR = path.join(ROOT, 'public', 'demos');

if (!fs.existsSync(DEMOS_DIR)) {
  console.log('[copy-demos] No demos/ directory found, skipping.');
  process.exit(0);
}

const demos = fs
  .readdirSync(DEMOS_DIR)
  .filter((name) => fs.statSync(path.join(DEMOS_DIR, name)).isDirectory());

for (const name of demos) {
  const distDir = path.join(DEMOS_DIR, name, 'dist');
  if (!fs.existsSync(distDir)) {
    console.warn(`[copy-demos] Skipping "${name}": no dist/ folder found.`);
    continue;
  }
  const outDir = path.join(PUBLIC_DEMOS_DIR, name);
  fs.rmSync(outDir, { recursive: true, force: true });
  copyDir(distDir, outDir);
  console.log(`[copy-demos] Copied "${name}" -> public/demos/${name}`);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
