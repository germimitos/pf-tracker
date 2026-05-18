import { C } from "../constants";

export function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <span style={{ color: C.muted, fontSize: 11, fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ color: color || C.text, fontSize: 26, fontWeight: 700, fontFamily: "monospace" }}>
        {value}
      </span>
      {sub && <span style={{ color: C.muted, fontSize: 12 }}>{sub}</span>}
    </div>
  );
}
