import { useMemo } from "react";
import { resample } from "../lib/ascii.js";

// The headline display: a 3D perspective vector mesh. 22 scan-line rows recede
// toward a horizon; front rows swing wider, back rows fade. The real sample
// shape (waveformData) modulates each row's amplitude so different sounds read
// differently. The playhead is a separate <g> the caller drives via `playheadRef`
// (translate X across the 0..720 viewBox from engine.voicePosition).
const W = 720;
const H = 260;
const ROWS = 22;
const COLS = 70;
const VP = { x: 360, y: 32 }; // vanishing point

export default function WireframeMesh({ waveformData, playheadRef }) {
  const rows = useMemo(() => buildRows(waveformData), [waveformData]);

  return (
    <svg className="mesh" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {/* perspective grid floor */}
      <line className="mesh-horizon" x1="40" y1={VP.y} x2="680" y2={VP.y} />
      {Array.from({ length: 11 }).map((_, j) => {
        const x = 40 + (j / 10) * 640;
        return <path key={`g${j}`} className="mesh-grid" d={`M ${VP.x} ${VP.y} L ${x} ${H}`} />;
      })}

      {/* waveform mesh */}
      {rows.map((r, i) => (
        <path
          key={i}
          d={r.d}
          className="mesh-row"
          stroke="var(--phos)"
          strokeOpacity={r.op}
          strokeWidth={r.sw}
          fill="none"
        />
      ))}

      {/* playhead — driven by the caller via ref */}
      <g ref={playheadRef} className="mesh-head" style={{ opacity: 0 }}>
        <line x1="0" y1="20" x2="0" y2={H} stroke="var(--phos-2)" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="0" cy="20" r="2.5" fill="var(--phos-2)" />
      </g>
    </svg>
  );
}

function buildRows(waveformData) {
  const env = resample(waveformData && waveformData.length ? waveformData : null, COLS);
  const peak = Math.max(...env, 0.0001);
  const out = [];
  for (let i = 0; i < ROWS; i++) {
    const t = i / (ROWS - 1);
    const y0 = 38 + Math.pow(t, 1.35) * 200; // pack rows toward the horizon
    const amp = 4 + t * 56; // front rows swing wider
    const xPad = (1 - t) * 60; // back rows narrower
    let d = "";
    for (let j = 0; j < COLS; j++) {
      const u = j / (COLS - 1);
      const x = xPad + u * (W - 2 * xPad);
      const envelope = Math.pow(Math.sin(u * Math.PI), 1.2);
      const wave =
        (Math.sin(u * 8 + i * 0.42) * 0.55 +
          Math.sin(u * 16 + i * 0.71) * 0.28 +
          Math.sin(u * 27 + i * 0.31) * 0.17) *
        envelope;
      // fold in the real sample so the mesh reflects the loaded sound
      const sampleAmt = 0.45 + 0.55 * (env[j] / peak);
      const y = y0 - wave * amp * sampleAmt;
      d += (j === 0 ? "M " : " L ") + x.toFixed(1) + " " + y.toFixed(1);
    }
    out.push({ d, op: 0.22 + t * 0.78, sw: 0.5 + t * 0.6 });
  }
  return out;
}
