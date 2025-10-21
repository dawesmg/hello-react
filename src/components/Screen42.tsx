

import React, { useMemo, useState, useEffect } from "react";
import { S42Renderer } from "./features/s42/Renderer";
import * as Flags from "../flags"; // flags.js is in src/, so ../ from components
import { SCREEN42_EVENTS } from "./features/s42/screen42Bus";

// --- Safe wrappers around the flags module (prevents crashes) ---
const safeGetFlag = (name: string): boolean => {
  try {
    return !!(Flags as any)?.getFlag?.(name);
  } catch {
    return false;
  }
};

const safeOnFlagChange = (cb: (name: string) => void): (() => void) => {
  try {
    const fn = (Flags as any)?.onFlagChange;
    if (typeof fn === "function") return fn(cb);
  } catch {}
  return () => {}; // no-op unsubscribe if not available
};


class LocalErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: any }> {
  constructor(props:any){ super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err:any){ return { err }; }
  componentDidCatch(err:any, info:any){ console.error("Screen42 error:", err, info); }
  render(){
    if (this.state.err) {
      return (
        <div style={{ padding: 16, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#7f1d1d" }}>
          Screen42 crashed: {String(this.state.err?.message || this.state.err)}
        </div>
      );
    }
    return this.props.children as any;
  }
}


// RA schema (inline)
const RA_SCHEMA = {
  id: "ra",
  name: "Rheumatoid Arthritis",
  metrics: [{
    id: "das28",
    label: "DAS28",
    type: "line",
    unit: "score",
    source: {
      resource: "Observation",
      methodCodeSystem: "http://snomed.info/sct",
      methodCode: "702660003",
      windowMonths: 12
    },
    bands: [
      { label: "Low", max: 3.19 },
      { label: "Moderate", min: 3.2, max: 5.0 },
      { label: "High", min: 5.1 }
    ]
  }],
  medTimeline: {
    resource: "MedicationStatement",
    groupBy: "category.class",
    labelFrom: ["medicationCodeableConcept.text"],
    doseFrom: ["dosage.0.text"],
    windowMonths: 12
  }
};

// T2D schema (inline)
const T2D_SCHEMA = {
  id: "t2d",
  name: "Type 2 Diabetes",
  metrics: [{
    id: "hba1c",
    label: "HbA1c",
    type: "line",
    unit: "%",
    source: {
      resource: "Observation",
      codeSystem: "http://loinc.org",
      codes: ["4548-4"],     // HbA1c
      windowMonths: 12
    },
    bands: [
      { label: "Good", max: 7.0 },
      { label: "Needs optimization", min: 7.0, max: 9.0 },
      { label: "Poor control", min: 9.0 }
    ]
  }],
  medTimeline: {
    resource: "MedicationStatement",
    groupBy: "category.class",
    labelFrom: ["medicationCodeableConcept.text"],
    doseFrom: ["dosage.0.text"],
    windowMonths: 12
  }
};

const HTN_SCHEMA = {
  id: "htn",
  name: "Hypertension",
  metrics: [
    {
      id: "bp",
      label: "Blood Pressure (mmHg)",
      type: "line",
      unit: "mmHg",
      source: {
        resource: "Observation",
        codeSystem: "http://loinc.org",
        codes: ["8480-6", "8462-4"], // systolic and diastolic
        windowMonths: 12
      },
      bands: [
        { label: "Normal", max: 120 },
        { label: "Elevated", min: 121, max: 139 },
        { label: "High", min: 140 }
      ]
    }
  ],
  medTimeline: {
    resource: "MedicationStatement",
    groupBy: "category.class",
    labelFrom: ["medicationCodeableConcept.text"],
    doseFrom: ["dosage.0.text"],
    windowMonths: 12
  }
};

const DEP_SCHEMA = {
  id: "dep",
  name: "Depression",
  metrics: [
    {
      id: "phq9",
      label: "PHQ-9",
      type: "line",
      unit: "score",
      source: {
        resource: "Observation",
        codeSystem: "http://loinc.org",
        codes: ["44249-1"], // PHQ-9 total score
        windowMonths: 12
      },
      bands: [
        { label: "Minimal", max: 4 },
        { label: "Mild", min: 5, max: 9 },
        { label: "Moderate", min: 10, max: 14 },
        { label: "Moderately Severe", min: 15, max: 19 },
        { label: "Severe", min: 20 }
      ]
    }
  ],
  medTimeline: {
    resource: "MedicationStatement",
    groupBy: "category.class",
    labelFrom: ["medicationCodeableConcept.text"],
    doseFrom: ["dosage.0.text"],
    windowMonths: 12
  }
};


// RA demo bundle
function buildRABundle(): any {
  return {
    resourceType: "Bundle",
    type: "collection",
    entry: [
      // DAS28 points (descending over 12 months)
      { resource: { resourceType: "Observation", code: { text: "DAS28" },
        method: { coding: [{ system: "http://snomed.info/sct", code: "702660003" }] },
        effectiveDateTime: new Date(new Date().setMonth(new Date().getMonth() - 10)).toISOString(),
        valueQuantity: { value: 6.1 } } },
      { resource: { resourceType: "Observation", code: { text: "DAS28" },
        method: { coding: [{ system: "http://snomed.info/sct", code: "702660003" }] },
        effectiveDateTime: new Date(new Date().setMonth(new Date().getMonth() - 7)).toISOString(),
        valueQuantity: { value: 5.0 } } },
      { resource: { resourceType: "Observation", code: { text: "DAS28" },
        method: { coding: [{ system: "http://snomed.info/sct", code: "702660003" }] },
        effectiveDateTime: new Date(new Date().setMonth(new Date().getMonth() - 4)).toISOString(),
        valueQuantity: { value: 4.1 } } },
      { resource: { resourceType: "Observation", code: { text: "DAS28" },
        method: { coding: [{ system: "http://snomed.info/sct", code: "702660003" }] },
        effectiveDateTime: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
        valueQuantity: { value: 3.6 } } },
      // Medications
      { resource: { resourceType: "MedicationStatement",
        medicationCodeableConcept: { text: "Methotrexate 15 mg PO weekly" },
        dosage: [{ text: "15 mg weekly" }],
        effectivePeriod: { start: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString(),
                           end:   new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString() },
        category: { class: "csDMARD" } } },
      { resource: { resourceType: "MedicationStatement",
        medicationCodeableConcept: { text: "Adalimumab-adbm (Cyltezo) 40 mg SC Q2W" },
        dosage: [{ text: "40 mg SC Q2W" }],
        effectivePeriod: { start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString(),
                           end:   new Date().toISOString() },
        category: { class: "bDMARD (TNF) – biosimilar" } } }
    ]
  };
}

// T2D demo bundle
function buildT2DBundle(): any {
  return {
    resourceType: "Bundle",
    type: "collection",
    entry: [
      // HbA1c trend 12 → 0 months
      { resource: { resourceType: "Observation",
        code: { coding: [{ system: "http://loinc.org", code: "4548-4", display: "Hemoglobin A1c" }], text: "HbA1c" },
        effectiveDateTime: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString(),
        valueQuantity: { value: 9.8, unit: "%" } } },
      { resource: { resourceType: "Observation", code: { coding: [{ system: "http://loinc.org", code: "4548-4" }], text: "HbA1c" },
        effectiveDateTime: new Date(new Date().setMonth(new Date().getMonth() - 9)).toISOString(),
        valueQuantity: { value: 8.7, unit: "%" } } },
      { resource: { resourceType: "Observation", code: { coding: [{ system: "http://loinc.org", code: "4548-4" }], text: "HbA1c" },
        effectiveDateTime: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString(),
        valueQuantity: { value: 7.9, unit: "%" } } },
      { resource: { resourceType: "Observation", code: { coding: [{ system: "http://loinc.org", code: "4548-4" }], text: "HbA1c" },
        effectiveDateTime: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString(),
        valueQuantity: { value: 7.1, unit: "%" } } },
      { resource: { resourceType: "Observation", code: { coding: [{ system: "http://loinc.org", code: "4548-4" }], text: "HbA1c" },
        effectiveDateTime: new Date().toISOString(),
        valueQuantity: { value: 6.8, unit: "%" } } },

      // Medications
      { resource: { resourceType: "MedicationStatement",
        medicationCodeableConcept: { text: "Metformin 1000 mg PO BID" },
        dosage: [{ text: "1000 mg BID" }],
        effectivePeriod: { start: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString(),
                           end:   new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString() },
        category: { class: "Biguanide" } } },
      { resource: { resourceType: "MedicationStatement",
        medicationCodeableConcept: { text: "Semaglutide 0.5 mg SC weekly" },
        dosage: [{ text: "0.5 mg weekly" }],
        effectivePeriod: { start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString(),
                           end:   new Date().toISOString() },
        category: { class: "GLP-1 RA" } } },
      { resource: { resourceType: "MedicationStatement",
        medicationCodeableConcept: { text: "Insulin glargine 10 units qHS" },
        dosage: [{ text: "10 units qHS" }],
        effectivePeriod: { start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString(),
                           end:   new Date().toISOString() },
        category: { class: "Basal insulin" } } }
    ]
  };
}
function buildHTNBundle() {
  return {
    resourceType: "Bundle",
    type: "collection",
    entry: [
      { resource: { resourceType: "Observation",
        code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic BP" }] },
        effectiveDateTime: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString(),
        valueQuantity: { value: 142, unit: "mmHg" } } },
      { resource: { resourceType: "Observation",
        code: { coding: [{ system: "http://loinc.org", code: "8480-6" }] },
        effectiveDateTime: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString(),
        valueQuantity: { value: 134, unit: "mmHg" } } },
      { resource: { resourceType: "Observation",
        code: { coding: [{ system: "http://loinc.org", code: "8480-6" }] },
        effectiveDateTime: new Date().toISOString(),
        valueQuantity: { value: 128, unit: "mmHg" } } },
      { resource: { resourceType: "MedicationStatement",
        medicationCodeableConcept: { text: "Lisinopril 10 mg PO daily" },
        dosage: [{ text: "10 mg PO daily" }],
        effectivePeriod: {
          start: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString(),
          end: new Date().toISOString()
        },
        category: { class: "ACE inhibitor" } } }
    ]
  };
}

function buildDEPBundle() {
  return {
    resourceType: "Bundle",
    type: "collection",
    entry: [
      { resource: { resourceType: "Observation",
        code: { coding: [{ system: "http://loinc.org", code: "44249-1", display: "PHQ-9 Total" }] },
        effectiveDateTime: new Date(new Date().setMonth(new Date().getMonth() - 9)).toISOString(),
        valueQuantity: { value: 18 } } },
      { resource: { resourceType: "Observation",
        code: { coding: [{ system: "http://loinc.org", code: "44249-1" }] },
        effectiveDateTime: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString(),
        valueQuantity: { value: 10 } } },
      { resource: { resourceType: "Observation",
        code: { coding: [{ system: "http://loinc.org", code: "44249-1" }] },
        effectiveDateTime: new Date().toISOString(),
        valueQuantity: { value: 5 } } },
      { resource: { resourceType: "MedicationStatement",
        medicationCodeableConcept: { text: "Sertraline 50 mg PO daily" },
        dosage: [{ text: "50 mg daily" }],
        effectivePeriod: {
          start: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString(),
          end: new Date().toISOString()
        },
        category: { class: "SSRI" } } }
    ]
  };
}

// ------------------- sample data -------------------
function buildMonths(): string[] {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(start);
    m.setMonth(m.getMonth() - i);
    months.push(m.toLocaleDateString(undefined, { month: "short", year: "2-digit" }));
  }
  return months;
}

const months = buildMonths();
const das28Series = [5.9, 5.6, 5.4, 5.2, 4.8, 4.4, 4.0, 3.6, 3.2, 2.9, 2.6, 2.4];
const meds = [
  { class: "NSAID", name: "Naproxen", dose: "500 mg PO BID", start: 0, end: 2 },
  { class: "csDMARD", name: "Methotrexate", dose: "15 mg PO weekly", start: 2, end: 7 },
  { class: "csDMARD", name: "Folic acid", dose: "1 mg PO OD", start: 3, end: 7 },
  { class: "bDMARD (TNF)", name: "Adalimumab (Humira)", dose: "40 mg SC Q2W", start: 7, end: 9 },
  { class: "bDMARD (TNF) – biosimilar", name: "Adalimumab-adbm (Cyltezo)", dose: "40 mg SC Q2W", start: 9, end: 11 },
];

type Med = { class: string; name: string; dose: string; start: number; end: number };
type Screen42Data = { months: string[]; das28Series: number[]; meds: Med[] };

function bandFor(score: number) {
  if (score >= 5.1) return "High";
  if (score >= 3.2) return "Moderate";
  return "Low";
}

const classColor: Record<string, string> = {
  NSAID: "#38bdf8",
  csDMARD: "#6366f1",
  "bDMARD (TNF)": "#8b5cf6",
  "bDMARD (TNF) – biosimilar": "#10b981",
  Other: "#a3a3a3",
};


// ------------------- tiny UI helpers -------------------
function Modal({
  open, onClose, children, title,
}: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{
        width: "min(1100px, 96vw)", maxHeight: "90vh", overflow: "auto",
        background: "#fff", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.2)", padding: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <button onClick={onClose} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 8px" }}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Tabs({
  tabs, active, onChange,
}: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: active === t ? "#eef2ff" : "#fff",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function TimelineRow({ label, items }: { label: string; items: Med[] }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, margin: "8px 0" }}>{label}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `220px repeat(${months.length}, 1fr)`,
          gap: 4,
          alignItems: "stretch",
        }}
      >
        <div />
        {months.map((m, i) => (
          <div key={i} style={{ fontSize: 10, textAlign: "center", color: "#6b7280" }}>{m}</div>
        ))}
        {items.map((med, idx) => (
          <React.Fragment key={idx}>
            <div style={{ padding: "6px 8px", textAlign: "right", fontSize: 12, color: "#374151" }}>
              <div style={{ fontWeight: 600 }}>{med.name}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{med.dose}</div>
            </div>
            {months.map((_, col) => {
              const active = col >= med.start && col <= med.end;
              return (
                <div
                  key={col}
                  style={{
                    height: 20,
                    borderRadius: 4,
                    background: active ? classColor[label] || "#a3a3a3" : "#f3f4f6",
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ------------------- main exports -------------------
export function Screen42Launcher({ fetchUrl }: { fetchUrl?: string }) {
  
  const [disease, setDisease] = useState<"RA" | "T2D" | "HTN" | "DEP">(
  safeGetFlag("screen42T2D")
    ? "T2D"
    : safeGetFlag("screen42HTN")
    ? "HTN"
    : safeGetFlag("screen42DEP")
    ? "DEP"
    : "RA"
);


useEffect(() => {
  const onOpen = () => setOpen(true);
  const onClose = () => setOpen(false);
  const onToggle = () => setOpen((x) => !x);

  window.addEventListener(SCREEN42_EVENTS.OPEN, onOpen as EventListener);
  window.addEventListener(SCREEN42_EVENTS.CLOSE, onClose as EventListener);
  window.addEventListener(SCREEN42_EVENTS.TOGGLE, onToggle as EventListener);

  return () => {
    window.removeEventListener(SCREEN42_EVENTS.OPEN, onOpen as EventListener);
    window.removeEventListener(SCREEN42_EVENTS.CLOSE, onClose as EventListener);
    window.removeEventListener(SCREEN42_EVENTS.TOGGLE, onToggle as EventListener);
  };
}, []);
useEffect(() => {
  const off = safeOnFlagChange((name: string) => {
    if (["screen42RA","screen42T2D","screen42HTN","screen42DEP"].includes(name)) {
      if (safeGetFlag("screen42T2D")) setDisease("T2D");
      else if (safeGetFlag("screen42HTN")) setDisease("HTN");
      else if (safeGetFlag("screen42DEP")) setDisease("DEP");
      else setDisease("RA");
    }
  });
  return off;
}, []);
  
  const [open, setOpen] = useState(false);
  const data: Screen42Data = { months, das28Series, meds }; // using inline data; hook can be added later

  const banded = useMemo(
    () => data.months.map((label, i) => ({ label, score: data.das28Series[i], band: bandFor(data.das28Series[i]) })),
    [data]
  );

  // group meds by class
  const grouped = useMemo(() => {
    const m = new Map<string, Med[]>();
    data.meds.forEach((x) => {
      if (!m.has(x.class)) m.set(x.class, []);
      m.get(x.class)!.push(x);
    });
    return Array.from(m.entries());
  }, [data]);

const schema =
  disease === "T2D" ? T2D_SCHEMA :
  disease === "HTN" ? HTN_SCHEMA :
  disease === "DEP" ? DEP_SCHEMA :
  RA_SCHEMA;

const bundle =
  disease === "T2D" ? buildT2DBundle() :
  disease === "HTN" ? buildHTNBundle() :
  disease === "DEP" ? buildDEPBundle() :
  buildRABundle();
  


  return (
  <LocalErrorBoundary>
    
   <Modal open={open} onClose={() => setOpen(false)} title="Screen 42 — Prescribing Decision Support">
  <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
    {/* Toggle */}
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <button onClick={() => setDisease("RA")}  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: disease === "RA"  ? "#eef2ff" : "#fff", fontWeight: disease === "RA"  ? 600 : 400 }}>RA</button>
      <button onClick={() => setDisease("T2D")} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: disease === "T2D" ? "#eef2ff" : "#fff", fontWeight: disease === "T2D" ? 600 : 400 }}>T2D</button>
      <button onClick={() => setDisease("HTN")} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: disease === "HTN" ? "#eef2ff" : "#fff", fontWeight: disease === "HTN" ? 600 : 400 }}>HTN</button>
      <button onClick={() => setDisease("DEP")} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: disease === "DEP" ? "#eef2ff" : "#fff", fontWeight: disease === "DEP" ? 600 : 400 }}>DEP</button>
    </div>

    {/* Renderer */}
    <S42Renderer
      schema={schema}
      layout={{
        layoutId: "epic-like",
        regions: [
          { id: "left-rail",  width: "0px", widgets: [] },
          { id: "top-strip",  height: "160px", widgets: ["metricStrip"] },
          { id: "main",       widgets: ["medTimeline"] },
          { id: "right-rail", width: "0px", widgets: [] }
        ],
        theme: "epic"
      }}
      bundle={bundle}
    />
  </div>
</Modal>
</LocalErrorBoundary>
);
}