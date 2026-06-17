import { useRef, useState } from "react";
import { useStore } from "../state/store.js";
import { typeMeta } from "../lib/types.js";

// The side bin: every loaded sample. Drag a row onto a Deck slot to arrange it.
// Click to load it on the screen. M / S mute and solo. "+ ADD" (or dropping
// files here) appends more samples to the session.
export default function Library() {
  const samples = useStore((s) => s.samples);
  const selectedId = useStore((s) => s.selectedId);
  const playing = useStore((s) => s.playing);
  const select = useStore((s) => s.select);
  const toggleMute = useStore((s) => s.toggleMute);
  const toggleSolo = useStore((s) => s.toggleSolo);
  const addFiles = useStore((s) => s.addFiles);
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  return (
    <div
      className={`lib-list${over ? " filedrop" : ""}`}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes("Files")) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (e.dataTransfer.files?.length) {
          e.preventDefault();
          setOver(false);
          addFiles(e.dataTransfer.files);
        }
      }}
    >
      <button className="lib-add" onClick={() => inputRef.current?.click()}>+ ADD FILES</button>

      {samples.map((s) => {
        const tm = typeMeta(s.detectedType);
        const on = !!playing[s.id];
        return (
          <div
            key={s.id}
            className={`lib-row${selectedId === s.id ? " sel" : ""}${on ? " on" : ""}${s.mute ? " muted" : ""}${s.solo ? " solo" : ""}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", JSON.stringify({ id: s.id, from: "lib" }));
              e.dataTransfer.effectAllowed = "copyMove";
            }}
            onClick={() => select(s.id)}
            title="Drag onto a deck slot"
          >
            <span className="lib-letter">[{tm.letter}]</span>
            <span className="lib-name">{s.name}</span>
            <span className="lib-ms">
              <button className={`ms m${s.mute ? " on" : ""}`} onClick={(e) => { e.stopPropagation(); toggleMute(s.id); }} title={s.mute ? "Muted — click to unmute" : "Mute this sample"} aria-pressed={s.mute}>M</button>
              <button className={`ms s${s.solo ? " on" : ""}`} onClick={(e) => { e.stopPropagation(); toggleSolo(s.id); }} title={s.solo ? "Soloed — click to clear" : "Solo this sample"} aria-pressed={s.solo}>S</button>
            </span>
          </div>
        );
      })}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="audio/*"
        hidden
        onChange={(e) => { if (e.target.files?.length) { addFiles(e.target.files); e.target.value = ""; } }}
      />
    </div>
  );
}
