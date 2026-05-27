import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// ── Helpers numériques ───────────────────────────────────────────
const parseFr = (s) => {
  if (!s) return 0;
  return parseFloat(
    s.toString()
      .replace(/€/g, '')
      .replace(/[\s  ]/g, '') // espaces + insécables
      .replace(/[−–]/g, '-')       // tirets spéciaux
      .replace(',', '.')
  ) || 0;
};

const toIso = (dmy) => {
  const [d, m, y] = dmy.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

// ── Mapping nom Trade Republic → ticker Yahoo Finance ───────────
export const TICKER_MAP = {
  // STOCKs
  'AMD':                          { ticker: 'AMD',      nom: 'Advanced Micro Devices, Inc.',    secteur: 'Technology'             },
  'Amazon.com':                   { ticker: 'AMZN',     nom: 'Amazon.com, Inc.',                secteur: 'Consumer Cyclical'      },
  'Coinbase Global (A)':          { ticker: 'COIN',     nom: 'Coinbase Global, Inc.',           secteur: 'Financial Services'     },
  'Kering':                       { ticker: 'KER.PA',   nom: 'Kering SA',                       secteur: 'Consumer Cyclical'      },
  'LVMH Moët Hennessy':           { ticker: 'MC.PA',    nom: 'LVMH Moët Hennessy - Louis Vuitton, Société Européenne', secteur: 'Consumer Cyclical' },
  'Mitsubishi':                   { ticker: '8058.T',   nom: 'Mitsubishi Corporation',           secteur: 'Industrials'            },
  'Netflix':                      { ticker: 'NFLX',     nom: 'Netflix, Inc.',                   secteur: 'Communication Services' },
  'PayPal':                       { ticker: 'PYPL',     nom: 'PayPal Holdings, Inc.',           secteur: 'Financial Services'     },
  'Reply':                        { ticker: 'REY.MI',   nom: 'Reply S.p.A.',                    secteur: 'Technology'             },
  'Robinhood Markets (A)':        { ticker: 'HOOD',     nom: 'Robinhood Markets, Inc.',         secteur: 'Financial Services'     },
  'STMicroelectronics (ADR)':     { ticker: 'STM',      nom: 'STMicroelectronics N.V.',         secteur: 'Technology'             },
  // FUNDs — PEA
  'S&P 500 EUR (Acc)':            { ticker: 'SXR8.DE',  nom: 'iShares Core S&P 500 UCITS ETF EUR (Acc)',       secteur: 'ETF' },
  'MSCI World Swap PEA EUR (Acc)':{ ticker: 'WPEA.PA',  nom: 'Amundi MSCI World UCITS ETF EUR (Acc)',          secteur: 'ETF' },
  'MSCI Emerging Asia PEA ESG Leaders EUR (Acc)': { ticker: 'PAASI.PA', nom: 'ETF MSCI Emerging Asia ESG Leaders EUR (Acc)', secteur: 'ETF' },
  'Core CAC 40 EUR (Acc)':        { ticker: 'CACC.PA',  nom: 'Amundi CAC 40 UCITS ETF Acc',                    secteur: 'ETF' },
  // FUNDs — CT
  'Core S&P 500 USD (Acc)':       { ticker: 'CSPX.L',   nom: 'iShares Core S&P 500 UCITS ETF USD (Acc)',      secteur: 'ETF' },
  'Easy S&P 500 EUR Hedged':      { ticker: 'ESEH.PA',  nom: 'BNP Paribas Easy S&P 500 UCITS ETF EUR Hedged', secteur: 'ETF' },
};

export function mapName(rawName) {
  if (!rawName) return { ticker: '?', nom: '', secteur: '' };
  // Exact match
  if (TICKER_MAP[rawName]) return { ...TICKER_MAP[rawName] };
  // Partial: source name starts with a known key (ou vice-versa)
  const key = Object.keys(TICKER_MAP).find(k =>
    rawName.toLowerCase().startsWith(k.toLowerCase()) ||
    k.toLowerCase().startsWith(rawName.toLowerCase())
  );
  if (key) return { ...TICKER_MAP[key] };
  // Fallback
  const ticker = rawName.replace(/[^A-Z0-9.]/gi, '-').toUpperCase().replace(/-{2,}/g, '-').slice(0, 14);
  return { ticker, nom: rawName, secteur: '' };
}

// ── Extraction PDF → lignes de texte ────────────────────────────
async function extractTextRows(file) {
  const buf = await file.arrayBuffer();
  const pdf  = await pdfjsLib.getDocument({ data: buf }).promise;
  const pageRows = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const vp   = page.getViewport({ scale: 1 });
    const tc   = await page.getTextContent();

    // Collecte items avec position
    const items = [];
    for (const item of tc.items) {
      const s = item.str?.trim();
      if (!s) continue;
      items.push({
        x: item.transform[4],
        y: Math.round(vp.height - item.transform[5]),
        str: s,
      });
    }

    // Tri par y puis x
    items.sort((a, b) =>
      Math.abs(a.y - b.y) > 5 ? a.y - b.y : a.x - b.x
    );

    // Groupe par ligne (items à ±5pt de y)
    const rows = [];
    let cur = null;
    for (const item of items) {
      if (!cur || Math.abs(item.y - cur.y) > 5) {
        if (cur) rows.push(cur.parts.join(' '));
        cur = { y: item.y, parts: [item.str] };
      } else {
        cur.parts.push(item.str);
      }
    }
    if (cur) rows.push(cur.parts.join(' '));
    pageRows.push(...rows);
  }

  return pageRows;
}

// ── Parsing d'une ligne Trade Republic ──────────────────────────
//
// Format attendu (après jointure) :
//   DD/MM/YYYY  PEA|DEFAULT  BUY|SELL  STOCK|FUND  <Nom...>  <Qté>  <Prix> €  <Montant> €  [<Frais> €]
//
// Stratégie : on retire les 4 tokens fixes du début, puis on
// trouve tous les nombres décimaux français (n,dd) à la fin.
// Tout ce qui précède le premier de ces nombres = Nom.

// Nombre décimal français : optionnel signe, chiffres + espaces (milliers), virgule, 2-4 décimales
const FR_NUM_RE = /[-−]?\s*\d[\d\s]*,\d{2,4}/g;

function parseLine(line) {
  // 1 — Tokens fixes
  const m = line.match(
    /^(\d{2}\/\d{2}\/\d{4})\s+(PEA|DEFAULT)\s+(BUY|SELL)\s+(STOCK|FUND)\s+(.*)/
  );
  if (!m) return null;
  const [, dateFr, compte, buyOrSell, classe, rest] = m;

  // 2 — Trouve tous les nombres décimaux français dans la partie "reste"
  const numMatches = [];
  let nm;
  FR_NUM_RE.lastIndex = 0;
  while ((nm = FR_NUM_RE.exec(rest)) !== null) {
    numMatches.push({ index: nm.index, str: nm[0] });
  }

  // On s'attend à 3 nombres (qte, prix, montant) ou 4 (+ frais)
  if (numMatches.length < 3) return null;

  // Les 3-4 derniers nombres sont les colonnes numériques
  const tail  = numMatches.slice(-4);   // [qte?, prix?, montant?, frais?] ou moins
  const nNums = tail.length;            // 3 ou 4

  const qteMatch    = tail[nNums - (nNums >= 4 ? 4 : 3)];
  const prixMatch   = tail[nNums - (nNums >= 4 ? 3 : 2)];
  // montant = tail[nNums - 2] — non stocké
  const fraisMatch  = nNums >= 4 ? tail[nNums - 1] : null;

  const nom     = rest.slice(0, qteMatch.index).replace(/\s+/g, ' ').trim();
  const qte     = Math.abs(parseFr(qteMatch.str));
  const prixAchat = Math.abs(parseFr(prixMatch.str));
  const frais   = fraisMatch ? Math.abs(parseFr(fraisMatch.str)) : 0;

  if (!nom || qte === 0 || prixAchat === 0) return null;

  const mapped = mapName(nom);
  return {
    date:     toIso(dateFr),
    type:     buyOrSell === 'BUY' ? 'ACHAT' : 'VENTE',
    classe,
    compte,
    ticker:   mapped.ticker,
    nom:      mapped.nom,
    nomBrut:  nom,
    secteur:  mapped.secteur,
    qte,
    prixAchat,
    frais,
  };
}

// ── Point d'entrée public ────────────────────────────────────────
export async function parseTradeRepublicPDF(file) {
  const lines = await extractTextRows(file);
  const transactions = [];

  for (const line of lines) {
    const tx = parseLine(line);
    if (tx) transactions.push(tx);
  }

  if (transactions.length === 0) {
    throw new Error(
      `Aucune transaction détectée dans ce PDF.\n` +
      `Vérifiez qu'il s'agit bien du fichier Trade Republic "Investissements — Achats & Ventes".`
    );
  }

  return transactions;
}

// ── Détection de doublons ────────────────────────────────────────
export function isDuplicate(tx, existing) {
  return existing.some(e => {
    const eQte = e.qte ?? e.nbActions ?? 0;
    return e.date   === tx.date &&
           (e.ticker ?? '').toUpperCase() === (tx.ticker ?? '').toUpperCase() &&
           e.type   === tx.type &&
           Math.abs(eQte - tx.qte) < 0.0001;
  });
}
