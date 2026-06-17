import { useRef } from "react";

// A draggable telemetry scrubber, rendered as a framed status-bar module. Drag
// the value horizontally to change it (≈200px = full sweep); shift = fine,
// cmd/ctrl = coarse. Wheel steps one notch, double-click resets. Bipolar params
// (pitch) get a centre detent and fill from the middle out.
export default function Scrubber({
  label,
  value,
  format = (v) => String(v),
  min = 0,
  max = 100,
  step = 1,
  bipolar = false,
  trackWidth = 80,
  defaultValue = bipolar ? 0 : min,
  onChange,
  disabled = false,
}) {
  const drag = useRef(null);

  const snap = (v) => Math.max(min, Math.min(max, Math.round(v / step) * step));
  const sensitivity = (e) => {
    let s = (max - min) / 200; // ~200px sweeps the whole range
    if (e.shiftKey) s /= 10; // fine
    if (e.metaKey || e.ctrlKey) s *= 4; // coarse
    return s;
  };

  const onPointerDown = (e) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startVal: value };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    onChange(snap(drag.current.startVal + dx * sensitivity(e)));
  };
  const endDrag = (e) => {
    if (!drag.current) return;
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
  };
  const onWheel = (e) => {
    if (disabled) return;
    e.preventDefault();
    onChange(snap(value - Math.sign(e.deltaY) * step));
  };

  const pct = Math.max(0, Math.min(1, (value - min) / (max - min))) * 100;
  const zeroPct = Math.max(0, Math.min(1, (0 - min) / (max - min))) * 100; // value 0 position
  const fill = bipolar
    ? { left: `${Math.min(pct, zeroPct)}%`, width: `${Math.abs(pct - zeroPct)}%` }
    : { left: 0, width: `${pct}%` };

  return (
    <div
      className={`mod scrub${disabled ? " off" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={onWheel}
      onDoubleClick={() => !disabled && onChange(snap(defaultValue))}
      title={`${label} — drag to set · shift fine · ⌘ coarse · dbl-click resets`}
    >
      <span className="mod-label">{label}</span>
      <span className="scrub-val">{format(value)}</span>
      <span className="scrub-track" style={{ width: trackWidth }}>
        <span className="pip" style={{ left: 0 }} />
        <span className="pip" style={{ left: "50%" }} />
        <span className="pip" style={{ left: "100%" }} />
        {bipolar && <span className="detent" />}
        <span className="scrub-fill" style={fill} />
        <span className="scrub-thumb" style={{ left: `${pct}%` }} />
      </span>
      <span className="scrub-glyph">↔</span>
    </div>
  );
}
