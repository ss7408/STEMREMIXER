import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store.js";
import { engine } from "../audio/engine.js";
import { meter } from "../lib/ascii.js";
import { BRAND } from "../brand.js";
import Screen from "./Screen.jsx";
import Encoders from "./Encoders.jsx";
import SampleKeys from "./SampleKeys.jsx";
import Library from "./Library.jsx";

const THEMES = [
  { id: "green", label: "GRN" },
  { id: "amber", label: "AMB" },
  { id: "blue", label: "BLU" },
];

export default function Device() {
  const view = useStore((s) => s.view);
  const bpm = useStore((s) => s.bpm);
  const masterPitch = useStore((s) => s.masterPitch);
  const align = useStore((s) => s.align);
  const setBpm = useStore((s) => s.setBpm);
  const setMasterPitch = useStore((s) => s.setMasterPitch);
  const toggleAlign = useStore((s) => s.toggleAlign);
  const stopAll = useStore((s) => s.stopAll);
  const reset = useStore((s) => s.reset);

  const [phos, setPhos] = useState("green");
  const vuRef = useRef(null);
  const ready = view === "ready";

  useEffect(() => {
    document.documentElement.dataset.phos = phos;
  }, [phos]);

  useEffect(() => {
    let raf;
    const tick = () => {
      if (vuRef.current) vuRef.current.textContent = meter(engine.masterLevel(), 10);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="crt">
      <div className="crt-bar">
        <span className="crt-brand">
          <span className="star">★</span> {BRAND.wordmark.toUpperCase()} <span className="star">★</span>
        </span>

        <span className="bar-item">
          <span className="k">TEMPO</span>
          <span className="step">
            <button onClick={() => setBpm(bpm - 1)} disabled={!ready}>-</button>
            <span className="b2">{String(bpm).padStart(3, "0")}</span>
            <button onClick={() => setBpm(bpm + 1)} disabled={!ready}>+</button>
          </span>
        </span>

        <span className="bar-item" title="Master transpose — moves every sample together">
          <span className="k">PITCH</span>
          <span className="step">
            <button onClick={() => setMasterPitch(masterPitch - 1)} disabled={!ready}>-</button>
            <span className="b2">{`${masterPitch >= 0 ? "+" : "-"}${String(Math.abs(masterPitch)).padStart(2, "0")}`}</span>
            <button onClick={() => setMasterPitch(masterPitch + 1)} disabled={!ready}>+</button>
          </span>
        </span>

        <button className={`tbtn${align ? " on" : ""}`} onClick={toggleAlign} disabled={!ready} title="Trim leading silence">
          ALIGN {align ? "ON" : "OFF"}
        </button>
        <button className="tbtn" onClick={stopAll} disabled={!ready}>■ STOP</button>

        <span className="bar-sp" />

        <span className="bar-item">
          <span className="k">VU</span>
          <span className="bar-vu" ref={vuRef}>{meter(0, 10)}</span>
        </span>

        <span className="step" title="Phosphor">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setPhos(t.id)}
              style={{ padding: "2px 5px", color: phos === t.id ? "var(--phos-2)" : "var(--phos-dim)" }}
            >
              {t.label}
            </button>
          ))}
        </span>

        {ready && <button className="tbtn" onClick={reset}>⏏ EJECT</button>}
      </div>

      <div className={`crt-body${ready ? " has-lib" : ""}`}>
        {ready && (
          <div className="panel lib-panel">
            <span className="panel-label">Library · drag →</span>
            <Library />
          </div>
        )}
        <div className="crt-right">
          <div className="crt-main">
            <div className="panel">
              <span className="panel-label">Display</span>
              <Screen />
            </div>
            <div className="panel">
              <span className="panel-label">Params</span>
              <Encoders />
            </div>
          </div>
          <div className="panel">
            <span className="panel-label">Deck</span>
            <SampleKeys />
          </div>
        </div>
      </div>
    </div>
  );
}
