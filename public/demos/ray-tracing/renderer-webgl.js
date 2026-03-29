// WebGL ray tracer — exact same scene/algorithm as lib.rs and renderer-js.js,
// but executed entirely on the GPU as a fragment shader.
// The scene geometry is baked into the shader as constants, matching scene.js.

// ── Shaders ───────────────────────────────────────────────────────────────────

const VERT_SRC = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// The fragment shader is a GLSL port of the full ray tracer.
// Scene constants are generated from scene.js at init time so there is one
// source of truth. Reflections are unrolled to max depth 3.
function buildFragSrc(scene) {
  const { spheres, lights, fovTan } = scene;
  const NS = spheres.length;
  const NL = lights.length;

  // Build sphere / light uniform initialisers as GLSL struct literals
  const sphereInits = spheres.map((s, i) => `
  spheres[${i}].center       = vec3(${s.center[0]}, ${s.center[1]}, ${s.center[2]});
  spheres[${i}].radius       = ${s.radius.toFixed(4)};
  spheres[${i}].albedo       = vec3(${s.albedo[0]}, ${s.albedo[1]}, ${s.albedo[2]});
  spheres[${i}].specular     = ${s.specular.toFixed(1)};
  spheres[${i}].reflectivity = ${s.reflectivity.toFixed(4)};
  spheres[${i}].checkerboard = ${s.checkerboard ? '1' : '0'};`).join('');

  const lightInits = lights.map((l, i) => `
  lights[${i}].position  = vec3(${l.position[0]}, ${l.position[1]}, ${l.position[2]});
  lights[${i}].intensity = ${l.intensity.toFixed(1)};`).join('');

  return `
precision highp float;

uniform vec2  u_resolution;
uniform vec3  u_camPos;
uniform vec3  u_camRight;
uniform vec3  u_camUp;
uniform vec3  u_camFwd;
uniform float u_fovTan;
// AA grid (1 or 2)
uniform int   u_aa;

// ── Scene structs ─────────────────────────────────────────────────────────────

struct Sphere {
  vec3  center;
  float radius;
  vec3  albedo;
  float specular;
  float reflectivity;
  int   checkerboard;
};

struct Light {
  vec3  position;
  float intensity;
};

// ── Ray–sphere intersection ───────────────────────────────────────────────────

float hitSphere(vec3 ro, vec3 rd, Sphere s) {
  vec3  oc   = ro - s.center;
  float h    = dot(oc, rd);
  float c    = dot(oc, oc) - s.radius * s.radius;
  float disc = h * h - c;
  if (disc < 0.0) return -1.0;
  float sq = sqrt(disc);
  float t  = -h - sq;
  if (t > 1e-4) return t;
  t = -h + sq;
  return t > 1e-4 ? t : -1.0;
}

// ── Phong lighting with hard shadows ─────────────────────────────────────────

float computeLighting(vec3 p, vec3 n, vec3 view, float spec,
                      Sphere spheres[${NS}], Light lights[${NL}]) {
  const float AMBIENT = 0.15;
  float intensity = AMBIENT;

  for (int li = 0; li < ${NL}; li++) {
    vec3  toLight = lights[li].position - p;
    float distSq  = dot(toLight, toLight);
    vec3  l       = normalize(toLight);

    bool inShadow = false;
    for (int si = 0; si < ${NS}; si++) {
      float t = hitSphere(p, l, spheres[si]);
      if (t > 0.0 && t * t < distSq) { inShadow = true; break; }
    }
    if (inShadow) continue;

    float att = lights[li].intensity / max(distSq, 1.0);
    float ndl = max(dot(n, l), 0.0);
    intensity += att * ndl;

    if (spec > 0.0) {
      vec3  r   = reflect(-l, n);
      float rdv = max(dot(r, view), 0.0);
      intensity += att * pow(rdv, spec);
    }
  }
  return intensity;
}

// ── Sky gradient ──────────────────────────────────────────────────────────────

vec3 sky(vec3 rd) {
  float t = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
  return mix(vec3(1.0, 0.95, 0.85), vec3(0.35, 0.55, 0.92), t);
}

// ── Scene init (called once per fragment) ─────────────────────────────────────

void initScene(out Sphere spheres[${NS}], out Light lights[${NL}]) {
  ${sphereInits}
  ${lightInits}
}

// ── Single-bounce trace (inlined 3-depth reflection loop) ────────────────────
// WebGL 1 forbids recursion, so we unroll manually.

vec3 traceScene(vec3 ro, vec3 rd, Sphere spheres[${NS}], Light lights[${NL}]) {

  vec3 col = sky(rd);

  // Depth 0 — capture sphere props inside the loop (GLSL ES 1.0: only loop
  // induction variables may index arrays, not plain int variables).
  float nearT0 = 1e20; bool hit0 = false;
  vec3  c0; vec3 alb0raw; float spec0; float refl0; int check0;
  for (int i = 0; i < ${NS}; i++) {
    float t = hitSphere(ro, rd, spheres[i]);
    if (t > 0.0 && t < nearT0) {
      nearT0 = t; hit0 = true;
      c0     = spheres[i].center;
      alb0raw = spheres[i].albedo;
      spec0  = spheres[i].specular;
      refl0  = spheres[i].reflectivity;
      check0 = spheres[i].checkerboard;
    }
  }
  if (!hit0) return sky(rd);

  vec3  p0  = ro + rd * nearT0;
  vec3  n0  = normalize(p0 - c0);
  vec3  v0  = -rd;
  vec3  alb0;
  if (check0 == 1) {
    int u = int(floor(p0.x)); int w = int(floor(p0.z));
    alb0 = (mod(float(u + w), 2.0) < 1.0) ? vec3(0.92, 0.92, 0.88) : vec3(0.12, 0.12, 0.15);
  } else {
    alb0 = alb0raw;
  }
  float lit0  = clamp(computeLighting(p0, n0, v0, spec0, spheres, lights), 0.0, 1.0);
  vec3  diff0 = alb0 * lit0;
  col = diff0;
  if (refl0 <= 0.0) return col;

  // ── Depth 1 ───────────────────────────────────────────────────────────────
  vec3  rd1 = normalize(reflect(rd, n0));
  vec3  ro1 = p0 + n0 * 1e-4;
  float nearT1 = 1e20; bool hit1 = false;
  vec3  c1; vec3 alb1raw; float spec1; float refl1; int check1;
  for (int i = 0; i < ${NS}; i++) {
    float t = hitSphere(ro1, rd1, spheres[i]);
    if (t > 0.0 && t < nearT1) {
      nearT1 = t; hit1 = true;
      c1      = spheres[i].center;
      alb1raw = spheres[i].albedo;
      spec1   = spheres[i].specular;
      refl1   = spheres[i].reflectivity;
      check1  = spheres[i].checkerboard;
    }
  }
  if (!hit1) { return mix(diff0, sky(rd1), refl0); }

  vec3  p1  = ro1 + rd1 * nearT1;
  vec3  n1  = normalize(p1 - c1);
  vec3  v1  = -rd1;
  vec3  alb1;
  if (check1 == 1) {
    int u = int(floor(p1.x)); int w = int(floor(p1.z));
    alb1 = (mod(float(u + w), 2.0) < 1.0) ? vec3(0.92, 0.92, 0.88) : vec3(0.12, 0.12, 0.15);
  } else {
    alb1 = alb1raw;
  }
  float lit1  = clamp(computeLighting(p1, n1, v1, spec1, spheres, lights), 0.0, 1.0);
  vec3  diff1 = alb1 * lit1;
  col = mix(diff0, diff1, refl0);
  if (refl1 <= 0.0) return col;

  // ── Depth 2 ───────────────────────────────────────────────────────────────
  vec3  rd2 = normalize(reflect(rd1, n1));
  vec3  ro2 = p1 + n1 * 1e-4;
  float nearT2 = 1e20; bool hit2 = false;
  vec3  c2; vec3 alb2raw; float spec2; int check2;
  for (int i = 0; i < ${NS}; i++) {
    float t = hitSphere(ro2, rd2, spheres[i]);
    if (t > 0.0 && t < nearT2) {
      nearT2 = t; hit2 = true;
      c2      = spheres[i].center;
      alb2raw = spheres[i].albedo;
      spec2   = spheres[i].specular;
      check2  = spheres[i].checkerboard;
    }
  }
  vec3 refl2col = sky(rd2);

  if (hit2) {
    vec3  p2  = ro2 + rd2 * nearT2;
    vec3  n2  = normalize(p2 - c2);
    vec3  v2  = -rd2;
    vec3  alb2;
    if (check2 == 1) {
      int u = int(floor(p2.x)); int w = int(floor(p2.z));
      alb2 = (mod(float(u + w), 2.0) < 1.0) ? vec3(0.92, 0.92, 0.88) : vec3(0.12, 0.12, 0.15);
    } else {
      alb2 = alb2raw;
    }
    float lit2  = clamp(computeLighting(p2, n2, v2, spec2, spheres, lights), 0.0, 1.0);
    refl2col = alb2 * lit2;
  }
  col = mix(mix(diff0, diff1, refl0), refl2col, refl1);
  return col;
}

// ── Main ──────────────────────────────────────────────────────────────────────

void main() {
  Sphere spheres[${NS}];
  Light  lights[${NL}];
  initScene(spheres, lights);

  float aspect = u_resolution.x / u_resolution.y;
  vec3  acc    = vec3(0.0);
  float invAA2 = 1.0 / float(u_aa * u_aa);

  for (int sy = 0; sy < 2; sy++) {
    if (sy >= u_aa) break;
    for (int sx = 0; sx < 2; sx++) {
      if (sx >= u_aa) break;

      vec2  fc  = gl_FragCoord.xy;
      float su  = ((fc.x + (float(sx) + 0.5) / float(u_aa)) / u_resolution.x * 2.0 - 1.0) * aspect * u_fovTan;
      // gl_FragCoord.y is bottom-up in GL, flip it
      float sv  = ((fc.y + (float(sy) + 0.5) / float(u_aa)) / u_resolution.y * 2.0 - 1.0) * u_fovTan;
      vec3  rd  = normalize(u_camRight * su + u_camUp * sv + u_camFwd);
      acc      += traceScene(u_camPos, rd, spheres, lights);
    }
  }

  vec3 col = acc * invAA2;
  // Gamma 2.2
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(col, 1.0);
}
`;
}

// ── WebGL renderer class ──────────────────────────────────────────────────────

export class WebGLRenderer {
  constructor(scene) {
    this._scene = scene;
    this._gl    = null;
    this._prog  = null;
    this._locs  = null;
  }

  /** Lazily initialise WebGL on the given canvas. Call whenever canvas changes. */
  init(canvas) {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('WebGL not supported');
    this._gl = gl;

    const fragSrc = buildFragSrc(this._scene);

    const vert = compileShader(gl, gl.VERTEX_SHADER,   VERT_SRC);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Shader link error: ' + gl.getProgramInfoLog(prog));
    }
    this._prog = prog;

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this._locs = {
      resolution: gl.getUniformLocation(prog, 'u_resolution'),
      camPos:     gl.getUniformLocation(prog, 'u_camPos'),
      camRight:   gl.getUniformLocation(prog, 'u_camRight'),
      camUp:      gl.getUniformLocation(prog, 'u_camUp'),
      camFwd:     gl.getUniformLocation(prog, 'u_camFwd'),
      fovTan:     gl.getUniformLocation(prog, 'u_fovTan'),
      aa:         gl.getUniformLocation(prog, 'u_aa'),
    };
  }

  /**
   * Render into `canvas` at full scene resolution with the given camera.
   * @param {HTMLCanvasElement} canvas
   * @param {{ pos, right, up, fwd }} camera
   * @param {number} [overrideW]
   * @param {number} [overrideH]
   * @param {number} [overrideAA]
   * @returns {number} elapsed ms
   */
  render(canvas, camera, overrideW, overrideH, overrideAA) {
    const { width: sw, height: sh, fovTan, aaGrid } = this._scene;
    const w  = overrideW  ?? sw;
    const h  = overrideH  ?? sh;
    const aa = overrideAA ?? aaGrid;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width  = w;
      canvas.height = h;
    }

    // Re-init gl if the canvas changed (e.g. size change forces a new context)
    if (!this._gl || this._gl.canvas !== canvas) {
      this.init(canvas);
    }

    const gl = this._gl;
    gl.viewport(0, 0, w, h);
    gl.useProgram(this._prog);

    const L = this._locs;
    gl.uniform2f(L.resolution, w, h);
    gl.uniform3fv(L.camPos,   camera.pos);
    gl.uniform3fv(L.camRight, camera.right);
    gl.uniform3fv(L.camUp,    camera.up);
    gl.uniform3fv(L.camFwd,   camera.fwd);
    gl.uniform1f(L.fovTan,    fovTan);
    gl.uniform1i(L.aa,        aa);

    const t0 = performance.now();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // readPixels forces a true CPU-GPU sync; gl.finish() alone is not
    // reliably blocking on all drivers and can return ~0 ms.
    const pixel = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    const ms = performance.now() - t0;

    canvas.style.display = 'block';
    return ms;
  }
}

// ── Shader compiler helper ────────────────────────────────────────────────────

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('Shader compile error:\n' + log);
  }
  return sh;
}
