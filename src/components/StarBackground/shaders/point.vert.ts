/* Point-sprite vertex shader — stars, shooting-star glow, explosion particles.
 * Vertex layout (7 floats): x, y, r, g, b, a, size
 */
const src = /* glsl */`
attribute vec2  a_pos;
attribute vec4  a_color;
attribute float a_size;
uniform   vec2  u_res;
varying   vec4  v_color;

void main() {
  vec2 ndc    = (a_pos / u_res) * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  gl_PointSize = a_size;
  v_color      = a_color;
}
`;

export default src;
