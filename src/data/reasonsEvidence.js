// src/data/reasonsEvidence.js
// Canonical evidence + reasons for the Biosimilars panel

export const BIOSIMILAR_REASONS = [
  {
    key: "equivalence",
    title: "Proven Clinical Equivalence",
    blurb: "RCTs and systematic reviews show non-inferiority on efficacy/safety."
  },
  {
    key: "cost",
    title: "Cost Savings for Patients and the Health System",
    blurb: "Lower acquisition costs; savings accrue to patients and systems."
  },
  {
    key: "priorauth",
    title: "Reduced Prior Authorization Barriers",
    blurb: "Preferred biosimilars often reduce PA friction and time-to-therapy."
  },
  {
    key: "copay",
    title: "Lower Patient Copayments",
    blurb: "Real programs show dramatic copay reductions versus originators."
  },
  {
    key: "effectiveness",
    title: "Potential for Greater Real-World Effectiveness",
    blurb: "Lower cost + access → better adherence/persistence and outcomes."
  }
];

export const EVIDENCE_MAP = {
  equivalence: {
    points: [
      "Equivalence demonstrated in RCTs and systematic reviews",
      "Similar safety and immunogenicity to reference biologics"
    ],
    detail: `There is a wealth of evidence of the clinical equivalence of biosimilars from randomized controlled trials (RCTs) and systematic reviews.

In one of the most recent and comprehensive systematic reviews of RCTs, biosimilars met equivalence with reference biologics in terms of ACR20 response (24 RCTs with 10,259 patients; RR, 1.01; 95% CrI, 0.98 to 1.04; τ² = 0.000) and change of HAQ-DI scores (14 RCTs with 5,579 patients; SMD, −0.04; 95% CrI, −0.11 to 0.02; τ² = 0.002) considering prespecified margins of equivalence. Trial sequential analysis found evidence for equivalence for ACR20 since 2017 and HAQ-DI since 2016. Overall, biosimilars were associated with similar safety and immunogenicity profiles compared with reference biologics (Ascef et al. 2023). This strong evidence base ensures prescribers can confidently recommend biosimilars without compromising patient outcomes. The safety profile of biosimilars has also been shown to be similar to reference products in post-marketing studies (Nikitina et al. 2025).

This is not to say that automatically switching all patients to a biosimilar is appropriate or recommended. Switching is not without risk, and pharmacists should follow patients who switch to a biosimilar closely during the transition period to monitor for signs of flares/loss of disease control (Jankowska et al. 2025).`
  },

  cost: {
    points: [
      "Lower acquisition costs vs originators",
      "Savings accrue to patients (OOP) and health systems"
    ],
    detail: `Biosimilars reduce costs substantially for both patients and healthcare systems. Although biologics account for approximately 2% of all US prescriptions, they represent almost 40% (~$120 billion) of prescription drug spending (Kvien et al. 2022). Biosimilars are generally priced lower than their reference biologics, leading to substantial cost savings; reported savings with biosimilars range from 44% to 69% compared with the price of the reference drug.

Patients prescribed an infliximab biosimilar ultimately paid 12% less out of pocket than with the reference biologic (Socal et al. 2020). Use of less expensive biosimilars could save the US health system $54 billion over a decade (Mulcahy et al. 2018).`
  },

  priorauth: {
    points: [
      "Preferred biosimilars can reduce PA friction",
      "Transition programs show high retention with minimal gaps"
    ],
    detail: `Although head-to-head studies on prior authorization (PA) rejection rates are limited, real-world transition programs provide strong indirect evidence. One in four Medicare beneficiaries with rheumatoid arthritis (RA) use high-cost biologic DMARDs, and spending for these drugs has risen sharply for Medicare Part D. All plans from 50 states and Washington, DC covered at least one biologic DMARD, but the vast majority required PA (97%) (Yazdany et al. 2015).

In one large-scale program shifting patients from Humira to biosimilars, 91% of patients remained on biosimilars three months post-transition, with minimal therapy gaps and no meaningful increase in adverse events (Arzt et al. 2025). These findings suggest payer alignment with biosimilars reduces delays and administrative hurdles, thereby improving patient access.`
  },

  copay: {
    points: [
      "Copays for originators are often very high in Medicare",
      "Biosimilars can cut copays dramatically (e.g., ~97%)"
    ],
    detail: `Copayments for biologics are often substantial under Medicare plans, sometimes exceeding $2,700 annually. Nearly all Part D formulary plans (81% to 100%) require a percentage coinsurance (average 29.6% of drug cost) rather than a fixed dollar copayment. This translates into mean out-of-pocket costs of $2,712–$2,774 before reaching the catastrophic phase of coverage, during which beneficiaries pay 5% of drug costs. Medicare Advantage plans cover more individual biologic DMARDs (55% to 100%) than stand-alone drug plans (22% to 100%) but charge higher average coinsurance (31.1% vs. 29.0%). In contrast, 6 of 9 non-biologic DMARDs are covered by nearly all plans without PAs at fixed copayments averaging $5–$10 per month (Yazdany et al. 2015).

Real-world data demonstrate dramatic reductions in patient copayments for biosimilars. In a transition program, average patient copays fell by 97%, from $4.53/month (originator biologic) to $0.15/month (biosimilar) (Arzt et al. 2025). These reductions significantly lessen financial burden and may enhance adherence.`
  },

  effectiveness: {
    points: [
      "Lower costs + fewer barriers → better adherence/persistence",
      "Broader access can improve real-world outcomes"
    ],
    detail: `While RCTs confirm equivalence, real-world studies highlight how lower costs and reduced barriers can translate to superior outcomes. A study published in AJMC found that patients using biosimilars had higher adherence and lower out-of-pocket costs compared to those on reference products (Joszt 2021). Transition programs help organizations and their clinicians address issues raised by professionals and patients (Transitioning to a Biosimilar Program 2021).

The savings realized from the introduction of biosimilars have expanded treatment options and improved access to therapies across a spectrum of diseases. Cost savings from biosimilar use have also led to changes in treatment guidelines, increasing the availability of biologic medicines for earlier lines of therapy. This expansion of access can have a positive impact on the overall patient experience and can reduce the overall disease burden. However, the adoption of biosimilars has not been universally successful and faces challenges in the current healthcare landscape and in the pharmaceutical development pipeline (Kvien et al. 2025).`
  }
};