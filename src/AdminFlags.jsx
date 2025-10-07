// src/AdminFlags.jsx (no Tailwind needed)
import { useEffect, useState } from "react";
import { listFlags, setFlag, resetFlag, onFlagChange } from "./flags";

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const panelStyle = {
  width: "min(680px, 95vw)",
  borderRadius: "12px",
  background: "#fff",
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  padding: "16px",
  boxSizing: "border-box",
};

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "start",
  gap: "12px",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "10px 12px",
};

const smallBtn = {
  fontSize: "12px",
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
  padding: "6px 10px",
  background: "white",
  cursor: "pointer",
};

const badgeStyle = (bg, color="#111") => ({
  display: "inline-block",
  fontSize: 11,
  padding: "2px 6px",
  borderRadius: 999,
  background: bg,
  color,
});

export default function AdminFlags({ open, onClose }) {
  const [flags, setFlags] = useState(listFlags());

  useEffect(() => {
    setFlags(listFlags());
    const unsub = onFlagChange(() => setFlags(listFlags()));
    return unsub;
  }, []);

  if (!open) return null;

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true">
      <div style={panelStyle}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12}}>
          <h2 style={{margin: 0, fontSize: 18, fontWeight: 600}}>Feature Flags</h2>
          <button style={smallBtn} onClick={onClose} aria-label="Close">Close</button>
        </div>

        <div style={{display: "grid", gap: 10}}>
          {flags.map((f) => (
            <div key={f.name} style={rowStyle}>
              <div>
                <label style={{display: "inline-flex", alignItems: "center", gap: 8}}>
                  <input
                    type="checkbox"
                    checked={!!f.value}
                    onChange={(e) => setFlag(f.name, e.target.checked)}
                  />
                  <span style={{fontSize: 14, fontWeight: 600}}>{f.name}</span>
                </label>

                {f.description && (
                  <div style={{marginTop: 4, fontSize: 13, color: "#374151"}}>
                    {f.description}
                  </div>
                )}

                <div style={{marginTop: 6, display: "flex", gap: 8, alignItems: "center"}}>
                  <span style={badgeStyle(f.source === "local" ? "#e0f2fe" : "#f3f4f6")}>
                    source: {f.source}
                  </span>
                  <span style={{fontSize: 12, color: "#6b7280"}}>
                    env default: <code>{String(f.envDefault)}</code>
                  </span>
                </div>
              </div>

              <button
                style={smallBtn}
                onClick={() => resetFlag(f.name)}
                title="Revert to environment default"
              >
                Reset
              </button>
            </div>
          ))}
        </div>

        <div style={{marginTop: 10, fontSize: 12, color: "#6b7280"}}>
          Changes persist in <code>localStorage</code>. Use “Reset” to revert to your environment defaults.
        </div>
      </div>
    </div>
  );
}