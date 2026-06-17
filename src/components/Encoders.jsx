import { useStore } from "../state/store.js";
import { fmtDb } from "../lib/format.js";
import AsciiBar from "./AsciiBar.jsx";

// Per-sample params for the selected sample, drawn as ASCII faders. Pitch is a
// master control (status bar), not here.
export default function Encoders() {
  const sample = useStore((s) => s.samples.find((x) => x.id === s.selectedId));
  const a = useStore.getState();
  const id = sample?.id;
  const on = !!sample;
  const noop = () => {};
  const pct = (v) => `${Math.round(v * 100)}`;

  return (
    <div className={`params${on ? "" : " disabled"}`}>
      <AsciiBar label="VOLUME" min={-40} max={6} defaultValue={0}
        value={sample ? sample.volume : 0}
        onChange={on ? (v) => a.setVolume(id, v) : noop}
        format={(v) => `${fmtDb(v)}`} />
      <AsciiBar label="FILTER" min={0} max={1} defaultValue={1}
        value={sample ? sample.filter : 1}
        onChange={on ? (v) => a.setFilter(id, v) : noop} format={pct} />
      <AsciiBar label="SPACE" min={0} max={1} defaultValue={0}
        value={sample ? sample.space : 0}
        onChange={on ? (v) => a.setSpace(id, v) : noop} format={pct} />
      <AsciiBar label="CHORUS" min={0} max={1} defaultValue={0}
        value={sample ? sample.chorus : 0}
        onChange={on ? (v) => a.setChorus(id, v) : noop} format={pct} />
      <AsciiBar label="DELAY" min={0} max={1} defaultValue={0}
        value={sample ? sample.delay : 0}
        onChange={on ? (v) => a.setDelay(id, v) : noop} format={pct} />
    </div>
  );
}
