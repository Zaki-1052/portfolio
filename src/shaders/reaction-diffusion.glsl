// src/shaders/reaction-diffusion.glsl
// Gray-Scott reaction-diffusion step, run by GPUComputationRenderer. It injects
// `uniform sampler2D textureGrayScott;` (the variable's own previous state) and
// a `resolution` #define. Channel r = chemical A, g = chemical B. B forms the
// coral/fold pattern sampled by the shell for surface detail.
uniform float uFeed;
uniform float uKill;
uniform float uDiffuseA;
uniform float uDiffuseB;
uniform float uDt;

// 9-point Laplacian on a channel via a small stencil (toroidal wrap).
vec2 laplacian(vec2 uv, vec2 texel) {
  vec2 sum = vec2(0.0);
  sum += texture2D(textureGrayScott, uv + texel * vec2(-1.0, -1.0)).rg * 0.05;
  sum += texture2D(textureGrayScott, uv + texel * vec2(0.0, -1.0)).rg * 0.2;
  sum += texture2D(textureGrayScott, uv + texel * vec2(1.0, -1.0)).rg * 0.05;
  sum += texture2D(textureGrayScott, uv + texel * vec2(-1.0, 0.0)).rg * 0.2;
  sum += texture2D(textureGrayScott, uv).rg * -1.0;
  sum += texture2D(textureGrayScott, uv + texel * vec2(1.0, 0.0)).rg * 0.2;
  sum += texture2D(textureGrayScott, uv + texel * vec2(-1.0, 1.0)).rg * 0.05;
  sum += texture2D(textureGrayScott, uv + texel * vec2(0.0, 1.0)).rg * 0.2;
  sum += texture2D(textureGrayScott, uv + texel * vec2(1.0, 1.0)).rg * 0.05;
  return sum;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 texel = 1.0 / resolution.xy;

  vec2 c = texture2D(textureGrayScott, uv).rg;
  float a = c.r;
  float b = c.g;

  vec2 lap = laplacian(uv, texel);
  float reaction = a * b * b;

  float da = uDiffuseA * lap.r - reaction + uFeed * (1.0 - a);
  float db = uDiffuseB * lap.g + reaction - (uKill + uFeed) * b;

  a = clamp(a + da * uDt, 0.0, 1.0);
  b = clamp(b + db * uDt, 0.0, 1.0);

  gl_FragColor = vec4(a, b, 0.0, 1.0);
}
