// src/components/Evidence.jsx
import React, { useState } from "react";
import EVIDENCE from "../data/evidence_biosimilars";

// Tiny modal
function Modal({ title, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "grid", placeItems: "center", padding: 16, zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, maxWidth: 760, width: "100%", padding: 16 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>{title}</div>
          <button
            onClick={onClose}
            style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 8px", background: "#fff", cursor: "pointer", fontSize: 12 }}
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Evidence() {
  const [openKey, setOpenKey] = useState(null);        // e.g., "copay"
  const [showDetail, setShowDetail] = useState(false);  // toggle detail visibility

  // Safely resolve the selected evidence node
  const open = (openKey && EVIDENCE && EVIDENCE[openKey]) || null;

  // Safe primitives/collections
  const title      = open?.title || "Evidence";
  const points     = Array.isArray(open?.points) ? open.points : [];
  const references = Array.isArray(open?.references) ? open.references : [];
  const detailHtml = typeof open?.detailHtml === "string" ? open.detailHtml : "";

  const hasDetail  = detailHtml.trim().length > 0;

  // Example: whether the “copay” evidence exists at all
  const hasCopay = Boolean(EVIDENCE?.copay);

  return (
    <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Five reasons to use biosimilars</div>

      {/* One reason wired up: Lower copays support adherence */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 600 }}>Lower copays support adherence</div>
         <button
  onClick={() => hasCopay && setOpenKey("copay")}
  disabled={!hasCopay}
  style={{
    border: "1px solid #334155",
    background: hasCopay ? "#334155" : "#f1f5f9",
    color: hasCopay ? "#fff" : "#64748b",
    borderRadius: 999,
    padding: "6px 10px",
    cursor: hasCopay ? "pointer" : "not-allowed",
    fontSize: 12
  }}
  title={hasCopay ? "Open evidence" : "No evidence available"}
>
  Evidence
</button>

        </div>
        <div style={{ fontSize: 13, color: "#334155", marginTop: 6 }}>
          Reduced monthly copays ease financial burden.<br />
          Better adherence/persistence in practice.
        </div>
        <div style={{ marginTop: 8 }}>
          <button
  onClick={() => hasCopay && setOpenKey("copay")}
  disabled={!hasCopay}
  style={{
    border: "1px solid #334155",
    background: hasCopay ? "#334155" : "#f1f5f9",
    color: hasCopay ? "#fff" : "#64748b",
    borderRadius: 999,
    padding: "6px 10px",
    cursor: hasCopay ? "pointer" : "not-allowed",
    fontSize: 12
  }}
  title={hasCopay ? "Open evidence" : "No evidence available"}
>
  Evidence
</button>
        </div>
      </div>

      {/* Modal populated from EVIDENCE */}
    {open && (
  <Modal title={`Evidence — ${title}`} onClose={() => { setOpenKey(null); setShowDetail(false); }}>
    <div style={{ display: "grid", gap: 12 }}>
      {/* Actions row (More detail toggle) */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={() => hasDetail && setShowDetail((v) => !v)}
          disabled={!hasDetail}
          style={{
            border: "1px solid #334155",
            background: hasDetail ? "#334155" : "#f1f5f9",
            color: hasDetail ? "#fff" : "#64748b",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: hasDetail ? "pointer" : "not-allowed",
            fontSize: 12
          }}
          title={hasDetail ? "Show more detail" : "No additional detail available"}
        >
          {showDetail ? "Hide detail" : "More detail"}
        </button>
      </div>

      {/* Key points (safe) */}
      {points.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Key points</div>
          <ul style={{ marginLeft: 18 }}>
            {points.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}

      {/* Details (toggle + safe) */}
      {showDetail && hasDetail && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Details</div>
          <div
            style={{ fontSize: 14, color: "#334155" }}
            dangerouslySetInnerHTML={{ __html: detailHtml }}
          />
        </div>
      )}

      {/* References (safe) */}
      {references.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>References</div>
          <ol style={{ marginLeft: 18 }}>
            {references.map((r, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <div>{r?.label ?? "—"}</div>
                {r?.url && (
                  <div>
                    <a href={r.url} target="_blank" rel="noreferrer">{r.url}</a>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  </Modal>
)}
    </section>
  );
}