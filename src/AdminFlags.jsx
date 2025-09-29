// src/components/AdminFlags.jsx
import { useEffect, useState } from 'react';
import { listFlags, setFlag, resetFlag, subscribe } from '../flags';

export default function AdminFlags({ open, onClose }) {
  const [flags, setFlags] = useState(listFlags());

  useEffect(() => {
    const unsub = subscribe(setFlags);
    return () => unsub();
  }, []);

  if (!open) return null;

  const handleToggle = (name, checked) => {
    setFlag(name, checked);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal */}
      <div className="relative z-10 w-[min(680px,95vw)] rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Feature Flags</h2>
          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          {flags.map((f) => (
            <div
              key={f.name}
              className="grid grid-cols-[1fr_auto] items-start gap-3 rounded-xl border p-3"
            >
              <div>
                <div className="font-medium">{f.name}</div>
                {f.description && (
                  <div className="text-sm text-gray-600">{f.description}</div>
                )}
                <div className="mt-1 text-xs text-gray-500">
                  Source: <span className="font-mono">{f.source}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(f.value)}
                    onChange={(e) => handleToggle(f.name, e.target.checked)}
                  />
                  <span className="text-sm">Enabled</span>
                </label>
                <button
                  onClick={() => resetFlag(f.name)}
                  className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                  title="Revert to environment default"
                >
                  Reset
                </button>
              </div>
            </div>
          ))}

          <div className="pt-2 text-xs text-gray-500">
            Changes persist in <code>localStorage</code>. Use “Reset” to revert a flag
            back to your environment default.
          </div>
        </div>
      </div>
    </div>
  );
}
