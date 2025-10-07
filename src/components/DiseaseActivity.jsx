// src/DiseaseActivity.jsx
import React, { useState } from "react";

// Tiny in-file modal to match your style (click backdrop to close)
function Modal({ title, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          maxWidth: 760,
          width: "100%",
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 600 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "4px 8px",
              background: "#fff",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Replace ONLY this component in DiseaseActivity.jsx
function QuickDiseaseInput({ onSelect }) {
  // Immediate-select via dropdown OR one-click buttons
  return (
    <div>
      <label>
        Choose Disease Activity:{" "}
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) onSelect(v); // parent will close the modal
          }}
          style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 8px" }}
        >
          <option value="">-- Select --</option>
          <option value="low">Low</option>
          <option value="moderate">Moderate</option>
          <option value="high">High</option>
        </select>
      </label>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => onSelect("low")}
          style={{
            border: "1px solid #86efac",
            background: "#dcfce7",
            color: "#065f46",
            borderRadius: 10,
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: 12,
          }}
          title="Low disease activity"
        >
          Low
        </button>

        <button
          onClick={() => onSelect("moderate")}
          style={{
            border: "1px solid #fde68a",
            background: "#fef9c3",
            color: "#7c6f06",
            borderRadius: 10,
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: 12,
          }}
          title="Moderate disease activity"
        >
          Moderate
        </button>

        <button
          onClick={() => onSelect("high")}
          style={{
            border: "1px solid #fecaca",
            background: "#fee2e2",
            color: "#7f1d1d",
            borderRadius: 10,
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: 12,
          }}
          title="High disease activity"
        >
          High
        </button>
      </div>
    </div>
  );
}

// Placeholder you can expand with CDAI/SDAI/DAS28/RAPID3/PAS-II later
function DiseaseCalculator() {
  return (
    <div style={{ fontSize: 14, color: "#334155" }}>
      Calculator coming soon: CDAI, SDAI, DAS28, RAPID3, PAS-II.
    </div>
  );
}

export default function DiseaseActivity({ onClose, onQuickSelect }) {
  const [mode, setMode] = useState(null);

  return (
    <Modal title="Disease Activity" onClose={onClose}>
      {!mode ? (
        <div style={{ display: "grid", gap: 10 }}>
          <button
            onClick={() => setMode("quick")}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: 10,
              padding: "10px 12px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            Quick Input (Low / Moderate / High)
          </button>
          <button
            onClick={() => setMode("calculate")}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: 10,
              padding: "10px 12px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            Calculate Disease Activity (CDAI/SDAI/DAS28/RAPID3/PAS-II)
          </button>
        </div>
      ) : mode === "quick" ? (
        <div>
          <QuickDiseaseInput
            onSelect={(level) => {
              // Notify parent and close
              onQuickSelect && onQuickSelect(level);
              onClose && onClose();
            }}
          />
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => setMode(null)}
              style={{
                border: "1px solid #e5e7eb",
                background: "#fff",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div>
          <DiseaseCalculator />
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => setMode(null)}
              style={{
                border: "1px solid #e5e7eb",
                background: "#fff",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}