import { useStore } from "../state/store.js";
import { fmtDb } from "../lib/format.js";
import AsciiBar from "./AsciiBar.jsx";

// Master-bus effects: saturation + compression on the whole mix (not per-sample,
// unlike the SPACE/CHORUS/DELAY sends in Params). MAKEUP trims the post-comp
// output back up. All drawn as ASCII faders — drag, scroll, double-click resets.
export default function MasterFx() {
  const sat = useStore((s) => s.master.saturate);
  const comp = useStore((s) => s.master.compress);
  const makeup = useStore((s) => s.master.makeup);
  const setSaturate = useStore((s) => s.setSaturate);
  const setCompress = useStore((s) => s.setCompress);
  const setMakeup = useStore((s) => s.setMakeup);
  const pct = (v) => `${Math.round(v * 100)}`;

  return (
    <div className="master">
      <AsciiBar label="SATURATE" min={0} max={1} defaultValue={0} width={14}
        value={sat} onChange={setSaturate} format={pct} />
      <AsciiBar label="COMPRESS" min={0} max={1} defaultValue={0} width={14}
        value={comp} onChange={setCompress} format={pct} />
      <AsciiBar label="MAKEUP" min={-12} max={12} defaultValue={0} width={14}
        value={makeup} onChange={setMakeup} format={(v) => fmtDb(v)} />
    </div>
  );
}
