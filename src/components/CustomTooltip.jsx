import { C } from "../constants";
import { fmt, fmtMonth } from "../utils";

const isYM = (s) => typeof s === "string" && /^\d{4}-\d{2}$/.test(s);

export function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const displayLabel = isYM(label) ? fmtMonth(label) : label;
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: "10px 14px",
      fontSize: 12,
      fontFamily: "monospace",
    }}>
      <div style={{ color: C.muted, marginBottom: 4 }}>{displayLabel}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  );
}
