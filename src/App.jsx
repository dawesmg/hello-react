import RTPB_AllRA from "./RTPB_AllRA";

// Inline EnvBadge component (no separate file needed)
function EnvBadge() {
  const raw = import.meta.env.VITE_APP_ENV ?? "dev";
  const env = String(raw).trim().toLowerCase();   // normalize casing

  const bg =
    env === "prod"    ? "#16a34a" :   // green
    env === "preview" ? "#f59e0b" :   // yellow
                        "#3b82f6";    // blue (dev/default)

  return (
    <div
      style={{
        position: "fixed",
        right: 8,
        bottom: 8,
        background: bg,
        color: "#fff",
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 11,
        fontWeight: 600,
        opacity: 0.9,
        zIndex: 9999,
      }}
    >
      {env.toUpperCase()}
    </div>
  );
}
export default function App() {
  return (
    <div>
      <RTPB_AllRA />
      <EnvBadge />
    </div>
  );
}
