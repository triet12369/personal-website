/* Nebula vertex shader — fullscreen TRIANGLE_STRIP quad.
 * Maps NDC corners [-1,1] to UV [0,1] with cover-crop support via
 * u_uv_offset / u_uv_scale so the texture is never squished.
 * v_screen_uv carries un-cropped screen-space [0,1] coords used to
 * sample the star illumination FBO (which lives in screen space).
 */
const src = /* glsl */`
attribute vec2  a_pos;
uniform   vec2  u_uv_offset;
uniform   vec2  u_uv_scale;
varying   vec2  v_uv;
varying   vec2  v_screen_uv;

void main() {
  vec2 base    = a_pos * 0.5 + 0.5;
  v_uv         = u_uv_offset + base * u_uv_scale;
  v_screen_uv  = base;
  gl_Position  = vec4(a_pos, 0.0, 1.0);
}
`;

export default src;
