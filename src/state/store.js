// store.js
// Single source of truth for the sampler. Small on purpose. The UI reads from
// here; actions push the audio side-effects into the engine.

import { create } from "zustand";
import * as Tone from "tone";
import { engine } from "../audio/engine.js";
import { analyzeBuffer } from "../audio/analyzer.js";
import { buildDemoPack, DEMO_HOME } from "../audio/demoPack.js";

function isLoop(meta) {
  if (meta.detectedType === "fx") return false;
  if (meta.bpm == null && meta.detectedType !== "texture") return false;
  return true;
}

function enrich(meta) {
  return {
    ...meta,
    loop: isLoop(meta),
    // per-sample params (pitch is global, see masterPitch)
    volume: 0,
    filter: 1,
    space: 0,
    chorus: 0,
    delay: 0,
    mute: false,
    solo: false,
  };
}

const SLOTS = 8;
function buildDeck(samples) {
  const deck = new Array(SLOTS).fill(null);
  for (let i = 0; i < Math.min(SLOTS, samples.length); i++) deck[i] = samples[i].id;
  return deck;
}

async function decodeFile(file) {
  const ab = await file.arrayBuffer();
  return await Tone.getContext().rawContext.decodeAudioData(ab);
}

const AUDIO_RE = /\.(wav|mp3|aif|aiff|flac|ogg|m4a|aac|webm)$/i;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const useStore = create((set, get) => ({
  view: "empty", // empty | analyzing | ready
  samples: [], // the full library
  deck: [], // SLOTS ids (or null) — the playable arrangement
  selectedId: null,
  playing: {},
  bpm: DEMO_HOME.bpm,
  masterPitch: 0,
  align: true,
  analyzing: { active: false, total: 0, done: 0, current: "" },

  // --- ingestion ------------------------------------------------------
  loadDemo: async () => {
    await engine.unlock();
    engine.setBpm(DEMO_HOME.bpm);
    set({ view: "analyzing", bpm: DEMO_HOME.bpm, samples: [], analyzing: { active: true, total: 8, done: 0, current: "Rendering pack" } });
    const pack = await buildDemoPack(Tone.getContext().sampleRate);
    await get()._ingest(pack);
  },

  loadFiles: async (fileList) => {
    const files = Array.from(fileList).filter((f) => AUDIO_RE.test(f.name)).slice(0, 16);
    if (files.length === 0) return;
    await engine.unlock();
    set({ view: "analyzing", samples: [], analyzing: { active: true, total: files.length, done: 0, current: "Reading files" } });
    const items = [];
    for (const file of files) {
      try {
        items.push({ filename: file.name, audioBuffer: await decodeFile(file), hint: {} });
      } catch (e) {
        /* skip undecodable */
      }
    }
    await get()._ingest(items);
  },

  // Add more samples to a running session (button / drop on the library).
  // Appends to the library and fills any empty deck slots.
  addFiles: async (fileList) => {
    if (get().view !== "ready") return get().loadFiles(fileList);
    const files = Array.from(fileList).filter((f) => AUDIO_RE.test(f.name)).slice(0, 16);
    if (!files.length) return;
    for (const file of files) {
      try {
        const audioBuffer = await decodeFile(file);
        const meta = analyzeBuffer(audioBuffer, file.name, {});
        const sample = enrich(meta);
        engine.addVoice(meta, audioBuffer, { loop: sample.loop });
        set((s) => {
          const samples = [...s.samples, sample];
          const deck = [...s.deck];
          const empty = deck.indexOf(null);
          if (empty >= 0) deck[empty] = sample.id;
          return { samples, deck, selectedId: sample.id };
        });
      } catch (e) {
        /* skip undecodable */
      }
    }
  },

  _ingest: async (items) => {
    set((s) => ({ analyzing: { ...s.analyzing, total: items.length, done: 0 } }));
    const out = [];
    for (let i = 0; i < items.length; i++) {
      const { filename, audioBuffer, hint } = items[i];
      const meta = analyzeBuffer(audioBuffer, filename, hint);
      const sample = enrich(meta);
      engine.addVoice(meta, audioBuffer, { loop: sample.loop });
      out.push(sample);
      set((s) => ({ analyzing: { ...s.analyzing, done: i + 1, current: sample.name }, samples: [...out] }));
      await wait(110);
    }
    await wait(360);
    set({ view: "ready", deck: buildDeck(out), selectedId: out[0]?.id ?? null, analyzing: { active: false, total: 0, done: 0, current: "" } });
  },

  reset: () => {
    engine.stopAll();
    get().samples.forEach((s) => engine.removeVoice(s.id));
    set({ view: "empty", samples: [], deck: [], selectedId: null, playing: {} });
  },

  // --- interaction ----------------------------------------------------
  select: (id) => set({ selectedId: id }),

  trigger: (id) => {
    const playing = engine.trigger(id);
    const smp = get().samples.find((s) => s.id === id);
    set({ selectedId: id });
    if (smp && smp.loop) {
      set((s) => ({ playing: { ...s.playing, [id]: playing } }));
    } else {
      set((s) => ({ playing: { ...s.playing, [id]: true } }));
      setTimeout(() => set((s) => ({ playing: { ...s.playing, [id]: false } })), 200);
    }
  },

  stopAll: () => {
    engine.stopAll();
    set({ playing: {} });
  },

  setBpm: (bpm) => {
    bpm = Math.max(60, Math.min(180, Math.round(bpm)));
    engine.setBpm(bpm);
    set({ bpm });
  },

  toggleAlign: () => {
    const align = !get().align;
    engine.setAlign(align);
    set({ align });
  },

  // master transpose — moves every sample together
  setMasterPitch: (semis) => {
    semis = Math.max(-12, Math.min(12, Math.round(semis)));
    engine.setMasterPitch(semis);
    set({ masterPitch: semis });
  },

  // --- per-sample params (operate on selected sample) -----------------
  _patch: (id, patch) =>
    set((s) => ({ samples: s.samples.map((smp) => (smp.id === id ? { ...smp, ...patch } : smp)) })),

  setVolume: (id, v) => {
    engine.setVolume(id, v);
    get()._patch(id, { volume: v });
  },
  setFilter: (id, v) => {
    engine.setFilter(id, v);
    get()._patch(id, { filter: v });
  },
  setSpace: (id, v) => {
    engine.setSpace(id, v);
    get()._patch(id, { space: v });
  },
  setChorus: (id, v) => {
    engine.setChorus(id, v);
    get()._patch(id, { chorus: v });
  },
  setDelay: (id, v) => {
    engine.setDelay(id, v);
    get()._patch(id, { delay: v });
  },

  toggleMute: (id) => {
    const smp = get().samples.find((s) => s.id === id);
    if (!smp) return;
    engine.setMute(id, !smp.mute);
    get()._patch(id, { mute: !smp.mute });
  },
  toggleSolo: (id) => {
    const smp = get().samples.find((s) => s.id === id);
    if (!smp) return;
    engine.setSolo(id, !smp.solo);
    get()._patch(id, { solo: !smp.solo });
  },

  // --- arrangement: drag from library onto deck slots -----------------
  // Drop a library sample onto a slot. If it already sits in another slot it
  // moves (no duplicates on the deck).
  assignSlot: (slot, id) => {
    const deck = get().deck.map((x) => (x === id ? null : x));
    deck[slot] = id;
    set({ deck, selectedId: id });
  },
  // Drag one slot onto another to swap them.
  swapSlots: (a, b) => {
    if (a === b) return;
    const deck = [...get().deck];
    [deck[a], deck[b]] = [deck[b], deck[a]];
    set({ deck });
  },
}));
