// src/pa/evaluatePA.js
// Minimal, safe rules engine for the demo.
// - Enforces TB/HBV date requirements
// - Enforces: biologic/JAK needs disease activity >= moderate
// Replace/expand with real payer rules later.

// Resolve a canonical drugKey from rules + names
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

// Treat these as biologics/JAKi for the “activity must be ≥ moderate” guard
const BIOLOGICS = new Set([
  "adalimumab", "etanercept", "infliximab", "golimumab",
  "certolizumab", "abatacept", "tocilizumab", "sarilumab",
  "rituximab"
]);
const JAKS = new Set([
  "tofacitinib", "upadacitinib", "baricitinib", "filgotinib"
]);

function normalizeCtx(ctx) {
  return {
    ...ctx,
    diseaseActivity: (ctx?.diseaseActivity || "").toLowerCase().trim()
  };
}

// Optional: tiny ladder if you expand to numeric later
const ACTIVITY_ORDER = ["low", "moderate", "high"];
function isBelowRequiredActivity(activity, minRequired) {
  const a = ACTIVITY_ORDER.indexOf((activity || "").toLowerCase());
  const r = ACTIVITY_ORDER.indexOf((minRequired || "").toLowerCase());
  return a !== -1 && r !== -1 && a < r;
}

export function evaluatePA(rules, payerId, drugKey, phase, ctx = {}) {
  const nctx = normalizeCtx(ctx);
  const missing = [];
  const messages = [];
  let considered = 0;

  const dk = (drugKey || "").toLowerCase();
  const isBiologicOrJAK = BIOLOGICS.has(dk) || JAKS.has(dk);

  // 1) Activity guard
  if (isBiologicOrJAK) {
    considered++;
    if (isBelowRequiredActivity(nctx.diseaseActivity, "moderate")) {
      missing.push("diseaseActivity_moderate_or_high");
      messages.push("For biologic/JAK initiation or re-auth, requires at least moderate disease activity.");
    }
  }

  // 2) TB/HBV screening
  considered++;
  const hasTB = !!nctx?.labs?.tuberculosis_screening_date;
  const hasHBV = !!nctx?.labs?.hepatitis_b_screening_date;
  if (!hasTB) missing.push("tuberculosis_screening_date");
  if (!hasHBV) missing.push("hepatitis_b_screening_date");
  if (!hasTB || !hasHBV) {
    messages.push("TB/HBV screening dates required.");
  }

  // 3) Prior csDMARD trial/failure required for biologic/JAK initiation
if (isBiologicOrJAK) {
  considered++;
  const csTried = (nctx.priorTherapies || []).some(
    t => (t.class || "").toLowerCase() === "csdmard" &&
         ["failed","ineffective","intolerant","contraindicated"].includes((t.outcome || "").toLowerCase())
  );
  if (!csTried) {
    missing.push("csDMARD_trial_failure");
    messages.push("Document prior csDMARD trial/failure (e.g., methotrexate).");
  }
}
// 4) Prescriber specialty (hard requirement – pend if not rheum/immunology)
considered++;
const spec = (nctx.prescriber?.specialty || "").toLowerCase();
if (!/(rheumatology|immunology|internal-medicine-rheum)/.test(spec)) {
  missing.push("prescriber_specialty_rheumatology");
  messages.push("Prescriber must be Rheumatology/Immunology (or Internal Medicine—Rheum).");
}

// 5) No concurrent biologic or JAK allowed
if ((nctx.concurrentTherapies || []).length > 0) {
  considered++;

  const conflict = nctx.concurrentTherapies.some((t) => {
    const cls = (t.class || "").toLowerCase().trim();     // e.g., "biologic" or "jaki"
    const nm  = (t.name  || "").toLowerCase().trim();     // e.g., "etanercept"

    const isBiologicByClass = cls === "biologic";
    const isJAKByClass      = cls === "jaki" || cls === "jak" || cls === "jak inhibitor";

    const isBiologicByName  = BIOLOGICS.has(nm);
    const isJAKByName       = JAKS.has(nm);

    return isBiologicByClass || isJAKByClass || isBiologicByName || isJAKByName;
  });

  if (conflict) {
    missing.push("no_concurrent_immunomodulators");
    messages.push("Cannot combine with another biologic or JAK at the same time.");
  }
}

  // 6) Safety attestations for JAKs
  if (JAKS.has(dk)) {
    considered++;
    const att = nctx.safetyAttestations || {};
    const needed = [];
    if (!att.cv_risk_discussed) needed.push("cv_risk_discussed");
    if (!att.thrombosis_risk_discussed) needed.push("thrombosis_risk_discussed");
    if (!att.malignancy_risk_discussed) needed.push("malignancy_risk_discussed");
    if (needed.length > 0) {
      missing.push(...needed);
      messages.push("Safety JAK attestations required (CV, thrombosis, malignancy).");
    }
  }

  const decision = missing.length === 0 ? "approve" : "needsInfo";
  return { decision, messages, missing, considered, approvalMonths: 12 };
}
