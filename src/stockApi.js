const BASE  = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=";
const PROXY = "https://corsproxy.io/?";

export async function fetchQuote(ticker) {
  const target     = `${BASE}${encodeURIComponent(ticker)}&lang=fr-FR&region=FR`;
  const url        = `${PROXY}${encodeURIComponent(target)}`;
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const q    = json?.quoteResponse?.result?.[0];
    if (!q) throw new Error(`Ticker "${ticker}" introuvable`);
    return {
      nom:        q.longName || q.shortName || ticker,
      prixActuel: q.regularMarketPrice ?? 0,
      devise:     q.currency ?? "USD",
    };
  } finally {
    clearTimeout(timeout);
  }
}
