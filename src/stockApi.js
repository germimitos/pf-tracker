const YF_CHART = (ticker) =>
  `/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;

async function tryFetch(url) {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function parseChart(json, ticker) {
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`Ticker "${ticker}" introuvable`);
  return {
    nom:        meta.longName || meta.shortName || ticker,
    prixActuel: meta.regularMarketPrice ?? 0,
    devise:     meta.currency ?? "USD",
  };
}

export async function fetchQuote(ticker) {
  const path = YF_CHART(ticker);

  // Tentative 1 : proxy Vite (npm run dev / npm run preview)
  try {
    return parseChart(await tryFetch(`/api/yf${path}`), ticker);
  } catch {}

  // Tentative 2 : corsproxy.io — fonctionne depuis un navigateur (Origin header présent)
  const fallback = `https://corsproxy.io/?${encodeURIComponent(`https://query1.finance.yahoo.com${path}`)}`;
  return parseChart(await tryFetch(fallback), ticker);
}
