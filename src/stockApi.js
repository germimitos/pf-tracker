// Les appels passent par le proxy Vite (/api/yf → query1.finance.yahoo.com)
// ce qui évite les restrictions CORS du navigateur.
export async function fetchQuote(ticker) {
  const url        = `/api/yf/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error(`Ticker "${ticker}" introuvable`);

    return {
      nom:        meta.longName || meta.shortName || ticker,
      prixActuel: meta.regularMarketPrice ?? 0,
      devise:     meta.currency ?? "USD",
    };
  } finally {
    clearTimeout(timeout);
  }
}
