import { useEffect, useRef } from "react";
import { useStore } from "../state/store.js";
import { engine } from "../audio/engine.js";
import { typeMeta } from "../lib/types.js";
import { keyShort } from "../audio/musicTheory.js";
import { meter } from "../lib/ascii.js";
import AsciiWave from "./AsciiWave.jsx";

export default function Screen() {
  const view = useStore((s) => s.view);
  return (
    <div className="scr">
      {view === "empty" && <Empty />}
      {view === "analyzing" && <Listening />}
      {view === "ready" && <Loaded />}
      <div className="scr-vig" />
    </div>
  );
}

function Empty() {
  const loadDemo = useStore((s) => s.loadDemo);
  const loadFiles = useStore((s) => s.loadFiles);
  const folderInput = useRef(null);

  return (
    <div
      className="scr-empty"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files?.length) loadFiles(e.dataTransfer.files);
      }}
    >
      <div className="scr-prompt b2">&gt; MOSAIC SAMPLER<span className="cur">█</span></div>
      <div className="scr-hint">DROP A FOLDER OF SAMPLES — WAV · AIFF · MP3 · OGG</div>
      <div className="scr-empty-actions">
        <button className="tbtn pixel" onClick={() => loadDemo()}>TRY DEMO</button>
        <button className="tbtn" onClick={() => folderInput.current?.click()}>BROWSE…</button>
      </div>
      <input
        ref={folderInput}
        type="file"
        multiple
        webkitdirectory=""
        directory=""
        accept="audio/*"
        hidden
        onChange={(e) => e.target.files?.length && loadFiles(e.target.files)}
      />
    </div>
  );
}

function Listening() {
  const { done, total, current } = useStore((s) => s.analyzing);
  const pct = total ? done / total : 0;
  return (
    <div className="scr-listen">
      <div className="b2">SCANNING FOLDER<span className="cur">█</span></div>
      <div className="row">
        <span className="meter">[{meter(pct, 26)}]</span>
        <span className="dim">{Math.round(pct * 100)}%</span>
      </div>
      <div className="name">
        {String(done).padStart(2, "0")}/{String(total).padStart(2, "0")} · {current || "…"}
      </div>
    </div>
  );
}

function Loaded() {
  const sample = useStore((s) => s.samples.find((x) => x.id === s.selectedId));
  const playing = useStore((s) => (sample ? s.playing[sample.id] : false));
  const align = useStore((s) => s.align);
  const headRef = useRef(null);

  useEffect(() => {
    let raf;
    const tick = () => {
      if (headRef.current) {
        const show = sample && playing;
        headRef.current.style.opacity = show ? "1" : "0";
        if (show) headRef.current.style.left = `${engine.voicePosition(sample.id) * 100}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sample, playing]);

  if (!sample) return null;
  const tm = typeMeta(sample.detectedType);
  const aligned = align && sample.trim > 0.004;

  return (
    <div className="scr-load">
      <div className="scr-line">
        <span className="scr-id glow">{sample.name}</span>
        <span className="scr-role">[{tm.letter}] {tm.full}</span>
      </div>

      <div className="ascii-wave">
        <AsciiWave data={sample.waveformData} />
        <span className="wave-head" ref={headRef} />
      </div>

      <div className="scr-meta">
        <span><b>{sample.bpm ? `${sample.bpm} BPM` : "ONE-SHOT"}</b></span>
        <span>KEY <b>{sample.key ? keyShort(sample.key).toUpperCase() : "--"}</b></span>
        <span>LEN <b>{sample.duration}S</b></span>
        <span className={aligned ? "lit" : ""}>{aligned ? `TRIM -${Math.round(sample.trim * 1000)}MS` : "@ 0"}</span>
      </div>
    </div>
  );
}
