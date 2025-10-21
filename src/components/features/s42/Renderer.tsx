// src/components/features/s42/Renderer.tsx
import React, { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

/** Types kept loose for easy adoption; you can tighten later */
type AnyObj = Record<string, any>;

export interface S42RendererProps {
  schema: AnyObj;   // { metrics: [{ id, label, source: { resource, codes?, methodCode? }, bands? }], medTimeline? }
  layout: AnyObj;   // { layoutId, regions: [{ id, widgets: [...] }], theme? }
  bundle: AnyObj;   // FHIR Bundle JSON (entries)
}

/** ---------- Small helpers ---------- */
function getEntries(bundle: AnyObj) {
  return Array.isArray(bundle?.entry) ? bundle.entry.map((e) => e.resource || e) : [];
}
function iso(dateStr?: string) {
  const d = dateStr ? new Date(dateStr) : null;
  return d && !isNaN(d as any) ? d : null;
}
function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

/** Build a time-series from Observation resources per metric spec */
function obsSeriesAdapter(entries: AnyObj[], metric: AnyObj) {
  const methodCode = metric?.source?.methodCode; // e.g. SNOMED DAS28 method: 702660003
  const loincCodes = metric?.source?.codes || []; // if you use codes instead of method
  const winMonths = metric?.source?.windowMonths ?? 12;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - winMonths);

  const rows: { t: Date; v: number }[] = [];

  for (const r of entries) {
    if (r?.resourceType !== "Observation") continue;

    // Filter by method code (preferred for DAS28), else by code set
    const methodMatches = !!methodCode && Array.isArray(r?.method?.coding)
      ? r.method.coding.some((c: AnyObj) => c?.code === methodCode)
      : false;

    const codeMatches = loincCodes.length > 0 && Array.isArray(r?.code?.coding)
      ? r.code.coding.some((c: AnyObj) => loincCodes.includes(c?.code))
      : (r?.code?.text || "").toLowerCase().includes((metric?.label || "").toLowerCase()); // fallback by label text

    if (methodCode ? !methodMatches : (loincCodes.length ? !codeMatches : false)) continue;

    const when =
      iso(r?.effectiveDateTime) ||
      iso(r?.issued) ||
      (r?.effectivePeriod?.start && iso(r.effectivePeriod.start));
    const val = r?.valueQuantity?.value ?? r?.valueInteger ?? r?.valueDecimal;

    if (!when || when < cutoff) continue;
    if (typeof val !== "number") continue;

    rows.push({ t: when, v: val });
  }

  rows.sort((a, b) => a.t.getTime() - b.t.getTime());

  // Map to recharts-friendly shape
  return rows.map((row) => ({
    label: monthLabel(row.t),
    score: row.v,
  }));
}

/** Build med timeline rows from MedicationStatement/Request */
function medTimelineAdapter(entries: AnyObj[], spec: AnyObj) {
  const winMonths = spec?.windowMonths ?? 12;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - winMonths);

  const meds: {
    class: string;
    name: string;
    dose: string;
    start?: Date | null;
    end?: Date | null;
  }[] = [];

  for (const r of entries) {
    if (r?.resourceType !== "MedicationStatement" && r?.resourceType !== "MedicationRequest") continue;

    const label =
      r?.medicationReference?.display ||
      r?.medicationCodeableConcept?.text ||
      "Medication";

    const dose =
      r?.dosage?.[0]?.text ||
      r?.dosageInstruction?.[0]?.text ||
      "";

    const cls = r?.category?.class || r?.category?.coding?.[0]?.display || r?.category?.text || "Other";

    const start =
      iso(r?.effectivePeriod?.start) ||
      iso(r?.authoredOn) ||
      null;

    const end = iso(r?.effectivePeriod?.end) || null;

    if (start && start < cutoff && (!end || end < cutoff)) continue; // out of window entirely

    meds.push({
      class: cls,
      name: label,
      dose,
      start,
      end,
    });
  }

  // group by class
  const byClass = new Map<string, typeof meds>();
  for (const m of meds) {
    const key = m.class || "Other";
    byClass.set(key, [...(byClass.get(key) || []), m]);
  }
  return Array.from(byClass.entries()); // [ [className, meds[]], ... ]
}

/** Simple class colors */
const CLASS_COLOR: Record<string, string> = {
  NSAID: "#38bdf8",
  csDMARD: "#6366f1",
  "bDMARD (TNF)": "#8b5cf6",
  "bDMARD (TNF) – biosimilar": "#10b981",
  Other: "#94a3b8",
};

/** ---------- Small presentational pieces ---------- */
function MetricLine({ title, series, bands }: { title: string; series: any[]; bands?: any[] }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={Array.isArray(series) ? series : []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="score" stroke="#111827" strokeWidth={3} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {Array.isArray(bands) && bands.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 12, color: "#475569" }}>
          {bands.map((b, i) => (
            <span key={i}>
              <strong>{b.label}</strong>
              {" "}
              {b.min != null ? `≥ ${b.min}` : ""}
              {b.max != null ? (b.min != null ? " and " : "≤ ") + b.max : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MedTimeline({ groups, months = 12 }: { groups: [string, AnyObj[]][], months?: number }) {
  const monthCols = useMemo(() => {
    const out: string[] = [];
    const start = new Date();
    start.setMonth(start.getMonth() - (months - 1));
    for (let i = 0; i < months; i++) {
      const d = new Date(start);
      d.setMonth(start.getMonth() + i);
      out.push(monthLabel(d));
    }
    return out;
  }, [months]);

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Medication Timeline</div>
      <div style={{ display: "grid", gridTemplateColumns: `220px repeat(${monthCols.length}, 1fr)`, gap: 4 }}>
        <div />
        {monthCols.map((m, i) => (
          <div key={i} style={{ fontSize: 10, textAlign: "center", color: "#6b7280" }}>{m}</div>
        ))}
        {groups.map(([cls, items], gi) => (
          <React.Fragment key={gi}>
            {items.map((med: AnyObj, mi: number) => {
              // map start/end to month indices (rough)
              const start = med.start ? new Date(med.start) : null;
              const end = med.end ? new Date(med.end) : null;
              const first = new Date();
              first.setMonth(first.getMonth() - (monthCols.length - 1));

              const toIdx = (d: Date | null) => {
                if (!d) return monthCols.length - 1;
                const diffMonths = (d.getFullYear() - first.getFullYear()) * 12 + (d.getMonth() - first.getMonth());
                return Math.max(0, Math.min(monthCols.length - 1, diffMonths));
              };

              const sIdx = toIdx(start);
              const eIdx = toIdx(end);

              return (
                <React.Fragment key={mi}>
                  <div style={{ padding: "6px 8px", textAlign: "right", fontSize: 12, color: "#374151" }}>
                    <div style={{ fontWeight: 600 }}>{med.name || "Medication"}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{med.dose || ""}</div>
                  </div>
                  {monthCols.map((_, col) => {
                    const active = col >= sIdx && col <= eIdx;
                    return (
                      <div
                        key={col}
                        style={{
                          height: 20,
                          borderRadius: 4,
                          background: active ? (CLASS_COLOR[cls] || CLASS_COLOR.Other) : "#f3f4f6",
                        }}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/** ---------- Renderer ---------- */
export function S42Renderer({ schema, layout, bundle }: S42RendererProps) {
  const entries = useMemo(() => getEntries(bundle), [bundle]);

  // Build metric series for all metrics in schema
  const metricSeries = useMemo(() => {
    const out: Record<string, any[]> = {};
    for (const m of schema?.metrics || []) {
      try {
        out[m.id] = obsSeriesAdapter(entries, m);
      } catch (e) {
        console.error("metric adapter failed:", m?.id, e);
        out[m.id] = [];
      }
    }
    return out;
  }, [entries, schema]);

  // Build med timeline groups
  const medGroups = useMemo(() => {
    try {
      return schema?.medTimeline ? medTimelineAdapter(entries, schema.medTimeline) : [];
    } catch (e) {
      console.error("timeline adapter failed:", e);
      return [];
    }
  }, [entries, schema]);

  // Regions with guards
  const left  = layout?.regions?.find?.((r: AnyObj) => r.id === "left-rail")?.widgets || [];
  const top   = layout?.regions?.find?.((r: AnyObj) => r.id === "top-strip")?.widgets || [];
  const main  = layout?.regions?.find?.((r: AnyObj) => r.id === "main")?.widgets || [];
  const right = layout?.regions?.find?.((r: AnyObj) => r.id === "right-rail")?.widgets || [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: `${left.length ? "260px" : "0px"} 1fr ${right.length ? "340px" : "0px"}`, gap: 12 }}>
      {/* Left rail */}
      <div>{/* reserved for patient/conditions widgets later */}</div>

      {/* Center column */}
      <div style={{ display: "grid", gap: 12 }}>
        {/* Top strip widgets */}
        {top.includes("metricStrip") && (
          <div>
            {(schema?.metrics || []).map((m: AnyObj) => (
              <MetricLine
                key={m.id}
                title={m.label}
                series={metricSeries[m.id] || []}
                bands={m.bands}
              />
            ))}
          </div>
        )}

        {/* Main widgets */}
        {main.includes("medTimeline") && (
          <MedTimeline groups={medGroups} months={schema?.medTimeline?.windowMonths ?? 12} />
        )}
        {main.includes("cdsBanner") && (
          <div style={{ background: "#ecfeff", border: "1px solid #cffafe", padding: 12, borderRadius: 10, color: "#155e75" }}>
            CDSS placeholder — plug rules engine here.
          </div>
        )}
        {main.includes("rtpbBox") && (
          <div style={{ background: "#fef9c3", border: "1px solid #fde68a", padding: 12, borderRadius: 10, color: "#7c2d12" }}>
            RTPB placeholder — show PA/copay likelihood here.
          </div>
        )}
      </div>

      {/* Right rail */}
      <div>{/* reserved for monograph/notes widgets later */}</div>
    </div>
  );
}