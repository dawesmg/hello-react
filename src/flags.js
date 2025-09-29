// src/flags.js
// Tiny feature-flag helper: env defaults + localStorage overrides

const ENV = (import.meta?.env?.VITE_APP_ENV || 'dev').toLowerCase(); // 'dev' | 'preview' | 'prod'
const STORAGE_KEY = 'app.flags.v1';

/**
 * Define your flags here with default values per environment.
 * Add a brief description so the Admin modal can display helpful text.
 */
const FLAG_DEFS = {
  adminUi: {
    description: 'Show the Admin button & flags modal.',
    defaults: { dev: true, preview: true, prod: false },
  },
  evidenceHints: {
    description: 'Show evidence hints UI for users.',
    defaults: { dev: true, preview: true, prod: false },
  },
  // Add more flags here...
};

function safeParse(json, fallback = {}) {
  try { return JSON.parse(json) ?? fallback; } catch { return fallback; }
}

function loadOverrides() {
  if (typeof window === 'undefined') return {};
  return safeParse(localStorage.getItem(STORAGE_KEY), {});
}

function saveOverrides(overrides) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

function envDefault(flagName) {
  const def = FLAG_DEFS[flagName];
  if (!def) return false;
  const byEnv = def.defaults || {};
  return byEnv[ENV] ?? false;
}

function computeAll() {
  const overrides = loadOverrides();
  const result = {};
  for (const name of Object.keys(FLAG_DEFS)) {
    const value = (name in overrides) ? overrides[name] : envDefault(name);
    result[name] = {
      name,
      value,
      description: FLAG_DEFS[name].description || '',
      source: (name in overrides) ? 'local' : 'env',
    };
  }
  return result;
}

let listeners = new Set();

/** Public API */
export function getFlag(name) {
  const all = computeAll();
  return all[name]?.value ?? false;
}

export function setFlag(name, value) {
  if (!(name in FLAG_DEFS)) return;
  const overrides = loadOverrides();
  overrides[name] = Boolean(value);
  saveOverrides(overrides);
  // notify
  listeners.forEach((fn) => { try { fn(computeAll()); } catch {} });
}

export function resetFlag(name) {
  const overrides = loadOverrides();
  if (name in overrides) {
    delete overrides[name];
    saveOverrides(overrides);
    listeners.forEach((fn) => { try { fn(computeAll()); } catch {} });
  }
}

export function listFlags() {
  // returns array: [{ name, value, description, source }]
  return Object.values(computeAll());
}

export function subscribe(listener) {
  listeners.add(listener);
  // initial push
  try { listener(computeAll()); } catch {}
  return () => listeners.delete(listener);
}

// handy export if you need the current runtime env elsewhere
export const runtimeEnv = ENV;
