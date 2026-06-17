import { useMemo } from "react";
import { resample } from "../lib/ascii.js";

// A waveform drawn entirely in characters. Mirrored around a centre line, with
// solid-to-light shading from the middle out so it reads like a real scope.
export default function AsciiWave({ data, rows = 13, cols = 58 }) {
  const ascii = useMemo(() => {
    const samp = resample(data, cols);
    const center = (rows - 1) / 2;
    const lines = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        const half = samp[c] * center;
        const dist = Math.abs(r - center);
        if (dist <= half + 0.0001 || (r === Math.round(center) && half < 0.5)) {
          const ratio = half > 0 ? dist / half : 0;
          line += ratio > 0.7 ? "░" : ratio > 0.38 ? "▒" : "█";
        } else {
          line += " ";
        }
      }
      lines.push(line);
    }
    return lines.join("\n");
  }, [data, rows, cols]);

  return <pre>{ascii}</pre>;
}
