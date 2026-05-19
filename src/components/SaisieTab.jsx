import { useState, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { fetchQuote } from "../stockApi";
import { fmt } from "../utils";

const inputStyle = (error, C, width) => ({
  background:   C.card,
  border:       `1px solid ${error ? C.moins : C.border}`,
  borderRadius: 8,
  color:        C.text,
  padding:      "7px 10px",
  fontSize:     12,
  fontFamily:   "monospace",
  width:        width ?? "100%",
  boxSizing:    "border-box",
  outline:      "none",
  transition:   "border-color 0.15s",
});

const btnStyle = (color) => ({
  background:   color,
  border:       "none",
  borderRadius: 8,
  color:        "#0a0f1e",
  padding:      "7px 14px",
  fontWeight:   700,
  cursor:       "pointer",
  fontSize:     13,
});

const outlineBtn = (color, disabled) => ({
  background:   "none",
  border:       `1px solid ${color}`,
  borderRadius: 8,
  color:        color,
  padding:      "8px 18px",
  fontWeight:   600,
  cursor:       disabled ? "not-allowed" : "pointer",
  fontSize:     13,
  opacity:      disabled ? 0.5 : 1,
});

const POS_FIELDS = [
  { key: "ticker",     label: "Ticker",          type: "text",   width: 130, placeholder: "AAPL"   },
  { key: "nom",        label: "Entreprise",       type: "text",   width: 165, placeholder: "Auto"   },
  { key: "secteur",    label: "Secteur",          type: "text",   width: 115, placeholder: ""        },
  { key: "nbActions",  label: "Nb actions",       type: "number", width: 80,  placeholder: "10"     },
  { key: "prixAchat",  label: "Prix achat (€)",   type: "number", width: 100, placeholder: "150.00" },
  { key: "prixActuel", label: "Prix actuel (€)",  type: "number", width: 100, placeholder: "Auto"   },
];

const EMPTY_POS  = { ticker: "", nom: "", secteur: "", nbActions: "", prixAchat: "", prixActuel: "" };
const EMPTY_HIST = { date: "", pea: "", ct: "" };

function validatePos(line) {
  const num = (v) => v === "" || isNaN(parseFloat(v));
  return {
    nom:      !line.nom.trim(),
    nbActions: num(line.nbActions) || parseFloat(line.nbActions) <= 0,
    prixAchat: num(line.prixAchat) || parseFloat(line.prixAchat) < 0,
  };
}

function validateHist(h) {
  return {
    date: !h.date,
    pea:  h.pea === "" || isNaN(parseFloat(h.pea)),
    ct:   h.ct  === "" || isNaN(parseFloat(h.ct)),
  };
}

const hasError = (e) => Object.values(e).some(Boolean);

function applyQuote(pos, { nom, prixActuel }) {
  const nb = parseFloat(pos.nbActions) || 0;
  const pa = parseFloat(pos.prixAchat) || 0;
  return { ...pos, nom, prixActuel, valeurActuelle: nb * prixActuel, prixRevient: nb * pa };
}

function derivedVal(row) {
  const computed = (parseFloat(row.nbActions) || 0) * (parseFloat(row.prixActuel) || 0);
  return computed > 0 ? computed : (parseFloat(row.valeurActuelle) || 0);
}

function TableSection({ title, color, data, setData, newLine, setNewLine, errors, setErrors }) {
  const C = useTheme();
  const [loadingRows,   setLoadingRows]   = useState(new Set());
  const [rowErrors,     setRowErrors]     = useState(new Set());
  const [newLoading,    setNewLoading]    = useState(false);
  const [newTickerErr,  setNewTickerErr]  = useState(false);
  const [newTickerMsg,  setNewTickerMsg]  = useState("");

  const thStyle = {
    color: C.muted, textAlign: "left", padding: "6px 8px",
    fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1,
  };

  const setRowLoading = (i, v) =>
    setLoadingRows(prev => { const s = new Set(prev); v ? s.add(i) : s.delete(i); return s; });
  const setRowError = (i, v) =>
    setRowErrors(prev => { const s = new Set(prev); v ? s.add(i) : s.delete(i); return s; });

  const refreshRow = async (i) => {
    const ticker = data[i]?.ticker?.trim();
    if (!ticker) return;
    setRowLoading(i, true);
    setRowError(i, false);
    try {
      const quote = await fetchQuote(ticker);
      setData(prev => { const u = [...prev]; u[i] = applyQuote(u[i], quote); return u; });
    } catch {
      setRowError(i, true);
    } finally {
      setRowLoading(i, false);
    }
  };

  const lookupNewTicker = async () => {
    const ticker = newLine.ticker?.trim();
    if (!ticker) return;
    setNewLoading(true);
    setNewTickerErr(false);
    setNewTickerMsg("");
    try {
      const { nom, prixActuel } = await fetchQuote(ticker);
      setNewLine(prev => ({ ...prev, nom, prixActuel: String(prixActuel) }));
    } catch (e) {
      setNewTickerErr(true);
      setNewTickerMsg(e.message || "Erreur réseau");
    } finally {
      setNewLoading(false);
    }
  };

  const updateRow = (i, key, value) => {
    setData(prev => {
      const u = [...prev];
      u[i] = { ...u[i], [key]: value };
      const nb = parseFloat(u[i].nbActions)  || 0;
      const pa = parseFloat(u[i].prixAchat)  || 0;
      const pc = parseFloat(u[i].prixActuel) || 0;
      u[i].valeurActuelle = nb * pc;
      u[i].prixRevient    = nb * pa;
      return u;
    });
  };

  const addRow = () => {
    const errs = validatePos(newLine);
    if (hasError(errs)) { setErrors(errs); return; }
    const nb = parseFloat(newLine.nbActions)  || 0;
    const pa = parseFloat(newLine.prixAchat)  || 0;
    const pc = parseFloat(newLine.prixActuel) || 0;
    setData([...data, {
      ticker:         newLine.ticker?.trim().toUpperCase() || "",
      nom:            newLine.nom,
      secteur:        newLine.secteur,
      nbActions:      nb,
      prixAchat:      pa,
      prixActuel:     pc,
      valeurActuelle: nb * pc,
      prixRevient:    nb * pa,
    }]);
    setNewLine(EMPTY_POS);
    setErrors({});
    setNewTickerErr(false);
    setNewTickerMsg("");
  };

  const searchBtnStyle = (active) => ({
    background:   active ? C.accent : C.border,
    border:       "none",
    borderRadius: 6,
    color:        active ? "#fff" : C.muted,
    cursor:       active ? "pointer" : "default",
    fontSize:     11,
    padding:      "0 7px",
    height:       28,
    flexShrink:   0,
    fontWeight:   700,
  });

  const previewVal = (parseFloat(newLine.nbActions) || 0) * (parseFloat(newLine.prixActuel) || 0);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20, overflowX: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
        <span style={{ color: C.text, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{title}</span>
      </div>
      <table style={{ borderCollapse: "collapse", fontSize: 12, minWidth: 880 }}>
        <thead>
          <tr>
            {POS_FIELDS.map((f) => <th key={f.key} style={{ ...thStyle, width: f.width }}>{f.label}</th>)}
            <th style={{ ...thStyle, width: 90 }}>Valeur act.</th>
            <th style={{ ...thStyle, width: 64 }} />
          </tr>
        </thead>
        <tbody>
          {/* Lignes existantes */}
          {data.map((row, i) => {
            const loading  = loadingRows.has(i);
            const hasErr   = rowErrors.has(i);
            return (
              <tr key={row.nom + (row.secteur || "")} style={{ borderTop: `1px solid ${C.border}` }}>
                {POS_FIELDS.map((f) => (
                  <td key={f.key} style={{ padding: "5px 4px" }}>
                    <input
                      value={row[f.key] ?? ""}
                      type={f.type}
                      disabled={f.key === "nom" && loading}
                      placeholder={f.key === "nom" && loading ? "Chargement…" : ""}
                      title={f.key === "ticker" && hasErr ? "Ticker non trouvé" : undefined}
                      onChange={(e) => {
                        const val = f.key === "ticker" ? e.target.value.toUpperCase() : e.target.value;
                        if (f.key === "ticker") setRowError(i, false);
                        updateRow(i, f.key, val);
                      }}
                      style={{
                        ...inputStyle(f.key === "ticker" && hasErr, C, f.width - 8),
                        opacity: (f.key === "nom" && loading) ? 0.5 : 1,
                      }}
                    />
                  </td>
                ))}
                <td style={{ padding: "5px 8px", color: C.text, fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {fmt(derivedVal(row))}
                </td>
                <td style={{ padding: "5px 4px", whiteSpace: "nowrap" }}>
                  <button
                    onClick={() => refreshRow(i)}
                    disabled={loading || !row.ticker?.trim()}
                    title={hasErr ? "Ticker non trouvé — réessayer" : "Rafraîchir le prix"}
                    style={{
                      background: "none", border: "none",
                      color: hasErr ? C.moins : (row.ticker?.trim() ? C.accent : C.muted),
                      cursor: row.ticker?.trim() && !loading ? "pointer" : "default",
                      fontSize: 15, marginRight: 2, opacity: loading ? 0.4 : 1,
                    }}
                  >{loading ? "…" : (hasErr ? "⚠" : "↻")}</button>
                  <button
                    onClick={() => setData(data.filter((_, idx) => idx !== i))}
                    style={{ background: "none", border: "none", color: C.moins, cursor: "pointer", fontSize: 16 }}
                  >✕</button>
                </td>
              </tr>
            );
          })}

          {/* Ligne d'ajout */}
          <tr style={{ borderTop: `1px solid ${C.border}` }}>
            {POS_FIELDS.map((f) => (
              <td key={f.key} style={{ padding: "5px 4px" }}>
                {f.key === "ticker" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                      <input
                        value={newLine.ticker ?? ""}
                        type="text"
                        placeholder="AAPL"
                        onChange={(e) => {
                          setNewLine({ ...newLine, ticker: e.target.value.toUpperCase() });
                          setNewTickerErr(false);
                          setNewTickerMsg("");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && lookupNewTicker()}
                        style={{ ...inputStyle(newTickerErr, C, f.width - 38) }}
                      />
                      <button
                        onClick={lookupNewTicker}
                        disabled={newLoading || !newLine.ticker?.trim()}
                        title="Rechercher (ou appuyer sur Entrée)"
                        style={searchBtnStyle(!newLoading && !!newLine.ticker?.trim())}
                      >
                        {newLoading ? "…" : "↗"}
                      </button>
                    </div>
                    {newTickerErr && newTickerMsg && (
                      <span style={{ color: C.moins, fontSize: 10, fontFamily: "monospace", lineHeight: 1.2 }}>
                        {newTickerMsg}
                      </span>
                    )}
                  </div>
                ) : f.key === "nom" ? (
                  <div style={{ position: "relative" }}>
                    <input
                      value={newLine.nom ?? ""}
                      type="text"
                      placeholder={newLoading ? "Chargement…" : newTickerErr ? "Erreur" : "Entreprise"}
                      disabled={newLoading}
                      onChange={(e) => {
                        setNewLine({ ...newLine, nom: e.target.value });
                        if (errors.nom) setErrors({ ...errors, nom: false });
                      }}
                      style={{
                        ...inputStyle(!!errors.nom, C, f.width - 8),
                        opacity: newLoading ? 0.6 : 1,
                      }}
                    />
                  </div>
                ) : (
                  <input
                    value={newLine[f.key] ?? ""}
                    type={f.type}
                    placeholder={f.placeholder}
                    onChange={(e) => {
                      setNewLine({ ...newLine, [f.key]: e.target.value });
                      if (errors[f.key]) setErrors({ ...errors, [f.key]: false });
                    }}
                    style={{ ...inputStyle(!!errors[f.key], C, f.width - 8) }}
                  />
                )}
              </td>
            ))}
            <td style={{ padding: "5px 8px", color: C.muted, fontFamily: "monospace", whiteSpace: "nowrap" }}>
              {previewVal > 0 ? fmt(previewVal) : "—"}
            </td>
            <td style={{ padding: "5px 4px" }}>
              <button onClick={addRow} style={btnStyle(color)}>+</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function SaisieTab({ pea, ct, history, setPea, setCt, setHistory }) {
  const C = useTheme();
  const thStyle = {
    color: C.muted, textAlign: "left", padding: "6px 8px",
    fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1,
  };

  const [newPea,     setNewPea]     = useState(EMPTY_POS);
  const [newCt,      setNewCt]      = useState(EMPTY_POS);
  const [newHist,    setNewHist]    = useState(EMPTY_HIST);
  const [peaErrors,  setPeaErrors]  = useState({});
  const [ctErrors,   setCtErrors]   = useState({});
  const [histErrors, setHistErrors] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const importRef = useRef(null);

  const addHist = () => {
    const errs = validateHist(newHist);
    if (hasError(errs)) { setHistErrors(errs); return; }
    const updated = [
      ...history,
      { date: newHist.date, pea: parseFloat(newHist.pea), ct: parseFloat(newHist.ct) },
    ].sort((a, b) => a.date.localeCompare(b.date));
    setHistory(updated);
    setNewHist(EMPTY_HIST);
    setHistErrors({});
  };

  const refreshAllPrices = async () => {
    setRefreshing(true);
    const refreshArr = async (arr) => {
      const updated = [...arr];
      await Promise.all(
        updated.map(async (pos, i) => {
          const ticker = pos.ticker?.trim();
          if (!ticker) return;
          try {
            const quote = await fetchQuote(ticker);
            updated[i] = applyQuote(pos, quote);
          } catch {}
        })
      );
      return updated;
    };
    const [newPeaArr, newCtArr] = await Promise.all([refreshArr(pea), refreshArr(ct)]);
    setPea(newPeaArr);
    setCt(newCtArr);
    setRefreshing(false);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ pea, ct, history }, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `pf-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (Array.isArray(parsed.pea))     setPea(parsed.pea);
        if (Array.isArray(parsed.ct))      setCt(parsed.ct);
        if (Array.isArray(parsed.history)) setHistory(parsed.history);
      } catch {
        alert("Fichier invalide — JSON attendu");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          onClick={refreshAllPrices}
          disabled={refreshing}
          style={outlineBtn(C.accent, refreshing)}
        >
          {refreshing ? "Mise à jour…" : "↻ Rafraîchir tous les prix"}
        </button>
      </div>

      <TableSection
        title="PEA — Positions" color={C.pea}
        data={pea} setData={setPea}
        newLine={newPea} setNewLine={setNewPea}
        errors={peaErrors} setErrors={setPeaErrors}
      />
      <TableSection
        title="Compte-Titre — Positions" color={C.ct}
        data={ct} setData={setCt}
        newLine={newCt} setNewLine={setNewCt}
        errors={ctErrors} setErrors={setCtErrors}
      />

      {/* Historique mensuel */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.accent }} />
          <span style={{ color: C.text, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>HISTORIQUE MENSUEL</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Date", "Valeur PEA (€)", "Valeur CT (€)", ""].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((row, i) => (
              <tr key={row.date} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "8px" }}>
                  <input
                    type="month" value={row.date}
                    onChange={(e) => {
                      const u = [...history];
                      u[i] = { ...u[i], date: e.target.value };
                      setHistory(u.sort((a, b) => a.date.localeCompare(b.date)));
                    }}
                    style={inputStyle(false, C)}
                  />
                </td>
                <td style={{ padding: "8px" }}>
                  <input
                    type="number" value={row.pea}
                    onChange={(e) => { const u = [...history]; u[i] = { ...u[i], pea: parseFloat(e.target.value) || 0 }; setHistory(u); }}
                    style={inputStyle(false, C)}
                  />
                </td>
                <td style={{ padding: "8px" }}>
                  <input
                    type="number" value={row.ct}
                    onChange={(e) => { const u = [...history]; u[i] = { ...u[i], ct: parseFloat(e.target.value) || 0 }; setHistory(u); }}
                    style={inputStyle(false, C)}
                  />
                </td>
                <td>
                  <button
                    onClick={() => setHistory(history.filter((_, idx) => idx !== i))}
                    style={{ background: "none", border: "none", color: C.moins, cursor: "pointer", fontSize: 16 }}
                  >✕</button>
                </td>
              </tr>
            ))}

            {/* Ligne d'ajout */}
            <tr style={{ borderTop: `1px solid ${C.border}` }}>
              <td style={{ padding: "8px" }}>
                <input
                  type="month" value={newHist.date}
                  onChange={(e) => { setNewHist({ ...newHist, date: e.target.value }); if (histErrors.date) setHistErrors({ ...histErrors, date: false }); }}
                  style={inputStyle(!!histErrors.date, C)}
                />
              </td>
              <td style={{ padding: "8px" }}>
                <input
                  type="number" placeholder="0" value={newHist.pea}
                  onChange={(e) => { setNewHist({ ...newHist, pea: e.target.value }); if (histErrors.pea) setHistErrors({ ...histErrors, pea: false }); }}
                  style={inputStyle(!!histErrors.pea, C)}
                />
              </td>
              <td style={{ padding: "8px" }}>
                <input
                  type="number" placeholder="0" value={newHist.ct}
                  onChange={(e) => { setNewHist({ ...newHist, ct: e.target.value }); if (histErrors.ct) setHistErrors({ ...histErrors, ct: false }); }}
                  style={inputStyle(!!histErrors.ct, C)}
                />
              </td>
              <td>
                <button onClick={addHist} style={btnStyle(C.accent)}>+</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={handleExport} style={outlineBtn(C.accent)}>
          Exporter JSON
        </button>
        <button onClick={() => importRef.current?.click()} style={outlineBtn(C.muted)}>
          Importer JSON
        </button>
        <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
      </div>
    </div>
  );
}
