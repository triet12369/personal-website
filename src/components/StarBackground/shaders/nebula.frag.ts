/* Nebula fragment shader — additively composites 3 pre-baked SHO noise layers.
 * Each layer has its own sampler so independent cloud shapes blend naturally.
 * Outputs premultiplied RGBA.
 */
const src = /* glsl */`
precision mediump float;

uniform sampler2D u_nebula0;  // S II  — sulfur  (reds / golds)
uniform sampler2D u_nebula1;  // H-α   — hydrogen (greens)
uniform sampler2D u_nebula2;  // O III — oxygen  (blues / teals)
uniform float     u_opacity;
// Per-layer prominence weights (0–1). H-α is always brightest;
// S II and O III alternate randomly (set from JS each page load).
uniform float     u_w0;       // S II weight
uniform float     u_w1;       // H-α weight
uniform float     u_w2;       // O III weight
varying vec2      v_uv;

void main() {
  vec4 c0 = texture2D(u_nebula0, v_uv);
  vec4 c1 = texture2D(u_nebula1, v_uv);
  vec4 c2 = texture2D(u_nebula2, v_uv);

  // Scale each layer's alpha by its prominence weight
  float a0 = c0.a * u_w0;
  float a1 = c1.a * u_w1;
  float a2 = c2.a * u_w2;

  // Additive layer blend weighted by prominence-scaled alpha
  vec3 rgb = c0.rgb * a0 + c1.rgb * a1 + c2.rgb * a2;
  rgb = clamp(rgb, 0.0, 1.0);

  // Alpha from the most prominent layer, scaled by global opacity
  float a = clamp(max(max(a0, a1), a2) * u_opacity, 0.0, 1.0);

  // Premultiplied output
  gl_FragColor = vec4(rgb * a, a);
}
`;

export default src;
