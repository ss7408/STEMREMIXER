// demoPack.js
// "Drop a folder" with no folder. We synthesise a small, musically-coherent
// sample pack into real AudioBuffers using an OfflineAudioContext, so the demo
// actually MAKES SOUND with zero shipped assets. Everything is tuned around a
// shared home key (A minor / C major family) at 90 BPM, with two deliberate
// outliers (different key + tempo) so the compatibility layer has something to
// react to: glow, warn, auto-pitch.
//
// Each entry returns { audioBuffer, filename, hint } and is then run through the
// exact same analyzer.js pipeline that real uploads use.

// SR is set to the live AudioContext sample rate before building, so demo
// buffers play back at the correct speed/pitch on any device (some default to
// 48000). buildDemoPack(sampleRate) sets it.
let SR = 44100;
const HOME_BPM = 90;
const beat = 60 / HOME_BPM; // seconds per beat
const bar = beat * 4;

// Note -> frequency (A4 = 440)
const NOTE = {};
["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].forEach(
  (n, i) => {
    for (let oct = 0; oct <= 7; oct++) {
      NOTE[`${n}${oct}`] = 440 * Math.pow(2, (i - 9 + (oct - 4) * 12) / 12);
    }
  }
);

function render(seconds, fn) {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * SR), SR);
  fn(ctx);
  return ctx.startRendering();
}

// --- tiny synth primitives (scheduled into an offline ctx) ----------------
function osc(ctx, { type = "sine", freq, t, dur, gain = 0.3, attack = 0.005, release = 0.08, detune = 0, dest }) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.setValueAtTime(gain, t + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest || ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noiseBurst(ctx, { t, dur, gain = 0.4, type = "highpass", freq = 6000, q = 0.7, dest }) {
  const len = Math.ceil(dur * SR);
  const buf = ctx.createBuffer(1, len, SR);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = type;
  filt.frequency.value = freq;
  filt.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filt).connect(g).connect(dest || ctx.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function kick(ctx, t, dest, gain = 0.9) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  o.connect(g).connect(dest || ctx.destination);
  o.start(t);
  o.stop(t + 0.34);
}

function snare(ctx, t, dest, gain = 0.55) {
  noiseBurst(ctx, { t, dur: 0.2, gain, type: "highpass", freq: 1800, dest });
  osc(ctx, { type: "triangle", freq: 190, t, dur: 0.16, gain: gain * 0.5, release: 0.1, dest });
}

function hat(ctx, t, dest, gain = 0.22, open = false) {
  noiseBurst(ctx, { t, dur: open ? 0.18 : 0.045, gain, type: "highpass", freq: 9000, dest });
}

// --- pack definitions -----------------------------------------------------
// Each builder returns a Promise<AudioBuffer>.

function buildDrumLoop() {
  return render(bar, (ctx) => {
    for (let b = 0; b < 4; b++) {
      const t = b * beat;
      if (b === 0 || b === 2) kick(ctx, t, ctx.destination);
      if (b === 1 || b === 3) snare(ctx, t, ctx.destination);
      hat(ctx, t, ctx.destination, 0.18);
      hat(ctx, t + beat / 2, ctx.destination, 0.13, b === 3);
    }
    kick(ctx, beat * 2 + beat * 0.75, ctx.destination, 0.7); // syncopated ghost
  });
}

function buildKickLoop() {
  return render(bar, (ctx) => {
    for (let b = 0; b < 4; b++) kick(ctx, b * beat, ctx.destination);
  });
}

function buildHatLoop() {
  return render(bar, (ctx) => {
    for (let i = 0; i < 16; i++) {
      hat(ctx, i * (beat / 4), ctx.destination, i % 2 ? 0.1 : 0.18, i === 15);
    }
  });
}

function buildClap() {
  // Deliberate leading silence (~70ms) so the "Align" feature has something to
  // visibly fix on load.
  const lead = 0.07;
  return render(lead + 0.4, (ctx) => {
    [0, 0.012, 0.026].forEach((d) =>
      noiseBurst(ctx, { t: lead + d, dur: 0.18, gain: 0.5, type: "bandpass", freq: 1500, q: 1.2, dest: ctx.destination })
    );
  });
}

// Bass loop in A minor (root A1, walking A - A - C - E motif).
function buildBassLoop() {
  return render(bar, (ctx) => {
    const notes = [
      { n: "A1", t: 0, d: beat * 1.5 },
      { n: "A1", t: beat * 1.5, d: beat * 0.5 },
      { n: "C2", t: beat * 2, d: beat },
      { n: "E2", t: beat * 3, d: beat },
    ];
    notes.forEach(({ n, t, d }) => {
      osc(ctx, { type: "sawtooth", freq: NOTE[n], t, dur: d, gain: 0.34, attack: 0.01, release: 0.06, dest: lp(ctx, 320) });
      osc(ctx, { type: "sine", freq: NOTE[n] / 1, t, dur: d, gain: 0.2, dest: ctx.destination });
    });
  });

  function lp(ctx, freq) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq;
    f.connect(ctx.destination);
    return f;
  }
}

// Warm chord pad: Am triad (A C E) sustained over 1 bar.
function buildChordPad() {
  return render(bar * 2, (ctx) => {
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 2400;
    filt.connect(ctx.destination);
    ["A3", "C4", "E4"].forEach((n, i) => {
      osc(ctx, { type: "sawtooth", freq: NOTE[n], t: 0, dur: bar * 2, gain: 0.12, attack: 0.25, release: 0.6, detune: i * 4 - 4, dest: filt });
    });
  });
}

// Chord stab: short Cmaj (C E G) hit, twice per bar.
function buildChordStab() {
  return render(bar, (ctx) => {
    [0, beat * 2].forEach((t) => {
      ["C4", "E4", "G4"].forEach((n) =>
        osc(ctx, { type: "square", freq: NOTE[n], t, dur: beat * 0.8, gain: 0.13, attack: 0.005, release: 0.25, dest: ctx.destination })
      );
    });
  });
}

// Pluck melody in A minor pentatonic.
function buildMelody() {
  return render(bar, (ctx) => {
    const seq = ["A4", "C5", "E5", "D5", "C5", "A4", "E5", "G4"];
    seq.forEach((n, i) => {
      const t = i * (beat / 2);
      osc(ctx, { type: "triangle", freq: NOTE[n], t, dur: beat * 0.45, gain: 0.22, attack: 0.004, release: 0.2, dest: ctx.destination });
      osc(ctx, { type: "sine", freq: NOTE[n] * 2, t, dur: beat * 0.3, gain: 0.06, dest: ctx.destination });
    });
  });
}

// Vocal-ish "ah": formant-filtered saw with vibrato, sustained on A4.
function buildVocal() {
  return render(bar * 1.5, (ctx) => {
    const dur = bar * 1.5;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = NOTE["A4"];
    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vib.frequency.value = 5.2;
    vibGain.gain.value = 6;
    vib.connect(vibGain).connect(o.detune);
    // two formants for an "ah" vowel
    const f1 = ctx.createBiquadFilter();
    f1.type = "bandpass";
    f1.frequency.value = 800;
    f1.Q.value = 6;
    const f2 = ctx.createBiquadFilter();
    f2.type = "bandpass";
    f2.frequency.value = 1150;
    f2.Q.value = 8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, 0);
    g.gain.linearRampToValueAtTime(0.3, 0.12);
    g.gain.setValueAtTime(0.3, dur - 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, dur);
    o.connect(f1);
    o.connect(f2);
    f1.connect(g);
    f2.connect(g);
    g.connect(ctx.destination);
    o.start(0);
    vib.start(0);
    o.stop(dur);
    vib.stop(dur);
  });
}

// FX riser: noise + rising tone sweep over 1 bar.
function buildRiser() {
  return render(bar, (ctx) => {
    const dur = bar;
    const len = Math.ceil(dur * SR);
    const buf = ctx.createBuffer(1, len, SR);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.setValueAtTime(400, 0);
    filt.frequency.exponentialRampToValueAtTime(9000, dur);
    filt.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.02, 0);
    g.gain.exponentialRampToValueAtTime(0.5, dur);
    src.connect(filt).connect(g).connect(ctx.destination);
    src.start(0);
    src.stop(dur);
  });
}

// FX impact: downward boom. Also carries leading silence to showcase Align.
function buildImpact() {
  const lead = 0.1;
  return render(lead + 1.2, (ctx) => {
    osc(ctx, { type: "sine", freq: 220, t: lead, dur: 1.1, gain: 0.6, attack: 0.002, release: 0.9, dest: ctx.destination });
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(180, lead);
    o.frequency.exponentialRampToValueAtTime(30, lead + 0.9);
    g.gain.setValueAtTime(0.5, lead);
    g.gain.exponentialRampToValueAtTime(0.0001, lead + 1.1);
    o.connect(g).connect(ctx.destination);
    o.start(lead);
    o.stop(lead + 1.15);
    noiseBurst(ctx, { t: lead, dur: 0.5, gain: 0.3, type: "lowpass", freq: 1200, dest: ctx.destination });
  });
}

// Ambient texture: detuned drifting pad (the "off" key outlier — F# minor).
function buildTexture() {
  return render(bar * 2, (ctx) => {
    const dur = bar * 2;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 1400;
    filt.connect(ctx.destination);
    ["F#3", "A3", "C#4", "F#4"].forEach((n, i) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = NOTE[n];
      o.detune.value = (i - 1.5) * 7;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, 0);
      g.gain.linearRampToValueAtTime(0.07, 1.2);
      g.gain.setValueAtTime(0.07, dur - 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, dur);
      o.connect(g).connect(filt);
      o.start(0);
      o.stop(dur);
    });
  });
}

// The faster, off-key melodic outlier (124 BPM, F major) so the compatibility
// engine has a clear "needs pitching / warn" candidate.
function buildOffMelody() {
  const offBeat = 60 / 124;
  return render(offBeat * 8, (ctx) => {
    const seq = ["F4", "A4", "C5", "F5", "C5", "A4", "G4", "F4"];
    seq.forEach((n, i) => {
      const t = i * offBeat;
      osc(ctx, { type: "square", freq: NOTE[n], t, dur: offBeat * 0.8, gain: 0.16, attack: 0.004, release: 0.18, dest: ctx.destination });
    });
  });
}

// --- pack manifest --------------------------------------------------------
// hint carries authored ground-truth so the demo reads perfectly; uploads have
// no hint and are fully analyzed instead.
const A_MIN = { tonic: 9, mode: "min" };
const C_MAJ = { tonic: 0, mode: "maj" };
const FS_MIN = { tonic: 6, mode: "min" };
const F_MAJ = { tonic: 5, mode: "maj" };

// A tight, OP-1-sized pack: eight sounds across the roles, one home key.
const MANIFEST = [
  { filename: "Drums_Full_Loop_90.wav", build: buildDrumLoop, hint: { bpm: HOME_BPM, key: null, type: "drum" } },
  { filename: "Hats_16th_90.wav", build: buildHatLoop, hint: { bpm: HOME_BPM, key: null, type: "drum" } },
  { filename: "Clap_OneShot.wav", build: buildClap, hint: { bpm: null, key: null, type: "drum" } },
  { filename: "Sub_Bass_Amin_90.wav", build: buildBassLoop, hint: { bpm: HOME_BPM, key: A_MIN, type: "bass" } },
  { filename: "Stab_Cmaj_90.wav", build: buildChordStab, hint: { bpm: HOME_BPM, key: C_MAJ, type: "chord" } },
  { filename: "Pluck_Lead_Amin_90.wav", build: buildMelody, hint: { bpm: HOME_BPM, key: A_MIN, type: "melody" } },
  { filename: "Vox_Ah_A.wav", build: buildVocal, hint: { bpm: null, key: A_MIN, type: "vocal" } },
  { filename: "Impact_Boom.wav", build: buildImpact, hint: { bpm: null, key: null, type: "fx" } },
];

// Build everything in parallel. Returns [{ audioBuffer, filename, hint }].
export async function buildDemoPack(sampleRate = 44100) {
  SR = sampleRate;
  const results = await Promise.all(
    MANIFEST.map(async ({ filename, build, hint }) => ({
      filename,
      hint,
      audioBuffer: await build(),
    }))
  );
  return results;
}

export const DEMO_HOME = { bpm: HOME_BPM, key: A_MIN };
