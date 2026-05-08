/**
 * MorningBrief.jsx
 *
 * Le module différenciant de Courtia.
 * Design : Aurora Bubble C — glassmorphism sombre, halo irisé, typographie tranchante.
 *
 * Props :
 * authToken   string — JWT Bearer
 * apiBaseUrl  string — ex. 'https://api.courtiark.fr'
 */

import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'https://api.courtiark.fr';

// ─── Palette & tokens ─────────────────────────────────────────
const C = {
  bg:         '#080810',
  surface:    'rgba(255,255,255,0.04)',
  border:     'rgba(255,255,255,0.08)',
  borderHover:'rgba(255,255,255,0.18)',
  high:       '#FF6B6B',
  medium:     '#FFB347',
  low:        '#74C0FC',
  teal:       '#4ECDCB',
  iris:       '#9B8DFF',
  text:       '#F0F0F8',
  muted:      '#6B6B8A',
  card:       'rgba(18,18,32,0.85)',
};

// ─── Icônes inline SVG (pas de dépendance externe) ────────────
const Icon = {
  Urgence:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.high} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Relance:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.medium} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Opportunite: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Conformite:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.iris} strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Copy:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Refresh:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  Spark:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill={C.iris} stroke="none"><path d="M12 2L9.5 9.5H2l6.18 4.49L5.82 21 12 16.51 18.18 21l-2.36-7.01L22 9.5h-7.5z"/></svg>,
};

// ─── SECTION CONFIG ───────────────────────────────────────────
const SECTIONS = [
  { key: 'urgences',     label: 'Urgences',    Icon: Icon.Urgence,     color: C.high,   glowColor: 'rgba(255,107,107,0.15)' },
  { key: 'relances',     label: 'Relances',    Icon: Icon.Relance,     color: C.medium, glowColor: 'rgba(255,179,71,0.12)'  },
  { key: 'opportunites', label: 'Opportunités',Icon: Icon.Opportunite, color: C.teal,   glowColor: 'rgba(78,205,203,0.12)'  },
  { key: 'conformite',   label: 'Conformité',  Icon: Icon.Conformite,  color: C.iris,   glowColor: 'rgba(155,141,255,0.12)' },
];

// ─── COMPOSANT CARTE ITEM ─────────────────────────────────────
function ItemCard({ item, sectionColor, onPrepare, preparing }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    if (item._prepared_message) {
      navigator.clipboard.writeText(item._prepared_message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const priorityDot = item.priority === 'high' ? C.high : item.priority === 'medium' ? C.medium : C.low;

  return (
    <div
      style={{
        background:    C.card,
        border:        `1px solid ${expanded ? C.borderHover : C.border}`,
        borderRadius:  '12px',
        padding:       '14px 16px',
        transition:    'border-color 0.2s, transform 0.15s',
        cursor:        'pointer',
        position:      'relative',
        overflow:      'hidden',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Priority dot */}
      <div style={{
        position:      'absolute',
        top:           '14px',
        right:         '14px',
        width:         '8px',
        height:        '8px',
        borderRadius:  '50%',
        background:    priorityDot,
        boxShadow:     `0 0 6px ${priorityDot}`,
      }}/>

      {/* Content */}
      <div style={{ paddingRight: '20px' }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.text, lineHeight: 1.4 }}>
          {item.label}
        </p>
        {item.sublabel && (
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.muted, lineHeight: 1.4 }}>
            {item.sublabel}
          </p>
        )}
      </div>

      {/* Expanded state: contact + ARK message */}
      {expanded && (
        <div
          style={{ marginTop: '12px', borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Contact rapide */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
            {item.phone && (
              <a href={`tel:${item.phone}`} style={styles.chip(sectionColor)}>
                📞 {item.phone}
              </a>
            )}
            {item.email && (
              <a href={`mailto:${item.email}`} style={styles.chip(sectionColor)}>
                ✉ {item.email}
              </a>
            )}
          </div>

          {/* Message ARK préparé */}
          {item._prepared_message ? (
            <div style={{ position: 'relative' }}>
              <p style={{
                margin:        0,
                padding:       '10px 36px 10px 12px',
                background:    'rgba(155,141,255,0.08)',
                borderRadius:  '8px',
                fontSize:      '12px',
                color:         C.text,
                lineHeight:    1.6,
                whiteSpace:    'pre-wrap',
                border:        `1px solid rgba(155,141,255,0.2)`,
              }}>
                {item._prepared_message}
              </p>
              <button
                onClick={handleCopy}
                style={{
                  ...styles.iconBtn,
                  position:    'absolute',
                  top:         '8px',
                  right:       '8px',
                  color:       copied ? C.teal : C.muted,
                }}
              >
                <Icon.Copy />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onPrepare(item)}
              disabled={preparing}
              style={styles.btnArk(preparing)}
            >
              <Icon.Spark />
              {preparing ? 'ARK prépare…' : 'Préparer le message'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── COMPOSANT SECTION ────────────────────────────────────────
function Section({ config, items, onPrepare, preparingId }) {
  if (!items?.length) return null;

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Header section */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            '8px',
        marginBottom:   '10px',
        paddingBottom:  '8px',
        borderBottom:   `1px solid ${C.border}`,
      }}>
        <config.Icon />
        <span style={{ fontSize: '12px', fontWeight: 700, color: config.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {config.label}
        </span>
        <span style={{
          marginLeft:    'auto',
          fontSize:      '11px',
          color:         config.color,
          background:    config.glowColor,
          padding:       '2px 8px',
          borderRadius:  '20px',
          fontWeight:    600,
        }}>
          {items.length}
        </span>
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item, i) => (
          <ItemCard
            key={item.client_id + i}
            item={item}
            sectionColor={config.color}
            onPrepare={onPrepare}
            preparing={preparingId === item.client_id + i}
          />
        ))}
      </div>
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────
export default function MorningBrief({ authToken }) {
  const [brief, setBrief]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [preparingId, setPrep]    = useState(null);
  const [lastRefresh, setRefresh] = useState(null);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/morning-brief`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBrief(data);
      setRefresh(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchBrief(); }, [fetchBrief]);

  const handlePrepare = useCallback(async (item, sectionKey) => {
    const uid = item.client_id + sectionKey;
    setPrep(uid);
    try {
      const res = await fetch(`${API}/api/morning-brief/prepare`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_type:  item.type,
          client_id:  item.client_id,
          context:    item,
        }),
      });
      const data = await res.json();
      // Injecter le message préparé dans le brief local
      setBrief(prev => {
        const updated = { ...prev };
        updated[sectionKey] = updated[sectionKey].map(i =>
          i.client_id === item.client_id ? { ...i, _prepared_message: data.message } : i
        );
        return updated;
      });
    } catch (e) {
      console.error('ARK prepare error:', e);
    } finally {
      setPrep(null);
    }
  }, [authToken]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '0', fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      {/* Aurora background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position:   'absolute',
          top:        '-30vh',
          left:       '10%',
          width:      '60vw',
          height:     '60vh',
          background: 'radial-gradient(ellipse, rgba(155,141,255,0.07) 0%, transparent 70%)',
          filter:     'blur(40px)',
        }}/>
        <div style={{
          position:   'absolute',
          top:        '20vh',
          right:      '-10%',
          width:      '40vw',
          height:     '40vh',
          background: 'radial-gradient(ellipse, rgba(78,205,203,0.06) 0%, transparent 70%)',
          filter:     'blur(60px)',
        }}/>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px', margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 style={{ margin: '6px 0 0', fontSize: '26px', fontWeight: 800, color: C.text, lineHeight: 1.2 }}>
                {greeting} <span style={{ background: 'linear-gradient(135deg, #9B8DFF, #4ECDCB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ARK</span>
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.muted }}>
                Voici les actions prioritaires pour aujourd'hui
              </p>
            </div>
            <button onClick={fetchBrief} disabled={loading} style={{ ...styles.iconBtn, marginTop: '4px', opacity: loading ? 0.4 : 1 }}>
              <Icon.Refresh />
            </button>
          </div>

          {/* KPI strip */}
          {brief?.summary && (
            <div style={{
              display:       'flex',
              gap:           '12px',
              marginTop:     '20px',
              padding:       '14px 16px',
              background:    C.surface,
              border:        `1px solid ${C.border}`,
              borderRadius:  '14px',
              flexWrap:      'wrap',
            }}>
              <KPI value={brief.summary.total_actions} label="actions" accent={C.iris} />
              <div style={{ width: '1px', background: C.border }} />
              <KPI value={(brief.urgences?.length || 0)} label="urgences" accent={C.high} />
              <div style={{ width: '1px', background: C.border }} />
              <KPI value={brief.summary.primes_en_jeu > 0 ? brief.summary.primes_en_jeu.toLocaleString('fr-FR') + ' €' : '—'} label="primes en jeu" accent={C.teal} mono />
              {lastRefresh && (
                <p style={{ marginLeft: 'auto', fontSize: '11px', color: C.muted, alignSelf: 'center' }}>
                  Mis à jour {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* States */}
        {loading && <Skeleton />}
        {error && <ErrorState msg={error} onRetry={fetchBrief} />}

        {/* Sections */}
        {!loading && !error && brief && (
          <div>
            {SECTIONS.map(section => (
              <Section
                key={section.key}
                config={section}
                items={brief[section.key]}
                onPrepare={(item) => handlePrepare(item, section.key)}
                preparingId={preparingId}
              />
            ))}
            {SECTIONS.every(s => !brief[s.key]?.length) && <EmptyState />}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────

function KPI({ value, label, accent, mono }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '20px', fontWeight: 800, color: accent, fontFamily: mono ? 'monospace' : 'inherit', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{label}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          height:        '72px',
          borderRadius:  '12px',
          background:    `linear-gradient(90deg, ${C.surface} 0%, rgba(255,255,255,0.07) 50%, ${C.surface} 100%)`,
          backgroundSize:'200% 100%',
          animation:     'shimmer 1.4s infinite',
          border:        `1px solid ${C.border}`,
        }}/>
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
      <p style={{ margin: 0, color: C.text, fontWeight: 600, fontSize: '16px' }}>Portfolio au vert</p>
      <p style={{ margin: '6px 0 0', color: C.muted, fontSize: '13px' }}>Aucune action prioritaire détectée aujourd'hui.</p>
    </div>
  );
}

function ErrorState({ msg, onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', border: `1px solid rgba(255,107,107,0.2)`, borderRadius: '14px', background: 'rgba(255,107,107,0.05)' }}>
      <p style={{ margin: '0 0 12px', color: C.high, fontWeight: 600 }}>Erreur de chargement</p>
      <p style={{ margin: '0 0 16px', color: C.muted, fontSize: '13px' }}>{msg}</p>
      <button onClick={onRetry} style={{ ...styles.btnArk(false), margin: '0 auto', maxWidth: '180px' }}>
        Réessayer
      </button>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────

const styles = {
  chip: (color) => ({
    display:        'inline-flex',
    alignItems:     'center',
    padding:        '4px 10px',
    borderRadius:   '20px',
    fontSize:       '12px',
    color:          color,
    background:     `${color}15`,
    border:         `1px solid ${color}30`,
    textDecoration: 'none',
    whiteSpace:     'nowrap',
  }),
  btnArk: (disabled) => ({
    display:        'flex',
    alignItems:     'center',
    gap:            '6px',
    padding:        '8px 14px',
    borderRadius:   '8px',
    border:         `1px solid rgba(155,141,255,0.3)`,
    background:     'rgba(155,141,255,0.1)',
    color:          C.iris,
    fontSize:       '12px',
    fontWeight:     600,
    cursor:         disabled ? 'not-allowed' : 'pointer',
    opacity:        disabled ? 0.6 : 1,
    transition:     'all 0.2s',
    width:          '100%',
    justifyContent: 'center',
  }),
  iconBtn: {
    background:   'transparent',
    border:       'none',
    cursor:       'pointer',
    padding:      '6px',
    borderRadius: '8px',
    color:        C.muted,
    display:      'flex',
    alignItems:   'center',
    justifyContent: 'center',
    transition:   'color 0.15s',
  },
};
