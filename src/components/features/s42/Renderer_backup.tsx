// =============================================
// Screen42 Schema‑Driven Starter
// Files in one place for easy copy/paste into your repo.
// Suggested structure:
//   src/features/s42/Renderer.tsx
//   src/features/s42/adapters.ts
//   src/features/s42/schemas/ra.json
//   src/features/s42/schemas/t2d.json
//   src/features/s42/layouts/epic-like.json
//   src/features/s42/theme/tokens.ts
// =============================================

// ===================== Renderer.tsx =====================
import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ---- Types ----
type MetricBand = { label: string; min?: number; max?: number; colorToken: string };

export type S42Metric = {
  id: string;
  label: string;
  type: "line" | "sparkline" | "gauge" | "badge";
  unit?: string;
  source: {
    resource: "Observation";
    codeSystem?: string;        // e.g., "http://loinc.org"
    codes?: string[];           // e.g., ["1988-5"] for CRP
    methodCodeSystem?: string;  // e.g., SNOMED for DAS28 method
    methodCode?: string;        // e.g., 702660003
    windowMonths?: number;      // default 12
  };
  bands?: MetricBand[];
};

export type S42Schema = {
  id: string;
  name: string;
  metrics: S42Metric[];
  medTimeline?: {
    resource: "MedicationStatement";
    groupBy: string; // e.g., "class"
    labelFrom: string[]; // paths to try in order
    doseFrom: string[];  // paths to try in order
    windowMonths?: number;
  };
  cds?: { engine: string; rulesetId?: string; inputs?: string[] };
  rtpb?: { enabled: boolean };
};

export type S42Layout = {
  layoutId: string;
  regions: { id: string; width?: string; height?: string; widgets: string[] }[];
  theme?: string; // "epic" | "clean" | "contrast"
};

// ---- Minimal tokens (swap with your design system) ----
const TOKENS: Record<string, string> = {
  "severity.low": "#10b981",
  "severity.med": "#f59e0b",
  "severity.high": "#ef4444",
  "surface.card": "#ffffff",
  "border.muted": "#e5e7eb",
  "text.base": "#111827",
  "text.muted": "#6b7280",
};

// ---- Utilities ----
function monthLabels(): string[] {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const arr: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(start);
    m.setMonth(m.getMonth() - i);
    arr.push(m.toLocaleDateString(undefined, { month: "short", year: "2-digit" }));
  }
  return arr;
}

function pathGet(obj: any, path: string): any {
  return path.split(".").reduce((acc: any, key: string) => (acc ? acc[key] : undefined), obj);
}

// ---- Adapters (can be moved to adapters.ts) ----
export function obsSeriesAdapter(bundle: any, metric: S42Metric): { date: string; value: number }[] {
  const entries = Array.isArray(bundle?.entry) ? bundle.entry : [];
  const items = entries
    .map((e: any) => e.resource)
    .filter((r: any) => r?.resourceType === "Observation")
    .filter((r: any) => {
      const codes = metric.source.codes || [];
      const cs = metric.source.codeSystem;
      if (!codes.length) return true; // allow local code tests
      const coding = r.code?.coding || [];
      return coding.some((c: any) => c.system === cs && codes.includes(String(c.code)));
    })
    .filter((r: any) => {
      if (!metric.source.methodCode) return true;
      const methodCode = metric.source.methodCode;
      const methodSys = metric.source.methodCodeSystem;
      const method = r.method?.coding || [];
      return method.some((m: any) => (!methodSys || m.system === methodSys) && String(m.code) === String(methodCode));
    })
    .map((r: any) => ({
      date: r.effectiveDateTime || r.issued || r.meta?.lastUpdated || "",
      value: Number(r.valueQuantity?.value),
    }))
    .filter((x: any) => !Number.isNaN(x.value))
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const window = metric.source.windowMonths ?? 12;
  const sliced = items.slice(-window);
  return sliced.map((it, i) => ({ date: String(i), value: it.value }));
}

export function medTimelineAdapter(bundle: any, conf: S42Schema["medTimeline"]) {
  if (!conf) return [];
  const entries = Array.isArray(bundle?.entry) ? bundle.entry : [];
  const stmts = entries.map((e: any) => e.resource).filter((r: any) => r?.resourceType === "MedicationStatement");
  const toIdx = (iso?: string) => {
    if (!iso) return -1;
    const dt = new Date(iso);
    const base = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const diff = (dt.getFullYear() - base.getFullYear()) * 12 + (dt.getMonth() - base.getMonth());
    const idx = 11 + diff;
    return Math.max(0, Math.min(11, idx));
  };
  return stmts.map((s: any) => {
    const label = conf.labelFrom.map((p) => pathGet(s, p)).find(Boolean) || "Medication";
    const dose = conf.doseFrom.map((p) => pathGet(s, p)).find(Boolean) || "";
    const groupBy = pathGet(s, conf.groupBy) || inferClass(label);
    const start = toIdx(s.effectivePeriod?.start);
    const end = toIdx(s.effectivePeriod?.end);
    return { class: groupBy, name: label, dose, start, end };
  }).filter((x: any) => x.start >= 0 && x.end >= 0);
}

function inferClass(name: string): string {
  if (/Methotrexate/i.test(name)) return "csDMARD";
  if (/Adalimumab/i.test(name)) return "bDMARD (TNF)";
  if (/Naproxen|Ibuprofen/i.test(name)) return "NSAID";
  return "Other";
}

// ---- Widgets ----
function MetricLine({ series, label, bands, unit }: { series: { label: string; score: number }[]; label: string; bands?: MetricBand[]; unit?: string }) {
  return (
    <div style={{ border: `1px solid ${TOKENS["border.muted"]}`, background: TOKENS["surface.card"], borderRadius: 10, padding: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip formatter={(v: any) => `${v}${unit ? ` ${unit}` : ""}`} />
            <Line type="monotone" dataKey="score" stroke="#111827" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {bands && (
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: TOKENS["text.muted"], marginTop: 8 }}>
          {bands.map((b) => (
            <span key={b.label}>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 999, background: TOKENS[b.colorToken] }} /> {b.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MedTimeline({ groups, months }: { groups: [string, any[]][]; months: string[] }) {
  const color: Record<string, string> = {
    NSAID: "#38bdf8",
    csDMARD: "#6366f1",
    "bDMARD (TNF)": "#8b5cf6",
    "bDMARD (TNF) – biosimilar": "#10b981",
    Other: "#a3a3a3",
  };
  return (
    <div style={{ border: `1px solid ${TOKENS["border.muted"]}`, background: TOKENS["surface.card"], borderRadius: 10, padding: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Medication Timeline</div>
      <div style={{ display: "grid", gridTemplateColumns: `220px repeat(${months.length}, 1fr)`, gap: 4 }}>
        <div />
        {months.map((m, i) => (
          <div key={i} style={{ fontSize: 10, textAlign: "center", color: TOKENS["text.muted"] }}>{m}</div>
        ))}
        {groups.map(([clazz, items]) => (
          <React.Fragment key={clazz}>
            {items.map((med, idx) => (
              <React.Fragment key={`${clazz}-${idx}`}>
                <div style={{ padding: "6px 8px", textAlign: "right", fontSize: 12, color: TOKENS["text.base"] }}>
                  <div style={{ fontWeight: 600 }}>{med.name}</div>
                  <div style={{ fontSize: 11, color: TOKENS["text.muted"] }}>{med.dose}</div>
                </div>
                {months.map((_, col) => {
                  const active = col >= med.start && col <= med.end;
                  return (
                    <div key={col} style={{ height: 20, borderRadius: 4, background: active ? (color[clazz] || "#a3a3a3") : "#f3f4f6" }} />
                  );
                })}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ---- Renderer ----
export function S42Renderer({ schema, layout, bundle }: { schema: S42Schema; layout: S42Layout; bundle: any }) {
  const months = useMemo(() => monthLabels(), []);

  // Build metric series
  const metricSeries = useMemo(() => {
    const result: Record<string, { label: string; score: number }[]> = {};
    for (const m of schema.metrics) {
      const series = obsSeriesAdapter(bundle, m);
      const points = series.map((s, i) => ({ label: months[i] ?? String(i), score: s.value }));
      result[m.id] = points;
    }
    return result;
  }, [schema, bundle, months]);

  // Build med timeline groups
  const medGroups = useMemo(() => {
    if (!schema.medTimeline) return [] as [string, any[]][];
    const rows = medTimelineAdapter(bundle, schema.medTimeline);
    const m = new Map<string, any[]>();
    rows.forEach((x) => { if (!m.has(x.class)) m.set(x.class, []); m.get(x.class)!.push(x); });
    return Array.from(m.entries());
  }, [schema, bundle]);

  // Region renderer (minimal for now)
  function renderWidget(w: string, i: number) {
    if (w === "metricStrip") {
      return (
        <div key={`w-${i}`} style={{ display: "grid", gap: 12 }}>
          {schema.metrics.map((m) => (
            <MetricLine key={m.id} series={metricSeries[m.id] || []} label={m.label} bands={m.bands} unit={m.unit} />
          ))}
        </div>
      );
    }
    if (w === "medTimeline") {
      return <MedTimeline key={`w-${i}`} groups={medGroups} months={months} />;
    }
    if (w === "cdsBanner") {
      return (
        <div key={`w-${i}`} style={{ border: `1px solid ${TOKENS["border.muted"]}`, background: TOKENS["surface.card"], borderRadius: 10, padding: 12 }}>
          <strong>CDSS</strong>: recommendation engine placeholder (ruleset {schema.cds?.rulesetId || "—"}).
        </div>
      );
    }
    if (w === "rtpbBox" && schema.rtpb?.enabled) {
      return (
        <div key={`w-${i}`} style={{ border: `1px solid ${TOKENS["border.muted"]}`, background: TOKENS["surface.card"], borderRadius: 10, padding: 12 }}>
          <strong>Benefits</strong>: PA likelihood & copay (stub). Integrate NCPDP RTPB v13 here.
        </div>
      );
    }
    return (
      <div key={`w-${i}`} style={{ border: `1px solid ${TOKENS["border.muted"]}`, background: TOKENS["surface.card"], borderRadius: 10, padding: 12 }}>
        Placeholder widget: {w}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: `${layout.regions.find(r=>r.id==="left-rail")?.width||"0px"} 1fr ${layout.regions.find(r=>r.id==="right-rail")?.width||"0px"}`, gap: 12 }}>
      {/* Left rail */}
      <div>
        {layout.regions.find(r => r.id === "left-rail")?.widgets.map(renderWidget)}
      </div>
      {/* Main column */}
      <div>
        {layout.regions.find(r => r.id === "top-strip")?.widgets.map(renderWidget)}
        {layout.regions.find(r => r.id === "main")?.widgets.map(renderWidget)}
      </div>
      {/* Right rail */}
      <div>
        {layout.regions.find(r => r.id === "right-rail")?.widgets.map(renderWidget)}
      </div>
    </div>
  );
}