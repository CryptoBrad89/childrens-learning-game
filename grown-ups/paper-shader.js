/* Paper band behind the grown-ups' corner masthead.
 * The fragment shader is Paper Shaders' static mesh gradient (Apache-2.0, see
 * paper-shaders/LICENSE and NOTICE), trimmed to a fixed stretch fit with grain
 * measured in CSS pixels. It is drawn once per size or color scheme, with no animation loop.
 * Without WebGL2 the band keeps its CSS gradient. */
(() => {
'use strict';
const canvas = document.getElementById('paper');
const gl = canvas && canvas.getContext('webgl2', {antialias: false, preserveDrawingBuffer: true, powerPreference: 'low-power'});
if (!gl) return;
const palettes = {
  light: ['#faf2df', '#b9dce6', '#ffd2eb', '#f6cf65', '#fff8e5'],
  dark: ['#14233a', '#263e58', '#3d2c4d', '#21485a', '#1c2f4a']
};
const vertex = `#version 300 es
in vec2 a_position; out vec2 v_objectUV;
void main(){ v_objectUV = a_position * .5; gl_Position = vec4(a_position, 0., 1.); }`;
const fragment = `#version 300 es
precision mediump float;
uniform vec4 u_colors[5];
uniform float u_colorsCount, u_positions, u_waveX, u_waveXShift, u_waveY, u_waveYShift, u_mixing, u_grainMixer, u_grainOverlay, u_pixelRatio;
in vec2 v_objectUV; out vec4 fragColor;
#define TWO_PI 6.28318530718
vec2 rotate(vec2 uv, float th) { return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv; }
float hash21(vec2 p) { p = fract(p * vec2(0.3183099, 0.3678794)) + 0.1; p += dot(p, p + 19.19); return fract(p.x * p.y); }
float valueNoise(vec2 st) {
  vec2 i = floor(st), f = fract(st);
  float a = hash21(i), b = hash21(i + vec2(1., 0.)), c = hash21(i + vec2(0., 1.)), d = hash21(i + vec2(1., 1.));
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
vec2 getPosition(int i, float t) {
  float a = float(i) * .37, b = .6 + mod(float(i), 3.) * .3, c = .8 + mod(float(i + 1), 4.) * .25;
  return .5 + .5 * vec2(sin(t * b + a), cos(t * c + a * 1.5));
}
void main() {
  vec2 uv = v_objectUV + .5;
  vec2 grainUV = gl_FragCoord.xy / u_pixelRatio;
  float mixerGrain = u_grainMixer > 0. ? .4 * u_grainMixer * (valueNoise(grainUV) - .5) : 0.;
  float center = 1. - smoothstep(0., 1., length(uv - .5));
  for (float i = 1.; i <= 2.; i++) {
    uv.x += u_waveX * center / i * cos(TWO_PI * u_waveXShift + i * 2. * smoothstep(.0, 1., uv.y));
    uv.y += u_waveY * center / i * cos(TWO_PI * u_waveYShift + i * 2. * smoothstep(.0, 1., uv.x));
  }
  vec3 color = vec3(0.); float opacity = 0., totalWeight = 0., positionSeed = 25. + .33 * u_positions;
  for (int i = 0; i < 5; i++) {
    if (i >= int(u_colorsCount)) break;
    float dist = length(uv - (getPosition(i, positionSeed) + mixerGrain));
    float mixing = pow(u_mixing, .7);
    dist = pow(dist, mix(2., 1., mixing));
    float w = 1. / (dist + 1e-3);
    w = pow(w, mix(mix(.0, 8., clamp(w, 0., 1.)), 1., mixing));
    color += u_colors[i].rgb * u_colors[i].a * w; opacity += u_colors[i].a * w; totalWeight += w;
  }
  color /= max(1e-4, totalWeight); opacity /= max(1e-4, totalWeight);
  if (u_grainOverlay > 0.) {
    float g = mix(valueNoise(rotate(grainUV, 1.) + vec2(3.)), valueNoise(rotate(grainUV, 2.) + vec2(-1.)), .5);
    float v = pow(g, 1.3) * 2. - 1.;
    float strength = pow(u_grainOverlay * abs(v), .8);
    color = mix(color, vec3(step(0., v)), .35 * strength);
    opacity += .5 * strength;
  }
  fragColor = vec4(color, clamp(opacity, 0., 1.));
}`;
function compile(type, source) {
  const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}
let program;
try {
  program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
} catch (error) { return; }
gl.useProgram(program);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
const position = gl.getAttribLocation(program, 'a_position');
gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
const uniform = name => gl.getUniformLocation(program, name);
const rgba = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).concat(1);
const dark = matchMedia('(prefers-color-scheme: dark)');
function draw() {
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5), box = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(box.width * ratio)), height = Math.max(1, Math.round(box.height * ratio));
  canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height);
  const colors = palettes[dark.matches ? 'dark' : 'light'];
  gl.uniform4fv(uniform('u_colors'), colors.flatMap(rgba));
  gl.uniform1f(uniform('u_colorsCount'), colors.length);
  const values = {u_positions: 42, u_waveX: .45, u_waveXShift: .1, u_waveY: .3, u_waveYShift: .6,
    u_mixing: .55, u_grainMixer: .35, u_grainOverlay: dark.matches ? .18 : .28, u_pixelRatio: ratio};
  for (const [name, value] of Object.entries(values)) gl.uniform1f(uniform(name), value);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
  canvas.dataset.drawn = String(Number(canvas.dataset.drawn || 0) + 1);
}
let pending = 0;
const later = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(draw); };
new ResizeObserver(later).observe(canvas);
dark.addEventListener('change', later);
canvas.addEventListener('webglcontextrestored', later);
})();
