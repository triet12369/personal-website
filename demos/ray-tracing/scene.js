// Shared scene configuration — single source of truth for both WASM and JS renderers.
// The Rust implementation in src/lib.rs encodes the identical scene geometry.

export const SCENE = {
  width: 640,
  height: 400,
  // tan(π/8) — 45° vertical FoV
  fovTan: Math.tan(Math.PI / 8),
  // Recursion depth for reflections
  maxDepth: 3,
  // Super-sampling anti-aliasing grid (2 → 2×2 = 4 samples/pixel)
  aaGrid: 2,

  spheres: [
    // Ground — large sphere acting as a plane (checkerboard pattern)
    {
      center: [0.0, -1000.5, 0.0],
      radius: 1000.0,
      albedo: [0.0, 0.0, 0.0], // unused; checkerboard overrides
      specular: 8.0,
      reflectivity: 0.05,
      checkerboard: true,
    },
    // Centre — blue, semi-reflective
    {
      center: [0.0, 0.0, -3.5],
      radius: 0.7,
      albedo: [0.25, 0.55, 1.0],
      specular: 400.0,
      reflectivity: 0.45,
      checkerboard: false,
    },
    // Left — red, matte
    {
      center: [-1.4, -0.1, -4.0],
      radius: 0.6,
      albedo: [0.85, 0.18, 0.18],
      specular: 30.0,
      reflectivity: 0.08,
      checkerboard: false,
    },
    // Right — gold, mirror-like
    {
      center: [1.4, -0.1, -4.0],
      radius: 0.6,
      albedo: [1.0, 0.78, 0.25],
      specular: 600.0,
      reflectivity: 0.65,
      checkerboard: false,
    },
    // Small floating — green
    {
      center: [0.0, 1.2, -4.2],
      radius: 0.35,
      albedo: [0.3, 0.85, 0.35],
      specular: 120.0,
      reflectivity: 0.2,
      checkerboard: false,
    },
  ],

  lights: [
    { position: [3.0, 8.0, 2.0],   intensity: 60.0 },
    { position: [-5.0, 4.0, -2.0], intensity: 25.0 },
  ],
};

// ── Orbit camera ──────────────────────────────────────────────────────────────

/**
 * Default orbit parameters.
 * center  — look-at point in world space
 * radius  — distance from camera to center  (≈ original camera distance)
 * yaw     — horizontal rotation around Y axis (radians)
 * pitch   — vertical angle above the XZ plane (radians)
 *
 * With yaw=0, pitch=0.1 the camera position equals the original [0, 0.5, 1.5].
 */
export const ORBIT_DEFAULT = {
  center: [0.0, 0.0, -3.5],
  radius: 5.025,
  yaw:    0.0,
  pitch:  0.1,
};

// ── Vector helpers (used only for camera math) ────────────────────────────────

function vSub(a, b)   { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function vLen(a)      { return Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]); }
function vNorm(a)     { const l = vLen(a); return [a[0]/l, a[1]/l, a[2]/l]; }
function vCross(a, b) {
  return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0],
  ];
}

/**
 * Computes camera position and orthonormal basis from orbit parameters.
 * @returns {{ pos: number[], right: number[], up: number[], fwd: number[] }}
 */
export function computeCamera({ center, radius, yaw, pitch }) {
  const pos = [
    center[0] + radius * Math.cos(pitch) * Math.sin(yaw),
    center[1] + radius * Math.sin(pitch),
    center[2] + radius * Math.cos(pitch) * Math.cos(yaw),
  ];
  const fwd   = vNorm(vSub(center, pos));      // direction camera looks
  const right = vNorm(vCross(fwd, [0, 1, 0])); // camera +X; safe while |pitch| < π/2
  const up    = vCross(right, fwd);             // camera +Y — already unit length
  return { pos, fwd, right, up };
}
