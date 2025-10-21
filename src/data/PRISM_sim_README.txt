
PRISM – Simulated EMR Data Mapping (RA, 12 months)

Files created:
1) PRISM_sim_FHIR_Bundle_RA.json  – FHIR R4 Bundle with Patient, Condition (RA), Observation (DAS28-like),
                                     Medication (with RxNorm & NDC placeholders), MedicationStatement (history).
2) PRISM_sim_Medications_12mo.csv – Flat extract of medication history.
3) PRISM_sim_DAS28_timeseries.csv  – Disease activity score time series.

Recommended PRISM field mappings:
- patient_id           ← Bundle.entry[Patient].id
- condition_codes      ← Condition.code.coding[*] (SNOMED 69896004; ICD-10 M06.9)
- activity_score_ts    ← Observation(code = DAS28).valueQuantity.value over time
- activity_band        ← Observation.interpretation.text (“High (red)”, “Moderate (yellow)”, “Low (green)”)
- medication_class     ← derived (NSAID / csDMARD / bDMARD / biosimilar) from Medication.code.display or formulary map
- medication_name      ← Medication.code.text
- rxnorm_code          ← Medication.code.coding(system=RxNorm).code
- ndc_code             ← Medication.code.coding(system=NDC).code
- dose_mg              ← MedicationStatement.dosage.doseAndRate[0].doseQuantity.value
- route                ← MedicationStatement.dosage.route.coding[0].display
- regimen              ← MedicationStatement.dosage.timing.code.text
- start_date           ← MedicationStatement.effectivePeriod.start
- end_date             ← MedicationStatement.effectivePeriod.end

Notes:
- Codes are placeholders for simulation. Replace with real RxNorm/NDC when hitting live EMR/formulary.
- DAS28 codes: for production, use an agreed LOINC code for DAS28 (CRP/ESR variant) and keep thresholds aligned to your RA decision tree.
