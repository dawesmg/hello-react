


/**
 * RTPB_AllRA.jsx
 * -----------------------------------------------------------
 * Phase 0 Documentation Block
 *
 * Purpose:
 *   Rapid RTBC demo flow locked to Rheumatoid Arthritis (RA).
 *   This phase establishes core scaffolding, resilience, and
 *   dev-only tooling for safe demos and team onboarding.
 *
 * Implemented Features:
 *   • Feature Flags (flags.js + Admin modal) for safe toggles
 *   • EvidenceHints bar, gated by flag
 *   • Environment badge + env-colored Admin button
 *   • ErrorBoundary wrapper with crash-test hook
 *   • RA-only flow (indications grid hidden, Change Disease removed)
 *   • Admin Console stub (Phase 0.6 placeholder)
 *   • RTBC toggle flag (Simulated vs Live mode stub)
 *   • Dev-only logging helper with key log points
 *
 * Layout Guide:
 *   - Header: title, Admin buttons, environment badge
 *   - EvidenceHintsBar: appears below header if flag is on
 *   - Main: ErrorBoundary wrapping RTPB_AllRA
 *   - Drug selection grid → Biosimilars modal → Summary/RX view
 *   - Evidence modals (safe defaults to prevent crashes)
 *
 * Acceptance Criteria:
 *   New contributors can open this file and quickly grasp
 *   Phase 0 structure, flow, and toggles before extending.
 * -----------------------------------------------------------
 */

import React, { useEffect, useMemo, useState } from "react";
import raw from "./data/ra_all_drugs_enriched.json";
import Evidence from "./components/Evidence.jsx";      
import { EVIDENCE_MAP, BIOSIMILAR_REASONS } from "./data/reasonsEvidence";
import useDebouncedValue from "./useDebouncedValue";
import { getFlag } from "./flags";
import { log, warn } from "./utils/log";
import DiseaseActivity from "./components/DiseaseActivity.jsx";
import PA_RULES from "./data/pa_rules_ra.json";
import { evaluatePA, resolveDrugKey } from "./pa/evaluatePA";

import DEMO_PATIENTS from "./data/demo_patients.json";

import { toggleScreen42 } from "./components/features/s42/screen42Bus"; // adjust path

const RA = "Rheumatoid arthritis";
const SHOW_INDICATIONS = false; // RA-locked demo


function getPaButtonStyle(result) {
  if (!result) {
    return {
      label: "Check Prior Auth",
      background: "#334155",
      color: "#fff"
    };
  }
  if (result.decision === "approve") {
    return {
      label: "PA Approved",
      background: "#16a34a", // green-600
      color: "#fff"
    };
  }
  if (result.decision === "needsInfo" || result.decision === "pend") {
    return {
      label: "More Info Needed",
      background: "#dc2626", // red-600
      color: "#fff"
    };
  }
  return {
    label: "Check Prior Auth",
    background: "#334155",
    color: "#fff"
  };
}




// Nice labels for the dropdown values
const SPECIALTY_LABELS = {
  "rheumatology": "Rheumatology",
  "immunology": "Immunology",
  "internal-medicine-rheum": "Internal Medicine (Rheum)",
  "family-medicine": "Family Medicine",
  "general-practice": "General Practice",
  "dermatology": "Dermatology",
  "gastroenterology": "Gastroenterology",
  "orthopedics": "Orthopedics",
  "oncology": "Oncology",
  "nurse-practitioner": "Nurse Practitioner",
  "physician-assistant": "Physician Assistant",
};

function fmtSpecialty(val) {
  return SPECIALTY_LABELS[val] || (val ? val : "— Not set —");
}

function isPreferredSpecialty(val = "") {
  return /^(rheumatology|immunology|internal-medicine-rheum)$/i.test(val);
}





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
    secondary: { background: "#d8f4f7ff", color: "#0f172a", border: "1px solid #d8f4f7ff" },
    danger:    { background: "#f8b6b6ff", color: "#7f1d1d", border: "1px solid #fecaca" },
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

// --- RTBC providers (Phase 0.7) ---
async function simulateRTBC(selection, disease) {
  // Fake latency + deterministic-ish payload for the demo
  await new Promise((r) => setTimeout(r, 400));
  return {
    likelihood: 0.73,
    patientCost: 18.5,
    flags: {
      pa: true,
      stepTherapy: false,
      quantityLimit: true,
      specialtyPharmacy: true,
    },
    requirements: ["Trial of methotrexate", "TB test in past 12 months"],
  };
}

async function liveRTBC(selection, disease) {
  // TODO: replace with real network call in Phase 2
  // For now, reuse simulator so “Live” path exercises the same UI.
  return simulateRTBC(selection, disease);
}

/* =========================================
   Main component
========================================= */

export default function RTPB_AllRA() {
  // view state
  const [mode, setMode] = useState("main"); // "main" | "rx" | "ended"
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [selection, setSelection] = useState(null);
  const [biosFor, setBiosFor] = useState(null);
  const [reasonsOpen, setReasonsOpen] = useState(false);
  const [activeReason, setActiveReason] = useState(null);
  const [showAllReasons, setShowAllReasons] = useState(false);
  const [rtpb, setRtpb] = useState(null);
  const [rtpbLoading, setRtpbLoading] = useState(false);
  const [disease, setDisease] = useState(null);
  const [evidenceOpen, setEvidenceOpen] = useState(null); 
  const [showReasonDetail, setShowReasonDetail] = useState(false);
  const [showDiseaseActivity, setShowDiseaseActivity] = useState(false);
  const [activityLevel, setActivityLevel] = useState(null); // "low" | "moderate" | "high"
  const [activityScore, setActivityScore] = useState(null); // numeric or null


  // --- PA (prototype) state ---
const [showPaModal, setShowPaModal] = useState(false);
const [paResult, setPaResult] = useState(null);
const [paContext, setPaContext] = useState({
  disease: "Rheumatoid arthritis",
  diseaseActivity: "moderate",   // keep fixed for now
  priorTherapies: [],
  concurrentTherapies: [],
  labs: {},                      // { tuberculosis_screening_date, hepatitis_b_screening_date }
  documentation: {},
  safetyAttestations: {},
  prescriber: { specialty: "rheumatology" }  
});

function recomputePA(src = "manual") {
  try {
    if (!selection?.generic && !selection?.brand) {
      setPaResult(null);
      return;
    }

    const dk =
      resolveDrugKey(PA_RULES, selection?.generic, selection?.brand) ||
      (selection?.generic || "").toLowerCase();

    const ctx = {
      ...paContext,
      diseaseActivity:
        activityLevel || paContext.diseaseActivity || "moderate",
    };

    const res = evaluatePA(PA_RULES, "optumrx-like", dk, "initialAuth", ctx);

    console.log(`[PA] recomputed via ${src}:`, {
      drugKey: dk,
      decision: res?.decision,
      missing: res?.missing,
    });

    setPaResult(res);
  } catch (err) {
    console.error("[PA] recompute failed:", err);
    setPaResult(null);
  }
}


//demo patients
const [selectedPatientId, setSelectedPatientId] = useState("ptA");
const selectedPatient = useMemo(
  () => DEMO_PATIENTS.find(p => p.id === selectedPatientId) || null,
  [selectedPatientId]
);

// Keep your PA context in sync when the selected patient changes
useEffect(() => {
  if (!selectedPatient) return;
  setPaContext(prev => ({
    // preserve any live edits if you want, or replace wholesale:
    ...selectedPatient
  }));
  // also reflect disease activity badge/colors if you want:
  if (selectedPatient.diseaseActivity) {
    setActivityLevel(selectedPatient.diseaseActivity);
  }
}, [selectedPatient]);

// Auto-recompute PA whenever drug/patient/key PA fields change
useEffect(() => {
  recomputePA("effect: selection/patient/context");
  // If your linter nags about missing deps, keep this exact list to avoid loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  selection?.generic,
  selection?.brand,
  activityLevel,
  selectedPatientId,
  paContext.prescriber?.specialty,
  paContext.labs?.tuberculosis_screening_date,
  paContext.labs?.hepatitis_b_screening_date,
]);


    // Track which reasons are expanded for full detail
    const [expandedReasons, setExpandedReasons] = useState(new Set());

    function expandAllReasons() {
      setExpandedReasons(new Set(BIOSIMILAR_REASONS.map(r => r.key)));
    }

    function collapseAllReasons() {
      setExpandedReasons(new Set());
    }

    function toggleReason(key) {
      setExpandedReasons(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    }

function activityChipStyle(level) {
  // base chip style
  const base = {
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    border: "1px solid",
    whiteSpace: "nowrap",
  };
  if (level === "low") {
    return { ...base, background: "#dcfce7", color: "#065f46", borderColor: "#86efac" };   // green
  }
  if (level === "moderate") {
    return { ...base, background: "#fef9c3", color: "#7c6f06", borderColor: "#fde68a" };   // yellow
  }
  if (level === "high") {
    return { ...base, background: "#fee2e2", color: "#7f1d1d", borderColor: "#fecaca" };   // red
  }
  return { ...base, background: "#f1f5f9", color: "#0f172a", borderColor: "#e2e8f0" };     // neutral
}

function scoreChipStyle() {
  return {
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#0f172a",
    whiteSpace: "nowrap",
  };
}

  const BIOSIMILAR_REASONS = [
  {
    key: "equivalence",
    title: "Proven Clinical Equivalence",
    summary: "RCTs and reviews confirm biosimilars match originators in efficacy, safety, and immunogenicity."
  },
  {
    key: "cost",
    title: "Cost Savings for Patients and the Health System",
    summary: "Biosimilars are significantly cheaper, reducing out-of-pocket and overall system spend."
  },
  {
    key: "priorauth",
    title: "Reduced Prior Authorization Barriers",
    summary: "Payer programs suggest biosimilars face fewer delays and improve treatment access."
  },
  {
    key: "copay",
    title: "Lower Patient Copayments",
    summary: "Real-world studies show copays reduced by up to 97%, easing burden and boosting adherence."
  },
  {
    key: "effectiveness",
    title: "Potential for Greater Real-World Effectiveness",
    summary: "Lower costs and better access enhance persistence, making biosimilars more effective in practice."
  }
  
];


  // Build search index
  const INDEX = useMemo(() => {
    return ORIGINATORS.map(o => ({
      ...o,
      _key: `${(o.generic || "").toLowerCase()} ${(o.brand || "").toLowerCase()}`
    }));
  }, []);

  const suggestions = useMemo(() => {
  const q = (debouncedQuery || "").toLowerCase().trim();
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
}, [debouncedQuery, INDEX]);

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
    setDisease(RA); // lock to RA on selection
    log("Disease selected RA only:", item);
     // NEW: auto-open biosimilars if available
  if (item?.has_biosimilars) {
    const full = findOriginator(item.generic, item.brand);
    const list = full?.originator?.biosimilars || [];
    if (list.length > 0) {
      setBiosFor({ generic: item.generic, brand: item.brand, list, parent: full });
    }
  }
  }
function runPA() {
  if (!selection) return;
  const dk =
    resolveDrugKey(PA_RULES, selection.generic, selection.brand) ||
    (selection.generic || "").toLowerCase();
  const res = evaluatePA(PA_RULES, "optumrx-like", dk, "initialAuth", paContext);
  setPaResult(res);
  setShowPaModal(true);
}
 
function resolveDrugKey(rules, generic, brand) {
  const g = (generic || "").toLowerCase().trim();
  const b = (brand || "").toLowerCase().trim();
  if (!g && !b) return null;

  // exact generic
  if (rules[g]) return g;

  // try brand lookup → generic
  for (const k of Object.keys(rules)) {
    const brands = (rules[k]?.brands || []).map(x => (x || "").toLowerCase());
    if (brands.includes(b)) return k;
  }
  return g || b || null;
}

async function runRtbc() {
  if (!selection) return;
  setRtpbLoading(true);
  try {
    const isLive = getFlag("rtbcLive"); // ← controlled by flag
    const provider = isLive ? liveRTBC : simulateRTBC;
    const result = await provider(selection, disease || "Rheumatoid arthritis");
    setRtpb(result);
  } finally {
    setRtpbLoading(false);
  }
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
   setDisease(RA);
   log("Custom Drug Name Disease selected:", item);
  }

  function openBiosimilarsFor(item) {
    const full = findOriginator(item.generic, item.brand);
    const list = full?.originator?.biosimilars || [];
    setBiosFor({ generic: item.generic, brand: item.brand, list, parent: full });
  }

  // ---- KEY FIX: keep biosimilar sticky in selection; never fall back to Humira for display
function selectBiosimilar(b) {
  if (!b) {
    console.warn("[DEV] selectBiosimilar called with empty value");
    return;
  }
  if (!biosFor?.parent) {
    console.warn("[DEV] selectBiosimilar: missing biosFor.parent");
    // If you prefer to hard-fail here, keep the return:
    // return;
  }

  const parent = biosFor?.parent || {};
  const rawParent = parent.originator || {};

  const toTitle = (g) =>
    g ? g.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()) : "";

  const synthetic = {
    generic: b.biosimilar_generic || parent.generic || "",
    // If brand missing in JSON, derive from generic (title-case) so we never fall back to Humira
    brand: b.biosimilar_brand || toTitle(b.biosimilar_generic) || parent.brand || "",

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
      contraindications: rawParent.contraindications || parent.contraindications || {},
    },

    _isBiosimilar: true,
    _referenceBrand: parent.brand || "",
    _referenceGeneric: parent.generic || "",
    // 🔒 hard lock the names used by the UI
    _displayLock: {
      brand: b.biosimilar_brand || toTitle(b.biosimilar_generic) || parent.brand || "",
      generic: b.biosimilar_generic || parent.generic || "",
    },
  };

  console.log("[DEV] selectBiosimilar →", {
    brand: synthetic.brand,
    generic: synthetic.generic,
    referenceBrand: synthetic._referenceBrand,
  });

  setSelection(synthetic);
  setDisease(RA);                  // lock to RA when picking a biosimilar
  setBiosFor(null);                // close modal
  setRtpb(null);
  setQuery("");                    // clear the search box so nothing re-highlights Humira
  setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
}


function openReasons() {
  // reset & open the reasons panel/modal
  setActiveReason(null);
  setShowAllReasons(false);
  setShowReasonDetail(true);  // ensures long detail shows under each reason
  setReasonsOpen(true);
}

function openEvidenceFor(reasonKey) {
  // Open the modal in “show all” view but expand only this reason
  setActiveReason(null);
  setShowAllReasons(true);
  setReasonsOpen(true);
  setExpandedReasons(new Set([reasonKey])); // expand exactly one

  // Optional: scroll to the expanded section after render
  setTimeout(() => {
    const el = document.querySelector(`[data-reason="${reasonKey}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
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

// ----- PA Button state (auto-colored based on result) -----
const paDecision = paResult?.decision;
const paButton = {
  text:
    paDecision === "approve"
      ? "PA: Approved"
      : paDecision === "needsInfo"
      ? "PA: Needs Info"
      : "Check PA",
  bg:
    paDecision === "approve"
      ? "#059669"   // green
      : paDecision === "needsInfo"
      ? "#ef4444"   // red
      : "#f59e0b",  // amber (default)
  border:
    paDecision === "approve"
      ? "#059669"
      : paDecision === "needsInfo"
      ? "#ef4444"
      : "#f59e0b",
};


  // ----- MAIN APP (search + selection) -----
return (
  <div style={page}>
    <header style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 24, fontWeight: 600 }}>
        RA Drugs — Class Alternatives & Biosimilars
      </div>
      <div style={{ fontSize: 13, color: "#334155" }}>
        Type a <strong>generic</strong> or <strong>brand</strong>. Select a drug to see alternatives in class. Click the biosimilars badge to drill down.
      </div>


      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
          fontSize: 12,
        }}
      >
        <div style={{ color: "#64748b" }}>Patient:</div>
        <select
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "4px 8px",
            fontSize: 12,
          }}
        >
          {DEMO_PATIENTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display}
            </option>
          ))}
        </select>
      </div>
      {/* 👆 end patient selector */}
    </header>

      {/* Search */}
      <section style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Enter drug (generic or brand)</div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length > 0) {
                e.preventDefault(); // don’t submit forms / blur
                // If your handler is named differently, replace handleSelect with it
                handleSelect(suggestions[0]);
                // (optional) clear the search box like we do after biosimilar select:
                setQuery("");
                // (optional) scroll to top if you do that elsewhere
                // setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
              }
            }}
          placeholder="e.g., Humira, adalimumab, methotrexate…"
          style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", minWidth: 260, width: "100%", marginBottom: 10 }}
        />
<div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
  <button
    onClick={() => setShowDiseaseActivity(true)}
    style={{
      border: "1px solid #e5e7eb",
      background: "#fff",
      borderRadius: 12,
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: 12,
    }}
  >
    Disease Activity Selection
  </button>

<button
  onClick={toggleScreen42}
  style={{ marginLeft: 8, border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 8px" }}
  title="Open Screen 42 (debug)"
>
  Screen42
</button>


  {/* Activity level chip with color */}
  {activityLevel && (
    <span style={activityChipStyle(activityLevel)}>
      Activity: {activityLevel.charAt(0).toUpperCase() + activityLevel.slice(1)}
    </span>
  )}

  {/* Score chip (shows N/A until calculator supplies a score) */}
  <span style={scoreChipStyle()}>
    Score: {activityScore ?? "—"}
  </span>
</div>

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
  

    `    {false && selection && !disease && (
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
            <div style={{ border: "2px dashed red", padding: 8, marginTop: 8 }}>
  

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
                <div
  key={`${o.generic}|${o.brand}`}
  style={{
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    background: "#fff",
    cursor: "pointer"
  }}
  onClick={() => {
    setSelection(o);
    setQuery("");

    // --- Auto-run Prior Auth evaluation when a drug is selected ---
    const dk =
      resolveDrugKey(PA_RULES, o?.generic, o?.brand) ||
      o?.generic?.toLowerCase();

    const result = evaluatePA(
      PA_RULES,
      "optumrx-like",
      dk,
      "initialAuth",
      {
        ...paContext,
        diseaseActivity: activityLevel || paContext.diseaseActivity
      }
    );

    setPaResult(result);
  }}
>
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

            
          </div>

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

      {/* 🔵🔴 Legend for color meaning */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginTop: "12px",
          fontSize: "13px",
          color: "#334155",
          borderTop: "1px solid #e5e7eb",
          paddingTop: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              display: "inline-block",
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              backgroundColor: "#3b82f6"
            }}
          ></span>
          <span>Safety alerts / Adverse effects</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              display: "inline-block",
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              backgroundColor: "#ef4444"
            }}
          ></span>
          <span>Contraindications — avoid use</span>
        </div>
      </div>
    </div>
  );
})()}

         {/* Active disease chip */}
<div style={{ marginTop: 8 }}>
  <Pill> Disease: {disease || RA} </Pill>
  {SHOW_INDICATIONS && (
    <button
      onClick={() => setDisease(null)}
      style={{ marginLeft: 8, border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}
      title="Change disease"
    >
      Change
    </button>
  )}
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

          {/* Check benefits (Simulated/Live) + Prescribe */}
<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
 <button
  onClick={async () => {
    setRtpbLoading(true);
    setRtpb(null);

    const mode = getFlag("rtbcLive") ? "Live" : "Simulated";
    try {
      // START log
      const selLabel =
        (selection && (selection.generic || selection.brand)) || "(none)";
      log("RTBC check started", { mode, selection: selLabel });
      // -----

      // (Phase 2: real call goes here when mode === "Live")
      await new Promise((r) => setTimeout(r, 900));
      setRtpb(simulateRTPBCheck(selection));

      // FINISH log
      log("RTBC check finished", { mode, result: "ok" });
    } catch (e) {
      // ERROR log (will show only in dev)
      log("RTBC check error", e?.message || String(e));
    } finally {
      setRtpbLoading(false);
    }
  }}
  style={{
    border: "1px solid #0ea5e9",
    background: "#0ea5e9",
    color: "#fff",
    borderRadius: 999,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
  }}
>
  {rtpbLoading
    ? "Checking benefits…"
    : `Check benefits (${getFlag("rtbcLive") ? "Live" : "Simulated"})`}
</button>

<button
  onClick={() => {
    recomputePA("button-click");
    setShowPaModal(true);
  }}
  disabled={!selection}
  style={{
    border: `1px solid ${paButton.border}`,
    background: paButton.bg,
    color: "#fff",
    borderRadius: 999,
    padding: "6px 10px",
    cursor: selection ? "pointer" : "not-allowed",
    fontSize: 12,
  }}
  title="Prototype PA check using JSON rules"
>
  {paButton.text}
</button>


  <button
    onClick={() => setMode("rx")}
    disabled={!selection}
    style={{
      border: "1px solid #059669",
      background: "#059669",
      color: "#fff",
      borderRadius: 999,
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: 12,
    }}
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

{/* PA Prototype Modal */}
{showPaModal && (
  <Modal onClose={() => setShowPaModal(false)} title="Prior Authorization — Prototype">
    {paResult ? (
      <div style={{ display: "grid", gap: 12 }}>
        {/* Decision pill */}
        <div>
          <span style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 999,
            background: paResult.decision === "approve" ? "#10b981" : "#f59e0b",
            color: "#fff",
            fontSize: 12,
            marginRight: 8
          }}>
            {paResult.decision === "approve" ? "APPROVE" : "NEEDS INFO"}
          </span>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {paResult.considered} criteria · {paResult.approvalMonths}-month default term
          </span>
        </div>

{/* Prescriber specialty pill display */}
<div>
  <span
    style={{
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      background: isPreferredSpecialty(paContext.prescriber?.specialty)
        ? "#10b981" // green
        : "#f59e0b", // amber
      color: "#fff",
      fontSize: 12,
      marginRight: 8
    }}
  >
    Prescriber: {fmtSpecialty(paContext.prescriber?.specialty)}
  </span>
  {!isPreferredSpecialty(paContext.prescriber?.specialty) && (
    <span style={{ fontSize: 12, color: "#64748b" }}>
      (Tip: Rheumatology/Immunology preferred)
    </span>
  )}
</div>

        {/* Messages */}
        {paResult.messages?.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Notes</div>
            <ul style={{ marginLeft: 18 }}>
              {paResult.messages.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        )}

        {/* Missing items checklist (quick inputs) */}
        {paResult.missing?.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Items required</div>
            <div style={{ display: "grid", gap: 8 }}>
              {/* TB / HBV dates */}
              {paResult.missing.includes("tuberculosis_screening_date") && (
                <div>
                  <label style={{ fontSize: 14 }}>
                    TB screening date:{" "}
                    <input
                      type="date"
                      onChange={(e) => setPaContext(prev => ({
                        ...prev,
                        labs: { ...(prev.labs || {}), tuberculosis_screening_date: e.target.value }
                      }))}
                    />
                  </label>
                </div>
              )}
              {paResult.missing.includes("hepatitis_b_screening_date") && (
                <div>
                  <label style={{ fontSize: 14 }}>
                    HBV screening date:{" "}
                    <input
                      type="date"
                      onChange={(e) => setPaContext(prev => ({
                        ...prev,
                        labs: { ...(prev.labs || {}), hepatitis_b_screening_date: e.target.value }
                      }))}
                    />
                  </label>
                </div>
              )}

              {/* JAK attestations */}
              {paResult.missing.some(m => ["cv_risk_discussed","thrombosis_risk_discussed","malignancy_risk_discussed"].includes(m)) && (
                <div style={{ display: "grid", gap: 6 }}>
                  <label>
                    <input
                      type="checkbox"
                      onChange={(e) => setPaContext(prev => ({
                        ...prev,
                        safetyAttestations: { ...(prev.safetyAttestations || {}), cv_risk_discussed: e.target.checked }
                      }))}
                    /> CV risk discussed
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      onChange={(e) => setPaContext(prev => ({
                        ...prev,
                        safetyAttestations: { ...(prev.safetyAttestations || {}), thrombosis_risk_discussed: e.target.checked }
                      }))}
                    /> Thrombosis risk discussed
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      onChange={(e) => setPaContext(prev => ({
                        ...prev,
                        safetyAttestations: { ...(prev.safetyAttestations || {}), malignancy_risk_discussed: e.target.checked }
                      }))}
                    /> Malignancy risk discussed
                  </label>
                </div>
              )}

              {/* Reauth response summary */}
              {paResult.missing.includes("clinical_response_summary") && (
                <div>
                  <label style={{ fontSize: 14 }}>
                    Clinical response summary:{" "}
                    <textarea
                      rows={3}
                      style={{ width: "100%" }}
                      onChange={(e) => setPaContext(prev => ({
                        ...prev,
                        documentation: { ...(prev.documentation || {}), clinical_response_summary: e.target.value }
                      }))}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prescriber specialty tweak (if needed) */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Prescriber Specialty Edit</div>
          <select
            value={paContext.prescriber?.specialty || ""}
            onChange={(e) =>
              setPaContext((prev) => ({
                ...prev,
                prescriber: { ...(prev.prescriber || {}), specialty: e.target.value },
              }))
            }
          >
            <option value="">-- Select --</option>

            {/* Preferred specialties (green pill) */}
            <option value="rheumatology">Rheumatology</option>
            <option value="immunology">Immunology</option>
            <option value="internal-medicine-rheum">Internal Medicine (Rheum)</option>

            {/* Non-preferred (will show amber pill + tip) */}
            <option value="family-medicine">Family Medicine</option>
            <option value="general-practice">General Practice</option>
            <option value="dermatology">Dermatology</option>
            <option value="gastroenterology">Gastroenterology</option>
            <option value="orthopedics">Orthopedics</option>
            <option value="oncology">Oncology</option>
            <option value="nurse-practitioner">Nurse Practitioner</option>
            <option value="physician-assistant">Physician Assistant</option>
          </select>
        </div>

        {/* Re-check */}
        <div>
          <button
            onClick={() => {
              if (!selection) return;
              const dk = resolveDrugKey(PA_RULES, selection?.generic, selection?.brand) || selection?.generic?.toLowerCase();
              const res = evaluatePA(PA_RULES, "optumrx-like", dk, "initialAuth", {
                ...paContext,
                diseaseActivity: activityLevel || paContext.diseaseActivity
              });
              setPaResult(res);
            }}
            style={{ border: "1px solid #334155", background: "#334155", color: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
          >
            Re-check now
          </button>
        </div>
      </div>
    ) : (
      <div style={{ fontSize: 13, color: "#64748b" }}>No result yet.</div>
    )}
  </Modal>
)}
      {/* Biosimilars modal */}
      {biosFor && (
        <Modal
          onClose={() => setBiosFor(null)}
          title={`Biosimilars — ${biosFor.generic}${biosFor.brand ? " (" + biosFor.brand + ")" : ""}`}
        >
          {/* NEW: top toolbar with Evidence button */}
    
     {/* Evidence button aligned left */}
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
     <button
        onClick={() => {
          // Open reasons modal straight to: show ALL reasons + show FULL details
          setActiveReason(null);
          setShowAllReasons(true);
          setReasonsOpen(true);
          collapseAllReasons(); // ← default to collapsed
    // if you still have showReasonDetail elsewhere, keep it off:
    // setShowReasonDetail(false);
        }}
        style={{
          border: "1px solid #334155",
          background: "#334155",
          color: "#fff",
          borderRadius: 999,
          padding: "6px 10px",
          cursor: "pointer",
          fontSize: 12
        }}
        title="See evidence for using biosimilars"
      >
        Evidence
      </button>

          </div>
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
      {/* Safety legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 11,
          color: "#475569",
          marginTop: 8,
          marginBottom: 4,
          flexWrap: "wrap"
        }}
>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              background: "#e0f2fe",
              border: "1px solid #38bdf8",
              borderRadius: 4
            }}
          ></span>
          <span>Warning (adverse event)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              background: "#fee2e2",
              border: "1px solid #ef4444",
              borderRadius: 4
            }}
          ></span>
          <span>Contraindication</span>
        </div>
      </div>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      // TEMP log so we know the click is firing
                      console.log("[DEV] biosimilar click", b?.biosimilar_brand || b?.biosimilar_generic || b);
                      selectBiosimilar(b);
                    }}
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
    {/* Intro (list is static; no click-to-open now) */}
    {!showAllReasons && !activeReason && (
      <>
        <div style={{ fontSize: 13, color: "#334155", marginBottom: 10 }}>
          Click “See all” to view summaries. Use the black Evidence button in the biosimilars list to show full details inline.
        </div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {BIOSIMILAR_REASONS.map((r) => (
            <div
              key={r.key || r.id}
              data-reason={r.key} // ← this allows the scroll helper to find the section
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{r.title}</div>
                <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // jump straight to the full “all reasons” list and expand THIS reason
                  openEvidenceFor(r.key);
                }}
                style={{
                  border: "1px solid #334155",
                  background: "#334155",
                  color: "#fff",
                  borderRadius: 999,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: 12
                }}
                title="More evidence"
              >
                More evidence
              </button>
              </div>

              {r.blurb && (
                <div style={{ fontSize: 13, color: "#334155", marginTop: 6 }}>
                  {r.blurb}
                </div>
              )}
            </div>
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

    {/* SHOW ALL: summaries + (if toggled) full detail under each reason */}
   {showAllReasons && (
  <>
    {BIOSIMILAR_REASONS.map((r) => {
      const ev = EVIDENCE_MAP[r.key] || {};
      const bullets = ev.points || r.bullets || (r.summary ? [r.summary] : []);
      const hasDetail = !!(ev.detail || ev.detailHtml);
      const isOpen = expandedReasons.has(r.key);

      return (
        <div key={r.key} style={{ marginBottom: 12 }}>
          {/* Title row + per-reason toggle button */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 700, flex: 1 }}>{r.title}</div>
            {hasDetail && (
              <button
                onClick={() => toggleReason(r.key)}
                style={{
                  border: "1px solid #334155",
                  background: isOpen ? "#334155" : "#fff",
                  color: isOpen ? "#fff" : "#0f172a",
                  borderRadius: 999,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: 12
                }}
                title={isOpen ? "Hide evidence" : "More evidence"}
              >
                {isOpen ? "Hide evidence" : "More evidence"}
              </button>
            )}
          </div>

          {/* Summaries */}
          {bullets.length > 0 ? (
            <ul style={{ marginLeft: 18 }}>
              {bullets.map((b, i) => (
                <li key={i} style={{ marginBottom: 6 }}>{b}</li>
              ))}
            </ul>
          ) : (
            <div style={{ fontSize: 13, color: "#64748b" }}>No details available.</div>
          )}

          {/* Expanded full detail per reason */}
          {isOpen && hasDetail && (
            ev.detailHtml ? (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  color: "#334155",
                  fontSize: 14
                }}
                dangerouslySetInnerHTML={{ __html: ev.detailHtml }}
              />
            ) : (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  color: "#334155",
                  fontSize: 14
                }}
              >
                {ev.detail}
              </div>
            )
          )}
        </div>
      );
    })}

    {/* Footer controls */}
    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        onClick={expandAllReasons}
        style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}
      >
        Expand all
      </button>
      <button
        onClick={collapseAllReasons}
        style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}
      >
        Collapse all
      </button>
      <button
        onClick={() => { setShowAllReasons(false); setActiveReason(null); collapseAllReasons(); /* setShowReasonDetail(false); */ }}
        style={{ marginLeft: "auto", border: "1px solid #e5e7eb", background: "#fff", borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}
      >
        Close section
      </button>
    </div>
  </>
)}
  </Modal>
)}
{/* Disease Activity modal */}
{showDiseaseActivity && (
  <DiseaseActivity
    onClose={() => setShowDiseaseActivity(false)}
    onQuickSelect={(level) => {
      setActivityLevel(level);
      setPaContext(prev => ({ ...prev, diseaseActivity: level }));
      recomputePA("activity-change");
      setShowDiseaseActivity(false);
    }}
  />
)}

   
    </div>
  );
}