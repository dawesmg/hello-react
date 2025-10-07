// Simple client-side logger with environment awareness
const ENV = (import.meta?.env?.VITE_APP_ENV || "dev").toLowerCase();

export function logError(err, info = {}) {
  const payload = {
    env: ENV,
    message: err?.message || String(err),
    name: err?.name || "Error",
    stack: err?.stack || null,
    ...info,
    time: new Date().toISOString(),
  };

  // Dev/preview: log to console. Prod: keep silent or send to endpoint.
  if (ENV === "prod") {
    // TODO: send to your endpoint / Sentry / etc.
    // fetch("/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
  } else {
    // eslint-disable-next-line no-console
    console.error("[Error]", payload);
  }
}