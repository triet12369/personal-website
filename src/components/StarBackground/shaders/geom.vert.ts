/* Geometry vertex shader — shooting-star trail quads and explosion rings.
 * Vertex layout (6 floats): x, y, r, g, b, a
 */
const src = /* glsl */`
attribute vec2 a_pos;
attribute vec4 a_color;
uniform   vec2 u_res;
varying   vec4 v_color;

void main() {
  vec2 ndc    = (a_pos / u_res) * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  v_color     = a_color;
}
`;

export default src;
