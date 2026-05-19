import { useState } from "react";
import { useParisTheme }   from "./hooks/useParisTheme";
import { ThemeContext }     from "./context/ThemeContext";
import { DEMO_PEA, DEMO_CT, DEMO_HISTORY } from "./constants";
import { DashboardTab } from "./components/DashboardTab";
import { SaisieTab }    from "./components/SaisieTab";

function loadFromStorage(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const { C, isDaytime } = useParisTheme();

  const [pea,     setPeaRaw]     = useState(() => loadFromStorage("pft-pea",     DEMO_PEA));
  const [ct,      setCtRaw]      = useState(() => loadFromStorage("pft-ct",      DEMO_CT));
  const [history, setHistoryRaw] = useState(() => loadFromStorage("pft-history", DEMO_HISTORY));

  const [isDirty, setIsDirty] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const dirty = (setter) => (val) => { setter(val); setIsDirty(true); };
  const setPea     = dirty(setPeaRaw);
  const setCt      = dirty(setCtRaw);
  const setHistory = dirty(setHistoryRaw);

  const save = () => {
    try {
      localStorage.setItem("pft-pea",     JSON.stringify(pea));
      localStorage.setItem("pft-ct",      JSON.stringify(ct));
      localStorage.setItem("pft-history", JSON.stringify(history));
      setIsDirty(false);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } catch {}
  };

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
              disabled={!isDirty}
              style={{
                background:    savedOk ? C.plus : (isDirty ? C.accent : "none"),
                border:        `1px solid ${savedOk ? C.plus : (isDirty ? C.accent : C.border)}`,
                borderRadius:  8,
                color:         savedOk || isDirty ? "#0a0f1e" : C.muted,
                padding:       "8px 18px",
                cursor:        isDirty ? "pointer" : "default",
                fontSize:      13,
                fontFamily:    "monospace",
                fontWeight:    700,
                letterSpacing: 1,
                transition:    "background 0.2s, border-color 0.2s, color 0.2s",
              }}
            >
              {savedOk ? "✓ Enregistré" : (isDirty ? "💾 Enregistrer" : "💾 Enregistrer")}
            </button>
            {isDirty && !savedOk && (
              <span style={{ fontSize: 10, color: C.moins, fontFamily: "monospace" }}>
                ● non enregistré
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: "32px" }}>
          {tab === "dashboard"
            ? <DashboardTab pea={pea} ct={ct} history={history} />
            : <SaisieTab pea={pea} ct={ct} history={history} setPea={setPea} setCt={setCt} setHistory={setHistory} />
          }
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
