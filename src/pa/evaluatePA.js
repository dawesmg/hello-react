// src/pa/evaluatePA.js
// Minimal, safe stub: enough to prove wiring. Replace later with real rules.

export function resolveDrugKey(rules, generic, brand) {
  const g = (generic || "").toLowerCase();
  const b = (brand || "").toLowerCase();
  const payer = rules?.payers?.[0];
  for (const d of payer?.drugs || []) {
    if (d.drugKey === g) return d.drugKey;
    if ((d.aliases || []).some(a => a.toLowerCase() === g || a.toLowerCase() === b)) return d.drugKey;
  }
  return g || b || null;
}

export function evaluatePA(rules, payerId, drugKey, phase, ctx) {
  // For now, "needs info" unless both TB/HBV dates exist — proves UI.
  const needs =
    !ctx?.labs?.tuberculosis_screening_date ||
    !ctx?.labs?.hepatitis_b_screening_date;

  return needs
    ? {
        decision: "pend",
        messages: ["TB/HBV screening dates required."],
        missing: ["tuberculosis_screening_date", "hepatitis_b_screening_date"],
        considered: 2,
        approvalMonths: 12
      }
    : {
        decision: "approve",
        messages: ["All basic checks passed."],
        missing: [],
        considered: 2,
        approvalMonths: 12
      };
}