// Assembles the dist/ folder from wasm-pack output + static frontend files.
// Run via: node build.js  (called by the npm "build" script)
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const PKG_SRC = path.join(ROOT, 'pkg');
const PKG_DEST = path.join(DIST, 'pkg');

// Clean slate
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(PKG_DEST, { recursive: true });

// Copy static frontend assets
for (const file of ['index.html', 'main.js', 'style.css', 'scene.js', 'renderer-js.js', 'renderer-webgl.js']) {
  fs.copyFileSync(path.join(ROOT, file), path.join(DIST, file));
}

// Copy wasm-pack output (JS bindings + WASM binary); skip package.json / .d.ts
for (const file of fs.readdirSync(PKG_SRC)) {
  if (file.endsWith('.wasm') || file.endsWith('.js')) {
    fs.copyFileSync(path.join(PKG_SRC, file), path.join(PKG_DEST, file));
  }
}

console.log('[ray-tracing] dist/ assembled successfully.');
