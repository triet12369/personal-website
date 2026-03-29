// Pure JavaScript ray tracer — a faithful port of src/lib.rs.
// Accepts the scene config from scene.js as its only input so both
// implementations share the exact same scene definition.

// ── Vector math ───────────────────────────────────────────────────────────────

function add(a, b)    { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
function sub(a, b)    { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function scale(a, t)  { return [a[0]*t,    a[1]*t,    a[2]*t];    }
function dot(a, b)    { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function len2(a)      { return dot(a, a); }
function len(a)       { return Math.sqrt(len2(a)); }
function norm(a)      { return scale(a, 1.0 / len(a)); }
function reflect(d,n) { return sub(d, scale(n, 2.0 * dot(d, n))); }
function lerp(a,b,t)  { return add(scale(a, 1.0 - t), scale(b, t)); }

// ── Ray–sphere intersection (half-b form, assumes |rd| = 1) ──────────────────

function hitSphere(ro, rd, s) {
  const oc = sub(ro, s.center);
  const h  = dot(oc, rd);
  const c  = dot(oc, oc) - s.radius * s.radius;
  const disc = h * h - c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  let t = -h - sq;
  if (t > 1e-4) return t;
  t = -h + sq;
  return t > 1e-4 ? t : null;
}

// ── Phong lighting with hard shadows ─────────────────────────────────────────

const AMBIENT = 0.15;

function computeLighting(p, n, view, spec, spheres, lights) {
  let intensity = AMBIENT;

  for (const light of lights) {
    const toLight = sub(light.position, p);
    const distSq  = len2(toLight);
    const l       = norm(toLight);

    // Shadow: any sphere that blocks the path to the light
    let inShadow = false;
    for (const s of spheres) {
      const t = hitSphere(p, l, s);
      if (t !== null && t * t < distSq) { inShadow = true; break; }
    }
    if (inShadow) continue;

    // r⁻² falloff, clamped so very close lights don't blow out
    const att = light.intensity / Math.max(distSq, 1.0);

    // Diffuse
    const ndl = Math.max(dot(n, l), 0.0);
    intensity += att * ndl;

    // Specular (Phong)
    if (spec > 0) {
      const r   = reflect(scale(l, -1), n);
      const rdv = Math.max(dot(r, view), 0.0);
      intensity += att * Math.pow(rdv, spec);
    }
  }

  return intensity;
}

// ── Sky background ────────────────────────────────────────────────────────────

function sky(rd) {
  const t = Math.min(Math.max(rd[1] * 0.5 + 0.5, 0.0), 1.0);
  return lerp([1.0, 0.95, 0.85], [0.35, 0.55, 0.92], t);
}

// ── Recursive ray tracer ──────────────────────────────────────────────────────

function trace(ro, rd, spheres, lights, depth) {
  // Find nearest intersection
  let nearestT   = Infinity;
  let nearestIdx = -1;
  for (let i = 0; i < spheres.length; i++) {
    const t = hitSphere(ro, rd, spheres[i]);
    if (t !== null && t < nearestT) { nearestT = t; nearestIdx = i; }
  }
  if (nearestIdx === -1) return sky(rd);

  const sphere = spheres[nearestIdx];
  const point  = add(ro, scale(rd, nearestT));
  const normal = norm(sub(point, sphere.center));
  const view   = scale(rd, -1);

  // Checkerboard pattern for the large ground sphere
  let albedo;
  if (sphere.checkerboard) {
    const u = Math.floor(point[0]);
    const w = Math.floor(point[2]);
    albedo = (((u + w) & 1) === 0)
      ? [0.92, 0.92, 0.88]
      : [0.12, 0.12, 0.15];
  } else {
    albedo = sphere.albedo;
  }

  const raw     = computeLighting(point, normal, view, sphere.specular, spheres, lights);
  const lit     = Math.min(Math.max(raw, 0.0), 1.0);
  const diffuse = scale(albedo, lit);

  if (depth === 0 || sphere.reflectivity <= 0) return diffuse;

  // Reflection ray — offset origin along normal to avoid self-intersection
  const reflDir    = norm(reflect(rd, normal));
  const reflOrigin = add(point, scale(normal, 1e-4));
  const reflCol    = trace(reflOrigin, reflDir, spheres, lights, depth - 1);

  return lerp(diffuse, reflCol, sphere.reflectivity);
}

// ── Gamma helper ──────────────────────────────────────────────────────────────

function toSRGB(v) {
  return Math.floor(Math.min(1.0, Math.max(0.0, v)) ** (1.0 / 2.2) * 255);
}

// ── Public render API ─────────────────────────────────────────────────────────

/**
 * Renders the scene and returns a flat RGBA Uint8ClampedArray.
 * @param {typeof import('./scene.js').SCENE} scene
 * @param {{ pos: number[], fwd: number[], right: number[], up: number[] }} camera
 * @param {number} [overrideW] - render width override (defaults to scene.width)
 * @param {number} [overrideH] - render height override (defaults to scene.height)
 * @param {number} [overrideAA] - AA grid override (defaults to scene.aaGrid)
 */
export function renderJS(scene, camera, overrideW, overrideH, overrideAA) {
  const { width: sw, height: sh, fovTan, maxDepth, aaGrid, spheres, lights } = scene;
  const width  = overrideW  ?? sw;
  const height = overrideH  ?? sh;
  const AA     = overrideAA ?? aaGrid;
  const { pos: camPos, fwd, right, up: upCam } = camera;
  const aspect = width / height;
  const invAA2 = 1.0 / (AA * AA);
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let r = 0, g = 0, b = 0;

      for (let sy = 0; sy < AA; sy++) {
        for (let sx = 0; sx < AA; sx++) {
          const su = ((px + (sx + 0.5) / AA) / width  * 2.0 - 1.0) * aspect * fovTan;
          const sv = (1.0 - (py + (sy + 0.5) / AA) / height * 2.0) * fovTan;
          // rd = right*su + up*sv + fwd, then normalised
          const rd = norm(add(add(scale(right, su), scale(upCam, sv)), fwd));
          const c  = trace(camPos, rd, spheres, lights, maxDepth);
          r += c[0]; g += c[1]; b += c[2];
        }
      }

      const base = (py * width + px) * 4;
      pixels[base]     = toSRGB(r * invAA2);
      pixels[base + 1] = toSRGB(g * invAA2);
      pixels[base + 2] = toSRGB(b * invAA2);
      pixels[base + 3] = 255;
    }
  }

  return pixels;
}
