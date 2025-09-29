import { useState } from 'react';
import AdminFlags from './AdminFlags.jsx';  // note: now from src/
import { getFlag } from './flags';

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
  const showAdminButton = getFlag('adminUi');

  return (
    <div className="p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My App</h1>
        {showAdminButton && (
          <button
            onClick={() => setShowAdmin(true)}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Admin
          </button>
        )}
      </header>

      <EvidenceHintsBar />

      <AdminFlags open={showAdmin} onClose={() => setShowAdmin(false)} />
    </div>
  );
}
