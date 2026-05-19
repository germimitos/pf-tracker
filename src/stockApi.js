const YF_BASE = "https://query1.finance.yahoo.com";

async function tryFetch(url, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// Cascade de proxies pour contourner le CORS de Yahoo Finance
async function fetchViaProxy(yfPath) {
  const encoded = encodeURIComponent(`${YF_BASE}${yfPath}`);

  try {
    return await tryFetch(`/api/yf${yfPath}`);
  } catch (e) {
    console.warn("[yf] proxy Vite →", e.message);
  }

  try {
    return await tryFetch(`https://corsproxy.io/?${encoded}`);
  } catch (e) {
    console.warn("[yf] corsproxy.io →", e.message);
  }

  try {
    const wrap = await tryFetch(`https://api.allorigins.win/get?url=${encoded}`);
    const raw  = wrap?.contents;
    if (!raw) throw new Error("allorigins: réponse vide");
    return JSON.parse(raw);
  } catch (e) {
    console.warn("[yf] allorigins →", e.message);
  }

  throw new Error("Réseau indisponible");
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

function parseSector(json, ticker) {
  const quotes = json?.quotes ?? [];
  const match  = quotes.find(
    (q) => q.symbol?.toUpperCase() === ticker.toUpperCase()
  );
  return match?.sector ?? "";
}

export async function fetchQuote(ticker) {
  const chartPath  = `/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  const searchPath = `/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=1&newsCount=0`;

  // Les deux appels en parallèle — la recherche de secteur est optionnelle
  const [chartJson, searchJson] = await Promise.all([
    fetchViaProxy(chartPath),
    fetchViaProxy(searchPath).catch(() => null),
  ]);

  const result = parseChart(chartJson, ticker);
  result.secteur = parseSector(searchJson, ticker);

  console.info(`[yf] ${ticker} → ${result.nom} | ${result.prixActuel} ${result.devise} | secteur: ${result.secteur || "—"}`);
  return result;
}
