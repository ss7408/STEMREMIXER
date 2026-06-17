// format.js — tiny display helpers so numbers read like an instrument.
export const fmtDb = (db) => `${db > 0 ? "+" : ""}${db.toFixed(1)}`;
export const fmtSemis = (s) => (s === 0 ? "0" : `${s > 0 ? "+" : ""}${s}`);
export const fmtPct = (n) => `${Math.round(n)}`;
export const fmtSec = (s) => `${s.toFixed(2)}s`;
