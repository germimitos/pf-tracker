import { useState } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { SECTOR_COLORS, ACCOUNTS } from "../constants";
import { useTheme } from "../context/ThemeContext";
import { fmt, pct, perf, fmtMonth } from "../utils";
import { StatCard } from "./StatCard";
import { CustomTooltip } from "./CustomTooltip";

const COLS = [
  { label: "Actif",     key: "nom",     fn: (p) => (p.nom || "").toLowerCase() },
  { label: "Compte",    key: "compte",  fn: (p) => p.compte },
  { label: "Secteur",   key: "secteur", fn: (p) => p.secteur || "" },
  { label: "Valeur",    key: "valeur",  fn: (p) => parseFloat(p.valeurActuelle) || 0 },
  { label: "P.Revient", key: "revient", fn: (p) => parseFloat(p.prixRevient) || 0 },
  {
    label: "P&L", key: "pl",
    fn: (p) => (parseFloat(p.valeurActuelle) || 0) - (parseFloat(p.prixRevient) || 0),
  },
  {
    label: "%", key: "pct",
    fn: (p) => {
      const v = parseFloat(p.valeurActuelle) || 0;
      const r = parseFloat(p.prixRevient) || 0;
      return r > 0 ? perf(v, r) : 0;
    },
  },
];

function SortIndicator({ colKey, sort }) {
  return (
    <span style={{ marginLeft: 4, opacity: sort.key === colKey ? 1 : 0.25 }}>
      {sort.key === colKey && sort.dir === 1 ? "▲" : "▼"}
    </span>
  );
}

export function DashboardTab({ pea, ct, history }) {
  const C = useTheme();
  const [sort, setSort] = useState({ key: "valeur", dir: -1 });

  const peaVal   = pea.reduce((s, x) => s + (parseFloat(x.valeurActuelle) || 0), 0);
  const peaRev   = pea.reduce((s, x) => s + (parseFloat(x.prixRevient)    || 0), 0);
  const ctVal    = ct.reduce( (s, x) => s + (parseFloat(x.valeurActuelle) || 0), 0);
  const ctRev    = ct.reduce( (s, x) => s + (parseFloat(x.prixRevient)    || 0), 0);
  const totalVal = peaVal + ctVal;
  const totalRev = peaRev + ctRev;
  const totalPnl = totalVal - totalRev;
  const totalPct = totalRev > 0 ? perf(totalVal, totalRev) : 0;
  const peaPct   = peaRev   > 0 ? perf(peaVal,   peaRev)   : 0;
  const ctPct    = ctRev    > 0 ? perf(ctVal,    ctRev)     : 0;

  const histData = history.map((h) => ({ ...h, total: h.pea + h.ct }));

  const allPos = [
    ...pea.map((x) => ({ ...x, compte: ACCOUNTS.PEA })),
    ...ct.map((x)  => ({ ...x, compte: ACCOUNTS.CT  })),
  ];

  const bySector = {};
  allPos.forEach((p) => {
    const s = p.secteur || "Autre";
    bySector[s] = (bySector[s] || 0) + (parseFloat(p.valeurActuelle) || 0);
  });
  const sectorData = Object.entries(bySector).map(([name, value]) => ({ name, value }));

  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }));

  const activeCol = COLS.find((c) => c.key === sort.key);
  const sortedPos = [...allPos].sort((a, b) => {
    const va = activeCol ? activeCol.fn(a) : 0;
    const vb = activeCol ? activeCol.fn(b) : 0;
    return va < vb ? sort.dir : va > vb ? -sort.dir : 0;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <StatCard label="Portefeuille total" value={fmt(totalVal)} sub={`Investi: ${fmt(totalRev)}`} />
        <StatCard label="Plus-value latente" value={fmt(totalPnl)} color={totalPnl >= 0 ? C.plus : C.moins} sub={pct(totalPct)} />
        <StatCard label="PEA"          value={fmt(peaVal)} color={C.pea} sub={pct(peaPct)} />
        <StatCard label="Compte-Titre" value={fmt(ctVal)}  color={C.ct}  sub={pct(ctPct)}  />
      </div>

      {/* Évolution historique */}
      {histData.length > 1 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 16 }}>
            Évolution de la valeur
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={histData}>
              <defs>
                <linearGradient id="gPea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.pea}    stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.pea}    stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gCt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.ct}     stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.ct}     stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={fmtMonth} />
              <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
              <Area type="monotone" dataKey="total" name="Total"        stroke={C.accent} fill="url(#gTotal)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="pea"   name="PEA"          stroke={C.pea}    fill="url(#gPea)"   strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="ct"    name="Compte-Titre" stroke={C.ct}     fill="url(#gCt)"    strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        {/* Répartition sectorielle */}
        {sectorData.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 16 }}>
              Répartition sectorielle
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sectorData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {sectorData.map((entry, i) => <Cell key={entry.name} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ color: C.muted, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* PEA vs CT */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 16 }}>
            PEA vs Compte-Titre
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[
              { name: "Investi", PEA: peaRev, CT: ctRev },
              { name: "Actuel",  PEA: peaVal, CT: ctVal  },
              { name: "P&L",     PEA: peaVal - peaRev, CT: ctVal - ctRev },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
              <Bar dataKey="PEA" fill={C.pea} radius={[4, 4, 0, 0]} />
              <Bar dataKey="CT"  fill={C.ct}  radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tableau des positions */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
        <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 16 }}>
          Détail des positions
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleSort(col.key)}
                  tabIndex={0}
                  aria-sort={sort.key === col.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                  style={{
                    color:        sort.key === col.key ? C.text : C.muted,
                    textAlign:    "left",
                    padding:      "8px 10px",
                    fontSize:     11,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    borderBottom: `1px solid ${C.border}`,
                    cursor:       "pointer",
                    userSelect:   "none",
                    whiteSpace:   "nowrap",
                  }}
                >
                  {col.label}<SortIndicator colKey={col.key} sort={sort} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPos.map((p) => {
              const val = parseFloat(p.valeurActuelle) || 0;
              const rev = parseFloat(p.prixRevient)    || 0;
              const pl  = val - rev;
              const pp  = rev > 0 ? perf(val, rev) : 0;
              return (
                <tr key={`${p.compte}-${p.nom}`} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 10px", color: C.text, fontWeight: 600 }}>{p.nom}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{
                      background:   p.compte === ACCOUNTS.PEA ? C.peaBadge : C.ctBadge,
                      color:        p.compte === ACCOUNTS.PEA ? C.pea : C.ct,
                      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                    }}>{p.compte}</span>
                  </td>
                  <td style={{ padding: "10px 10px", color: C.muted }}>{p.secteur}</td>
                  <td style={{ padding: "10px 10px", color: C.text,  fontFamily: "monospace" }}>{fmt(val)}</td>
                  <td style={{ padding: "10px 10px", color: C.muted, fontFamily: "monospace" }}>{fmt(rev)}</td>
                  <td style={{ padding: "10px 10px", color: pl >= 0 ? C.plus : C.moins, fontFamily: "monospace", fontWeight: 700 }}>{fmt(pl)}</td>
                  <td style={{ padding: "10px 10px", color: pp >= 0 ? C.plus : C.moins, fontFamily: "monospace" }}>{pct(pp)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
