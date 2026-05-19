import { useState, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { fetchQuote } from "../stockApi";
import { fmt, pct, perf } from "../utils";
import { ACCOUNTS } from "../constants";

/* ── styles helpers ─────────────────────────────────────────── */
const inputStyle = (error, C) => ({
  background:   C.card,
  border:       `1px solid ${error ? C.moins : C.border}`,
  borderRadius: 8,
  color:        C.text,
  padding:      "8px 10px",
  fontSize:     13,
  fontFamily:   "monospace",
  width:        "100%",
  boxSizing:    "border-box",
  outline:      "none",
});

const label = (C) => ({
  color:         C.muted,
  fontSize:      10,
  textTransform: "uppercase",
  letterSpacing: 1,
  display:       "block",
  marginBottom:  4,
});

const btnStyle = (color) => ({
  background:   color,
  border:       "none",
  borderRadius: 8,
  color:        "#0a0f1e",
  padding:      "9px 20px",
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

/* ── constantes ─────────────────────────────────────────────── */
const EMPTY_POS = { ticker: "", nom: "", secteur: "", nbActions: "", prixAchat: "", prixActuel: "" };

function validatePos(f) {
  const num = (v) => v === "" || isNaN(parseFloat(v));
  return {
    nom:       !f.nom?.trim(),
    nbActions: num(f.nbActions) || parseFloat(f.nbActions) <= 0,
    prixAchat: num(f.prixAchat) || parseFloat(f.prixAchat) < 0,
  };
}

const hasError = (e) => Object.values(e).some(Boolean);

function toPosition(f) {
  const nb = parseFloat(f.nbActions)  || 0;
  const pa = parseFloat(f.prixAchat)  || 0;
  const pc = parseFloat(f.prixActuel) || 0;
  return {
    ticker:         f.ticker?.trim().toUpperCase() || "",
    nom:            f.nom?.trim()     || "",
    secteur:        f.secteur?.trim() || "",
    nbActions:      nb,
    prixAchat:      pa,
    prixActuel:     pc,
    valeurActuelle: nb * pc,
    prixRevient:    nb * pa,
  };
}

function applyQuote(pos, { nom, prixActuel, secteur }) {
  const nb = parseFloat(pos.nbActions) || 0;
  const pa = parseFloat(pos.prixAchat) || 0;
  return {
    ...pos,
    nom,
    prixActuel,
    secteur:        pos.secteur || secteur || "",
    valeurActuelle: nb * prixActuel,
    prixRevient:    nb * pa,
  };
}

/* ── Formulaire de saisie (ajouter ou modifier) ─────────────── */
function AddForm({ title, color, form, setForm, editIdx, onAdd, onUpdate, onCancel, errors, setErrors }) {
  const C = useTheme();
  const [loading,   setLoading]   = useState(false);
  const [tickerErr, setTickerErr] = useState(false);
  const [tickerMsg, setTickerMsg] = useState("");
  const isEditing = editIdx !== null;

  const lookup = async () => {
    const ticker = form.ticker?.trim();
    if (!ticker) return;
    setLoading(true);
    setTickerErr(false);
    setTickerMsg("");
    try {
      const { nom, prixActuel, secteur } = await fetchQuote(ticker);
      setForm((prev) => ({
        ...prev,
        nom,
        prixActuel: String(prixActuel),
        secteur:    prev.secteur || secteur || "",
      }));
    } catch (e) {
      setTickerErr(true);
      setTickerMsg(e.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const previewVal = (parseFloat(form.nbActions) || 0) * (parseFloat(form.prixActuel) || 0);

  const field = (key, lbl, type, placeholder, errorKey) => (
    <div>
      <span style={label(C)}>{lbl}</span>
      <input
        value={form[key] ?? ""}
        type={type}
        placeholder={placeholder}
        onChange={(e) => {
          setForm({ ...form, [key]: type === "text" ? e.target.value : e.target.value });
          if (errorKey && errors[errorKey]) setErrors({ ...errors, [errorKey]: false });
        }}
        style={{ ...inputStyle(errorKey ? !!errors[errorKey] : false, C) }}
      />
    </div>
  );

  return (
    <div style={{
      background:   C.card,
      border:       `1px solid ${isEditing ? color : C.border}`,
      borderRadius: 12,
      padding:      20,
      marginBottom: 20,
    }}>
      {/* Titre */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
        <span style={{ color: C.text, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{title}</span>
        {isEditing && (
          <span style={{
            fontSize: 11, fontFamily: "monospace",
            background: `${color}22`, color, border: `1px solid ${color}44`,
            borderRadius: 4, padding: "2px 8px",
          }}>
            ✏ Modification en cours
          </span>
        )}
      </div>

      {/* Champs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
        {/* Ticker avec bouton lookup */}
        <div>
          <span style={label(C)}>Ticker</span>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              value={form.ticker ?? ""}
              type="text"
              placeholder="AAPL"
              onChange={(e) => {
                setForm({ ...form, ticker: e.target.value.toUpperCase() });
                setTickerErr(false);
                setTickerMsg("");
              }}
              onKeyDown={(e) => e.key === "Enter" && lookup()}
              style={{ ...inputStyle(tickerErr, C), flex: 1, minWidth: 0 }}
            />
            <button
              onClick={lookup}
              disabled={loading || !form.ticker?.trim()}
              title="Rechercher (ou Entrée)"
              style={{
                background:   (!loading && form.ticker?.trim()) ? color : C.border,
                border:       "none",
                borderRadius: 8,
                color:        (!loading && form.ticker?.trim()) ? "#0a0f1e" : C.muted,
                cursor:       (!loading && form.ticker?.trim()) ? "pointer" : "default",
                fontSize:     11,
                padding:      "0 8px",
                height:       36,
                fontWeight:   700,
                flexShrink:   0,
              }}
            >{loading ? "…" : "↗"}</button>
          </div>
          {tickerErr && tickerMsg && (
            <span style={{ color: C.moins, fontSize: 10, fontFamily: "monospace" }}>{tickerMsg}</span>
          )}
        </div>

        {/* Entreprise */}
        <div>
          <span style={label(C)}>Entreprise</span>
          <input
            value={form.nom ?? ""}
            type="text"
            placeholder={loading ? "Chargement…" : "Entreprise"}
            disabled={loading}
            onChange={(e) => {
              setForm({ ...form, nom: e.target.value });
              if (errors.nom) setErrors({ ...errors, nom: false });
            }}
            style={{ ...inputStyle(!!errors.nom, C), opacity: loading ? 0.6 : 1 }}
          />
        </div>

        {field("secteur",   "Secteur",        "text",   "—",      null)}
        {field("nbActions", "Nb actions",      "number", "10",     "nbActions")}
        {field("prixAchat", "Prix achat (€)",  "number", "150.00", "prixAchat")}

        {/* Prix actuel */}
        <div>
          <span style={label(C)}>Prix actuel (€)</span>
          <input
            value={form.prixActuel ?? ""}
            type="number"
            placeholder="Auto"
            onChange={(e) => setForm({ ...form, prixActuel: e.target.value })}
            style={inputStyle(false, C)}
          />
        </div>
      </div>

      {/* Bas du formulaire */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 12, fontFamily: "monospace", color: C.muted }}>
          Valeur estimée :{" "}
          <span style={{ color: previewVal > 0 ? C.text : C.muted, fontWeight: 600 }}>
            {previewVal > 0 ? fmt(previewVal) : "—"}
          </span>
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {isEditing && (
            <button onClick={onCancel} style={outlineBtn(C.muted)}>Annuler</button>
          )}
          <button
            onClick={isEditing ? onUpdate : onAdd}
            style={btnStyle(color)}
          >
            {isEditing ? "✓ Mettre à jour" : "+ Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Historique des positions ────────────────────────────────── */
function PositionHistory({ pea, ct, editPeaIdx, editCtIdx, onEditPea, onEditCt, onDeletePea, onDeleteCt, setPea, setCt }) {
  const C = useTheme();
  const [loadingRows, setLoadingRows] = useState(new Map());

  const setRowLoading = (key, v) =>
    setLoadingRows((prev) => { const m = new Map(prev); v ? m.set(key, true) : m.delete(key); return m; });

  const refresh = async (compte, i, pos) => {
    const ticker = pos.ticker?.trim();
    if (!ticker) return;
    const key = `${compte}-${i}`;
    setRowLoading(key, true);
    try {
      const quote = await fetchQuote(ticker);
      if (compte === ACCOUNTS.PEA) {
        setPea((prev) => { const u = [...prev]; u[i] = applyQuote(u[i], quote); return u; });
      } else {
        setCt((prev) => { const u = [...prev]; u[i] = applyQuote(u[i], quote); return u; });
      }
    } catch {}
    setRowLoading(key, false);
  };

  const allPos = [
    ...pea.map((pos, i) => ({ pos, i, compte: ACCOUNTS.PEA })),
    ...ct.map((pos, i)  => ({ pos, i, compte: ACCOUNTS.CT  })),
  ];

  if (allPos.length === 0) return null;

  const thStyle = {
    color:         C.muted,
    textAlign:     "left",
    padding:       "8px 10px",
    fontSize:      11,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight:    500,
    borderBottom:  `1px solid ${C.border}`,
    whiteSpace:    "nowrap",
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.accent }} />
        <span style={{ color: C.text, fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>
          HISTORIQUE DES POSITIONS
        </span>
        <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>
          {allPos.length} position{allPos.length > 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={thStyle}>Actif</th>
              <th style={thStyle}>Compte</th>
              <th style={thStyle}>Secteur</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Valeur</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Investi</th>
              <th style={{ ...thStyle, textAlign: "right" }}>P&L</th>
              <th style={{ ...thStyle, textAlign: "right" }}>%</th>
              <th style={{ ...thStyle, textAlign: "center" }} />
            </tr>
          </thead>
          <tbody>
            {allPos.map(({ pos, i, compte }) => {
              const val    = parseFloat(pos.valeurActuelle) || 0;
              const rev    = parseFloat(pos.prixRevient)    || 0;
              const pl     = val - rev;
              const pp     = rev > 0 ? perf(val, rev) : 0;
              const key    = `${compte}-${i}`;
              const isEdit = (compte === ACCOUNTS.PEA && editPeaIdx === i) ||
                             (compte === ACCOUNTS.CT  && editCtIdx  === i);
              const loading = loadingRows.has(key);

              return (
                <tr
                  key={key}
                  style={{
                    borderBottom: `1px solid ${C.border}`,
                    background:   isEdit ? `${compte === ACCOUNTS.PEA ? "#4ade8011" : "#60a5fa11"}` : "transparent",
                  }}
                >
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ fontWeight: 600, color: C.text }}>{pos.nom || pos.ticker}</div>
                    {pos.ticker && <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{pos.ticker}</div>}
                  </td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{
                      background:   compte === ACCOUNTS.PEA ? "#14532d" : "#1e3a5f",
                      color:        compte === ACCOUNTS.PEA ? "#4ade80"  : "#60a5fa",
                      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                    }}>{compte}</span>
                  </td>
                  <td style={{ padding: "10px 10px", color: C.muted, fontSize: 12 }}>{pos.secteur || "—"}</td>
                  <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "monospace", color: C.text }}>{fmt(val)}</td>
                  <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "monospace", color: C.muted }}>{fmt(rev)}</td>
                  <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: pl >= 0 ? "#4ade80" : "#f87171" }}>{fmt(pl)}</td>
                  <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "monospace", color: pp >= 0 ? "#4ade80" : "#f87171" }}>{pct(pp)}</td>
                  <td style={{ padding: "10px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {/* Rafraîchir */}
                    <button
                      onClick={() => refresh(compte, i, pos)}
                      disabled={loading || !pos.ticker?.trim()}
                      title="Rafraîchir le prix"
                      style={{ background: "none", border: "none", color: loading ? C.muted : C.accent, cursor: pos.ticker?.trim() && !loading ? "pointer" : "default", fontSize: 15, marginRight: 4 }}
                    >{loading ? "…" : "↻"}</button>
                    {/* Modifier */}
                    <button
                      onClick={() => compte === ACCOUNTS.PEA ? onEditPea(i) : onEditCt(i)}
                      title="Modifier"
                      style={{ background: "none", border: "none", color: isEdit ? C.accent : C.muted, cursor: "pointer", fontSize: 14, marginRight: 4 }}
                    >✏</button>
                    {/* Supprimer */}
                    <button
                      onClick={() => compte === ACCOUNTS.PEA ? onDeletePea(i) : onDeleteCt(i)}
                      title="Supprimer"
                      style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 15 }}
                    >✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── SaisieTab principal ─────────────────────────────────────── */
export function SaisieTab({ pea, ct, setPea, setCt }) {
  const C = useTheme();
  const importRef = useRef(null);

  const [formPea,    setFormPea]    = useState(EMPTY_POS);
  const [formCt,     setFormCt]     = useState(EMPTY_POS);
  const [editPeaIdx, setEditPeaIdx] = useState(null);
  const [editCtIdx,  setEditCtIdx]  = useState(null);
  const [peaErrors,  setPeaErrors]  = useState({});
  const [ctErrors,   setCtErrors]   = useState({});
  const [refreshing, setRefreshing] = useState(false);

  /* ── PEA actions ── */
  const addPea = () => {
    const errs = validatePos(formPea);
    if (hasError(errs)) { setPeaErrors(errs); return; }
    setPea([...pea, toPosition(formPea)]);
    setFormPea(EMPTY_POS);
    setPeaErrors({});
  };

  const startEditPea = (i) => {
    setFormPea({ ...pea[i], nbActions: String(pea[i].nbActions), prixAchat: String(pea[i].prixAchat), prixActuel: String(pea[i].prixActuel) });
    setEditPeaIdx(i);
    setPeaErrors({});
    // Annuler l'édition CT en cours si besoin
    setEditCtIdx(null);
    setFormCt(EMPTY_POS);
  };

  const updatePea = () => {
    const errs = validatePos(formPea);
    if (hasError(errs)) { setPeaErrors(errs); return; }
    setPea((prev) => { const u = [...prev]; u[editPeaIdx] = toPosition(formPea); return u; });
    setFormPea(EMPTY_POS);
    setEditPeaIdx(null);
    setPeaErrors({});
  };

  const cancelPea = () => { setFormPea(EMPTY_POS); setEditPeaIdx(null); setPeaErrors({}); };

  const deletePea = (i) => {
    setPea(pea.filter((_, idx) => idx !== i));
    if (editPeaIdx === i) cancelPea();
    else if (editPeaIdx > i) setEditPeaIdx(editPeaIdx - 1);
  };

  /* ── CT actions ── */
  const addCt = () => {
    const errs = validatePos(formCt);
    if (hasError(errs)) { setCtErrors(errs); return; }
    setCt([...ct, toPosition(formCt)]);
    setFormCt(EMPTY_POS);
    setCtErrors({});
  };

  const startEditCt = (i) => {
    setFormCt({ ...ct[i], nbActions: String(ct[i].nbActions), prixAchat: String(ct[i].prixAchat), prixActuel: String(ct[i].prixActuel) });
    setEditCtIdx(i);
    setCtErrors({});
    setEditPeaIdx(null);
    setFormPea(EMPTY_POS);
  };

  const updateCt = () => {
    const errs = validatePos(formCt);
    if (hasError(errs)) { setCtErrors(errs); return; }
    setCt((prev) => { const u = [...prev]; u[editCtIdx] = toPosition(formCt); return u; });
    setFormCt(EMPTY_POS);
    setEditCtIdx(null);
    setCtErrors({});
  };

  const cancelCt = () => { setFormCt(EMPTY_POS); setEditCtIdx(null); setCtErrors({}); };

  const deleteCt = (i) => {
    setCt(ct.filter((_, idx) => idx !== i));
    if (editCtIdx === i) cancelCt();
    else if (editCtIdx > i) setEditCtIdx(editCtIdx - 1);
  };

  /* ── Rafraîchir tout ── */
  const refreshAllPrices = async () => {
    setRefreshing(true);
    const refreshArr = async (arr) => {
      const updated = [...arr];
      await Promise.all(updated.map(async (pos, i) => {
        if (!pos.ticker?.trim()) return;
        try { updated[i] = applyQuote(pos, await fetchQuote(pos.ticker.trim())); } catch {}
      }));
      return updated;
    };
    const [newPea, newCt] = await Promise.all([refreshArr(pea), refreshArr(ct)]);
    setPea(newPea);
    setCt(newCt);
    setRefreshing(false);
  };

  /* ── Export / Import ── */
  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ pea, ct }, null, 2)], { type: "application/json" });
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
        if (Array.isArray(parsed.pea)) setPea(parsed.pea);
        if (Array.isArray(parsed.ct))  setCt(parsed.ct);
      } catch {
        alert("Fichier invalide — JSON attendu");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div>
      {/* Bouton rafraîchir tout */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={refreshAllPrices} disabled={refreshing} style={outlineBtn(C.accent, refreshing)}>
          {refreshing ? "Mise à jour…" : "↻ Rafraîchir tous les prix"}
        </button>
      </div>

      {/* Formulaires de saisie */}
      <AddForm
        title="PEA — Nouvelle position" color={C.pea}
        form={formPea} setForm={setFormPea}
        editIdx={editPeaIdx}
        onAdd={addPea} onUpdate={updatePea} onCancel={cancelPea}
        errors={peaErrors} setErrors={setPeaErrors}
      />
      <AddForm
        title="Compte-Titre — Nouvelle position" color={C.ct}
        form={formCt} setForm={setFormCt}
        editIdx={editCtIdx}
        onAdd={addCt} onUpdate={updateCt} onCancel={cancelCt}
        errors={ctErrors} setErrors={setCtErrors}
      />

      {/* Historique des positions */}
      <PositionHistory
        pea={pea} ct={ct}
        editPeaIdx={editPeaIdx} editCtIdx={editCtIdx}
        onEditPea={startEditPea} onEditCt={startEditCt}
        onDeletePea={deletePea} onDeleteCt={deleteCt}
        setPea={setPea} setCt={setCt}
      />

      {/* Export / Import */}
      <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={handleExport} style={outlineBtn(C.accent)}>Exporter JSON</button>
        <button onClick={() => importRef.current?.click()} style={outlineBtn(C.muted)}>Importer JSON</button>
        <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
      </div>
    </div>
  );
}
