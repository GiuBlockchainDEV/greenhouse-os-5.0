export const heatmapVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const heatmapFragmentShader = /* glsl */ `
  uniform sampler2D heatmapTexture;
  uniform float opacity;
  uniform int colorMode;
  uniform float minValue;
  uniform float maxValue;
  varying vec2 vUv;

  vec3 temperatureGradient(float t) {
    vec3 cold = vec3(0.05, 0.25, 0.85);
    vec3 mid = vec3(0.15, 0.85, 0.35);
    vec3 warm = vec3(0.95, 0.85, 0.1);
    vec3 hot = vec3(0.9, 0.15, 0.05);

    if (t < 0.33) {
      return mix(cold, mid, t / 0.33);
    } else if (t < 0.66) {
      return mix(mid, warm, (t - 0.33) / 0.33);
    }
    return mix(warm, hot, (t - 0.66) / 0.34);
  }

  vec3 vpdGradient(float t) {
    vec3 optimal = vec3(0.2, 0.85, 0.45);
    vec3 stress = vec3(0.95, 0.55, 0.1);
    vec3 severe = vec3(0.85, 0.1, 0.15);

    if (t < 0.5) {
      return mix(optimal, stress, t / 0.5);
    }
    return mix(stress, severe, (t - 0.5) / 0.5);
  }

  void main() {
    float raw = texture2D(heatmapTexture, vUv).r;
    float range = max(maxValue - minValue, 0.001);
    float normalized = clamp((raw - minValue) / range, 0.0, 1.0);

    vec3 color;
    if (colorMode == 1) {
      color = vpdGradient(normalized);
    } else {
      color = temperatureGradient(normalized);
    }

    gl_FragColor = vec4(color, opacity);
  }
`;
