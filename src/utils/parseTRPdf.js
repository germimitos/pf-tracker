import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// ── Helpers ─────────────────────────────────────────────────────
const parseFr = (s) => {
  if (!s) return 0;
  return parseFloat(
    s.toString()
      .replace(/€/g, '')
      .replace(/[\s  ]/g, '')
      .replace('−', '-')
      .replace(',', '.')
  ) || 0;
};

const toIso = (dmy) => {
  const [d, m, y] = dmy.split('/');
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
};

// ── Mapping nom Trade Republic → ticker Yahoo Finance ───────────
export const TICKER_MAP = {
  // STOCKs
  'AMD':                          { ticker: 'AMD',     nom: 'Advanced Micro Devices, Inc.',    secteur: 'Technology'             },
  'Amazon.com':                   { ticker: 'AMZN',    nom: 'Amazon.com, Inc.',                secteur: 'Consumer Cyclical'      },
  'Coinbase Global (A)':          { ticker: 'COIN',    nom: 'Coinbase Global, Inc.',           secteur: 'Financial Services'     },
  'Kering':                       { ticker: 'KER.PA',  nom: 'Kering SA',                       secteur: 'Consumer Cyclical'      },
  'LVMH Moët Hennessy':           { ticker: 'MC.PA',   nom: 'LVMH Moët Hennessy - Louis Vuitton, Société Européenne', secteur: 'Consumer Cyclical' },
  'Mitsubishi':                   { ticker: '8058.T',  nom: 'Mitsubishi Corporation',           secteur: 'Industrials'            },
  'Netflix':                      { ticker: 'NFLX',    nom: 'Netflix, Inc.',                   secteur: 'Communication Services' },
  'PayPal':                       { ticker: 'PYPL',    nom: 'PayPal Holdings, Inc.',           secteur: 'Financial Services'     },
  'Reply':                        { ticker: 'REY.MI',  nom: 'Reply S.p.A.',                    secteur: 'Technology'             },
  'Robinhood Markets (A)':        { ticker: 'HOOD',    nom: 'Robinhood Markets, Inc.',         secteur: 'Financial Services'     },
  'STMicroelectronics (ADR)':     { ticker: 'STM',     nom: 'STMicroelectronics N.V.',         secteur: 'Technology'             },
  // FUNDs — PEA
  'S&P 500 EUR (Acc)':            { ticker: '500.PA',  nom: 'Amundi ETF S&P 500 UCITS EUR (Acc)',          secteur: 'ETF' },
  'MSCI World Swap PEA EUR (Acc)':{ ticker: 'CW8.PA',  nom: 'Amundi MSCI World UCITS ETF EUR (Acc)',        secteur: 'ETF' },
  'MSCI Emerging Asia PEA ESG Leaders EUR (Acc)': { ticker: 'PAASI.PA', nom: 'ETF MSCI Emerging Asia ESG Leaders EUR (Acc)', secteur: 'ETF' },
  'Core CAC 40 EUR (Acc)':        { ticker: 'C40.PA',  nom: 'Amundi Core CAC 40 UCITS ETF EUR (Acc)',       secteur: 'ETF' },
  // FUNDs — CT
  'Core S&P 500 USD (Acc)':       { ticker: 'CSPX.L',  nom: 'iShares Core S&P 500 UCITS ETF USD (Acc)',    secteur: 'ETF' },
};

export function mapName(rawName) {
  if (!rawName) return { ticker: '?', nom: rawName || '', secteur: '' };
  const key = Object.keys(TICKER_MAP).find(
    k => rawName === k || rawName.toLowerCase() === k.toLowerCase() ||
         rawName.toLowerCase().startsWith(k.toLowerCase())
  );
  if (key) return { ...TICKER_MAP[key] };
  const ticker = rawName.replace(/[^A-Z0-9.]/gi, '-').toUpperCase().replace(/-{2,}/g, '-').slice(0, 14);
  return { ticker, nom: rawName, secteur: '' };
}

// ── Extraction PDF ───────────────────────────────────────────────
async function extractItems(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const items = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const vp   = page.getViewport({ scale: 1 });
    const tc   = await page.getTextContent();

    for (const item of tc.items) {
      const s = item.str?.trim();
      if (!s) continue;
      items.push({
        page: p,
        x: item.transform[4],
        y: Math.round(vp.height - item.transform[5]),
        str: s,
      });
    }
  }
  return items;
}

function groupRows(items) {
  const sorted = [...items].sort((a, b) =>
    a.page !== b.page ? a.page - b.page :
    Math.abs(a.y - b.y) > 5 ? a.y - b.y : a.x - b.x
  );

  const rows = [];
  let cur = null;

  for (const item of sorted) {
    if (!cur || cur.page !== item.page || Math.abs(item.y - cur.avgY) > 5) {
      if (cur) rows.push(cur);
      cur = { page: item.page, avgY: item.y, items: [item] };
    } else {
      cur.items.push(item);
      cur.avgY = cur.items.reduce((s, i) => s + i.y, 0) / cur.items.length;
    }
  }
  if (cur) rows.push(cur);
  return rows;
}

// Trouve la ligne d'en-tête et retourne les bornes X par colonne
const COL_NAMES = ['Date', 'Compte', 'Type', 'Classe', 'Nom', 'Qté', 'Prix', 'Montant', 'Frais'];

function findColBounds(rows) {
  const normalize = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const headerRow = rows.find(row => {
    const strs = row.items.map(i => normalize(i.str));
    return strs.includes('date') && strs.includes('compte') && strs.includes('qte');
  });
  if (!headerRow) return null;

  const bounds = {};
  for (const col of COL_NAMES) {
    const normCol = normalize(col);
    const item = headerRow.items.find(i => normalize(i.str) === normCol);
    if (item) bounds[col] = item.x;
  }
  return bounds;
}

function colText(rowItems, colName, bounds) {
  const idx = COL_NAMES.indexOf(colName);
  const startX = bounds[colName] ?? -Infinity;
  const nextCol = COL_NAMES[idx + 1];
  const endX = (nextCol && bounds[nextCol] != null) ? bounds[nextCol] - 2 : Infinity;
  return rowItems
    .filter(i => i.x >= startX - 4 && i.x < endX)
    .sort((a, b) => a.x - b.x)
    .map(i => i.str)
    .join(' ')
    .trim();
}

// ── Point d'entrée public ────────────────────────────────────────
export async function parseTradeRepublicPDF(file) {
  const items = await extractItems(file);
  const rows  = groupRows(items);
  const bounds = findColBounds(rows);

  if (!bounds || !bounds['Date']) {
    throw new Error('Format Trade Republic non reconnu — en-tête de tableau introuvable.');
  }

  const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
  const transactions = [];

  for (const row of rows) {
    const dateTxt = colText(row.items, 'Date', bounds);
    if (!DATE_RE.test(dateTxt)) continue;

    const compte = colText(row.items, 'Compte', bounds);
    const type   = colText(row.items, 'Type',   bounds);
    const classe = colText(row.items, 'Classe', bounds);
    const nom    = colText(row.items, 'Nom',    bounds);

    if (!['PEA', 'DEFAULT'].includes(compte)) continue;
    if (!['BUY', 'SELL'].includes(type))      continue;

    const qteTxt    = colText(row.items, 'Qté',     bounds);
    const prixTxt   = colText(row.items, 'Prix',    bounds);
    const fraisTxt  = colText(row.items, 'Frais',   bounds);

    const qte      = Math.abs(parseFr(qteTxt));
    const prixAchat = Math.abs(parseFr(prixTxt));
    const frais    = Math.abs(parseFr(fraisTxt));

    if (!nom || qte === 0 || prixAchat === 0) continue;

    const mapped = mapName(nom);

    transactions.push({
      date:      toIso(dateTxt),
      type:      type === 'BUY' ? 'ACHAT' : 'VENTE',
      classe,
      compte,
      ticker:    mapped.ticker,
      nom:       mapped.nom,
      nomBrut:   nom,
      secteur:   mapped.secteur,
      qte,
      prixAchat,
      frais,
    });
  }

  return transactions;
}

// ── Détection de doublons ────────────────────────────────────────
export function isDuplicate(tx, existing) {
  return existing.some(e => {
    const eQte = e.qte ?? e.nbActions ?? 0;
    return e.date === tx.date &&
           e.ticker?.toUpperCase() === tx.ticker?.toUpperCase() &&
           e.type === tx.type &&
           Math.abs(eQte - tx.qte) < 0.0001;
  });
}
