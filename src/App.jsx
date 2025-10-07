// src/App.jsx
import { useEffect, useState, lazy, Suspense } from "react";
import RTPB_AllRA from "./RTPB_AllRA";
import { getFlag, onFlagChange } from "./flags";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { logError } from "./logging";

// Lazy-loaded modals
const AdminFlags = lazy(() => import("./AdminFlags.jsx"));
const AdminStub  = lazy(() => import("./AdminStub.jsx")); // Phase 0.6 stub console

{getFlag("diseaseActivity") && (
  <button
    onClick={() => setShowDiseaseActivity(true)}
    style={{ marginLeft: "1em" }}
  >
    Disease Activity
  </button>
)}


// Gated helper UI (no Tailwind)
function EvidenceHintsBar() {
  if (!getFlag("evidenceHints")) return null;
  return (
    <div
      style={{
        margin: "16px 0",
        border: "1px solid #fcd34d",
        background: "#fffbeb",
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
      }}
    >
      💡 <strong>Evidence hints:</strong> Try hovering the treatment names to
      see guideline excerpts and citations.
    </div>
  );
}

// Env badge with color by environment
function EnvBadge() {
  if (!getFlag("showEnvBadge")) return null;
  const env = (import.meta.env.VITE_APP_ENV || "dev").toLowerCase();

  let style = {
    position: "fixed",
    right: 12,
    bottom: 12,
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid",
    zIndex: 9999,
  };

  if (env === "dev") {
    style = { ...style, background: "#dbeafe", borderColor: "#3b82f6", color: "#1e3a8a" };
  } else if (env === "preview") {
    style = { ...style, background: "#fef3c7", borderColor: "#f59e0b", color: "#92400e" };
  } else if (env === "prod") {
    style = { ...style, background: "#dcfce7", borderColor: "#16a34a", color: "#166534" };
  }

  return <div style={style}>{env.toUpperCase()}</div>;
}

// Button style keyed by env (matches badge palette)
function envButtonStyle() {
  const env = (import.meta.env.VITE_APP_ENV || "dev").toLowerCase();
  const base = {
    border: "1px solid",
    borderRadius: 12,
    padding: "6px 12px",
    fontSize: 14,
    background: "white",
    cursor: "pointer",
  };
  if (env === "dev")     return { ...base, borderColor: "#3b82f6", color: "#1e3a8a" };
  if (env === "preview") return { ...base, borderColor: "#f59e0b", color: "#92400e" };
  if (env === "prod")    return { ...base, borderColor: "#16a34a", color: "#166534" };
  return base;
}

export default function App() {
  // Feature Flags modal (existing)
  const [showAdmin, setShowAdmin] = useState(false);
  // Admin Console stub (Phase 0.6)
  const [showAdminStub, setShowAdminStub] = useState(false);
  // Re-render when any flag changes
  const [, forceRerender] = useState(0);

  useEffect(() => {
    const unsubscribe = onFlagChange(() => {
      forceRerender((x) => x + 1);
    });
    return unsubscribe;
  }, []);

  // Optional: global error listeners (helps catch async errors)
  useEffect(() => {
    const onErr = (event) => logError(event.error || event.message, { where: "window.onerror" });
    const onRej = (event) => logError(event.reason || "unhandledrejection", { where: "window.onunhandledrejection" });
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  const showFlagsButton   = getFlag("adminUi");       // Phase 0 flags panel
  const showConsoleButton = getFlag("adminConsole");  // Phase 0.6 admin console stub

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#111827" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 16px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          GenXys – RA Decision Support
        </h1>

        <div style={{ display: "flex", gap: 8 }}>
          {showFlagsButton && (
            <button
              onClick={() => setShowAdmin(true)}
              title="Open Feature Flags"
              style={envButtonStyle()}
            >
              Flags
            </button>
          )}
          {showConsoleButton && (
            <button
              onClick={() => setShowAdminStub(true)}
              title="Open Admin Console (stub)"
              style={envButtonStyle()}
            >
              Console
            </button>
          )}
        </div>
      </header>

      {/* Gated helper UI */}
      <div style={{ padding: "0 16px" }}>
        <EvidenceHintsBar />
      </div>

      {/* Main content (protected) */}
      <main style={{ padding: "24px 16px" }}>
        <ErrorBoundary
          onError={(err, info) => logError(err, { where: "RTPB_AllRA", ...info })}
          fallback={({ error, reset }) => (
            <div
              style={{
                padding: 16,
                border: "1px solid #fee2e2",
                background: "#fef2f2",
                borderRadius: 10,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                We couldn’t render this view.
              </div>
              <div style={{ fontSize: 13, color: "#7f1d1d", marginBottom: 8 }}>
                {error?.message || String(error)}
              </div>
              <button
                onClick={reset}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                  background: "white",
                }}
              >
                Try again
              </button>
            </div>
          )}
        >
          <RTPB_AllRA />
        </ErrorBoundary>
      </main>

      {/* Modals (lazy-loaded) */}
      <Suspense fallback={null}>
        <AdminFlags open={showAdmin} onClose={() => setShowAdmin(false)} />
      </Suspense>

      <Suspense fallback={null}>
        {showAdminStub && <AdminStub onClose={() => setShowAdminStub(false)} />}
      </Suspense>

      {/* Environment badge */}
      <EnvBadge />
    </div>
  );
}