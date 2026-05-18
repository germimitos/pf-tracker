import { useState } from "react";
import { C } from "../constants";

const inputStyle = (error) => ({
  background: "#0d1526",
  border: `1px solid ${error ? C.moins : C.border}`,
  borderRadius: 8,
  color: C.text,
  padding: "8px 12px",
  fontSize: 13,
  fontFamily: "monospace",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.15s",
});

const btnStyle = (color) => ({
  background: color,
  border: "none",
  borderRadius: 8,
  color: "#0a0f1e",
  padding: "8px 18px",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 13,
});

const POS_FIELDS = [
  { key: "nom",            label: "Nom",                 type: "text"   },
  { key: "secteur",        label: "Secteur",             type: "text"   },
  { key: "valeurActuelle", label: "Valeur actuelle (€)", type: "number" },
  { key: "prixRevient",    label: "Prix de revient (€)", type: "number" },
];

const EMPTY_POS  = { nom: "", secteur: "", valeurActuelle: "", prixRevient: "" };
const EMPTY_HIST = { date: "", pea: "", ct: "" };

function validatePos(line) {
  const num = (v) => v === "" || isNaN(parseFloat(v)) || parseFloat(v) < 0;
  return {
    nom:            !line.nom.trim(),
    valeurActuelle: num(line.valeurActuelle),
    prixRevient:    num(line.prixRevient),
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

function TableSection({ title, color, data, setData, newLine, setNewLine, errors, setErrors }) {
  const thStyle = {
    color: C.muted, textAlign: "left", padding: "6px 8px",
    fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1,
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
        <span style={{ color: C.text, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{title}</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {POS_FIELDS.map((f) => <th key={f.key} style={thStyle}>{f.label}</th>)}
            <th style={{ ...thStyle, width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
              {POS_FIELDS.map((f) => (
                <td key={f.key} style={{ padding: "8px" }}>
                  <input
                    value={row[f.key]}
                    type={f.type}
                    onChange={(e) => {
                      const updated = [...data];
                      updated[i] = { ...updated[i], [f.key]: e.target.value };
                      setData(updated);
                    }}
                    style={inputStyle(false)}
                  />
                </td>
              ))}
              <td style={{ padding: "8px 4px" }}>
                <button
                  onClick={() => setData(data.filter((_, idx) => idx !== i))}
                  style={{ background: "none", border: "none", color: C.moins, cursor: "pointer", fontSize: 16 }}
                >✕</button>
              </td>
            </tr>
          ))}

          {/* Ligne d'ajout */}
          <tr style={{ borderTop: `1px solid ${C.border}` }}>
            {POS_FIELDS.map((f) => (
              <td key={f.key} style={{ padding: "8px" }}>
                <input
                  placeholder={f.label}
                  value={newLine[f.key]}
                  type={f.type}
                  onChange={(e) => {
                    setNewLine({ ...newLine, [f.key]: e.target.value });
                    if (errors[f.key]) setErrors({ ...errors, [f.key]: false });
                  }}
                  style={inputStyle(!!errors[f.key])}
                />
              </td>
            ))}
            <td style={{ padding: "8px 4px" }}>
              <button
                onClick={() => {
                  const errs = validatePos(newLine);
                  if (hasError(errs)) { setErrors(errs); return; }
                  setData([...data, {
                    ...newLine,
                    valeurActuelle: parseFloat(newLine.valeurActuelle),
                    prixRevient:    parseFloat(newLine.prixRevient),
                  }]);
                  setNewLine(EMPTY_POS);
                  setErrors({});
                }}
                style={btnStyle(color)}
              >+</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function SaisieTab({ pea, ct, history, setPea, setCt, setHistory, onReset }) {
  const [newPea,     setNewPea]     = useState(EMPTY_POS);
  const [newCt,      setNewCt]      = useState(EMPTY_POS);
  const [newHist,    setNewHist]    = useState(EMPTY_HIST);
  const [peaErrors,  setPeaErrors]  = useState({});
  const [ctErrors,   setCtErrors]   = useState({});
  const [histErrors, setHistErrors] = useState({});

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

  const thStyle = {
    color: C.muted, textAlign: "left", padding: "6px 8px",
    fontSize: 11, textTransform: "uppercase", letterSpacing: 1,
  };

  return (
    <div>
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
              <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "8px" }}>
                  <input
                    type="month" value={row.date}
                    onChange={(e) => { const u = [...history]; u[i] = { ...u[i], date: e.target.value }; setHistory(u); }}
                    style={inputStyle(false)}
                  />
                </td>
                <td style={{ padding: "8px" }}>
                  <input
                    type="number" value={row.pea}
                    onChange={(e) => { const u = [...history]; u[i] = { ...u[i], pea: parseFloat(e.target.value) || 0 }; setHistory(u); }}
                    style={inputStyle(false)}
                  />
                </td>
                <td style={{ padding: "8px" }}>
                  <input
                    type="number" value={row.ct}
                    onChange={(e) => { const u = [...history]; u[i] = { ...u[i], ct: parseFloat(e.target.value) || 0 }; setHistory(u); }}
                    style={inputStyle(false)}
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
                  style={inputStyle(!!histErrors.date)}
                />
              </td>
              <td style={{ padding: "8px" }}>
                <input
                  type="number" placeholder="0" value={newHist.pea}
                  onChange={(e) => { setNewHist({ ...newHist, pea: e.target.value }); if (histErrors.pea) setHistErrors({ ...histErrors, pea: false }); }}
                  style={inputStyle(!!histErrors.pea)}
                />
              </td>
              <td style={{ padding: "8px" }}>
                <input
                  type="number" placeholder="0" value={newHist.ct}
                  onChange={(e) => { setNewHist({ ...newHist, ct: e.target.value }); if (histErrors.ct) setHistErrors({ ...histErrors, ct: false }); }}
                  style={inputStyle(!!histErrors.ct)}
                />
              </td>
              <td>
                <button onClick={addHist} style={btnStyle(C.accent)}>+</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onReset}
          style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.muted, padding: "8px 18px", cursor: "pointer", fontSize: 12, fontFamily: "monospace",
          }}
        >
          Réinitialiser avec données démo
        </button>
      </div>
    </div>
  );
}
