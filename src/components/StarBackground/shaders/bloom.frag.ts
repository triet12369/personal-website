/* Bloom halo fragment shader — soft wide Gaussian only, no sharp core.
 * Used in a second additive pass over stars to simulate lens bloom.
 * Outputs premultiplied RGBA.
 */
const src = /* glsl */`
precision mediump float;

varying vec4 v_color;

void main() {
  float dist  = length(gl_PointCoord - vec2(0.5)) * 2.0;
  float bloom = exp(-dist * dist * 2.5);
  float alpha = v_color.a * bloom;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(v_color.rgb * alpha, alpha);
}
`;

export default src;
