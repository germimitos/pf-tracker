import { useState, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { fetchQuote } from "../stockApi";
import { fmt, pct, perf } from "../utils";
import { ACCOUNTS, TX_TYPES } from "../constants";

/* ── helpers de style ───────────────────────────────────────── */
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

/* ── valeur par défaut d'une transaction ────────────────────── */
const emptyTx = () => ({
  ticker:    "",
  nom:       "",
  secteur:   "",
  type:      TX_TYPES.ACHAT,
  date:      new Date().toISOString().slice(0, 10),
  qte:       "",          // nombre d'actions
  prixAchat: "",          // prix d'achat par action (€)
  prixActuel: "",         // prix actuel par action (€, auto-rempli)
  prixActuelNative: "",   // prix actuel en devise native (affiché sous prixActuel)
  devise:    "EUR",
  frais:     "",
});

function validateTx(f) {
  const num = (v) => v === "" || isNaN(parseFloat(v));
  return {
    nom:       !f.nom?.trim(),
    qte:       num(f.qte) || parseFloat(f.qte) <= 0,
    prixAchat: num(f.prixAchat) || parseFloat(f.prixAchat) < 0,
  };
}

const hasError = (e) => Object.values(e).some(Boolean);

function toTransaction(f, existingId) {
  const qte        = parseFloat(f.qte)              || 0;
  const prixAchat  = parseFloat(f.prixAchat)        || 0;
  const prixActuel = parseFloat(f.prixActuel)       || 0;
  const frais      = parseFloat(f.frais)            || 0;
  return {
    id:               existingId ?? crypto.randomUUID(),
    date:             f.date || new Date().toISOString().slice(0, 10),
    type:             f.type || TX_TYPES.ACHAT,
    ticker:           f.ticker?.trim().toUpperCase() || "",
    nom:              f.nom?.trim()     || "",
    secteur:          f.secteur?.trim() || "",
    qte,
    prixAchat,
    prixActuel,
    prixActuelNative: parseFloat(f.prixActuelNative) || prixActuel,
    devise:           f.devise || "EUR",
    frais,
    // alias pour compatibilité avec derivePositions v1/v2
    nbActions:        qte,
    prixUnitaireEUR:  prixAchat,
  };
}

/* ── Formulaire de saisie ────────────────────────────────────── */
function AddForm({
  title, color, form, setForm,
  editId, onAdd, onUpdate, onCancel,
  errors, setErrors, setPriceCache,
}) {
  const C = useTheme();
  const [loading,   setLoading]   = useState(false);
  const [tickerErr, setTickerErr] = useState(false);
  const [tickerMsg, setTickerMsg] = useState("");
  const isEditing = editId !== null;

  const lookup = async () => {
    const ticker = form.ticker?.trim();
    if (!ticker) return;
    setLoading(true);
    setTickerErr(false);
    setTickerMsg("");
    try {
      const { nom, prixActuel, prixActuelEUR, devise, secteur } = await fetchQuote(ticker);
      const eur    = prixActuelEUR ?? prixActuel;
      const native = prixActuel;
      setForm((prev) => ({
        ...prev,
        nom,
        prixActuel:       String(eur),
        prixActuelNative: devise !== "EUR" ? String(native) : String(eur),
        devise:           devise || "EUR",
        secteur:          secteur || prev.secteur || "",
      }));
      setPriceCache((prev) => ({
        ...prev,
        [ticker.toUpperCase()]: { prixActuelEUR: eur, devise: devise || "EUR", updatedAt: Date.now() },
      }));
    } catch (e) {
      setTickerErr(true);
      setTickerMsg(e.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const isVente   = form.type === TX_TYPES.VENTE;
  const qte       = parseFloat(form.qte)       || 0;
  const pa        = parseFloat(form.prixAchat) || 0;
  const pc        = parseFloat(form.prixActuel)|| 0;
  const investi   = qte * pa + (parseFloat(form.frais) || 0);
  const valActuel = qte * pc;
  const showNative = form.devise && form.devise !== "EUR" && parseFloat(form.prixActuelNative) > 0;

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
          }}>✏ Modification en cours</span>
        )}
      </div>

      {/* Toggle ACHAT / VENTE */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[TX_TYPES.ACHAT, TX_TYPES.VENTE].map((t) => {
          const active = form.type === t;
          const tColor = t === TX_TYPES.ACHAT ? C.plus : C.moins;
          return (
            <button
              key={t}
              onClick={() => setForm((prev) => ({ ...prev, type: t }))}
              style={{
                background:    active ? tColor : "none",
                border:        `1px solid ${tColor}`,
                borderRadius:  8,
                color:         active ? "#0a0f1e" : tColor,
                padding:       "6px 20px",
                fontWeight:    700,
                cursor:        "pointer",
                fontSize:      12,
                letterSpacing: 1,
              }}
            >{t}</button>
          );
        })}
      </div>

      {/* Grille */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>

        {/* Ticker */}
        <div>
          <span style={label(C)}>Ticker</span>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              value={form.ticker ?? ""}
              type="text"
              placeholder="AAPL"
              onChange={(e) => {
                setForm({ ...form, ticker: e.target.value.toUpperCase() });
                setTickerErr(false); setTickerMsg("");
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
                border:       "none", borderRadius: 8,
                color:        (!loading && form.ticker?.trim()) ? "#0a0f1e" : C.muted,
                cursor:       (!loading && form.ticker?.trim()) ? "pointer" : "default",
                fontSize: 11, padding: "0 8px", height: 36, fontWeight: 700, flexShrink: 0,
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

        {/* Secteur */}
        <div>
          <span style={label(C)}>Secteur</span>
          <input
            value={form.secteur ?? ""}
            type="text"
            placeholder="—"
            onChange={(e) => setForm({ ...form, secteur: e.target.value })}
            style={inputStyle(false, C)}
          />
        </div>

        {/* Date */}
        <div>
          <span style={label(C)}>Date</span>
          <input
            value={form.date ?? ""}
            type="date"
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            style={inputStyle(false, C)}
          />
        </div>

        {/* Qté */}
        <div>
          <span style={label(C)}>Qté</span>
          <input
            value={form.qte ?? ""}
            type="number"
            placeholder="10"
            onChange={(e) => {
              setForm({ ...form, qte: e.target.value });
              if (errors.qte) setErrors({ ...errors, qte: false });
            }}
            style={inputStyle(!!errors.qte, C)}
          />
        </div>

        {/* Prix à l'achat par action */}
        <div>
          <span style={label(C)}>{isVente ? "Prix de vente / action (€)" : "Prix d'achat / action (€)"}</span>
          <input
            value={form.prixAchat ?? ""}
            type="number"
            placeholder="150.00"
            onChange={(e) => {
              setForm({ ...form, prixAchat: e.target.value });
              if (errors.prixAchat) setErrors({ ...errors, prixAchat: false });
            }}
            style={inputStyle(!!errors.prixAchat, C)}
          />
        </div>

        {/* Prix actuel par action — auto-rempli depuis Yahoo */}
        <div>
          <span style={label(C)}>Prix actuel / action (€)</span>
          <input
            value={form.prixActuel ?? ""}
            type="number"
            placeholder="Auto (↗)"
            onChange={(e) => {
              const raw = e.target.value;
              setForm((prev) => ({
                ...prev,
                prixActuel:       raw,
                prixActuelNative: prev.devise === "EUR" ? raw : prev.prixActuelNative,
              }));
            }}
            style={inputStyle(false, C)}
          />
          {showNative && (
            <span style={{ fontSize: 10, fontFamily: "monospace", color: C.muted, marginTop: 3, display: "block" }}>
              {parseFloat(form.prixActuelNative).toFixed(2)} {form.devise}
            </span>
          )}
        </div>

        {/* Frais */}
        <div>
          <span style={label(C)}>Frais (€)</span>
          <input
            value={form.frais ?? ""}
            type="number"
            placeholder="0.00"
            onChange={(e) => setForm({ ...form, frais: e.target.value })}
            style={inputStyle(false, C)}
          />
        </div>

      </div>

      {/* Résumé + boutons */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 20, fontSize: 12, fontFamily: "monospace" }}>
          <span style={{ color: C.muted }}>
            Investi :{" "}
            <span style={{ color: investi > 0 ? C.text : C.muted, fontWeight: 600 }}>
              {investi > 0 ? fmt(investi) : "—"}
            </span>
          </span>
          {valActuel > 0 && (
            <span style={{ color: C.muted }}>
              Valeur actuelle :{" "}
              <span style={{
                fontWeight: 600,
                color: valActuel >= investi ? C.plus : C.moins,
              }}>
                {fmt(valActuel)}
              </span>
              {investi > 0 && (
                <span style={{ color: valActuel >= investi ? C.plus : C.moins, marginLeft: 6 }}>
                  ({valActuel >= investi ? "+" : ""}{((valActuel - investi) / investi * 100).toFixed(1)}%)
                </span>
              )}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isEditing && <button onClick={onCancel} style={outlineBtn(C.muted)}>Annuler</button>}
          <button
            onClick={isEditing ? onUpdate : onAdd}
            style={btnStyle(isVente ? C.moins : color)}
          >
            {isEditing ? "✓ Mettre à jour" : `+ ${isVente ? "Vente" : "Achat"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Journal de transactions ─────────────────────────────────── */
function TransactionLog({
  peaTx, ctTx,
  editPeaId, editCtId,
  onEditPea, onEditCt,
  onDeletePea, onDeleteCt,
  priceCache, setPriceCache,
}) {
  const C = useTheme();
  const [loadingIds,      setLoadingIds]      = useState(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const setRowLoading = (id, v) =>
    setLoadingIds((prev) => { const s = new Set(prev); v ? s.add(id) : s.delete(id); return s; });

  const refresh = async (tx) => {
    const ticker = tx.ticker?.trim();
    if (!ticker) return;
    setRowLoading(tx.id, true);
    try {
      const { prixActuelEUR, devise } = await fetchQuote(ticker);
      setPriceCache((prev) => ({
        ...prev,
        [ticker.toUpperCase()]: { prixActuelEUR: prixActuelEUR ?? 0, devise: devise || "EUR", updatedAt: Date.now() },
      }));
    } catch {}
    setRowLoading(tx.id, false);
  };

  const allTx = [
    ...peaTx.map((tx) => ({ tx, compte: ACCOUNTS.PEA })),
    ...ctTx.map((tx)  => ({ tx, compte: ACCOUNTS.CT  })),
  ].sort((a, b) => b.tx.date.localeCompare(a.tx.date));

  if (allTx.length === 0) return null;

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
          JOURNAL DES TRANSACTIONS
        </span>
        <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>
          {allTx.length} opération{allTx.length > 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Actif</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Qté</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Prix achat/action</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Prix actuel/action</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Frais</th>
              <th style={{ ...thStyle, textAlign: "right" }}>P&L</th>
              <th style={thStyle}>Compte</th>
              <th style={{ ...thStyle, textAlign: "center" }} />
            </tr>
          </thead>
          <tbody>
            {allTx.map(({ tx, compte }) => {
              const isEdit     = (compte === ACCOUNTS.PEA && editPeaId === tx.id) ||
                                 (compte === ACCOUNTS.CT  && editCtId  === tx.id);
              const isLoading  = loadingIds.has(tx.id);
              const isVente    = tx.type === TX_TYPES.VENTE;
              const typeColor  = isVente ? "#f87171" : "#4ade80";
              const confirming = confirmDeleteId === tx.id;

              // Rétrocompat : plusieurs formats possibles
              const qte       = tx.qte      ?? tx.nbActions ?? 0;
              const pa        = tx.prixAchat ?? tx.prixUnitaireEUR ?? tx.prixUnitaire ?? 0;
              const cached    = priceCache?.[tx.ticker?.toUpperCase()];
              const pcEUR     = tx.prixActuel ?? cached?.prixActuelEUR ?? 0;
              const pcNative  = tx.prixActuelNative ?? tx.prixLiveNative ?? tx.prixUnitaire ?? pcEUR;
              const showNat   = tx.devise && tx.devise !== "EUR";
              const investi   = qte * pa + (tx.frais || 0);
              const valActuel = qte * (cached?.prixActuelEUR ?? pcEUR);
              const pl        = valActuel - investi;
              const plPct     = investi > 0 ? (pl / investi) * 100 : 0;

              return (
                <tr
                  key={tx.id}
                  style={{
                    borderBottom: `1px solid ${C.border}`,
                    background:   isEdit ? `${compte === ACCOUNTS.PEA ? "#4ade8011" : "#60a5fa11"}` : "transparent",
                  }}
                >
                  <td style={{ padding: "10px 10px", color: C.muted, fontFamily: "monospace", fontSize: 12 }}>
                    {tx.date}
                  </td>

                  <td style={{ padding: "10px 10px" }}>
                    <span style={{
                      background:   isVente ? "#3f1f1f" : "#14532d",
                      color:        typeColor,
                      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                    }}>{tx.type}</span>
                  </td>

                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ fontWeight: 600, color: C.text }}>{tx.nom || tx.ticker}</div>
                    {tx.ticker && <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{tx.ticker}</div>}
                  </td>

                  <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "monospace", color: C.text }}>
                    {qte % 1 === 0 ? qte : qte.toFixed(3)}
                  </td>

                  {/* Prix achat / action */}
                  <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "monospace", color: C.muted }}>
                    {pa > 0 ? fmt(pa) : "—"}
                  </td>

                  {/* Prix actuel / action (EUR + devise native) */}
                  <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "monospace" }}>
                    {cached?.prixActuelEUR != null ? (
                      <>
                        <div style={{ color: C.text, fontWeight: 600 }}>{fmt(cached.prixActuelEUR)}</div>
                        {showNat && pcNative > 0 && (
                          <div style={{ fontSize: 10, color: C.muted }}>
                            {pcNative.toFixed(2)} {tx.devise}
                          </div>
                        )}
                      </>
                    ) : pcEUR > 0 ? (
                      <>
                        <div style={{ color: C.muted }}>{fmt(pcEUR)}</div>
                        {showNat && pcNative > 0 && (
                          <div style={{ fontSize: 10, color: C.muted }}>
                            {pcNative.toFixed(2)} {tx.devise}
                          </div>
                        )}
                      </>
                    ) : "—"}
                  </td>

                  {/* Frais */}
                  <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "monospace", color: C.muted }}>
                    {tx.frais > 0 ? fmt(tx.frais) : "—"}
                  </td>

                  {/* P&L */}
                  <td style={{ padding: "10px 10px", textAlign: "right", fontFamily: "monospace" }}>
                    {investi > 0 && valActuel > 0 ? (
                      <>
                        <div style={{ fontWeight: 700, color: pl >= 0 ? C.plus : C.moins }}>{fmt(pl)}</div>
                        <div style={{ fontSize: 10, color: pl >= 0 ? C.plus : C.moins }}>
                          {pl >= 0 ? "+" : ""}{plPct.toFixed(1)}%
                        </div>
                      </>
                    ) : "—"}
                  </td>

                  {/* Compte */}
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{
                      background:   compte === ACCOUNTS.PEA ? "#14532d" : "#1e3a5f",
                      color:        compte === ACCOUNTS.PEA ? "#4ade80"  : "#60a5fa",
                      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                    }}>{compte}</span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "10px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {confirming ? (
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: C.moins, fontFamily: "monospace" }}>Supprimer ?</span>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{ ...outlineBtn(C.muted), padding: "4px 10px", fontSize: 11 }}
                        >Annuler</button>
                        <button
                          onClick={() => {
                            if (compte === ACCOUNTS.PEA) onDeletePea(tx.id);
                            else                          onDeleteCt(tx.id);
                            setConfirmDeleteId(null);
                          }}
                          style={{ ...btnStyle(C.moins), padding: "4px 10px", fontSize: 11 }}
                        >Supprimer</button>
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => refresh(tx)}
                          disabled={isLoading || !tx.ticker?.trim()}
                          title="Rafraîchir le prix actuel"
                          style={{ background: "none", border: "none", color: isLoading ? C.muted : C.accent, cursor: tx.ticker?.trim() && !isLoading ? "pointer" : "default", fontSize: 15, marginRight: 4 }}
                        >{isLoading ? "…" : "↻"}</button>
                        <button
                          onClick={() => compte === ACCOUNTS.PEA ? onEditPea(tx.id) : onEditCt(tx.id)}
                          title="Modifier"
                          style={{ background: "none", border: "none", color: isEdit ? C.accent : C.muted, cursor: "pointer", fontSize: 14, marginRight: 4 }}
                        >✏</button>
                        <button
                          onClick={() => setConfirmDeleteId(tx.id)}
                          title="Supprimer"
                          style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 15 }}
                        >✕</button>
                      </>
                    )}
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
export function SaisieTab({ peaTx, ctTx, setPeaTx, setCtTx, priceCache, setPriceCache }) {
  const C = useTheme();
  const importRef = useRef(null);

  const [formPea,    setFormPea]    = useState(emptyTx);
  const [formCt,     setFormCt]     = useState(emptyTx);
  const [editPeaId,  setEditPeaId]  = useState(null);
  const [editCtId,   setEditCtId]   = useState(null);
  const [peaErrors,  setPeaErrors]  = useState({});
  const [ctErrors,   setCtErrors]   = useState({});
  const [refreshing, setRefreshing] = useState(false);

  /* ── PEA ── */
  const addPea = () => {
    const errs = validateTx(formPea);
    if (hasError(errs)) { setPeaErrors(errs); return; }
    setPeaTx([...peaTx, toTransaction(formPea)]);
    setFormPea(emptyTx());
    setPeaErrors({});
  };

  const startEditPea = (id) => {
    const tx = peaTx.find((t) => t.id === id);
    if (!tx) return;
    const qte       = tx.qte      ?? tx.nbActions ?? 0;
    const pa        = tx.prixAchat ?? tx.prixUnitaireEUR ?? tx.prixUnitaire ?? 0;
    const pc        = tx.prixActuel ?? tx.prixLive ?? tx.prixUnitaireEUR ?? 0;
    const pcNative  = tx.prixActuelNative ?? tx.prixLiveNative ?? tx.prixUnitaire ?? pc;
    setFormPea({ ...tx, qte: String(qte), prixAchat: String(pa), prixActuel: String(pc), prixActuelNative: String(pcNative), frais: String(tx.frais ?? "") });
    setEditPeaId(id);
    setPeaErrors({});
    setEditCtId(null);
    setFormCt(emptyTx());
  };

  const updatePea = () => {
    const errs = validateTx(formPea);
    if (hasError(errs)) { setPeaErrors(errs); return; }
    setPeaTx((prev) => prev.map((t) => t.id === editPeaId ? toTransaction(formPea, editPeaId) : t));
    setFormPea(emptyTx());
    setEditPeaId(null);
    setPeaErrors({});
  };

  const cancelPea = () => { setFormPea(emptyTx()); setEditPeaId(null); setPeaErrors({}); };

  const deletePea = (id) => {
    setPeaTx((prev) => prev.filter((t) => t.id !== id));
    if (editPeaId === id) cancelPea();
  };

  /* ── CT ── */
  const addCt = () => {
    const errs = validateTx(formCt);
    if (hasError(errs)) { setCtErrors(errs); return; }
    setCtTx([...ctTx, toTransaction(formCt)]);
    setFormCt(emptyTx());
    setCtErrors({});
  };

  const startEditCt = (id) => {
    const tx = ctTx.find((t) => t.id === id);
    if (!tx) return;
    const qte      = tx.qte      ?? tx.nbActions ?? 0;
    const pa       = tx.prixAchat ?? tx.prixUnitaireEUR ?? tx.prixUnitaire ?? 0;
    const pc       = tx.prixActuel ?? tx.prixLive ?? tx.prixUnitaireEUR ?? 0;
    const pcNative = tx.prixActuelNative ?? tx.prixLiveNative ?? tx.prixUnitaire ?? pc;
    setFormCt({ ...tx, qte: String(qte), prixAchat: String(pa), prixActuel: String(pc), prixActuelNative: String(pcNative), frais: String(tx.frais ?? "") });
    setEditCtId(id);
    setCtErrors({});
    setEditPeaId(null);
    setFormPea(emptyTx());
  };

  const updateCt = () => {
    const errs = validateTx(formCt);
    if (hasError(errs)) { setCtErrors(errs); return; }
    setCtTx((prev) => prev.map((t) => t.id === editCtId ? toTransaction(formCt, editCtId) : t));
    setFormCt(emptyTx());
    setEditCtId(null);
    setCtErrors({});
  };

  const cancelCt = () => { setFormCt(emptyTx()); setEditCtId(null); setCtErrors({}); };

  const deleteCt = (id) => {
    setCtTx((prev) => prev.filter((t) => t.id !== id));
    if (editCtId === id) cancelCt();
  };

  /* ── Rafraîchir tous les prix ── */
  const refreshAllPrices = async () => {
    setRefreshing(true);
    const tickers = [...new Set([...peaTx, ...ctTx].map((tx) => tx.ticker?.toUpperCase()).filter(Boolean))];
    const updated = { ...priceCache };
    await Promise.all(tickers.map(async (ticker) => {
      try {
        const { prixActuelEUR, devise } = await fetchQuote(ticker);
        updated[ticker] = { prixActuelEUR: prixActuelEUR ?? 0, devise: devise || "EUR", updatedAt: Date.now() };
      } catch {}
    }));
    setPriceCache(updated);
    setRefreshing(false);
  };

  /* ── Export / Import ── */
  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ peaTx, ctTx, priceCache }, null, 2)], { type: "application/json" });
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
        if (Array.isArray(parsed.peaTx)) {
          setPeaTx(parsed.peaTx);
          setCtTx(parsed.ctTx ?? []);
          if (parsed.priceCache) setPriceCache(parsed.priceCache);
        } else if (Array.isArray(parsed.pea)) {
          const migrate = (arr) => arr.map((pos) => ({
            id: crypto.randomUUID(), date: "2024-01-01",
            type: TX_TYPES.ACHAT,
            ticker: pos.ticker ?? "", nom: pos.nom ?? "", secteur: pos.secteur ?? "",
            qte:        parseFloat(pos.nbActions)  || 0,
            prixAchat:  parseFloat(pos.prixAchat)  || 0,
            prixActuel: parseFloat(pos.prixActuel) || 0,
            devise: "EUR", frais: 0,
            nbActions: parseFloat(pos.nbActions) || 0,
            prixUnitaireEUR: parseFloat(pos.prixAchat) || 0,
          }));
          setPeaTx(migrate(parsed.pea));
          setCtTx(migrate(parsed.ct ?? []));
        } else {
          alert("Format de fichier non reconnu");
        }
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
        <button onClick={refreshAllPrices} disabled={refreshing} style={outlineBtn(C.accent, refreshing)}>
          {refreshing ? "Mise à jour…" : "↻ Rafraîchir tous les prix"}
        </button>
      </div>

      <AddForm
        title="PEA — Nouvelle transaction" color={C.pea}
        form={formPea} setForm={setFormPea}
        editId={editPeaId}
        onAdd={addPea} onUpdate={updatePea} onCancel={cancelPea}
        errors={peaErrors} setErrors={setPeaErrors}
        setPriceCache={setPriceCache}
      />
      <AddForm
        title="Compte-Titre — Nouvelle transaction" color={C.ct}
        form={formCt} setForm={setFormCt}
        editId={editCtId}
        onAdd={addCt} onUpdate={updateCt} onCancel={cancelCt}
        errors={ctErrors} setErrors={setCtErrors}
        setPriceCache={setPriceCache}
      />

      <TransactionLog
        peaTx={peaTx} ctTx={ctTx}
        editPeaId={editPeaId} editCtId={editCtId}
        onEditPea={startEditPea} onEditCt={startEditCt}
        onDeletePea={deletePea}  onDeleteCt={deleteCt}
        priceCache={priceCache} setPriceCache={setPriceCache}
      />

      <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={handleExport} style={outlineBtn(C.accent)}>Exporter JSON</button>
        <button onClick={() => importRef.current?.click()} style={outlineBtn(C.muted)}>Importer JSON</button>
        <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
      </div>
    </div>
  );
}
