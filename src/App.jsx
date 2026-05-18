import { useState, useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";

// ─── Données initiales de démonstration ───────────────────────────────────────
const DEMO_HISTORY = [
  { date: "Jan 2024", pea: 12000, ct: 8000 },
  { date: "Fév 2024", pea: 12500, ct: 8200 },
  { date: "Mar 2024", pea: 11800, ct: 8100 },
  { date: "Avr 2024", pea: 13200, ct: 8700 },
  { date: "Mai 2024", pea: 13800, ct: 9100 },
  { date: "Jui 2024", pea: 14100, ct: 9400 },
  { date: "Jui 2024", pea: 14600, ct: 9200 },
  { date: "Aoû 2024", pea: 15200, ct: 9800 },
  { date: "Sep 2024", pea: 14800, ct: 9600 },
  { date: "Oct 2024", pea: 15600, ct: 10200 },
  { date: "Nov 2024", pea: 16100, ct: 10600 },
  { date: "Déc 2024", pea: 16800, ct: 11000 },
  { date: "Jan 2025", pea: 17200, ct: 11400 },
  { date: "Fév 2025", pea: 17800, ct: 11800 },
  { date: "Mar 2025", pea: 18100, ct: 12100 },
];

const DEMO_PEA = [
  { nom: "MSCI World (WPEA)", secteur: "ETF Monde", valeurActuelle: 8200, prixRevient: 6500 },
  { nom: "DCAM (Amundi)", secteur: "ETF Monde", valeurActuelle: 5100, prixRevient: 4200 },
  { nom: "BNP Paribas", secteur: "Finance", valeurActuelle: 2400, prixRevient: 2100 },
  { nom: "Air Liquide", secteur: "Industrie", valeurActuelle: 2400, prixRevient: 1900 },
];

const DEMO_CT = [
  { nom: "NVIDIA", secteur: "Tech", valeurActuelle: 3800, prixRevient: 2200 },
  { nom: "Apple", secteur: "Tech", valeurActuelle: 2200, prixRevient: 1800 },
  { nom: "Gold ETF", secteur: "Matières premières", valeurActuelle: 2100, prixRevient: 1900 },
  { nom: "Visa", secteur: "Finance", valeurActuelle: 2000, prixRevient: 1700 },
];

// ─── Couleurs ────────────────────────────────────────────────────────────────
const C = {
  pea: "#4ade80",
  ct: "#60a5fa",
  bg: "#0a0f1e",
  card: "#111827",
  border: "#1e293b",
  text: "#e2e8f0",
  muted: "#64748b",
  plus: "#4ade80",
  moins: "#f87171",
  accent: "#818cf8",
};

const SECTOR_COLORS = ["#4ade80", "#60a5fa", "#f59e0b", "#f87171", "#a78bfa", "#34d399", "#fb923c"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const pct = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const perf = (actuel, revient) => ((actuel - revient) / revient) * 100;

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "20px 24px", display: "flex", flexDirection: "column", gap: 6
    }}>
      <span style={{ color: C.muted, fontSize: 11, fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase" }}>{label}</span>
      <span style={{ color: color || C.text, fontSize: 26, fontWeight: 700, fontFamily: "monospace" }}>{value}</span>
      {sub && <span style={{ color: C.muted, fontSize: 12 }}>{sub}</span>}
    </div>
  );
}

// ─── Onglet Saisie ─────────────────────────────────────────────────────────
function SaisieTab({ pea, ct, history, setPea, setCt, setHistory }) {
  const [newPeaLine, setNewPeaLine] = useState({ nom: "", secteur: "", valeurActuelle: "", prixRevient: "" });
  const [newCtLine, setNewCtLine] = useState({ nom: "", secteur: "", valeurActuelle: "", prixRevient: "" });
  const [newHist, setNewHist] = useState({ date: "", pea: "", ct: "" });

  const inputStyle = {
    background: "#0d1526", border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.text, padding: "8px 12px", fontSize: 13, fontFamily: "monospace", width: "100%", boxSizing: "border-box"
  };
  const btnStyle = (color) => ({
    background: color, border: "none", borderRadius: 8, color: "#0a0f1e",
    padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontSize: 13
  });

  const addLine = (arr, setArr, newLine, setNew, defaults) => {
    if (!newLine.nom) return;
    setArr([...arr, { ...newLine, valeurActuelle: parseFloat(newLine.valeurActuelle) || 0, prixRevient: parseFloat(newLine.prixRevient) || 0 }]);
    setNew(defaults);
  };

  const removeLine = (arr, setArr, i) => setArr(arr.filter((_, idx) => idx !== i));

  const addHist = () => {
    if (!newHist.date) return;
    const updated = [...history, { date: newHist.date, pea: parseFloat(newHist.pea) || 0, ct: parseFloat(newHist.ct) || 0 }];
    updated.sort((a, b) => a.date.localeCompare(b.date));
    setHistory(updated);
    setNewHist({ date: "", pea: "", ct: "" });
  };

  const TableSection = ({ title, data, setData, newLine, setNewLine, color, fields }) => (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
        <span style={{ color: C.text, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{title}</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>{fields.map(f => <th key={f.key} style={{ color: C.muted, textAlign: "left", padding: "6px 8px", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{f.label}</th>)}
            <th style={{ color: C.muted, width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
              {fields.map(f => (
                <td key={f.key} style={{ padding: "8px 8px" }}>
                  <input value={row[f.key]} onChange={e => {
                    const updated = [...data];
                    updated[i] = { ...updated[i], [f.key]: f.type === "number" ? e.target.value : e.target.value };
                    setData(updated);
                  }} style={{ ...inputStyle, width: "100%" }} type={f.type || "text"} />
                </td>
              ))}
              <td style={{ padding: "8px 4px" }}>
                <button onClick={() => removeLine(data, setData, i)}
                  style={{ background: "none", border: "none", color: C.moins, cursor: "pointer", fontSize: 16 }}>✕</button>
              </td>
            </tr>
          ))}
          <tr style={{ borderTop: `1px solid ${C.border}` }}>
            {fields.map(f => (
              <td key={f.key} style={{ padding: "8px 8px" }}>
                <input placeholder={f.label} value={newLine[f.key]} onChange={e => setNewLine({ ...newLine, [f.key]: e.target.value })}
                  style={{ ...inputStyle }} type={f.type || "text"} />
              </td>
            ))}
            <td style={{ padding: "8px 4px" }}>
              <button onClick={() => addLine(data, setData, newLine, setNewLine, fields.reduce((a, f) => ({ ...a, [f.key]: "" }), {}))}
                style={btnStyle(color)}>+</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const FIELDS_POSITIONS = [
    { key: "nom", label: "Nom" },
    { key: "secteur", label: "Secteur" },
    { key: "valeurActuelle", label: "Valeur actuelle (€)", type: "number" },
    { key: "prixRevient", label: "Prix de revient (€)", type: "number" },
  ];

  return (
    <div>
      <TableSection title="PEA — Positions" data={pea} setData={setPea} newLine={newPeaLine} setNewLine={setNewPeaLine} color={C.pea} fields={FIELDS_POSITIONS} />
      <TableSection title="Compte-Titre — Positions" data={ct} setData={setCt} newLine={newCtLine} setNewLine={setNewCtLine} color={C.ct} fields={FIELDS_POSITIONS} />

      {/* Historique */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.accent }} />
          <span style={{ color: C.text, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>HISTORIQUE MENSUEL</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Date", "Valeur PEA (€)", "Valeur CT (€)", ""].map(h => (
                <th key={h} style={{ color: C.muted, textAlign: "left", padding: "6px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((row, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "8px" }}><input value={row.date} onChange={e => { const u = [...history]; u[i] = { ...u[i], date: e.target.value }; setHistory(u); }} style={inputStyle} /></td>
                <td style={{ padding: "8px" }}><input value={row.pea} onChange={e => { const u = [...history]; u[i] = { ...u[i], pea: parseFloat(e.target.value) || 0 }; setHistory(u); }} style={inputStyle} type="number" /></td>
                <td style={{ padding: "8px" }}><input value={row.ct} onChange={e => { const u = [...history]; u[i] = { ...u[i], ct: parseFloat(e.target.value) || 0 }; setHistory(u); }} style={inputStyle} type="number" /></td>
                <td><button onClick={() => setHistory(history.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: C.moins, cursor: "pointer", fontSize: 16 }}>✕</button></td>
              </tr>
            ))}
            <tr style={{ borderTop: `1px solid ${C.border}` }}>
              <td style={{ padding: "8px" }}><input placeholder="Ex: Jan 2025" value={newHist.date} onChange={e => setNewHist({ ...newHist, date: e.target.value })} style={inputStyle} /></td>
              <td style={{ padding: "8px" }}><input placeholder="0" value={newHist.pea} onChange={e => setNewHist({ ...newHist, pea: e.target.value })} style={inputStyle} type="number" /></td>
              <td style={{ padding: "8px" }}><input placeholder="0" value={newHist.ct} onChange={e => setNewHist({ ...newHist, ct: e.target.value })} style={inputStyle} type="number" /></td>
              <td><button onClick={addHist} style={btnStyle(C.accent)}>+</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Dashboard principal ───────────────────────────────────────────────────
function DashboardTab({ pea, ct, history }) {
  // Stats globales
  const peaVal = pea.reduce((s, x) => s + (parseFloat(x.valeurActuelle) || 0), 0);
  const peaRev = pea.reduce((s, x) => s + (parseFloat(x.prixRevient) || 0), 0);
  const ctVal = ct.reduce((s, x) => s + (parseFloat(x.valeurActuelle) || 0), 0);
  const ctRev = ct.reduce((s, x) => s + (parseFloat(x.prixRevient) || 0), 0);
  const totalVal = peaVal + ctVal;
  const totalRev = peaRev + ctRev;
  const totalPnl = totalVal - totalRev;
  const totalPct = totalRev > 0 ? perf(totalVal, totalRev) : 0;
  const peaPct = peaRev > 0 ? perf(peaVal, peaRev) : 0;
  const ctPct = ctRev > 0 ? perf(ctVal, ctRev) : 0;

  // Historique enrichi
  const histData = history.map((h, i) => {
    const total = h.pea + h.ct;
    const prev = i > 0 ? history[i - 1].pea + history[i - 1].ct : total;
    return { ...h, total, evolution: i > 0 ? ((total - prev) / prev) * 100 : 0 };
  });

  // Répartition secteurs
  const allPos = [
    ...pea.map(x => ({ ...x, compte: "PEA" })),
    ...ct.map(x => ({ ...x, compte: "CT" })),
  ];
  const bySector = {};
  allPos.forEach(p => {
    const s = p.secteur || "Autre";
    bySector[s] = (bySector[s] || 0) + (parseFloat(p.valeurActuelle) || 0);
  });
  const sectorData = Object.entries(bySector).map(([name, value]) => ({ name, value }));

  // Top positions
  const topPos = [...allPos].sort((a, b) => (parseFloat(b.valeurActuelle) || 0) - (parseFloat(a.valeurActuelle) || 0));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "#1e293b", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontFamily: "monospace" }}>
        <div style={{ color: C.muted, marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <StatCard label="Portefeuille total" value={fmt(totalVal)} sub={`Investi: ${fmt(totalRev)}`} />
        <StatCard label="Plus-value latente" value={fmt(totalPnl)} color={totalPnl >= 0 ? C.plus : C.moins} sub={pct(totalPct)} />
        <StatCard label="PEA" value={fmt(peaVal)} color={C.pea} sub={pct(peaPct)} />
        <StatCard label="Compte-Titre" value={fmt(ctVal)} color={C.ct} sub={pct(ctPct)} />
      </div>

      {/* Évolution historique */}
      {histData.length > 1 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 16 }}>Évolution de la valeur</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={histData}>
              <defs>
                <linearGradient id="gPea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.pea} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.pea} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.ct} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.ct} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k€`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
              <Area type="monotone" dataKey="total" name="Total" stroke={C.accent} fill="url(#gTotal)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="pea" name="PEA" stroke={C.pea} fill="url(#gPea)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="ct" name="Compte-Titre" stroke={C.ct} fill="url(#gCt)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Répartition sectorielle */}
        {sectorData.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 16 }}>Répartition sectorielle</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sectorData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {sectorData.map((_, i) => <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#1e293b", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ color: C.muted, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* PEA vs CT */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 16 }}>PEA vs Compte-Titre</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[
              { name: "Investi", PEA: peaRev, CT: ctRev },
              { name: "Actuel", PEA: peaVal, CT: ctVal },
              { name: "P&L", PEA: peaVal - peaRev, CT: ctVal - ctRev },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: C.muted, fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#1e293b", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ color: C.muted, fontSize: 12 }} />
              <Bar dataKey="PEA" fill={C.pea} radius={[4, 4, 0, 0]} />
              <Bar dataKey="CT" fill={C.ct} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top positions */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
        <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, fontFamily: "monospace", textTransform: "uppercase", marginBottom: 16 }}>Détail des positions</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Actif", "Compte", "Secteur", "Valeur", "P.Revient", "P&L", "%"].map(h => (
                <th key={h} style={{ color: C.muted, textAlign: "left", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topPos.map((p, i) => {
              const val = parseFloat(p.valeurActuelle) || 0;
              const rev = parseFloat(p.prixRevient) || 0;
              const pl = val - rev;
              const pp = rev > 0 ? perf(val, rev) : 0;
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 10px", color: C.text, fontWeight: 600 }}>{p.nom}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ background: p.compte === "PEA" ? "#14532d" : "#1e3a5f", color: p.compte === "PEA" ? C.pea : C.ct, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{p.compte}</span>
                  </td>
                  <td style={{ padding: "10px 10px", color: C.muted }}>{p.secteur}</td>
                  <td style={{ padding: "10px 10px", color: C.text, fontFamily: "monospace" }}>{fmt(val)}</td>
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

// ─── App principale ────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [pea, setPea] = useState(DEMO_PEA);
  const [ct, setCt] = useState(DEMO_CT);
  const [history, setHistory] = useState(DEMO_HISTORY);

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{
      background: tab === key ? "#1e293b" : "none",
      border: tab === key ? `1px solid ${C.border}` : "1px solid transparent",
      borderRadius: 8, color: tab === key ? C.text : C.muted,
      padding: "8px 20px", cursor: "pointer", fontSize: 13,
      fontFamily: "monospace", fontWeight: tab === key ? 700 : 400,
      letterSpacing: 1
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", padding: 0 }}>
      {/* Header */}
      <div style={{ background: "#080d1a", borderBottom: `1px solid ${C.border}`, padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, fontFamily: "monospace" }}>
            <span style={{ color: C.pea }}>P</span>
            <span style={{ color: C.ct }}>F</span>
            <span style={{ color: C.text }}> TRACKER</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 3, marginTop: 2, fontFamily: "monospace" }}>PEA · COMPTE-TITRE</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tabBtn("dashboard", "📊 Dashboard")}
          {tabBtn("saisie", "✏️ Saisie")}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "32px" }}>
        {tab === "dashboard"
          ? <DashboardTab pea={pea} ct={ct} history={history} />
          : <SaisieTab pea={pea} ct={ct} history={history} setPea={setPea} setCt={setCt} setHistory={setHistory} />
        }
      </div>
    </div>
  );
}
