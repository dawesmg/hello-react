// src/App.jsx
import { useState } from 'react';
import RTPB_AllRA from './RTPB_AllRA';        // your existing main component
import AdminFlags from './AdminFlags.jsx';    // admin modal
import { getFlag } from './flags';            // feature flags helper

// Example gated UI element
function EvidenceHintsBar() {
  if (!getFlag('evidenceHints')) return null;
  return (
    <div className="my-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
      💡 <span className="font-medium">Evidence hints:</span> Try hovering the
      treatment names to see guideline excerpts and citations.
    </div>
  );
}

export default function App() {
  const [showAdmin, setShowAdmin] = useState(false);
  const showAdminButton = getFlag('adminUi'); // defaults: dev/preview = true, prod = false

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Top bar / header */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-xl font-semibold">GenXys – RA Decision Support</h1>

        {showAdminButton && (
          <button
            onClick={() => setShowAdmin(true)}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
            title="Open Admin flags"
          >
            Admin
          </button>
        )}
      </header>

      {/* Optional: gated helper UI */}
      <div className="px-4">
        <EvidenceHintsBar />
      </div>

      {/* Main content (your existing app) */}
      <main className="px-4 py-6">
        <RTPB_AllRA />
      </main>

      {/* Admin flags modal */}
      <AdminFlags open={showAdmin} onClose={() => setShowAdmin(false)} />
    </div>
  );
}
