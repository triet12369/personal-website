/* Nebula vertex shader — fullscreen TRIANGLE_STRIP quad.
 * Maps NDC corners [-1,1] to UV [0,1].
 */
const src = /* glsl */`
attribute vec2 a_pos;
varying   vec2 v_uv;

void main() {
  v_uv        = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export default src;
