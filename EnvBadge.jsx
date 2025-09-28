// src/components/EnvBadge.jsx
export default function EnvBadge() {
  const env = import.meta.env.VITE_APP_ENV || "dev";

  const styles = {
    position: "fixed",
    bottom: 8,
    right: 8,
    background: env === "prod" ? "#16a34a" : env === "preview" ? "#facc15" : "#3b82f6",
    color: "#fff",
    padding: "4px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    opacity: 0.85,
    zIndex: 9999,
  };

  return <div style={styles}>{env.toUpperCase()}</div>;
}
