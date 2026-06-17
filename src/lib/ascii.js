// ascii.js — string builders for the terminal UI. Everything draws with
// characters: meters, bars, spinners. No canvas, no gradients.

const BLOCKS = " ▁▂▃▄▅▆▇█"; // 0..8 eighths

// Horizontal meter, e.g. "███████░░░░░"
export function meter(level, width = 12, fill = "█", empty = "░") {
  const n = Math.max(0, Math.min(width, Math.round(level * width)));
  return fill.repeat(n) + empty.repeat(width - n);
}

// A bar with a moving head, e.g. "──────●─────"
export function slider(norm, width = 12, track = "─", head = "●") {
  const i = Math.max(0, Math.min(width - 1, Math.round(norm * (width - 1))));
  return track.repeat(i) + head + track.repeat(width - 1 - i);
}

// One column of a waveform as a vertical eighth-block (for single-row strips).
export function eighth(level) {
  return BLOCKS[Math.max(0, Math.min(8, Math.round(level * 8)))];
}

export const SPINNER = ["|", "/", "-", "\\"];

// Resample an array to a target length (nearest-ish), for fitting waveforms.
export function resample(arr, len) {
  if (!arr || arr.length === 0) return new Array(len).fill(0);
  const out = new Array(len);
  for (let i = 0; i < len; i++) {
    const t = (i / (len - 1)) * (arr.length - 1);
    const a = Math.floor(t);
    const b = Math.min(arr.length - 1, a + 1);
    out[i] = arr[a] + (arr[b] - arr[a]) * (t - a);
  }
  return out;
}
