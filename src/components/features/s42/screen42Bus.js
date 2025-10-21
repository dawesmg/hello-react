// Simple global event bus for Screen42 modal control

const OPEN = "screen42:open";
const CLOSE = "screen42:close";
const TOGGLE = "screen42:toggle";

export function openScreen42() {
  window.dispatchEvent(new CustomEvent(OPEN));
}

export function closeScreen42() {
  window.dispatchEvent(new CustomEvent(CLOSE));
}

export function toggleScreen42() {
  window.dispatchEvent(new CustomEvent(TOGGLE));
}

export const SCREEN42_EVENTS = { OPEN, CLOSE, TOGGLE };