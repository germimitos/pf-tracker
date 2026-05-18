export const fmt = (n) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

export const pct = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

export const perf = (actuel, revient) => ((actuel - revient) / revient) * 100;

export const fmtMonth = (ym) => {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1).toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
};
