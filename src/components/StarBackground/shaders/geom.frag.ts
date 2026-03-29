/* Geometry fragment shader — outputs premultiplied RGBA from per-vertex color. */
const src = /* glsl */`
precision mediump float;

varying vec4 v_color;

void main() {
  gl_FragColor = vec4(v_color.rgb * v_color.a, v_color.a);
}
`;

export default src;
