import React from "react";

export default function AdminStub({ onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          width: 400,
          textAlign: "center",
        }}
      >
        <h2>Admin Console (stub)</h2>
        <p style={{ marginTop: 12 }}>
          Placeholder settings area. Real logic coming in Phase 2.
        </p>
        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#f9fafb",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}