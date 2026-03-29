import init, { render } from './pkg/ray_tracing.js';
import { SCENE, ORBIT_DEFAULT, computeCamera } from './scene.js';
import { renderJS } from './renderer-js.js';
import { WebGLRenderer } from './renderer-webgl.js';

const webgl = new WebGLRenderer(SCENE);

const { width: WIDTH, height: HEIGHT } = SCENE;

// ── DOM refs ──────────────────────────────────────────────────────────────────

const canvas      = document.getElementById('canvas');        // 2D context: WASM + JS
const canvasWebGL = document.getElementById('canvas-webgl');   // WebGL context
const status      = document.getElementById('status');
const renderTime  = document.getElementById('render-time');
const hint        = document.getElementById('hint');
const scaleSlider = document.getElementById('preview-scale');
const scaleLabel  = document.getElementById('preview-scale-label');
const methodBtns  = document.querySelectorAll('.method-btn');

// Lock CSS display size so canvases don't reflow during preview renders
canvas.style.width       = WIDTH  + 'px';
canvas.style.height      = HEIGHT + 'px';
canvasWebGL.style.width  = WIDTH  + 'px';
canvasWebGL.style.height = HEIGHT + 'px';

function getActiveCanvas() {
  return activeMethod === 'webgl' ? canvasWebGL : canvas;
}

function showActiveCanvas() {
  canvas.style.display      = activeMethod !== 'webgl' ? 'block' : 'none';
  canvasWebGL.style.display = activeMethod === 'webgl'  ? 'block' : 'none';
}

// ── Active method ─────────────────────────────────────────────────────────────

let activeMethod = 'wasm'; // 'wasm' | 'js' | 'webgl'

methodBtns.forEach((btn) => {
  btn.addEventListener('click', async () => {
    if (btn.disabled || btn.dataset.method === activeMethod) return;
    activeMethod = btn.dataset.method;
    methodBtns.forEach((b) => b.classList.toggle('active', b === btn));
    updateActiveTableRow();
    await doFullRender();
  });
});

// ── Slider ────────────────────────────────────────────────────────────────────

function previewScale() { return parseInt(scaleSlider.value, 10) / 100; }

scaleSlider.addEventListener('input', () => {
  scaleLabel.textContent = scaleSlider.value + '%';
});

// ── Orbit state ───────────────────────────────────────────────────────────────

const orbit = { ...ORBIT_DEFAULT };

// ── Stats tracking ────────────────────────────────────────────────────────────
// Keeps the last MAX_SAMPLES full-quality render times per method.

const MAX_SAMPLES = 20;
const stats = { wasm: [], js: [], webgl: [] };

function recordSample(method, ms) {
  const arr = stats[method];
  arr.push(ms);
  if (arr.length > MAX_SAMPLES) arr.shift();
  refreshStatsTable(method);
}

function refreshStatsTable(method) {
  const arr  = stats[method];
  const row  = document.querySelector(`.stats-table tr[data-method="${method}"]`);
  if (!row) return;
  if (arr.length === 0) return;

  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const fps = Math.round(1000 / avg);

  row.querySelector('.col-samples').textContent = arr.length;
  row.querySelector('.col-avg').textContent     = avg.toFixed(1) + ' ms';
  row.querySelector('.col-fps').textContent     = '~' + fps + ' fps';
}

function updateActiveTableRow() {
  document.querySelectorAll('.stats-table tr[data-method]').forEach((r) => {
    r.classList.toggle('active-row', r.dataset.method === activeMethod);
  });
}

// ── Core render functions (synchronous, safe inside rAF) ─────────────────────

function paintFrame(camera, w, h, aa, record) {
  if (activeMethod === 'wasm') {
    const { pos, right, up, fwd } = camera;
    const t0 = performance.now();
    const px = render(
      w, h,
      pos[0],   pos[1],   pos[2],
      right[0], right[1], right[2],
      up[0],    up[1],    up[2],
      fwd[0],   fwd[1],   fwd[2],
    );
    const ms = performance.now() - t0;
    canvas.width  = w;
    canvas.height = h;
    canvas.getContext('2d').putImageData(
      new ImageData(new Uint8ClampedArray(px), w, h), 0, 0,
    );
    if (record) recordSample('wasm', ms);
    return ms;
  }

  if (activeMethod === 'js') {
    const t0 = performance.now();
    const px = renderJS(SCENE, camera, w, h, aa);
    const ms = performance.now() - t0;
    canvas.width  = w;
    canvas.height = h;
    canvas.getContext('2d').putImageData(new ImageData(px, w, h), 0, 0);
    if (record) recordSample('js', ms);
    return ms;
  }

  if (activeMethod === 'webgl') {
    try {
      const ms = webgl.render(canvasWebGL, camera, w, h, aa);
      if (record) recordSample('webgl', ms);
      return ms;
    } catch (err) {
      status.textContent = 'WebGL error: ' + err.message;
      status.style.display = 'block';
      console.error(err);
      return 0;
    }
  }

  return 0;
}

function formatTiming(ms) {
  const fps = Math.round(1000 / ms);
  return ms.toFixed(1) + ' ms  \u00b7  ~' + fps + ' fps';
}

// ── Full-quality render ───────────────────────────────────────────────────────

async function doFullRender() {
  status.style.display = 'block';
  status.textContent   = 'Rendering\u2026';
  getActiveCanvas().style.display = 'none';
  renderTime.textContent = '';
  await new Promise((r) => requestAnimationFrame(r));

  const camera = computeCamera(orbit);
  const ms = paintFrame(camera, WIDTH, HEIGHT, SCENE.aaGrid, true);

  showActiveCanvas();
  status.style.display   = 'none';
  renderTime.textContent = formatTiming(ms);
}

// ── rAF-throttled live loop ───────────────────────────────────────────────────

let rafId      = null;
let frameDirty = false;

function scheduleLiveFrame() {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    if (!frameDirty) return;
    frameDirty = false;

    const scale = previewScale();
    const w = Math.max(1, Math.round(WIDTH  * scale));
    const h = Math.max(1, Math.round(HEIGHT * scale));
    const camera = computeCamera(orbit);
    // AA=1 during drag for maximum speed; don't record preview times
    const ms = paintFrame(camera, w, h, 1, false);

    showActiveCanvas();
    status.style.display   = 'none';
    renderTime.textContent = formatTiming(ms) + '  (preview)';

    if (dragging) scheduleLiveFrame();
  });
}

// ── Pointer orbit ─────────────────────────────────────────────────────────────

const SENSITIVITY = 0.006;
const PITCH_CLAMP = 1.2;

let dragging = false;
let lastX    = 0;
let lastY    = 0;

function handlePointerDown(e) {
  dragging = true;
  lastX    = e.clientX;
  lastY    = e.clientY;
  hint.textContent = 'Dragging (preview) \u2014 release for full render';
  e.currentTarget.setPointerCapture(e.pointerId);
}

canvas.addEventListener('pointerdown', handlePointerDown);
canvasWebGL.addEventListener('pointerdown', handlePointerDown);

document.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  orbit.yaw   -= dx * SENSITIVITY;
  orbit.pitch += dy * SENSITIVITY;
  orbit.pitch  = Math.max(-PITCH_CLAMP, Math.min(PITCH_CLAMP, orbit.pitch));

  frameDirty = true;
  scheduleLiveFrame();
});

document.addEventListener('pointerup', async () => {
  if (!dragging) return;
  dragging = false;

  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  hint.textContent = 'Drag to orbit \u00b7 release for full render';
  await doFullRender();
});

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  await init();
  updateActiveTableRow();
  await doFullRender();
}

main().catch((err) => {
  status.textContent = 'Error: ' + err.message;
  console.error(err);
});
