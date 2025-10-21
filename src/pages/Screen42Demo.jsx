import React from "react";
import { Screen42Launcher } from "../components/Screen42";

export default function Screen42Demo() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <Screen42Launcher fetchUrl="/api/sandbox/PRISM_FHIR_Bundle_42_demo.json" />
    </div>
  );
}