// src/shaders/coil-bake.glsl
// One-shot bake pass: shapes the warmed Gray-Scott field into the shell's coil
// height texture. Run once by GPUComputationRenderer.doRenderTarget after the
// sim freezes (the `resolution` define comes from createShaderMaterial), output
// to a plain RGBA8 target (filterable + mippable everywhere, unlike the sim's
// half-float ping-pong). Channels:
//   r = crisp coil height — broad rounded crests, narrow deep crevices; drives
//       the per-pixel shading normal and the crevice AO.
//   g = the same field gently blurred — the C1 band-limited DISPLACEMENT
//       channel (same two-profile split the old system proved: smooth for
//       geometry, crisp for shading).
//   b = the raw chem field — low-amplitude tonal mottle.
//   a = fine strands — iso-contour bands of the chem field. Contours of the
//       worm field run ALONG each tube by construction, so these read as the
//       bundled strands within each coil, at zero runtime cost for direction.
uniform sampler2D uSrc;

// Crest profile from the worm field: the low threshold start widens each
// worm's footprint so neighboring coils nearly touch (packed tubes, not lines
// on a plate); the pow rounds the crest top.
float shaped(vec2 uv) {
  float b = texture2D(uSrc, uv).g;
  return pow(smoothstep(0.04, 0.30, b), 0.62);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 texel = 1.0 / resolution.xy;

  float crisp = shaped(uv);

  // 5×5 gaussian (sigma ~1.4 texels) of the SHAPED field — blur after shaping
  // so displacement sees the widened crests. The sim wraps toroidally, so the
  // taps tile seamlessly across the texture edges.
  float blur = 0.0;
  float wsum = 0.0;
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      float w = exp(-float(i * i + j * j) / 3.92);
      blur += shaped(uv + texel * vec2(float(i), float(j))) * w;
      wsum += w;
    }
  }
  blur /= wsum;

  float b0 = texture2D(uSrc, uv).g;
  float raw = clamp(b0 * 2.6, 0.0, 1.0);

  // Fine strands: sin over the chem value = onion bands between a worm's edge
  // and its spine, i.e. parallel strands along the tube. Neutral (0.5) on the
  // background so the crevices stay clean.
  float strands = 0.5 + 0.5 * sin(b0 * 92.0);
  strands = mix(0.5, strands, smoothstep(0.04, 0.1, b0));

  gl_FragColor = vec4(crisp, blur, raw, strands);
}
