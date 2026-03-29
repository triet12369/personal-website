/* Point-sprite fragment shader — soft circular alpha falloff.
 * Outputs premultiplied RGBA.
 */
const src = /* glsl */`
precision mediump float;

varying vec4 v_color;

void main() {
  float dist  = length(gl_PointCoord - vec2(0.5)) * 2.0;
  if (dist > 1.0) discard;
  float alpha = v_color.a * (1.0 - smoothstep(0.35, 1.0, dist));
  gl_FragColor = vec4(v_color.rgb * alpha, alpha);
}
`;

export default src;
