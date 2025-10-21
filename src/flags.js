// src/flags.js
// Feature flags with env defaults, localStorage overrides, and descriptions.

const ENV = (import.meta?.env?.VITE_APP_ENV || "dev").toLowerCase(); // dev | preview | prod
const STORAGE_KEY = "app.flags.v1";


// Define flags here
const FLAG_DEFS = {
  adminUi: {
    description: "Show the Admin button to open this flags panel.",
    defaults: { dev: true, preview: true, prod: false },
  },
  evidenceHints: {
    description:
      "Display the yellow ‘Evidence hints’ helper bar for clinicians.",
    defaults: { dev: true, preview: false, prod: false },
  },
  showEnvBadge: {
    description: "Show a small DEV/PREVIEW badge to avoid prod confusion.",
    defaults: { dev: true, preview: true, prod: false },
  },
  adminConsole: {
  description: "Show Admin Console stub modal (Phase 0.6 placeholder).",
  defaults: { dev: true, preview: false, prod: false },
},

screen42: {
  description: "Show Screen 42 (debug modal for RA EMR snapshot)",
  // ON in dev/preview, OFF in prod by default
  defaults: { dev: true, preview: true, prod: false },
},
 screen42RA: {
  description: "Screen42: use RA schema + RA demo bundle",
  defaults: { dev: true,  preview: false, prod: false },
},
screen42T2D: {
  description: "Screen42: use T2D schema + T2D demo bundle",
  defaults: { dev: false, preview: false, prod: false },
},
screen42HTN: {
  description: "Screen42: use HTN schema + HTN demo bundle",
  defaults: { dev: false, preview: false, prod: false },
},
screen42DEP: {
  description: "Screen42: use DEP schema + DEP demo bundle",
  defaults: { dev: false, preview: false, prod: false },
},
};

function safeParse(str, fb = {}) {
  try { return JSON.parse(str) ?? fb; } catch { return fb; }
}
function loadOverrides() {
  if (typeof window === "undefined") return {};
  return safeParse(localStorage.getItem(STORAGE_KEY), {});
}
function saveOverrides(overrides) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}
function envDefault(name) {
  const def = FLAG_DEFS[name];
  if (!def) return false;
  return def.defaults?.[ENV] ?? false;
}

let listeners = [];

// Public API
export function getFlag(name) {
  const overrides = loadOverrides();
  return (name in overrides) ? !!overrides[name] : envDefault(name);
}

export function setFlag(name, value) {
  if (!(name in FLAG_DEFS)) return;
  const overrides = loadOverrides();
  overrides[name] = !!value;
  saveOverrides(overrides);
  listeners.forEach((cb) => { try { cb(name, !!value); } catch {} });
}

export function resetFlag(name) {
  const overrides = loadOverrides();
  if (name in overrides) {
    delete overrides[name];
    saveOverrides(overrides);
    listeners.forEach((cb) => { try { cb(name, getFlag(name)); } catch {} });
  }
}

export function onFlagChange(cb) {
  listeners.push(cb);
  return () => { listeners = listeners.filter((x) => x !== cb); };
}

/** Returns array of { name, value, description, source, envDefault } */
export function listFlags() {
  const overrides = loadOverrides();
  return Object.keys(FLAG_DEFS).map((name) => {
    const value = (name in overrides) ? !!overrides[name] : envDefault(name);
    const source = (name in overrides) ? "local" : "env";
    return {
      name,
      value,
      description: FLAG_DEFS[name].description || "",
      source,
      envDefault: envDefault(name),
    };
  });
}