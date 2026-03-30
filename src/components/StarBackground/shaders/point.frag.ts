/* Point-sprite fragment shader — gaussian glow halo + sharp bright core.
 * Sprite is drawn at radius * GLOW_FACTOR size so the halo has room to expand.
 * Outputs premultiplied RGBA.
 */
const src = /* glsl */`
precision mediump float;

varying vec4 v_color;

void main() {
  // dist: 0 at center, 1 at sprite edge (= GLOW_FACTOR * core radius)
  float dist = length(gl_PointCoord - vec2(0.5)) * 2.0;

  // Core occupies the innermost 1/GLOW_FACTOR fraction of the sprite radius.
  float core = 1.0 - smoothstep(0.0, 0.9, dist);

  // Gaussian halo that fades to near-zero at the sprite edge.
  float glow = exp(-dist * dist * 6.5);

  float brightness = max(core, glow);
  float alpha = v_color.a * brightness;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(v_color.rgb * alpha, alpha);
}
`;

export default src;
