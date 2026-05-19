const YF_BASE = "https://query1.finance.yahoo.com";
const YF_CHART = (ticker) =>
  `/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;

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

function parseChart(json, ticker) {
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`Ticker "${ticker}" introuvable`);
  return {
    nom:        meta.longName || meta.shortName || ticker,
    prixActuel: meta.regularMarketPrice ?? 0,
    devise:     meta.currency ?? "USD",
  };
}

// Parse allorigins.win wrapper: {"contents": "...", "status": {...}}
function parseAllOrigins(json, ticker) {
  const raw = json?.contents;
  if (!raw) throw new Error("allorigins: réponse vide");
  return parseChart(JSON.parse(raw), ticker);
}

export async function fetchQuote(ticker) {
  const path    = YF_CHART(ticker);
  const yfUrl   = `${YF_BASE}${path}`;
  const encoded = encodeURIComponent(yfUrl);

  // Tentative 1 : proxy Vite local (npm run dev / npm run preview)
  try {
    const data = await tryFetch(`/api/yf${path}`);
    return parseChart(data, ticker);
  } catch (e) {
    console.warn("[fetchQuote] proxy Vite échoué →", e.message);
  }

  // Tentative 2 : corsproxy.io (requête navigateur avec Origin header)
  try {
    const data = await tryFetch(`https://corsproxy.io/?${encoded}`);
    return parseChart(data, ticker);
  } catch (e) {
    console.warn("[fetchQuote] corsproxy.io échoué →", e.message);
  }

  // Tentative 3 : allorigins.win (renvoie {"contents": "..."})
  try {
    const data = await tryFetch(`https://api.allorigins.win/get?url=${encoded}`);
    return parseAllOrigins(data, ticker);
  } catch (e) {
    console.warn("[fetchQuote] allorigins.win échoué →", e.message);
  }

  // Toutes les tentatives ont échoué
  console.error(`[fetchQuote] impossible de récupérer "${ticker}" — vérifiez la console pour les détails`);
  throw new Error(`Ticker "${ticker}" introuvable ou réseau indisponible`);
}
