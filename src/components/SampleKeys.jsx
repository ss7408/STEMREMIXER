import { useState } from "react";
import { useStore } from "../state/store.js";
import { typeMeta } from "../lib/types.js";

// The deck: 8 playable slots. Tap to play; drag a slot to swap, or drop a
// Library sample in to assign it. Playing slots go inverse-video.
export default function SampleKeys() {
  const view = useStore((s) => s.view);
  const deck = useStore((s) => s.deck);
  const samples = useStore((s) => s.samples);
  const playing = useStore((s) => s.playing);
  const selectedId = useStore((s) => s.selectedId);
  const trigger = useStore((s) => s.trigger);
  const assignSlot = useStore((s) => s.assignSlot);
  const swapSlots = useStore((s) => s.swapSlots);
  const [hover, setHover] = useState(null);

  if (view !== "ready") {
    return (
      <div className="deck">
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="cell ghost" key={i} />
        ))}
      </div>
    );
  }

  const onDrop = (e, slot) => {
    e.preventDefault();
    setHover(null);
    try {
      const d = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (d.from === "lib") assignSlot(slot, d.id);
      else if (d.from === "deck") swapSlots(d.slot, slot);
    } catch (_) {}
  };

  return (
    <div className="deck">
      {deck.map((id, slot) => {
        const s = id ? samples.find((x) => x.id === id) : null;
        const tm = s ? typeMeta(s.detectedType) : null;
        const on = s ? !!playing[s.id] : false;
        const cls = [
          "cell",
          s ? "" : "empty",
          selectedId === id ? "sel" : "",
          on ? "on" : "",
          s && s.mute ? "muted" : "",
          hover === slot ? "drop" : "",
        ].join(" ");

        return (
          <button
            key={slot}
            className={cls}
            draggable={!!s}
            onDragStart={(e) => s && e.dataTransfer.setData("text/plain", JSON.stringify({ id: s.id, from: "deck", slot }))}
            onDragOver={(e) => { e.preventDefault(); setHover(slot); }}
            onDragLeave={() => setHover((h) => (h === slot ? null : h))}
            onDrop={(e) => onDrop(e, slot)}
            onClick={() => s && trigger(s.id)}
          >
            {s ? (
              <>
                <div className="cell-top">
                  <span className="cell-letter">[{tm.letter}]</span>
                  {on ? <span className="cell-stat">█</span> : <span className="cell-letter">{s.loop ? "∞" : "·"}</span>}
                </div>
                <div className="cell-name">{s.name}</div>
                <div className="cell-meta">{s.loop ? "LOOP" : "ONE"}{s.bpm ? ` ${s.bpm}` : ""}{s.mute ? " · MUTE" : ""}{s.solo ? " · SOLO" : ""}</div>
              </>
            ) : (
              <span className="cell-drop">DROP</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
