// src/utils/log.js
export function log(...args) {
  if (import.meta.env.DEV) console.log("[DEV]", ...args);
}
export function warn(...args) {
  if (import.meta.env.DEV) console.warn("[DEV]", ...args);
}
export function error(...args) {
  if (import.meta.env.DEV) console.error("[DEV]", ...args);
}