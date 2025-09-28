import RTPB_AllRA from "./RTPB_AllRA";

// Inline EnvBadge component (no separate file needed)
function EnvBadge() {
  const env = import.meta.env.VITE_APP_ENV || "dev";
  const bg = env === "prod" ? "#16a34a" : env === "preview" ? "#f59e0b" : "#3b82f6";
  return (
    <div
      title={`Environment: ${String(env).toUpperCase()}`}
      style={{
        position: "fixed",
        right: 8,
        bottom: 8,
        zIndex: 9999,
        background: bg,
        color: "#fff",
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 11,
        fontWeight: 600,
        opacity: 0.9,
      }}
    >
      {String(env).toUpperCase()}
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
