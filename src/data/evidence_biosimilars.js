// src/data/evidence_biosimilars.js
const EVIDENCE = {
  copay: {
    title: "Lower copays support adherence",
    points: [
      "Biologic DMARDs often use percentage coinsurance, creating high monthly out-of-pocket costs.",
      "Transitions to biosimilars have shown dramatic copay reductions and maintained persistence."
    ],
    detailHtml: `
      <p><strong>Summary.</strong> Percentage-based coinsurance on originator biologics can result in substantial monthly OOP burden. Real-world transitions to biosimilars have reduced patient copays markedly and maintained persistence.</p>
      <ul>
        <li>Medicare Part D and many commercial plans commonly apply coinsurance to biologic DMARDs, raising monthly OOP.</li>
        <li>Large Humira→biosimilar programs report ~order-of-magnitude copay reductions with high on-therapy persistence.</li>
      </ul>
    `,
    references: [
      {
        label: "Yazdany et al., 2015 — Part D coverage/cost sharing for biologics",
        url: "https://onlinelibrary.wiley.com/"
      },
      {
        label: "Navitus 2025 — Real-world Humira→biosimilar transitions (copay ↓, persistence ↑)",
        url: "https://navitus.com/resources/real-world-data-demonstrates-successful-transitions-from-humira-to-biosimilars/"
      }
    ]
  }
};

export default EVIDENCE;