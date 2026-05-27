import { useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ACCOUNTS, TX_TYPES } from '../constants';
import { fmt } from '../utils';
import { parseTradeRepublicPDF, isDuplicate, mapName } from '../utils/parseTRPdf';

const CLASSE_LABELS = { STOCK: '📈 Action', FUND: '🏦 Fonds' };
const outlineBtn = (color, disabled) => ({
  background:   'none', border: `1px solid ${color}`, borderRadius: 8,
  color, padding: '7px 16px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 13, opacity: disabled ? 0.5 : 1,
});
const solidBtn = (color) => ({
  background: color, border: 'none', borderRadius: 8, color: '#0a0f1e',
  padding: '7px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13,
});

export function ImportModal({ peaTx, ctTx, setPeaTx, setCtTx, onClose }) {
  const C = useTheme();
  const fileRef = useRef(null);

  const [step,       setStep]     = useState('idle'); // idle | parsing | preview | done
  const [error,      setError]    = useState('');
  const [rows,       setRows]     = useState([]);      // { tx, compte, isDup, selected, ticker }
  const [filter,     setFilter]   = useState('all');   // all | new | dup
  const [bulkFrom,   setBulkFrom] = useState('');
  const [bulkTo,     setBulkTo]   = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep('parsing');
    setError('');
    try {
      const parsed = await parseTradeRepublicPDF(file);
      const allExisting = [...peaTx, ...ctTx];
      const rowsInit = parsed.map(tx => ({
        tx,
        dup:      isDuplicate(tx, allExisting),
        selected: !isDuplicate(tx, allExisting),
        ticker:   tx.ticker,
      }));
      setRows(rowsInit);
      setStep('preview');
    } catch (err) {
      setError(err.message || 'Erreur lors du parsing PDF');
      setStep('idle');
    }
    e.target.value = '';
  };

  const toggleRow = (i) =>
    setRows(prev => prev.map((r, j) => j === i ? { ...r, selected: !r.selected } : r));

  const toggleAll = (val) =>
    setRows(prev => prev.map(r => ({ ...r, selected: val })));

  const selectNew = () =>
    setRows(prev => prev.map(r => ({ ...r, selected: !r.dup })));

  const updateTicker = (i, val) =>
    setRows(prev => prev.map((r, j) => {
      if (j !== i) return r;
      const mapped = mapName(val) ?? {};
      return { ...r, ticker: val, tx: { ...r.tx, ticker: val, nom: mapped.nom || r.tx.nom, secteur: mapped.secteur || r.tx.secteur } };
    }));

  const bulkReplace = () => {
    const from = bulkFrom.trim().toUpperCase();
    const to   = bulkTo.trim().toUpperCase();
    if (!from || !to) return;
    const mapped = mapName(to);
    setRows(prev => prev.map(r => {
      if (r.ticker.toUpperCase() !== from) return r;
      return { ...r, ticker: to, tx: { ...r.tx, ticker: to, nom: mapped.nom || r.tx.nom, secteur: mapped.secteur || r.tx.secteur } };
    }));
    setBulkFrom('');
    setBulkTo('');
  };

  const doImport = () => {
    const toImport = rows.filter(r => r.selected);
    const newPeaTx = [...peaTx];
    const newCtTx  = [...ctTx];

    for (const { tx, ticker } of toImport) {
      const finalTx = {
        id:               crypto.randomUUID(),
        date:             tx.date,
        type:             tx.type,
        ticker:           ticker,
        nom:              tx.nom,
        secteur:          tx.secteur,
        qte:              tx.qte,
        prixAchat:        tx.prixAchat,
        prixActuel:       tx.prixAchat,
        prixActuelNative: tx.prixAchat,
        devise:           'EUR',
        frais:            tx.frais,
        nbActions:        tx.qte,
        prixUnitaireEUR:  tx.prixAchat,
      };
      if (tx.compte === 'PEA') newPeaTx.push(finalTx);
      else                     newCtTx.push(finalTx);
    }

    // Sort by date
    newPeaTx.sort((a, b) => a.date.localeCompare(b.date));
    newCtTx.sort((a, b)  => a.date.localeCompare(b.date));

    setPeaTx(newPeaTx);
    setCtTx(newCtTx);
    setStep('done');
  };

  const displayed = rows.filter(r =>
    filter === 'all' ? true : filter === 'new' ? !r.dup : r.dup
  );

  const newCount  = rows.filter(r => !r.dup).length;
  const dupCount  = rows.filter(r =>  r.dup).length;
  const selCount  = rows.filter(r =>  r.selected).length;

  const thStyle = {
    padding: '7px 8px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1,
    color: C.muted, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
    textAlign: 'left',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1000, overflowY: 'auto', padding: '32px 16px',
    }}>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
        width: '100%', maxWidth: 1000, padding: 28,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>
              Importer depuis Trade Republic
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
              Fichier PDF « Investissements — Achats &amp; Ventes »
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        {/* Upload */}
        {step === 'idle' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            {error && (
              <div style={{ color: C.moins, fontFamily: 'monospace', fontSize: 13, marginBottom: 16, background: '#3f1f1f', padding: '10px 16px', borderRadius: 8 }}>
                {error}
              </div>
            )}
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={solidBtn(C.accent)}>
              ↑ Sélectionner le PDF Trade Republic
            </button>
            <div style={{ marginTop: 12, fontSize: 12, color: C.muted }}>
              Le fichier est lu localement — aucune donnée n'est envoyée à un serveur externe.
            </div>
          </div>
        )}

        {/* Parsing */}
        {step === 'parsing' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontFamily: 'monospace' }}>
            ↻ Lecture du PDF en cours…
          </div>
        )}

        {/* Preview */}
        {step === 'preview' && (
          <>
            {/* Stats + actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.plus   }}>✓ {newCount} nouvelle{newCount > 1 ? 's' : ''}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.muted  }}>⊘ {dupCount} doublon{dupCount > 1 ? 's' : ''}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.text   }}>{selCount} sélectionné{selCount > 1 ? 's' : ''}</span>
              <div style={{ flex: 1 }} />
              {/* Filter */}
              {['all', 'new', 'dup'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  background: filter === f ? C.accent : 'none',
                  border: `1px solid ${filter === f ? C.accent : C.border}`,
                  borderRadius: 6, color: filter === f ? '#0a0f1e' : C.muted,
                  padding: '3px 10px', cursor: 'pointer', fontSize: 11, fontFamily: 'monospace',
                }}>
                  {f === 'all' ? 'Tout' : f === 'new' ? 'Nouvelles' : 'Doublons'}
                </button>
              ))}
              <button onClick={() => toggleAll(true)}  style={outlineBtn(C.muted, false)}>Tout cocher</button>
              <button onClick={() => toggleAll(false)} style={outlineBtn(C.muted, false)}>Tout décocher</button>
              <button onClick={selectNew}              style={outlineBtn(C.accent, false)}>Nouvelles seules</button>
            </div>

            {/* Remplacement en masse */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>Remplacer en masse :</span>
              <input
                value={bulkFrom}
                onChange={e => setBulkFrom(e.target.value.toUpperCase())}
                placeholder="Ancien ticker"
                onKeyDown={e => e.key === 'Enter' && bulkReplace()}
                style={{
                  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
                  color: C.text, fontFamily: 'monospace', fontSize: 12,
                  padding: '4px 8px', width: 110, outline: 'none',
                }}
              />
              <span style={{ color: C.muted, fontSize: 13 }}>→</span>
              <input
                value={bulkTo}
                onChange={e => setBulkTo(e.target.value.toUpperCase())}
                placeholder="Nouveau ticker"
                onKeyDown={e => e.key === 'Enter' && bulkReplace()}
                style={{
                  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
                  color: C.text, fontFamily: 'monospace', fontSize: 12,
                  padding: '4px 8px', width: 110, outline: 'none',
                }}
              />
              <button
                onClick={bulkReplace}
                disabled={!bulkFrom.trim() || !bulkTo.trim()}
                style={outlineBtn(C.accent, !bulkFrom.trim() || !bulkTo.trim())}
              >Appliquer</button>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, background: C.card, zIndex: 1 }}>
                  <tr>
                    <th style={thStyle}></th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Cpt.</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Classe</th>
                    <th style={thStyle}>Nom brut</th>
                    <th style={{ ...thStyle, minWidth: 100 }}>Ticker</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Qté</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Prix/action</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Frais</th>
                    <th style={thStyle}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((r, i) => {
                    const globalIdx = rows.indexOf(r);
                    const { tx, dup, selected, ticker } = r;
                    const isVente = tx.type === 'VENTE';
                    return (
                      <tr key={globalIdx} style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: dup ? `${C.border}44` : selected ? `${isVente ? '#f8717108' : '#4ade8008'}` : 'transparent',
                        opacity: !selected && !dup ? 0.5 : 1,
                      }}>
                        <td style={{ padding: '6px 8px' }}>
                          <input type="checkbox" checked={selected} onChange={() => toggleRow(globalIdx)}
                            style={{ cursor: 'pointer', accentColor: C.accent }} />
                        </td>
                        <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: C.muted }}>
                          {tx.date.split('-').reverse().join('/')}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{
                            background: tx.compte === 'PEA' ? '#14532d' : '#1e3a5f',
                            color: tx.compte === 'PEA' ? '#4ade80' : '#60a5fa',
                            borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700,
                          }}>{tx.compte === 'PEA' ? 'PEA' : 'CT'}</span>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <span style={{
                            background: isVente ? '#3f1f1f' : '#14532d',
                            color: isVente ? '#f87171' : '#4ade80',
                            borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700,
                          }}>{tx.type}</span>
                        </td>
                        <td style={{ padding: '6px 8px', color: C.muted, fontSize: 11 }}>
                          {CLASSE_LABELS[tx.classe] ?? tx.classe}
                        </td>
                        <td style={{ padding: '6px 8px', color: C.text, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.nomBrut}>
                          {tx.nomBrut}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            value={ticker}
                            onChange={e => updateTicker(globalIdx, e.target.value.toUpperCase())}
                            style={{
                              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4,
                              color: C.text, fontFamily: 'monospace', fontSize: 11,
                              padding: '2px 6px', width: 90, outline: 'none',
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', color: C.text }}>
                          {tx.qte % 1 === 0 ? tx.qte : tx.qte.toFixed(4)}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', color: C.muted }}>
                          {fmt(tx.prixAchat)}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', color: C.muted }}>
                          {tx.frais > 0 ? fmt(tx.frais) : '—'}
                        </td>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                          {dup
                            ? <span style={{ color: C.muted, fontSize: 10, fontFamily: 'monospace', background: `${C.border}`, borderRadius: 4, padding: '1px 6px' }}>⊘ doublon</span>
                            : <span style={{ color: C.plus,  fontSize: 10, fontFamily: 'monospace', background: '#14532d', borderRadius: 4, padding: '1px 6px' }}>✓ nouveau</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {displayed.length === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: C.muted, fontFamily: 'monospace', fontSize: 12 }}>
                  Aucune transaction dans ce filtre.
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button onClick={onClose} style={outlineBtn(C.muted, false)}>Annuler</button>
              <button
                onClick={doImport}
                disabled={selCount === 0}
                style={solidBtn(selCount === 0 ? C.border : C.accent)}
              >
                ↓ Importer {selCount > 0 ? `${selCount} transaction${selCount > 1 ? 's' : ''}` : '—'}
              </button>
            </div>
          </>
        )}

        {/* Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ color: C.plus, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Import réussi — {selCount} transaction{selCount > 1 ? 's' : ''} ajoutée{selCount > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 24 }}>
              N'oublie pas de cliquer sur 💾 Enregistrer pour sauvegarder.
            </div>
            <button onClick={onClose} style={solidBtn(C.accent)}>Fermer</button>
          </div>
        )}
      </div>
    </div>
  );
}
