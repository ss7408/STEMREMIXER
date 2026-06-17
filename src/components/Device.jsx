import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store.js";
import { engine } from "../audio/engine.js";
import { meter } from "../lib/ascii.js";
import { BRAND } from "../brand.js";
import Screen from "./Screen.jsx";
import Encoders from "./Encoders.jsx";
import SampleKeys from "./SampleKeys.jsx";
import Library from "./Library.jsx";
import Scrubber from "./Scrubber.jsx";
import MasterFx from "./MasterFx.jsx";
import { keyLabel } from "../audio/musicTheory.js";

const THEMES = [
  { id: "cyan", label: "CYN" },
  { id: "green", label: "GRN" },
  { id: "amber", label: "AMB" },
  { id: "blue", label: "BLU" },
];

const fmtTempo = (n) => String(n).padStart(3, "0");
const fmtPitch = (n) => (n >= 0 ? "+" : "-") + String(Math.abs(n)).padStart(2, "0");

function Brand() {
  return (
    <span className="crt-brand">
      <span className="star">★</span> {BRAND.wordmark.toUpperCase()} <span className="star">★</span>
    </span>
  );
}

export default function Device() {
  const view = useStore((s) => s.view);
  const bpm = useStore((s) => s.bpm);
  const masterPitch = useStore((s) => s.masterPitch);
  const align = useStore((s) => s.align);
  const count = useStore((s) => s.samples.length);
  const projectKey = useStore((s) => s.projectKey);
  const keyLock = useStore((s) => s.keyLock);
  const setBpm = useStore((s) => s.setBpm);
  const setMasterPitch = useStore((s) => s.setMasterPitch);
  const toggleAlign = useStore((s) => s.toggleAlign);
  const nudgeProjectKey = useStore((s) => s.nudgeProjectKey);
  const toggleKeyMode = useStore((s) => s.toggleKeyMode);
  const toggleKeyLock = useStore((s) => s.toggleKeyLock);
  const stopAll = useStore((s) => s.stopAll);
  const reset = useStore((s) => s.reset);

  const [phos, setPhos] = useState("cyan");
  const vuRef = useRef(null);
  const vuDbRef = useRef(null);
  const ready = view === "ready";

  useEffect(() => {
    document.documentElement.dataset.phos = phos;
  }, [phos]);

  useEffect(() => {
    let raf;
    const tick = () => {
      const lvl = engine.masterLevel();
      if (vuRef.current) vuRef.current.textContent = meter(lvl, 10);
      if (vuDbRef.current) vuDbRef.current.textContent = `${Math.round(lvl * 48 - 48)}dB`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!ready) {
    return (
      <div className="crt">
        <SlimBar view={view} bpm={bpm} masterPitch={masterPitch} />
        <Screen />
      </div>
    );
  }

  return (
    <div className="crt">
      <div className="crt-bar">
        <Brand />
        <Scrubber label="TEMPO" value={bpm} min={60} max={200} step={1} defaultValue={120}
          format={fmtTempo} onChange={setBpm} />
        <Scrubber label="PITCH" value={masterPitch} min={-24} max={24} step={1} bipolar defaultValue={0}
          trackWidth={70} format={fmtPitch} onChange={setMasterPitch} />

        <span className="mod key-mod">
          <span className="mod-label">KEY</span>
          <button className="key-arrow" onClick={() => nudgeProjectKey(-1)} disabled={!projectKey} title="Project key down a semitone">‹</button>
          <button className="key-name" onClick={toggleKeyMode} disabled={!projectKey} title="Project key — click toggles major / minor">
            {projectKey ? keyLabel(projectKey).toUpperCase() : "— —"}
          </button>
          <button className="key-arrow" onClick={() => nudgeProjectKey(1)} disabled={!projectKey} title="Project key up a semitone">›</button>
        </span>
        <button className={`pill${keyLock ? " on" : ""}`} onClick={toggleKeyLock} title="Key lock — auto-match every sample to the project key">
          LOCK {keyLock ? "ON" : "OFF"}
        </button>

        <button className={`pill${align ? " on" : ""}`} onClick={toggleAlign} title="Trim leading silence">
          ALIGN {align ? "ON" : "OFF"}
        </button>
        <button className="pill" onClick={stopAll}>■ STOP</button>

        <span className="bar-sp" />

        <span className="mod vu-mod">
          <span className="mod-label">MASTER VU</span>
          <span className="bar-vu" ref={vuRef}>{meter(0, 10)}</span>
          <span className="vu-db" ref={vuDbRef}>-48dB</span>
        </span>

        <span className="mod phos-mod">
          <span className="mod-label">PHOSPHOR</span>
          <span className="phos-codes">
            {THEMES.map((t) => (
              <button key={t.id} className={`phos-code${phos === t.id ? " on" : ""}`} onClick={() => setPhos(t.id)}>
                {t.label}
              </button>
            ))}
          </span>
        </span>

        <button className="pill" onClick={reset}>⏏ EJECT</button>
      </div>

      <div className="info-line">
        <span>DISPLAY MODE D-01 · WAVEFORM 3D</span>
        <span>FORMAT B · END SEG 128 / 64</span>
        <span className="bar-sp" />
        <span>SESSION 09 · USER: SS7408</span>
      </div>

      <div className="work">
        <div className="panel lib-panel">
          <span className="panel-label">Library · {count}</span>
          <Library />
        </div>
        <div className="panel disp-panel">
          <span className="panel-label">Display</span>
          <Screen />
        </div>
        <div className="panel params-panel">
          <span className="panel-label">Params</span>
          <Encoders />
        </div>
      </div>

      <div className="panel deck-panel">
        <span className="panel-label">Deck · 8</span>
        <SampleKeys />
      </div>

      <div className="panel master-panel">
        <span className="panel-label">Master · FX</span>
        <MasterFx />
      </div>
    </div>
  );
}

// The empty / scanning states use a single slim bordered bar instead of the
// modular telemetry frames — the big status bar is reserved for the workspace.
function SlimBar({ view, bpm, masterPitch }) {
  const scanning = view === "analyzing";
  return (
    <div className="crt-bar slim">
      <Brand />
      <span className="slim-kv">
        <i>TEMPO</i> <b>{scanning ? fmtTempo(bpm) : "— —"}</b>
      </span>
      <span className="slim-kv">
        <i>PITCH</i> <b>{scanning ? fmtPitch(masterPitch) : "— —"}</b>
      </span>
      <span className="bar-sp" />
      {scanning ? (
        <span className="chip b2"><span className="blip">■</span> ANALYZE</span>
      ) : (
        <span className="chip dim">NO MEDIA</span>
      )}
    </div>
  );
}
