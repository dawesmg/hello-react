{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // src/data/reasonsEvidence.js\
export const REASONS_EVIDENCE = [\
  \{\
    id: "equivalence",\
    title: "Proven clinical equivalence",\
    summary: [\
      "Across randomized controlled trials and systematic reviews, biosimilars demonstrate equivalent efficacy to reference biologics (e.g., ACR20) and comparable safety and immunogenicity.",\
      "Large meta-analyses show effect estimates tightly centered on equivalence margins, and pharmacovigilance analyses do not suggest excess safety signals with biosimilars.",\
      "Switching is not automatically appropriate for everyone; close monitoring during transitions helps detect flares or loss of control early."\
    ],\
    references: [\
      \{\
        label: "Ascef et al. 2023 \'97 Therapeutic Equivalence of Biosimilars and Reference Biologics in RA (JAMA Netw Open)",\
        url: "https://jamanetwork.com/",\
        cite: "Meta-analysis of RCTs; equivalence for ACR20 and HAQ-DI."\
      \},\
      \{\
        label: "Nikitina et al. 2025 \'97 Comparative Safety (J Clin Med)",\
        url: "https://www.mdpi.com/",\
        cite: "EudraVigilance pharmacovigilance analysis; similar safety profiles."\
      \},\
      \{\
        label: "Jankowska et al. 2025 \'97 Nonmedical Switches (J Pharm Technol)",\
        url: "https://journals.sagepub.com/",\
        cite: "Switching requires monitoring; watch for flares/loss of control."\
      \}\
    ]\
  \},\
  \{\
    id: "cost-savings",\
    title: "Cost savings for patients and the health system",\
    summary: [\
      "Biologics are ~2% of prescriptions but ~40% of drug spend; biosimilars are priced lower and drive substantial savings.",\
      "Studies and models suggest large system-level savings and lower out-of-pocket costs for patients."\
    ],\
    references: [\
      \{\
        label: "Kvien et al. 2022 \'97 Cost burden perspective (Semin Arthritis Rheum)",\
        url: "https://www.sciencedirect.com/",\
        cite: "Biologics\'92 share of spend; savings potential with biosimilars."\
      \},\
      \{\
        label: "Socal et al. 2020 \'97 Employer savings brief (JHSPH)",\
        url: "https://www.eric.org/wp-content/uploads/2020/03/JHU-Savings-Opportunities-for-Large-Employers.pdf",\
        cite: "Lower patient OOP with infliximab biosimilars."\
      \},\
      \{\
        label: "Mulcahy et al. 2018 \'97 RAND estimate",\
        url: "https://www.rand.org/",\
        cite: "Projected U.S. savings ~$54B over a decade."\
      \}\
    ]\
  \},\
  \{\
    id: "pa-barriers",\
    title: "Reduced prior authorization barriers",\
    summary: [\
      "Medicare Part D commonly imposes PA on biologic DMARDs; alignment around biosimilars can reduce delays and improve access.",\
      "Transition programs show high persistence on biosimilars and minimal therapy gaps post-switch."\
    ],\
    references: [\
      \{\
        label: "Yazdany et al. 2015 \'97 Part D coverage analysis (Arthritis Rheumatol)",\
        url: "https://onlinelibrary.wiley.com/",\
        cite: "Widespread PA for biologic DMARDs."\
      \},\
      \{\
        label: "Arzt et al. 2025 \'97 Real-world Humira\uc0\u8594 biosimilars transitions (Navitus)",\
        url: "https://navitus.com/resources/real-world-data-demonstrates-successful-transitions-from-humira-to-biosimilars/",\
        cite: "91% remained on biosimilars at 3 months; minimal therapy gaps."\
      \}\
    ]\
  \},\
  \{\
    id: "lower-copays",\
    title: "Lower patient copayments",\
    summary: [\
      "Part D often uses percentage coinsurance (\uc0\u8776 30%), leading to high OOP on originators.",\
      "Programs demonstrate dramatic copay reductions (e.g., ~97%) after switching to biosimilars."\
    ],\
    references: [\
      \{\
        label: "Yazdany et al. 2015 \'97 Part D cost sharing (Arthritis Rheumatol)",\
        url: "https://onlinelibrary.wiley.com/",\
        cite: "Coinsurance common; high OOP for originators."\
      \},\
      \{\
        label: "Arzt et al. 2025 \'97 Copay reductions in transition program (Navitus)",\
        url: "https://navitus.com/resources/real-world-data-demonstrates-successful-transitions-from-humira-to-biosimilars/",\
        cite: "Avg patient copay fell by ~97% in program."\
      \}\
    ]\
  \},\
  \{\
    id: "real-world",\
    title: "Potential for greater real-world effectiveness",\
    summary: [\
      "Lower costs and reduced administrative barriers improve adherence and persistence, which can enhance real-world outcomes despite RCT equivalence.",\
      "Transition planning helps mitigate nocebo concerns when switching."\
    ],\
    references: [\
      \{\
        label: "Joszt 2021 \'97 Real-world evidence summary (AJMC)",\
        url: "https://www.ajmc.com/view/real-world-evidence-on-biosimilar-adherence-and-adoption",\
        cite: "Higher adherence and lower OOP with biosimilars."\
      \},\
      \{\
        label: "Kvien et al. 2025 \'97 Beyond cost: clinical/patient benefits (BioDrugs)",\
        url: "https://link.springer.com/",\
        cite: "Access expansion and earlier use from savings."\
      \},\
      \{\
        label: "Smolen et al. 2021 \'97 Nocebo in RA biosimilars (RMD Open)",\
        url: "https://rmdopen.bmj.com/",\
        cite: "Nocebo may affect subjective outcomes; plan transitions."\
      \},\
      \{\
        label: "Colloca 2023 \'97 Nocebo overview (Annu Rev Pharmacol Toxicol)",\
        url: "https://www.annualreviews.org/",\
        cite: "Mechanisms and mitigation strategies for nocebo."\
      \}\
    ]\
  \}\
];\
\
// Optional one-liner you can show under the modal as provenance.\
// Source: Summarized from your uploaded \'93Biosimilar_RA_Prescribing.docx\'94.\
export const EVIDENCE_PROVENANCE = "Summaries & citations derived from user-supplied evidence dossier.";}