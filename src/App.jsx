import { useState, useEffect, useCallback } from "react";
import { useParisTheme }    from "./hooks/useParisTheme";
import { ThemeContext }      from "./context/ThemeContext";
import { DEMO_PEA, DEMO_CT } from "./constants";
import { derivePositions }   from "./utils";
import { DashboardTab }      from "./components/DashboardTab";
import { SaisieTab }         from "./components/SaisieTab";

function loadFromStorage(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

// Convertit d'anciennes positions (modèle v1) en transactions ACHAT (modèle v2)
function migratePositionsToTx(posArr) {
  if (!Array.isArray(posArr)) return [];
  return posArr.map((pos) => ({
    id:              crypto.randomUUID(),
    date:            "2024-01-01",
    type:            "ACHAT",
    ticker:          pos.ticker ?? "",
    nom:             pos.nom    ?? "",
    secteur:         pos.secteur ?? "",
    nbActions:       parseFloat(pos.nbActions) || 0,
    prixUnitaire:    parseFloat(pos.prixAchat)  || 0,
    devise:          "EUR",
    prixUnitaireEUR: parseFloat(pos.prixAchat)  || 0,
  }));
}

// Construit le priceCache initial depuis d'anciennes positions
function migratePriceCache(posArr) {
  if (!Array.isArray(posArr)) return {};
  const cache = {};
  for (const pos of posArr) {
    if (pos.ticker) {
      cache[pos.ticker] = {
        prixActuelEUR: parseFloat(pos.prixActuel) || 0,
        devise:        "EUR",
        updatedAt:     Date.now(),
      };
    }
  }
  return cache;
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const { C, isDaytime } = useParisTheme();

  // Initialisation depuis localStorage avec migration v1 → v2
  const [peaTx, setPeaTxRaw] = useState(() => {
    const stored = loadFromStorage("pft-peaTx", null);
    if (stored !== null) return stored;
    const oldPea = loadFromStorage("pft-pea", null);
    return oldPea ? migratePositionsToTx(oldPea) : migratePositionsToTx(DEMO_PEA);
  });

  const [ctTx, setCtTxRaw] = useState(() => {
    const stored = loadFromStorage("pft-ctTx", null);
    if (stored !== null) return stored;
    const oldCt = loadFromStorage("pft-ct", null);
    return oldCt ? migratePositionsToTx(oldCt) : migratePositionsToTx(DEMO_CT);
  });

  const [priceCache, setPriceCacheRaw] = useState(() => {
    const stored = loadFromStorage("pft-priceCache", null);
    if (stored !== null) return stored;
    const oldPea = loadFromStorage("pft-pea", null);
    const oldCt  = loadFromStorage("pft-ct",  null);
    return { ...migratePriceCache(oldPea ?? DEMO_PEA), ...migratePriceCache(oldCt ?? DEMO_CT) };
  });

  const [isDirty,  setIsDirty]  = useState(false);
  const [savedOk,  setSavedOk]  = useState(false);
  const [saveErr,  setSaveErr]  = useState(false);
  const [dbStatus, setDbStatus] = useState(null);

  const dirty = (setter) => (val) => { setter(val); setIsDirty(true); };
  const setPeaTx      = dirty(setPeaTxRaw);
  const setCtTx       = dirty(setCtTxRaw);
  const setPriceCache = dirty(setPriceCacheRaw);

  // Chargement initial depuis la DB
  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => {
        if (r.status === 503) throw new Error("not_configured");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setDbStatus(true);
        if (!data) return;
        if (Array.isArray(data.peaTx)) {
          // Nouveau format
          setPeaTxRaw(data.peaTx);
          setCtTxRaw(data.ctTx ?? []);
          setPriceCacheRaw(data.priceCache ?? {});
        } else if (Array.isArray(data.pea)) {
          // Ancien format — migration transparente
          setPeaTxRaw(migratePositionsToTx(data.pea));
          setCtTxRaw(migratePositionsToTx(data.ct ?? []));
          setPriceCacheRaw({ ...migratePriceCache(data.pea), ...migratePriceCache(data.ct ?? []) });
        }
      })
      .catch(() => setDbStatus(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async () => {
    setSaveErr(false);
    try {
      if (dbStatus) {
        const r = await fetch("/api/portfolio", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ peaTx, ctTx, priceCache }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      } else {
        localStorage.setItem("pft-peaTx",      JSON.stringify(peaTx));
        localStorage.setItem("pft-ctTx",        JSON.stringify(ctTx));
        localStorage.setItem("pft-priceCache",  JSON.stringify(priceCache));
      }
      setIsDirty(false);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } catch {
      setSaveErr(true);
      setTimeout(() => setSaveErr(false), 3000);
    }
  }, [dbStatus, peaTx, ctTx, priceCache]);

  // Positions dérivées pour le Dashboard (calcul pur, pas de state)
  const peaPositions = derivePositions(peaTx ?? [], priceCache);
  const ctPositions  = derivePositions(ctTx  ?? [], priceCache);

  const tabBtn = (key, label) => (
    <button
      onClick={() => setTab(key)}
      style={{
        background:    tab === key ? C.border : "none",
        border:        tab === key ? `1px solid ${C.border}` : "1px solid transparent",
        borderRadius:  8,
        color:         tab === key ? C.text : C.muted,
        padding:       "8px 20px",
        cursor:        "pointer",
        fontSize:      13,
        fontFamily:    "monospace",
        fontWeight:    tab === key ? 700 : 400,
        letterSpacing: 1,
      }}
    >
      {label}
    </button>
  );

  const saveLabel = savedOk ? "✓ Enregistré"
    : saveErr    ? "✕ Erreur"
    : "💾 Enregistrer";

  const saveBg = savedOk ? C.plus
    : saveErr  ? C.moins
    : isDirty  ? C.accent
    : "none";

  const saveBorder = savedOk ? C.plus
    : saveErr    ? C.moins
    : isDirty    ? C.accent
    : C.border;

  return (
    <ThemeContext.Provider value={C}>
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
        <div style={{
          background:     C.header,
          borderBottom:   `1px solid ${C.border}`,
          padding:        "20px 32px",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          gap:            16,
          flexWrap:       "wrap",
        }}>
          {/* Logo */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, fontFamily: "monospace" }}>
                <span style={{ color: C.pea }}>P</span>
                <span style={{ color: C.ct }}>F</span>
                <span style={{ color: C.text }}> TRACKER</span>
              </div>
              <span style={{
                fontSize:      10,
                fontFamily:    "monospace",
                letterSpacing: 1,
                background:    isDaytime ? "#fef3c7" : "#0f172a",
                color:         isDaytime ? "#92400e" : "#94a3b8",
                border:        `1px solid ${isDaytime ? "#fde68a" : "#334155"}`,
                borderRadius:  4,
                padding:       "2px 7px",
              }}>
                {isDaytime ? "☀ JOUR" : "☾ NUIT"}
              </span>
              <span style={{
                fontSize:      10,
                fontFamily:    "monospace",
                letterSpacing: 1,
                background:    dbStatus === null ? "#1e293b" : dbStatus ? "#14532d" : "#1c1917",
                color:         dbStatus === null ? "#94a3b8"  : dbStatus ? "#4ade80" : "#78716c",
                border:        `1px solid ${dbStatus === null ? "#334155" : dbStatus ? "#166534" : "#292524"}`,
                borderRadius:  4,
                padding:       "2px 7px",
              }}>
                {dbStatus === null ? "…" : dbStatus ? "🗄 DB" : "💻 Local"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: 3, marginTop: 2, fontFamily: "monospace" }}>
              PEA · COMPTE-TITRE
            </div>
          </div>

          {/* Navigation + Enregistrer */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {tabBtn("dashboard", "📊 Dashboard")}
            {tabBtn("saisie",    "✏️ Saisie")}
            <div style={{ width: 1, height: 28, background: C.border }} />
            <button
              onClick={save}
              disabled={!isDirty && !saveErr}
              style={{
                background:    saveBg,
                border:        `1px solid ${saveBorder}`,
                borderRadius:  8,
                color:         (savedOk || saveErr || isDirty) ? "#0a0f1e" : C.muted,
                padding:       "8px 18px",
                cursor:        isDirty ? "pointer" : "default",
                fontSize:      13,
                fontFamily:    "monospace",
                fontWeight:    700,
                letterSpacing: 1,
                transition:    "background 0.2s, border-color 0.2s, color 0.2s",
              }}
            >
              {saveLabel}
            </button>
            {isDirty && !savedOk && !saveErr && (
              <span style={{ fontSize: 10, color: C.moins, fontFamily: "monospace" }}>
                ● non enregistré
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: "32px" }}>
          {dbStatus === null
            ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", paddingTop: 80, color: C.muted, fontFamily: "monospace", fontSize: 13, gap: 10 }}>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>↻</span>
                Chargement du portefeuille…
              </div>
            )
            : tab === "dashboard"
              ? <DashboardTab pea={peaPositions} ct={ctPositions} />
              : <SaisieTab
                  peaTx={peaTx ?? []}        ctTx={ctTx ?? []}
                  setPeaTx={setPeaTx}        setCtTx={setCtTx}
                  priceCache={priceCache}    setPriceCache={setPriceCache}
                />
          }
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
