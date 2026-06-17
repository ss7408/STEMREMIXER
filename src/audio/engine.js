// engine.js
// A small sampler engine on Tone.js. Deliberately minimal: each sample is a
// Tone.GrainPlayer (tempo-stretch + master transpose), a lowpass filter, and
// three send amounts to shared master effects (reverb / chorus / delay). Pitch
// is a single master transpose. No effect rack, no mixer — an instrument.
//
//  * Loops time-stretch to the project tempo and drop in on the bar.
//  * One-shots fire tight (next 1/16) so keys feel responsive.
//  * "Align" trims the leading silence so every sample starts at 0.

import * as Tone from "tone";

const FILTER_OPEN = 18000;

class SamplerEngine {
  constructor() {
    this.ready = false;
    this.voices = new Map();
    this.bpm = 90;
    this.align = true;
    this.masterPitch = 0; // transposes every sample together (semitones)
  }

  async unlock() {
    if (this.ready) return;
    await Tone.start();
    this._buildMaster();
    const t = Tone.getTransport();
    t.bpm.value = this.bpm;
    t.start();
    this.ready = true;
  }

  _buildMaster() {
    const dest = Tone.getDestination();
    this.masterIn = new Tone.Gain(1);
    this.limiter = new Tone.Limiter(-1);
    this.meter = new Tone.Meter({ smoothing: 0.8 });
    this.masterIn.chain(this.limiter, this.meter, dest);

    // Shared, fully-wet send returns. Per-voice send gains set how much of each
    // sample feeds them, so reverb / chorus / delay are master effects you dial
    // in per sound.
    this.reverb = new Tone.Reverb({ decay: 3, preDelay: 0.01, wet: 1 });
    this.chorus = new Tone.Chorus({ frequency: 1.2, delayTime: 3.5, depth: 0.7, wet: 1 }).start();
    this.delay = new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.32, wet: 1 });
    this.reverb.connect(this.limiter);
    this.chorus.connect(this.limiter);
    this.delay.connect(this.limiter);
  }

  setBpm(bpm) {
    this.bpm = bpm;
    if (this.ready) Tone.getTransport().bpm.rampTo(bpm, 0.12);
    this.voices.forEach((v) => this._applyRate(v));
  }

  setAlign(on) {
    this.align = on;
  }

  // --- voices ---------------------------------------------------------
  addVoice(meta, audioBuffer, opts = {}) {
    if (this.voices.has(meta.id)) return;
    const buffer = new Tone.ToneAudioBuffer(audioBuffer);
    const grain = new Tone.GrainPlayer({ url: buffer, grainSize: 0.12, overlap: 0.06, loop: false });
    const filter = new Tone.Filter({ type: "lowpass", frequency: FILTER_OPEN, Q: 0.6 });
    const channel = new Tone.Channel({ volume: 0 });
    const space = new Tone.Gain(0); // reverb send
    const chorusSend = new Tone.Gain(0);
    const delaySend = new Tone.Gain(0);
    const meter = new Tone.Meter({ smoothing: 0.7 });

    grain.chain(filter, channel);
    channel.connect(this.masterIn);
    channel.connect(space);
    space.connect(this.reverb);
    channel.connect(chorusSend);
    chorusSend.connect(this.chorus);
    channel.connect(delaySend);
    delaySend.connect(this.delay);
    channel.connect(meter);

    const voice = {
      id: meta.id,
      grain,
      filter,
      channel,
      space,
      chorusSend,
      delaySend,
      meter,
      buffer,
      isPlaying: false,
      loop: !!opts.loop,
      baseBpm: meta.bpm || null,
      trim: meta.trim || 0,
    };
    this.voices.set(meta.id, voice);
    this._applyRate(voice);
    grain.detune = this.masterPitch * 100; // follow current master transpose
  }

  removeVoice(id) {
    const v = this.voices.get(id);
    if (!v) return;
    [v.grain, v.filter, v.channel, v.space, v.chorusSend, v.delaySend, v.meter].forEach((n) => n.dispose && n.dispose());
    this.voices.delete(id);
  }

  _applyRate(v) {
    v.grain.playbackRate = v.loop && v.baseBpm ? this.bpm / v.baseBpm : 1;
  }

  _offset(v) {
    return this.align ? v.trim : 0;
  }

  trigger(id) {
    const v = this.voices.get(id);
    if (!v) return;
    const off = this._offset(v);
    v.off = off;
    if (v.loop) {
      // Always drop in on the next downbeat so every loop is phase-locked to the
      // grid (and to each other) from the very first cycle.
      const t = this.ready ? Tone.getTransport().nextSubdivision("1m") : Tone.now();
      v.grain.loop = true;
      v.grain.loopStart = off;
      // Snap the loop region to a whole number of bars at the sample's own tempo
      // so it never drifts out of sync over a long session.
      let loopEnd = v.buffer.duration;
      if (v.baseBpm) {
        const barSec = (60 / v.baseBpm) * 4;
        const bars = Math.max(1, Math.round((v.buffer.duration - off) / barSec));
        loopEnd = Math.min(v.buffer.duration, off + bars * barSec);
      }
      v.grain.loopEnd = loopEnd;
      v.loopSrcLen = loopEnd - off;
      if (v.isPlaying) {
        v.grain.stop(t);
        v.isPlaying = false;
      } else {
        v.grain.start(t, off);
        v.isPlaying = true;
        v.startTime = t;
      }
    } else {
      v.grain.loop = false;
      const t = this.ready ? Tone.getTransport().nextSubdivision("16n") : Tone.now();
      v.grain.restart(t, off);
      v.isPlaying = true;
      v.startTime = t;
    }
    return v.isPlaying;
  }

  // Position within the playing sample, 0..1 — drives the display playhead.
  // Computed from the real start time so it's accurate for any loop length.
  voicePosition(id) {
    const v = this.voices.get(id);
    if (!v || !v.isPlaying || v.startTime == null) return 0;
    const now = Tone.now();
    if (now < v.startTime) return 0;
    const rate = v.grain.playbackRate || 1;
    if (v.loop) {
      const L = (v.loopSrcLen || v.buffer.duration - (v.off || 0)) / rate;
      return L > 0 ? ((now - v.startTime) % L) / L : 0;
    }
    const L = (v.buffer.duration - (v.off || 0)) / rate;
    const p = (now - v.startTime) / L;
    return p >= 1 ? 0 : Math.max(0, p);
  }

  stopAll() {
    this.voices.forEach((v) => {
      try {
        v.grain.stop(Tone.now() + 0.01);
      } catch (e) {}
      v.isPlaying = false;
    });
  }

  // --- master pitch (transposes everything) ---------------------------
  setMasterPitch(semitones) {
    this.masterPitch = semitones;
    this.voices.forEach((v) => {
      v.grain.detune = semitones * 100;
    });
  }

  // --- per-sample params ----------------------------------------------
  setVolume(id, db) {
    const v = this.voices.get(id);
    if (v) v.channel.volume.rampTo(db, 0.03);
  }
  setFilter(id, amt) {
    const v = this.voices.get(id);
    if (!v) return;
    const freq = 120 * Math.pow(FILTER_OPEN / 120, amt); // 0 = closed, 1 = open
    v.filter.frequency.rampTo(freq, 0.04);
  }
  setSpace(id, amt) {
    const v = this.voices.get(id);
    if (v) v.space.gain.rampTo(amt, 0.05);
  }
  setChorus(id, amt) {
    const v = this.voices.get(id);
    if (v) v.chorusSend.gain.rampTo(amt, 0.05);
  }
  setDelay(id, amt) {
    const v = this.voices.get(id);
    if (v) v.delaySend.gain.rampTo(amt, 0.05);
  }
  setMute(id, m) {
    const v = this.voices.get(id);
    if (v) v.channel.mute = m;
  }
  setSolo(id, s) {
    const v = this.voices.get(id);
    if (v) v.channel.solo = s; // Tone.Channel handles the shared solo bus
  }

  // --- metering / transport -------------------------------------------
  voiceLevel(id) {
    const v = this.voices.get(id);
    if (!v) return 0;
    return this._norm(v.meter.getValue());
  }
  masterLevel() {
    return this.meter ? this._norm(this.meter.getValue()) : 0;
  }
  _norm(db) {
    const value = Array.isArray(db) ? Math.max(...db) : db;
    if (!isFinite(value)) return 0;
    return Math.max(0, Math.min(1, (value + 48) / 48));
  }

  transportPosition() {
    if (!this.ready) return { progress: 0, bar: 1, beat: 1 };
    const t = Tone.getTransport();
    const ticksPerBar = t.PPQ * 4;
    const ticks = t.ticks;
    return {
      progress: (ticks % ticksPerBar) / ticksPerBar,
      bar: Math.floor(ticks / ticksPerBar) + 1,
      beat: Math.floor((ticks % ticksPerBar) / t.PPQ) + 1,
    };
  }
}

export const engine = new SamplerEngine();
