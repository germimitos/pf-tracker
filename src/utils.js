export const fmt = (n) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

export const pct = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

export const perf = (actuel, revient) => ((actuel - revient) / revient) * 100;

export function derivePositions(txArr, priceCache) {
  const map = new Map();

  for (const tx of txArr) {
    const key = tx.ticker;
    if (!map.has(key)) {
      map.set(key, { nom: tx.nom, secteur: tx.secteur, nbActions: 0, totalCost: 0 });
    }
    const b = map.get(key);

    if (tx.type === "ACHAT") {
      let cost, shares;
      if (tx.qte != null) {
        // Format actuel : qte × prixAchat (par action) + frais
        cost   = (tx.qte * (tx.prixAchat || 0)) + (tx.frais || 0);
        shares = tx.qte;
      } else if (tx.prixLive != null) {
        // Format intermédiaire : prixAchat = montant total, prixLive = par action
        cost   = (tx.prixAchat || 0) + (tx.frais || 0);
        shares = tx.nbActions;
      } else {
        // Format v1 : nbActions × prixUnitaireEUR
        cost   = tx.nbActions * (tx.prixUnitaireEUR ?? tx.prixUnitaire ?? 0);
        shares = tx.nbActions;
      }
      b.totalCost += cost;
      b.nbActions += shares;
    } else {
      const avg     = b.nbActions > 0 ? b.totalCost / b.nbActions : 0;
      b.totalCost  -= avg * tx.nbActions;
      b.nbActions  -= tx.nbActions;
      if (b.nbActions < 0) b.nbActions = 0;
      if (b.totalCost  < 0) b.totalCost  = 0;
    }
  }

  const positions = [];
  for (const [ticker, b] of map) {
    if (b.nbActions <= 0) continue;
    const cached       = priceCache?.[ticker];
    const prixActuelEUR = cached?.prixActuelEUR ?? 0;
    positions.push({
      ticker,
      nom:            b.nom,
      secteur:        b.secteur,
      nbActions:      b.nbActions,
      prixAchat:      b.nbActions > 0 ? b.totalCost / b.nbActions : 0,
      prixActuel:     prixActuelEUR,
      valeurActuelle: b.nbActions * prixActuelEUR,
      prixRevient:    b.totalCost,
      devise:         cached?.devise ?? "EUR",
    });
  }
  return positions;
}

export const fmtMonth = (ym) => {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1).toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
};
