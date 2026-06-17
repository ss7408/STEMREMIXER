import { useRef } from "react";
import { meter } from "../lib/ascii.js";

// An ASCII fader: [███████░░░░░]. Drag horizontally (or scroll) to set; the
// click position maps straight to the value. Double-click resets.
export default function AsciiBar({
  label,
  value,
  min = 0,
  max = 1,
  defaultValue = min,
  onChange,
  format = (v) => `${v}`,
  width = 12,
}) {
  const barRef = useRef(null);
  const dragging = useRef(false);
  const norm = (value - min) / (max - min);

  const fromClientX = (x) => {
    const el = barRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const n = Math.max(0, Math.min(1, (x - r.left) / r.width));
    onChange(min + n * (max - min));
  };

  return (
    <div className="fader">
      <div className="fader-top">
        <span>{label}</span>
        <span className="v">{format(value)}</span>
      </div>
      <div
        className="fader-bar"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragging.current = true;
          fromClientX(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && fromClientX(e.clientX)}
        onPointerUp={(e) => {
          dragging.current = false;
          try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
        }}
        onWheel={(e) => {
          e.preventDefault();
          const n = Math.max(0, Math.min(1, norm - Math.sign(e.deltaY) * 0.05));
          onChange(min + n * (max - min));
        }}
        onDoubleClick={() => onChange(defaultValue)}
      >
        <span className="lead">[</span>
        <span ref={barRef}>{meter(norm, width)}</span>
        <span className="lead">]</span>
      </div>
    </div>
  );
}
