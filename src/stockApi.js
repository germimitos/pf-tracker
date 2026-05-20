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

// Retourne le nombre d'EUR pour 1 unité de `fromCurrency`
// EURUSD=X = nb USD par 1 EUR → on inverse pour obtenir EUR par USD
export async function fetchFxRate(fromCurrency) {
  if (!fromCurrency || fromCurrency === "EUR") return 1;
  const ticker = `EUR${fromCurrency}=X`;
  const path   = `/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  const json   = await fetchViaProxy(path);
  const meta   = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`Taux EUR/${fromCurrency} introuvable`);
  const rate = meta.regularMarketPrice ?? 1;
  return 1 / rate;
}

async function resolveAndFetch(symbol, searchJson) {
  const chartPath = `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const chartJson = await fetchViaProxy(chartPath);
  const result    = parseChart(chartJson, symbol);
  result.secteur  = parseSector(searchJson, symbol);

  if (result.devise === "EUR") {
    result.prixActuelEUR = result.prixActuel;
  } else {
    try {
      const fxRate = await fetchFxRate(result.devise);
      result.prixActuelEUR = result.prixActuel * fxRate;
    } catch {
      result.prixActuelEUR = result.prixActuel;
    }
  }
  return result;
}

export async function fetchQuote(ticker) {
  const searchPath = `/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=5&newsCount=0`;

  // Appels en parallèle — chart peut échouer, search est optionnel
  const [chartJson, searchJson] = await Promise.all([
    fetchViaProxy(`/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`).catch(() => null),
    fetchViaProxy(searchPath).catch(() => null),
  ]);

  // Ticker exact trouvé
  if (chartJson?.chart?.result?.[0]?.meta) {
    const result = await resolveAndFetch(ticker, searchJson);
    console.info(`[yf] ${ticker} → ${result.nom} | ${result.prixActuel} ${result.devise} (${result.prixActuelEUR?.toFixed(2)} €)`);
    return result;
  }

  // Fallback : meilleur résultat de la recherche (ex: HMI → RMS.PA)
  const quotes    = searchJson?.quotes ?? [];
  const bestMatch = quotes.find((q) => q.symbol && q.quoteType === "EQUITY") ?? quotes[0];
  const symbol    = bestMatch?.symbol;

  if (symbol && symbol.toUpperCase() !== ticker.toUpperCase()) {
    console.info(`[yf] "${ticker}" introuvable → fallback "${symbol}"`);
    const result = await resolveAndFetch(symbol, searchJson);
    console.info(`[yf] ${symbol} → ${result.nom} | ${result.prixActuel} ${result.devise} (${result.prixActuelEUR?.toFixed(2)} €)`);
    return result;
  }

  throw new Error(`Ticker "${ticker}" introuvable — pour Euronext Paris essayez avec .PA (ex: RMS.PA)`);
}
