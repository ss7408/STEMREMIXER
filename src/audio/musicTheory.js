// musicTheory.js
// The "intelligence" behind Hook's harmonic layer. Everything the UI uses to
// decide whether two sounds belong together, and how far to nudge a sample so
// it does, lives here. Pure functions, no audio — easy to test and swap.

export const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

// Pretty names with flats where producers expect them.
const PRETTY = {
  "C#": "C#", "D#": "Eb", "F#": "F#", "G#": "Ab", "A#": "Bb",
};

export function noteName(pitchClass) {
  const raw = NOTE_NAMES[((pitchClass % 12) + 12) % 12];
  return PRETTY[raw] || raw;
}

// A "key" is { tonic: 0-11, mode: 'maj' | 'min' }.
export function keyLabel(key) {
  if (!key) return "—";
  return `${noteName(key.tonic)} ${key.mode === "min" ? "min" : "maj"}`;
}

export function keyShort(key) {
  if (!key) return "—";
  return `${noteName(key.tonic)}${key.mode === "min" ? "m" : ""}`;
}

// --- Camelot wheel -------------------------------------------------------
// The DJ-standard harmonic mixing wheel. Maps every key to a clock position
// (1-12) and a letter (A = minor, B = major). Adjacent positions and the
// relative major/minor are the "compatible" moves.
// Built from the canonical wheel: 8B = C major, 8A = A minor.
const CAMELOT = (() => {
  // [tonic, mode] -> { num, letter }
  const map = {};
  // Major keys around the wheel, starting at 8B = C major, moving by +7 (fifths).
  const majorOrder = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]; // C G D A E B F# Db Ab Eb Bb F
  // 8B is C, then each fifth up advances the wheel number by 1 (9B = G ...).
  majorOrder.forEach((tonic, i) => {
    const num = ((8 + i - 1) % 12) + 1;
    map[`${tonic}-maj`] = { num, letter: "B" };
  });
  // Minor keys: relative minor of each major shares the wheel number, letter A.
  // Relative minor tonic = major tonic - 3 semitones.
  majorOrder.forEach((tonic, i) => {
    const num = ((8 + i - 1) % 12) + 1;
    const minorTonic = ((tonic - 3) % 12 + 12) % 12;
    map[`${minorTonic}-min`] = { num, letter: "A" };
  });
  return map;
})();

export function camelot(key) {
  if (!key) return null;
  return CAMELOT[`${key.tonic}-${key.mode}`] || null;
}

export function camelotLabel(key) {
  const c = camelot(key);
  return c ? `${c.num}${c.letter}` : "—";
}

// Shortest distance around the 12-position wheel.
function wheelDistance(a, b) {
  const d = Math.abs(a - b) % 12;
  return Math.min(d, 12 - d);
}

// --- Compatibility scoring ----------------------------------------------
// Returns 0-100. 100 = same key. The scoring mirrors how harmonic mixing
// actually feels: relative maj/min and neighbours are nearly as good as a
// perfect match, energy-boost (+/- a position) is fine, far keys clash.
export function compatibilityScore(keyA, keyB) {
  if (!keyA || !keyB) return 50; // unknown / percussive — treat as neutral
  const ca = camelot(keyA);
  const cb = camelot(keyB);
  if (!ca || !cb) return 50;

  if (ca.num === cb.num && ca.letter === cb.letter) return 100;
  // Relative major/minor (same number, different letter)
  if (ca.num === cb.num) return 88;

  const dist = wheelDistance(ca.num, cb.num);
  const sameLetter = ca.letter === cb.letter;

  if (dist === 1 && sameLetter) return 84; // adjacent, energy move
  if (dist === 1) return 70; // diagonal
  if (dist === 2 && sameLetter) return 58;
  if (dist === 2) return 48;
  // Falls off with distance.
  return Math.max(8, 46 - dist * 7);
}

export function compatibilityTier(score) {
  if (score >= 86) return { tier: "perfect", label: "Locks in" };
  if (score >= 70) return { tier: "good", label: "Plays nice" };
  if (score >= 50) return { tier: "ok", label: "Workable" };
  return { tier: "clash", label: "Clashes" };
}

// --- Pitch suggestion ----------------------------------------------------
// Given a sample's key and the project key, find the smallest semitone shift
// (within +/- 7) that maximises compatibility. Mode doesn't change under a
// transpose, only the tonic moves. We prefer the smallest move on ties because
// large shifts degrade audio quality (and sound less natural).
export function suggestPitchShift(sampleKey, projectKey) {
  if (!sampleKey || !projectKey) return 0;
  let best = { shift: 0, score: compatibilityScore(sampleKey, projectKey) };
  for (let s = -7; s <= 7; s++) {
    if (s === 0) continue;
    const shifted = {
      tonic: ((sampleKey.tonic + s) % 12 + 12) % 12,
      mode: sampleKey.mode,
    };
    const score = compatibilityScore(shifted, projectKey);
    if (
      score > best.score ||
      (score === best.score && Math.abs(s) < Math.abs(best.shift))
    ) {
      best = { shift: s, score };
    }
  }
  return best.shift;
}

// Transpose a key by N semitones (for previewing the result of a shift).
export function transposeKey(key, semitones) {
  if (!key) return key;
  return {
    tonic: ((key.tonic + semitones) % 12 + 12) % 12,
    mode: key.mode,
  };
}

export const ALL_KEYS = (() => {
  const keys = [];
  for (let t = 0; t < 12; t++) {
    keys.push({ tonic: t, mode: "min" });
    keys.push({ tonic: t, mode: "maj" });
  }
  return keys;
})();
