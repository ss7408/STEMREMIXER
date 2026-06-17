import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store.js";
import { engine } from "../audio/engine.js";
import { typeMeta } from "../lib/types.js";
import { keyShort } from "../audio/musicTheory.js";

// The keyboard shortcuts that fire each slot (Q W E R / A S D F), shown top-left.
const KEYCAPS = ["Q", "W", "E", "R", "A", "S", "D", "F"];

// The deck: 8 playable slots. Tap to play; drag a slot to swap, or drop a
// Library sample in to assign it. Playing slots go inverse-video and every cell
// carries its own playhead, so several simultaneously-playing samples each show
// their position at once.
export default function SampleKeys() {
  const deck = useStore((s) => s.deck);
  const samples = useStore((s) => s.samples);
  const playing = useStore((s) => s.playing);
  const selectedId = useStore((s) => s.selectedId);
  const trigger = useStore((s) => s.trigger);
  const assignSlot = useStore((s) => s.assignSlot);
  const swapSlots = useStore((s) => s.swapSlots);
  const [hover, setHover] = useState(null);
  const headRefs = useRef([]);

  // One rAF loop ticks every assigned cell's playhead.
  useEffect(() => {
    let raf;
    const tick = () => {
      for (let slot = 0; slot < deck.length; slot++) {
        const head = headRefs.current[slot];
        if (!head) continue;
        const id = deck[slot];
        if (id && playing[id]) {
          head.style.opacity = "1";
          head.style.left = `${engine.voicePosition(id) * 100}%`;
        } else {
          head.style.opacity = "0";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [deck, playing]);

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

        const metaText = s
          ? s.bpm
            ? `${s.bpm}${s.key ? " · " + keyShort(s.key).toUpperCase() : ""}`
            : "ONE-SH"
          : "";

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
            <div className="cell-top">
              <span className="cell-key">{KEYCAPS[slot]}</span>
              <span className="cell-letter">[{tm ? tm.letter : "—"}]</span>
            </div>
            {s ? (
              <>
                <div className="cell-name">{s.name}</div>
                <div className="cell-meta">{metaText}{s.mute ? " · MUTE" : ""}{s.solo ? " · SOLO" : ""}</div>
              </>
            ) : (
              <span className="cell-drop">EMPTY</span>
            )}
            <span className="cell-ph">
              <span className="cell-ph-head" ref={(el) => (headRefs.current[slot] = el)} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
