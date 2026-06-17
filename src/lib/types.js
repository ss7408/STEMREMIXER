// types.js
// In the terminal aesthetic, sample role is encoded as a LETTER, not a colour.
// Monochrome phosphor reads as authentic; a rainbow reads as AI.

export const TYPE_META = {
  drum: { label: "DRM", letter: "D", full: "DRUMS" },
  bass: { label: "BAS", letter: "B", full: "BASS" },
  chord: { label: "CHD", letter: "C", full: "CHORD" },
  melody: { label: "MEL", letter: "M", full: "MELODY" },
  vocal: { label: "VOX", letter: "V", full: "VOCAL" },
  fx: { label: "FX", letter: "F", full: "FX" },
  texture: { label: "TEX", letter: "T", full: "TEXTURE" },
  unknown: { label: "???", letter: "?", full: "UNKNOWN" },
};

export const typeMeta = (t) => TYPE_META[t] || TYPE_META.unknown;
