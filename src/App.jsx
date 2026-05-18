import { useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { C, DEMO_PEA, DEMO_CT, DEMO_HISTORY } from "./constants";
import { DashboardTab } from "./components/DashboardTab";
import { SaisieTab }    from "./components/SaisieTab";

export default function App() {
  const [tab,     setTab]     = useState("dashboard");
  const [pea,     setPea]     = useLocalStorage("pft-pea",     DEMO_PEA);
  const [ct,      setCt]      = useLocalStorage("pft-ct",      DEMO_CT);
  const [history, setHistory] = useLocalStorage("pft-history", DEMO_HISTORY);

  const reset = () => {
    setPea(DEMO_PEA);
    setCt(DEMO_CT);
    setHistory(DEMO_HISTORY);
  };

  const tabBtn = (key, label) => (
    <button
      onClick={() => setTab(key)}
      style={{
        background:   tab === key ? "#1e293b" : "none",
        border:       tab === key ? `1px solid ${C.border}` : "1px solid transparent",
        borderRadius: 8,
        color:        tab === key ? C.text : C.muted,
        padding:      "8px 20px",
        cursor:       "pointer",
        fontSize:     13,
        fontFamily:   "monospace",
        fontWeight:   tab === key ? 700 : 400,
        letterSpacing: 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <div style={{
        background: "#080d1a",
        borderBottom: `1px solid ${C.border}`,
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, fontFamily: "monospace" }}>
            <span style={{ color: C.pea }}>P</span>
            <span style={{ color: C.ct }}>F</span>
            <span style={{ color: C.text }}> TRACKER</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: 3, marginTop: 2, fontFamily: "monospace" }}>
            PEA · COMPTE-TITRE
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tabBtn("dashboard", "📊 Dashboard")}
          {tabBtn("saisie",    "✏️ Saisie")}
        </div>
      </div>

      <div style={{ padding: "32px" }}>
        {tab === "dashboard"
          ? <DashboardTab pea={pea} ct={ct} history={history} />
          : <SaisieTab pea={pea} ct={ct} history={history} setPea={setPea} setCt={setCt} setHistory={setHistory} onReset={reset} />
        }
      </div>
    </div>
  );
}
