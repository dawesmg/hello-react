// src/RTPB_AllRA.jsx
import React, { useMemo, useState } from "react";
import raw from "./data/ra_all_drugs_enriched.json";

/* =========================================
   Data shaping from JSON
========================================= */
const ORIGINATORS = (raw.originators || []).map(o => ({
  generic: o.originator_generic,
  brand: o.originator_brand,
  dmard_class: o.dmard_class || "",
  moa: o.moa || "",
  route: o.route || "",
  regimen: o.regimen || "",
  starting_dose: o.starting_dose || "",
  maintenance_dose: o.maintenance_dose || "",
  dose_units: o.dose_units || "",
  monograph_url: o.monograph_url || "",
  biosimilars: Array.isArray(o.biosimilars) ? o.biosimilars : [],
  has_biosimilars: !!o.has_biosimilars,
  biosimilar_count: o.biosimilar_count ?? 0,
  warnings: o.warnings || undefined,
  contraindications: o.contraindications || undefined,
  indications: Array.isArray(o.indications) ? o.indications : undefined,
  originator: o
}));
const CLASS_MAP = raw.classes || {};

/* =========================================
   UI atoms
========================================= */
function Pill({ children, kind = "default" }) {
  const styles = {
    default:   { background: "#eef2ff", color: "#1e1b4b", border: "1px solid #c7d2fe" },
    secondary: { background: "#f1f5f9", color: "#0f172a", border: "1px solid #e2e8f0" },
    danger:    { background: "#fee2e2", color: "#7f1d1d", border: "1px solid #fecaca" },
  }[kind];
  return (
    <span style={{ ...styles, fontSize: 12, borderRadius: 999, padding: "3px 8px", display: "inline-block" }}>
      {children}
    </span>
  );
}

function Modal({ onClose, children, title }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "grid", placeItems: "center", padding: 16, zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, maxWidth: 720, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 8px", background: "#fff", cursor: "pointer" }}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* =========================================
   Reasons content (concise UI copy)
========================================= */
const BIOSIMILAR_REASONS = [
  { key: "equivalence", title: "Proven clinical equivalence", bullets: [
      "Trials & meta-analyses show equivalent efficacy/immunogenicity.",
      "Comparable safety in post-marketing studies.",
      "Switching is reasonable with follow-up for flares."
  ]},
  { key: "cost", title: "Cost savings for patients & system", bullets: [
      "Lower acquisition cost versus originators.",
      "Often lower patient out-of-pocket costs.",
      "Savings can expand access and earlier use."
  ]},
  { key: "pa", title: "Fewer PA barriers, faster starts", bullets: [
      "Payer alignment/transition programs reduce delays.",
      "High persistence observed after transitions.",
      "Less admin friction → quicker initiation."
  ]},
  { key: "copay", title: "Lower copays support adherence", bullets: [
      "Reduced monthly copays ease financial burden.",
      "Better adherence/persistence in practice."
  ]},
  { key: "realworld", title: "Real-world effectiveness can improve", bullets: [
      "Lower cost + easier access → better adherence.",
      "Outcomes may improve despite trial equivalence.",
      "Patient education minimizes nocebo effects."
  ]},
];

/* =========================================
   Helpers (finders, safety, RTPB mock, indications, display)
========================================= */
function findOriginator(generic, brand) {
  const g = (generic || "").toLowerCase();
  const b = (brand || "").toLowerCase();
  return ORIGINATORS.find(o =>
    (o.generic || "").toLowerCase() === g &&
    (o.brand || "").toLowerCase() === b
  ) || null;
}

function extractSafety(obj) {
  if (!obj) return { warns: [], contras: [] };
  const warnObj = obj.warnings || {};
  const contraObj = obj.contraindications || {};
  const tidy = (k) => String(k).replace(/^(Warn_|Contra_)/, "").replace(/_/g, " ").trim();
  const yes = (v) => v === "Y" || v === true || v === "Yes";

  const warns = Object.entries(warnObj).filter(([, v]) => yes(v)).map(([k]) => tidy(k));
  const contras = Object.entries(contraObj).filter(([, v]) => yes(v)).map(([k]) => tidy(k));

  const topWarns = Object.entries(obj).filter(([k, v]) => k.startsWith("Warn_") && yes(v)).map(([k]) => tidy(k));
  const topContras = Object.entries(obj).filter(([k, v]) => k.startsWith("Contra_") && yes(v)).map(([k]) => tidy(k));

  return { warns: [...new Set([...warns, ...topWarns])], contras: [...new Set([...contras, ...topContras])] };
}

function Likelihood({ value }) {
  const map = {
    High: <Pill>High</Pill>,
    Medium: <Pill kind="secondary">Medium</Pill>,
    Low: <Pill kind="danger">Low</Pill>,
  };
  return map[value] || <span>-</span>;
}

function simulateRTPBCheck(item) {
  const hasBios = !!item.has_biosimilars;
  const isIV = (item.route || "").toLowerCase().includes("iv");
  const isTNFi = (item.dmard_class || "").toLowerCase().includes("tnf");
  const baseCost = isIV ? 180 : 90;

  let likelihood = hasBios ? "High" : "Medium";
  if (isIV) likelihood = "Medium";

  const flags = {
    pa: true,
    stepTherapy: hasBios && isTNFi,
    quantityLimit: Math.random() > 0.5,
    specialtyPharmacy: !isIV && Math.random() > 0.4,
  };

  const requirements = [
    "Dx code (ICD-10): RA (M05/M06), HS (L73.2) as applicable",
    "Prior therapies: NSAID + csDMARD (e.g., methotrexate) with dates/outcomes",
    "TB/HBV screening results and dates",
    flags.quantityLimit ? "Requested quantity & days’ supply within plan limits" : null,
    flags.stepTherapy ? "Documented trial of plan-preferred biosimilar" : null,
    isIV ? "Site-of-care authorization (infusion center/hospital outpatient)" : null
  ].filter(Boolean);

  const patientCost = Number((baseCost + (Math.random() * 70 - 20)).toFixed(2));

  return {
    brand: item.brand || item.generic,
    likelihood,
    patientCost,
    flags,
    requirements
  };
}

// Indications per product (reads JSON if present; fallback for Humira demo)
function getIndications(item) {
  if (!item) return [];
  const fromJson = item?.indications || item?.originator?.indications;
  if (Array.isArray(fromJson) && fromJson.length) return fromJson;

  const g = (item.generic || "").toLowerCase();
  const b = (item.brand || "").toLowerCase();
  if (g === "adalimumab" || b === "humira") {
    return [
      "Rheumatoid arthritis",
      "Psoriatic arthritis",
      "Ankylosing spondylitis (axSpA)",
      "Crohn’s disease",
      "Ulcerative colitis",
      "Hidradenitis suppurativa",
      "Uveitis",
      "Plaque psoriasis",
      "Juvenile idiopathic arthritis"
    ];
  }
  return ["Rheumatoid arthritis"];
}

// Title-case helper (for fallback brand display)
function toTitleCase(s = "") {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// Always display the user's actual selection (biosimilar stays visible)
// IMPORTANT: If a biosimilar is selected and it lacks a brand, we DO NOT fall back to the reference brand.
function getDisplay(selection) {
  if (!selection) return { brand: "", generic: "" };

  const isBiosim = !!selection._isBiosimilar;

  // Prefer the explicit fields from the selection
  const generic = selection.generic
    || selection._referenceGeneric
    || selection.originator?.originator_generic
    || selection.originator?.generic
    || "";

  let brand = selection.brand || "";

  // If this is a biosimilar and brand is missing, DO NOT fall back to reference brand.
  // Instead, use a friendly brand from the generic (title-cased), or leave blank.
  if (isBiosim && !brand) {
    brand = generic ? toTitleCase(generic) : "";
  }

  // For reference products (not biosimilars), allow normal fallbacks.
  if (!isBiosim && !brand) {
    brand =
      selection._referenceBrand ||
      selection.originator?.originator_brand ||
      selection.originator?.brand ||
      "";
  }

  return { brand, generic };
}

/* =========================================
   Class-mates panel
========================================= */
function ClassMatesPanel({ selection, onOpenBiosimilars }) {
  if (!selection?.originator?.dmard_class) return null;
  const cls = selection.originator.dmard_class;
  const mates = (CLASS_MAP[cls] || []).filter(
    x => (x.generic !== selection.generic || x.brand !== selection.brand)
  );
  if (!mates.length) return null;

  return (
    <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, background: "#fff" }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        Alternatives in class — <span style={{ color: "#334155" }}>{cls}</span>
      </div>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {mates.map(m => (
          <div key={`${m.generic}|${m.brand}`} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{m.generic}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{m.brand || "—"}</div>
              </div>
              {m.has_biosimilars ? (
                <button
                  onClick={() => onOpenBiosimilars(m)}
                  title="View biosimilars"
                  style={{ border: "1px solid #c7d2fe", background: "#eef2ff", color: "#1e1b4b",
                           borderRadius: 999, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}
                >
                  Biosimilars: {m.biosimilar_count ?? 0}
                </button>
              ) : (
                <Pill kind="secondary">No biosimilars</Pill>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =========================================
   Main component
========================================= */
export default function RTPB_AllRA() {
  // view state
  const [mode, setMode] = useState("main"); // "main" | "rx" | "ended"

  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(null);
  const [biosFor, setBiosFor] = useState(null);
  const [reasonsOpen, setReasonsOpen] = useState(false);
  const [activeReason, setActiveReason] = useState(null);
  const [showAllReasons, setShowAllReasons] = useState(false);
  const [rtpb, setRtpb] = useState(null);
  const [rtpbLoading, setRtpbLoading] = useState(false);
  const [disease, setDisease] = useState(null);

  // Build search index
  const INDEX = useMemo(() => {
    return ORIGINATORS.map(o => ({
      ...o,
      _key: `${(o.generic || "").toLowerCase()} ${(o.brand || "").toLowerCase()}`
    }));
  }, []);

  const suggestions = useMemo(() => {
    const q = (query || "").toLowerCase().trim();
    const cap = 20;
    if (!q) return [];
    const starts = [];
    const contains = [];
    for (const row of INDEX) {
      if (
        row._key.startsWith(q) ||
        (row.generic || "").toLowerCase().startsWith(q) ||
        (row.brand || "").toLowerCase().startsWith(q)
      ) {
        starts.push(row);
      } else if (row._key.includes(q)) {
        contains.push(row);
      }
      if (starts.length + contains.length >= 200) break;
    }
    return [...starts, ...contains].slice(0, cap);
  }, [query, INDEX]);

  const page = { padding: 24, fontFamily: "system-ui, -apple-system, Arial" };
  const card = { border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, background: "#fff" };

  // helpers to navigate/clear
  function resetAll() {
    setMode("main");
    setQuery("");
    setSelection(null);
    setBiosFor(null);
    setReasonsOpen(false);
    setActiveReason(null);
    setShowAllReasons(false);
    setRtpb(null);
    setRtpbLoading(false);
    setDisease(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSelect(item) {
    setSelection(item);
    setRtpb(null);
    setDisease(null);
  }

  function selectCustomDrug(name) {
    const label = (name || "").trim();
    if (!label) return;
    setSelection({
      generic: label,
      brand: "",
      dmard_class: "",
      moa: "",
      route: "",
      regimen: "",
      starting_dose: "",
      maintenance_dose: "",
      dose_units: "",
      monograph_url: "",
      has_biosimilars: false,
      biosimilar_count: 0,
      indications: ["Rheumatoid arthritis"],
      originator: { source: "custom" },
      _custom: true,
      _message: "Drug not in current CDSS but will be added to next version."
    });
    setBiosFor(null);
    setRtpb(null);
    setDisease(null);
  }

  function openBiosimilarsFor(item) {
    const full = findOriginator(item.generic, item.brand);
    const list = full?.originator?.biosimilars || [];
    setBiosFor({ generic: item.generic, brand: item.brand, list, parent: full });
  }

  // ---- KEY FIX: keep biosimilar sticky in selection; never fall back to Humira for display
  function selectBiosimilar(b) {
  if (!biosFor?.parent) return;
  const parent = biosFor.parent;
  const rawParent = parent.originator || {};

  const synthetic = {
    generic: b.biosimilar_generic || parent.generic || "",
    // If brand missing in JSON, derive from generic (title-case) so we never fall back to Humira
    brand: b.biosimilar_brand || (b.biosimilar_generic ? b.biosimilar_generic.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()) : ""),

    dmard_class: rawParent.dmard_class || parent.dmard_class || "",
    moa: rawParent.moa || parent.moa || "",
    route: b.route || rawParent.route || parent.route || "",
    regimen: b.regimen || "",
    starting_dose: b.starting_dose || "",
    maintenance_dose: b.maintenance_dose || "",
    dose_units: b.dose_units || "",
    monograph_url: "",

    has_biosimilars: false,
    biosimilar_count: 0,

    indications: rawParent.indications || ["Rheumatoid arthritis"],
    originator: {
      dmard_class: rawParent.dmard_class,
      moa: rawParent.moa,
      route: rawParent.route,
      warnings: rawParent.warnings || parent.warnings || {},
      contraindications: rawParent.contraindications || parent.contraindications || {}
    },

    _isBiosimilar: true,
    _referenceBrand: parent.brand || "",
    _referenceGeneric: parent.generic || "",
    // 🔒 hard lock the names used by the UI
    _displayLock: {
      brand: b.biosimilar_brand || (b.biosimilar_generic ? b.biosimilar_generic.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()) : ""),
      generic: b.biosimilar_generic || parent.generic || ""
    }
  };

  console.log("DEBUG selectBiosimilar →", synthetic.brand, synthetic.generic);
  setSelection(synthetic);
  setBiosFor(null);
  setRtpb(null);
  setQuery("");          // ← clear the search box so nothing re-highlights Humira
  // keep disease as-is (don’t clear)
  setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
}

  function openReasons() {
    setActiveReason(null);
    setShowAllReasons(false);
    setReasonsOpen(true);
  }

  // ----- RX view payload (summary) -----
  const rxSummary = useMemo(() => {
    if (!selection) return null;
    const { brand: displayBrand, generic: displayGeneric } = getDisplay(selection);
    return {
      date: new Date().toLocaleString(),
      disease: disease || "—",
      generic: displayGeneric || "—",
      brand: displayBrand || "—",
      class: selection.dmard_class || "—",
      moa: selection.moa || "—",
      route: selection.route || "—",
      regimen: selection.regimen || "—",
      dose: `${selection.starting_dose || "—"} ${selection.dose_units || ""} → ${selection.maintenance_dose || "—"} ${selection.dose_units || ""}`.replace(/\s+/g," ").trim(),
      monograph: selection.monograph_url || "",
      rtpb: rtpb ? {
        likelihood: rtpb.likelihood,
        cost: rtpb.patientCost,
        flags: rtpb.flags,
        requirements: rtpb.requirements
      } : null
    };
  }, [selection, disease, rtpb]);

  // ----- Ended screen -----
  if (mode === "ended") {
    return (
      <div style={{ ...page, display: "grid", placeItems: "center", height: "100vh" }}>
        <div style={{ ...card, maxWidth: 560, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Program ended</div>
          <div style={{ color: "#475569", marginBottom: 16 }}>
            Printing complete. Refresh the page to restart the demo, or choose an action below.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={resetAll} style={{ border: "1px solid #059669", background: "#059669", color: "#fff", borderRadius: 10, padding: "8px 12px", cursor: "pointer" }}>
              Start over
            </button>
            <button onClick={() => window.location.reload()} style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 10, padding: "8px 12px", cursor: "pointer" }}>
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----- RX page -----
  if (mode === "rx") {
    return (
      <div style={page}>
        <header style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 600 }}>Prescription (Demo)</div>
          <div style={{ fontSize: 13, color: "#334155" }}>
            This page is a static preview for demo purposes only.
          </div>
        </header>

        <section style={{ ...card, marginBottom: 12 }}>
          {rxSummary ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><strong>Date/time:</strong> {rxSummary.date}</div>
              <div><strong>Disease:</strong> {rxSummary.disease}</div>
              <div><strong>Generic:</strong> {rxSummary.generic}</div>
              <div><strong>Brand:</strong> {rxSummary.brand}</div>
              <div><strong>Class:</strong> {rxSummary.class}</div>
              <div><strong>MoA:</strong> {rxSummary.moa}</div>
              <div><strong>Route:</strong> {rxSummary.route}</div>
              <div><strong>Regimen:</strong> {rxSummary.regimen}</div>
              <div style={{ gridColumn: "1 / -1" }}>
                <strong>Dose (start → maint):</strong> {rxSummary.dose}
              </div>
              {rxSummary.monograph && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <strong>Monograph:</strong>{" "}
                  <a href={rxSummary.monograph} target="_blank" rel="noreferrer">{rxSummary.monograph}</a>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: "#64748b" }}>No selection found.</div>
          )}
        </section>

        {rxSummary?.rtpb && (
          <section style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Benefit (Simulated)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Approval likelihood</div>
                <div><Likelihood value={rxSummary.rtpb.likelihood} /></div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Estimated patient cost</div>
                <div><strong>${rxSummary.rtpb.cost.toFixed(2)}</strong></div>
              </div>
            </div>
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {rxSummary.rtpb.flags.pa && <Pill kind="secondary">PA likely</Pill>}
              {rxSummary.rtpb.flags.stepTherapy && <Pill kind="secondary">Step therapy</Pill>}
              {rxSummary.rtpb.flags.quantityLimit && <Pill kind="secondary">Quantity limit</Pill>}
              {rxSummary.rtpb.flags.specialtyPharmacy && <Pill kind="secondary">Specialty pharmacy</Pill>}
            </div>
            {rxSummary.rtpb.requirements?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Common plan requirements</div>
                <ul style={{ marginLeft: 18 }}>
                  {rxSummary.rtpb.requirements.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* RX Actions */}
        <section style={{ ...card }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => { window.print(); setMode("ended"); }}
              style={{ border: "1px solid #334155", background: "#334155", color: "#fff", borderRadius: 10, padding: "8px 12px", cursor: "pointer" }}
              title="Print and end demo"
            >
              PRINT
            </button>
            <button
              onClick={resetAll}
              style={{ border: "1px solid #059669", background: "#059669", color: "#fff", borderRadius: 10, padding: "8px 12px", cursor: "pointer" }}
              title="Clear and go to opening screen"
            >
              Choose another drug
            </button>
            <button
              onClick={() => setMode("main")}
              style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 10, padding: "8px 12px", cursor: "pointer" }}
              title="Back to previous screen"
            >
              Go back
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ----- MAIN APP (search + selection) -----
  return (
    <div style={page}>
      <header style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>RA Drugs — Class Alternatives & Biosimilars</div>
        <div style={{ fontSize: 13, color: "#334155" }}>
          Type a <strong>generic</strong> or <strong>brand</strong>. Select a drug to see alternatives in class. Click the biosimilars badge to drill down.
        </div>
      </header>

      {/* Search */}
      <section style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Enter drug (generic or brand)</div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g., Humira, adalimumab, methotrexate…"
          style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", minWidth: 260, width: "100%", marginBottom: 10 }}
        />

        {!query && (
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
            Start typing to see matching drugs…
          </div>
        )}

        {query && suggestions.length === 0 && (
          <div style={{ marginTop: 10, border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
              No matches found for <strong>{query}</strong>.
            </div>
            <button
              onClick={() => selectCustomDrug(query)}
              style={{ border: "1px solid #334155", background: "#334155", color: "#fff", borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}
            >
              Use “{query}” anyway
            </button>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
              Drug not in current CDSS but will be added to next version.
            </div>
          </div>
        )}

        {/* Indications panel appears once a drug is selected and no disease chosen yet */}
        {selection && !disease && (
          <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }} />
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff", minWidth: 300 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Indications (per monograph)</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                Select disease to continue. For this demo, only <strong>Rheumatoid arthritis</strong> is enabled.
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {getIndications(selection).map((ind) => {
                  const isRA = /rheumatoid/i.test(ind);
                  return (
                    <button
                      key={ind}
                      onClick={() => isRA && setDisease("Rheumatoid arthritis")}
                      disabled={!isRA}
                      style={{
                        textAlign: "left",
                        border: "1px solid " + (isRA ? "#c7d2fe" : "#e2e8f0"),
                        background: isRA ? "#eef2ff" : "#f8fafc",
                        color: "#0f172a",
                        borderRadius: 10,
                        padding: "8px 10px",
                        cursor: isRA ? "pointer" : "not-allowed",
                        opacity: isRA ? 1 : 0.6
                      }}
                      title={isRA ? "Select Rheumatoid arthritis" : "Disabled in this demo"}
                    >
                      {ind}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {query && suggestions.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 10, marginBottom: 8 }}>
              Showing {suggestions.length} of {INDEX.length} originators
            </div>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              {suggestions.map(o => (
                <div key={`${o.generic}|${o.brand}`} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{o.generic}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{o.brand || "—"}</div>
                    </div>
                   <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <Pill kind="secondary">{o.dmard_class || "—"}</Pill>

  {o.has_biosimilars ? (
    // 🔒 Disable in the search list; guide user to select first
    <span
      title="Select this drug, then choose the disease to view biosimilars"
      style={{
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        color: "#64748b",
        borderRadius: 999,
        padding: "4px 8px",
        fontSize: 12,
        cursor: "not-allowed",
        userSelect: "none",
        whiteSpace: "nowrap"
      }}
    >
      {`Biosimilars: ${o.biosimilar_count ?? 0} (select drug to view)`}
    </span>
  ) : (
    <Pill kind="secondary">No biosimilars</Pill>
  )}
</div>
                  </div>

                  {o.has_biosimilars && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openReasons(); }}
                        style={{ border: "1px solid #334155", background: "#334155", color: "#fff",
                                 borderRadius: 999, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}
                      >
                        5 reasons to use biosimilars?
                      </button>
                    </div>
                  )}

                  <div style={{ marginTop: 10 }}>
                    <button
                      onClick={() => handleSelect(o)}
                      style={{ border: "1px solid #059669", background: "#059669", color: "#fff", borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}
                    >
                      Select →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

     
          {/* Current selection */}
{selection && disease && (
  <section style={{ ...card, marginBottom: 12 }}>
    <div style={{ fontWeight: 600, marginBottom: 6 }}>Selected drug</div>

    {/* Badge so you can see what is selected */}
    {selection._isBiosimilar ? (
      <div style={{ marginBottom: 8 }}>
        <Pill>Selected: Biosimilar</Pill>
        {!!selection._referenceBrand && (
          <span style={{ marginLeft: 8, fontSize: 12, color: "#64748b" }}>
            Reference: {selection._referenceGeneric} ({selection._referenceBrand})
          </span>
        )}
      </div>
    ) : (
      <div style={{ marginBottom: 8 }}>
        <Pill kind="secondary">Selected: Reference</Pill>
      </div>
    )}

    {/* Always display the biosimilar/reference actually selected,
        honoring the _displayLock set by selectBiosimilar() */}
    {(() => {
      const locked = selection?._displayLock || {};
      const d = getDisplay(selection); // helper from earlier in the file
      const displayBrand   = (locked.brand   ?? d.brand)   || "—";
      const displayGeneric = (locked.generic ?? d.generic) || "—";

      return (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><strong>Generic:</strong> {displayGeneric}</div>
            <div><strong>Brand:</strong> {displayBrand}</div>
            <div><strong>Class:</strong> {selection.dmard_class || "—"}</div>
            <div><strong>MoA:</strong> {selection.moa || "—"}</div>
            <div><strong>Route:</strong> {selection.route || "—"}</div>
            <div><strong>Regimen:</strong> {selection.regimen || "—"}</div>
            <div style={{ gridColumn: "1 / -1" }}>
              <strong>Typical dose (start → maint):</strong>{" "}
              {(selection.starting_dose || "—")} {(selection.dose_units || "")} → {(selection.maintenance_dose || "—")} {(selection.dose_units || "")}
            </div>
            {selection.monograph_url && (
              <div style={{ gridColumn: "1 / -1" }}>
                <strong>Monograph:</strong>{" "}
                <a href={selection.monograph_url} target="_blank" rel="noreferrer">{selection.monograph_url}</a>
              </div>
            )}

            {/* Safety pills */}
            {selection?.originator && (() => {
              const { warns, contras } = extractSafety(selection.originator);
              if (!warns.length && !contras.length) return null;
              return (
                <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                  <strong>Safety:</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {warns.map((w) => <Pill key={`w-${w}`} kind="secondary">{w}</Pill>)}
                    {contras.map((c) => <Pill key={`c-${c}`} kind="danger">{c}</Pill>)}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Active disease chip */}
          <div style={{ marginTop: 8 }}>
            <Pill> Disease: {disease} </Pill>
            <button
              onClick={() => setDisease(null)}
              style={{ marginLeft: 8, border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}
              title="Change disease"
            >
              Change
            </button>
          </div>

          {/* Actions: biosimilars + reasons */}
          {selection.has_biosimilars && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button
                onClick={() => openBiosimilarsFor(selection)}
                style={{ border: "1px solid #c7d2fe", background: "#eef2ff", color: "#1e1b4b",
                         borderRadius: 999, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}
              >
                View biosimilars ({selection.biosimilar_count})
              </button>
              <button
                onClick={openReasons}
                style={{ border: "1px solid #334155", background: "#334155", color: "#fff",
                         borderRadius: 999, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}
              >
                5 reasons to use biosimilars?
              </button>
            </div>
          )}

          {/* Check benefits (simulated) + Prescribe */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button
              onClick={() => {
                setRtpbLoading(true);
                setRtpb(null);
                setTimeout(() => {
                  setRtpb(simulateRTPBCheck(selection));
                  setRtpbLoading(false);
                }, 900);
              }}
              style={{ border: "1px solid #0ea5e9", background: "#0ea5e9", color: "#fff",
                       borderRadius: 999, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}
            >
              {rtpbLoading ? "Checking benefits…" : "Check benefits (simulated)"}
            </button>

            <button
              onClick={() => setMode("rx")}
              disabled={!selection}
              style={{ border: "1px solid #059669", background: "#059669", color: "#fff",
                       borderRadius: 999, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}
              title="Create a demo prescription"
            >
              Prescribe
            </button>
          </div>

          {/* RTPB result */}
          {rtpb && (
            <div style={{ marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Approval likelihood</div>
                  <div><Likelihood value={rtpb.likelihood} /></div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Estimated patient cost</div>
                  <div><strong>${rtpb.patientCost.toFixed(2)}</strong></div>
                </div>
              </div>

              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {rtpb.flags.pa && <Pill kind="secondary">PA likely</Pill>}
                {rtpb.flags.stepTherapy && <Pill kind="secondary">Step therapy</Pill>}
                {rtpb.flags.quantityLimit && <Pill kind="secondary">Quantity limit</Pill>}
                {rtpb.flags.specialtyPharmacy && <Pill kind="secondary">Specialty pharmacy</Pill>}
              </div>

              {rtpb.requirements?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Common plan requirements</div>
                  <ul style={{ marginLeft: 18 }}>
                    {rtpb.requirements.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      );
    })()}
  </section>
)}

      {/* Class-mates */}
      {selection && disease && (
        <div style={{ marginTop: 12 }}>
          <ClassMatesPanel selection={selection} onOpenBiosimilars={openBiosimilarsFor} />
        </div>
      )}

      {/* Biosimilars modal */}
      {biosFor && (
        <Modal
          onClose={() => setBiosFor(null)}
          title={`Biosimilars — ${biosFor.generic}${biosFor.brand ? " (" + biosFor.brand + ")" : ""}`}
        >
          {!biosFor.list?.length ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>No biosimilars found for this product.</div>
          ) : (
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
              {biosFor.list.map(b => (
                <div key={`${b.biosimilar_generic}|${b.biosimilar_brand}`} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{b.biosimilar_brand || b.biosimilar_generic}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{b.biosimilar_generic || "—"}</div>
                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    <div><strong>Route:</strong> {b.route || "—"}</div>
                    <div><strong>Regimen:</strong> {b.regimen || "—"}</div>
                    {(b.starting_dose || b.maintenance_dose) && (
                      <div>
                        <strong>Dose:</strong>{" "}
                        {(b.starting_dose || "—")} {(b.dose_units || "")} → {(b.maintenance_dose || "—")} {(b.dose_units || "")}
                      </div>
                    )}
                  </div>

                  {/* Optional mini PA preview per biosimilar */}
                  {(() => {
                    const item = {
                      generic: b.biosimilar_generic,
                      brand: b.biosimilar_brand,
                      dmard_class: (biosFor?.parent?.originator?.dmard_class) || "",
                      route: b.route || (biosFor?.parent?.route) || "",
                      has_biosimilars: false
                    };
                    const p = simulateRTPBCheck(item);
                    return (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, color: "#64748b" }}>Approval</span>
                          <Likelihood value={p.likelihood} />
                          <span style={{ fontSize: 12, color: "#64748b" }}>Cost</span>
                          <strong>${p.patientCost.toFixed(2)}</strong>
                        </div>
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {p.flags.pa && <Pill kind="secondary">PA likely</Pill>}
                          {p.flags.stepTherapy && <Pill kind="secondary">Step therapy</Pill>}
                          {p.flags.quantityLimit && <Pill kind="secondary">QL</Pill>}
                          {p.flags.specialtyPharmacy && <Pill kind="secondary">Specialty pharmacy</Pill>}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Safety for biosimilar (if present) */}
                  {(() => {
                    const { warns, contras } = extractSafety(b || {});
                    if (!warns.length && !contras.length) return null;
                    return (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Safety</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {warns.map((w) => <Pill key={`bw-${w}`} kind="secondary">{w}</Pill>)}
                          {contras.map((c) => <Pill key={`bc-${c}`} kind="danger">{c}</Pill>)}
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ marginTop: 10 }}>
                    <button
                     onClick={(e) => { e.stopPropagation(); selectBiosimilar(b); }}
                      style={{ border: "1px solid #059669", background: "#059669", color: "#fff", borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}
                    >
                      Select →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Reasons modal */}
      {reasonsOpen && (
        <Modal onClose={() => setReasonsOpen(false)} title="Five reasons to use biosimilars">
          {!showAllReasons && !activeReason && (
            <>
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 10 }}>
                Click a reason to see details, or “See all” to expand everything.
              </div>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                {BIOSIMILAR_REASONS.map(r => (
                  <button
                    key={r.key}
                    onClick={() => setActiveReason(r.key)}
                    style={{
                      textAlign: "left",
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      borderRadius: 12,
                      padding: 12,
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Tap to view bullet points</div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowAllReasons(true)}
                  style={{ border: "1px solid #0ea5e9", background: "#0ea5e9", color: "#fff",
                           borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}
                >
                  See all
                </button>
              </div>
            </>
          )}

          {!showAllReasons && activeReason && (
            <>
              <button
                onClick={() => setActiveReason(null)}
                style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, padding: "4px 8px", cursor: "pointer", marginBottom: 8 }}
              >
                ← Back
              </button>
              {BIOSIMILAR_REASONS.filter(r => r.key === activeReason).map(r => (
                <div key={r.key} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{r.title}</div>
                  <ul style={{ marginLeft: 18 }}>
                    {r.bullets.map((b, i) => <li key={i} style={{ marginBottom: 6 }}>{b}</li>)}
                  </ul>
                </div>
              ))}
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => setShowAllReasons(true)}
                  style={{ border: "1px solid #0ea5e9", background: "#0ea5e9", color: "#fff",
                           borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}
                >
                  See all
                </button>
              </div>
            </>
          )}

          {showAllReasons && (
            <>
              {BIOSIMILAR_REASONS.map(r => (
                <div key={r.key} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{r.title}</div>
                  <ul style={{ marginLeft: 18 }}>
                    {r.bullets.map((b, i) => <li key={i} style={{ marginBottom: 6 }}>{b}</li>)}
                  </ul>
                </div>
              ))}
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => { setShowAllReasons(false); setActiveReason(null); }}
                  style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}
                >
                  Collapse
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}