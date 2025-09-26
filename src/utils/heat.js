// src/utils/heat.js
export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function formatSeconds(s) {
  return `${s}s`;
}

// Advanced heatmap: Green → Yellow → Orange → Red → Dark Red
export function heatColor(value, max = 20) {
  const ratio = clamp(value / Math.max(1, max), 0, 1);

  let r, g, b;

  if (ratio <= 0.25) {
    // Green (0,255,0) → Yellow (255,255,0)
    const t = ratio / 0.25;
    r = Math.round(lerp(0, 255, t));
    g = 255;
    b = 0;
  } else if (ratio <= 0.5) {
    // Yellow (255,255,0) → Orange (255,165,0)
    const t = (ratio - 0.25) / 0.25;
    r = 255;
    g = Math.round(lerp(255, 165, t));
    b = 0;
  } else if (ratio <= 0.75) {
    // Orange (255,165,0) → Red (255,0,0)
    const t = (ratio - 0.5) / 0.25;
    r = 255;
    g = Math.round(lerp(165, 0, t));
    b = 0;
  } else {
    // Red (255,0,0) → Dark Red (139,0,0)
    const t = (ratio - 0.75) / 0.25;
    r = Math.round(lerp(255, 139, t));
    g = 0;
    b = 0;
  }

  return `rgb(${r},${g},${b})`;
}
