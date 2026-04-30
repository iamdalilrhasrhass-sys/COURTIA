import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function Logo({ dark = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 28, height: 28, background: dark ? '#0a0a0a' : 'white', borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <div style={{ width: 12, height: 12, background: dark ? 'white' : '#0a0a0a', transform: 'rotate(45deg)' }} />
      </div>
      <span style={{ color: dark ? '#0a0a0a' : 'white', fontSize: 15, fontWeight: 500, letterSpacing: -0.3 }}>COURTIA</span>
    </div>
  )
}

// Mini ARK demo
function ArkDemo() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour. Je suis ARK. Que puis-je analyser pour vous ?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const DEMOS = [
    { label: 'Analyser mon portefeuille', msg: 'Analyse mon portefeuille et donne-moi les 3 actions prioritaires.' },
    { label: 'Rédiger un email de relance', msg: 'Rédige un email de relance professionnel pour un client dont le contrat auto expire dans 15 jours.' },
    { label: 'Risque de résiliation', msg: 'Quels sont les signaux d\'un client à risque de résiliation et comment l\'anticiper ?' },
  ]

  async function send(msg) {
    if (!msg?.trim() || loading) return
    const text = msg.trim()
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    try {
      const res = await axios.post(`${API_URL}/api/ark/chat`, { message: text, clientData: null, conversationHistory: [] }, { timeout: 60000 })
      const reply = res.data?.reply || res.data?.message || 'Réponse reçue.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'ARK est disponible après connexion. Cette démo illustre l\'interface.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 360 }}>
      {/* Quick actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {DEMOS.map(d => (
          <button key={d.label} onClick={() => send(d.msg)}
            style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'Arial, sans-serif' }}>
            {d.label} →
          </button>
        ))}
      </div>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            padding: '8px 12px', borderRadius: 8, maxWidth: '85%', fontSize: 12, lineHeight: 1.6,
            background: m.role === 'user' ? '#1d4ed8' : 'rgba(255,255,255,0.07)',
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            color: 'white'
          }}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.07)', borderRadius: 8, alignSelf: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563eb', animation: `dotBounce 1.2s ease ${i*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {/* Input */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(input) }}
          placeholder="Demandez à ARK..."
          style={{ flex: 1, padding: '9px 12px', background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 7, color: 'white', fontSize: 13, fontFamily: 'Arial, sans-serif' }} />
        <button onClick={() => send(input)} disabled={loading}
          style={{ padding: '9px 14px', background: '#2563eb', border: 'none', borderRadius: 7, color: 'white', cursor: 'pointer', fontSize: 14 }}>→</button>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()

  const s = {
    page: { fontFamily: 'Arial, sans-serif', background: '#f7f6f2', color: '#0a0a0a' },
    nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 56px', background: '#f7f6f2', borderBottom: '0.5px solid #e8e6e0', position: 'sticky', top: 0, zIndex: 50 },
    btnBlack: { background: '#0a0a0a', color: 'white', padding: '10px 22px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Arial, sans-serif' },
    btnGhost: { background: 'white', color: '#0a0a0a', padding: '10px 22px', borderRadius: 8, border: '0.5px solid #e8e6e0', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Arial, sans-serif' },
    card: { background: 'white', borderRadius: 12, border: '0.5px solid #e8e6e0', padding: 28 },
    label: { fontSize: 11, fontWeight: 600, letterSpacing: 1.5, color: '#9ca3af' },
  }

  return (
    <div style={s.page}>
      <style>{`
        @keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes badgePulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.25)}50%{box-shadow:0 0 0 5px rgba(34,197,94,0)}}
        .hover-lift{transition:transform 0.2s ease}
        .hover-lift:hover{transform:translateY(-2px)}
        @media (max-width: 768px) {
          .landing-nav { padding: 12px 16px !important; flex-wrap: wrap; gap: 8px !important; }
          .landing-nav > div:last-child { width: 100%; justify-content: center; margin-top: 8px; }
          .landing-hero { grid-template-columns: 1fr !important; min-height: auto !important; }
          .landing-hero-left { padding: 40px 16px !important; border-right: none !important; border-bottom: 0.5px solid #e8e6e0 !important; }
          .landing-hero-left h1 { font-size: 32px !important; letter-spacing: -1px !important; }
          .landing-hero-left > p { font-size: 13px !important; }
          .landing-hero-stats { flex-wrap: wrap; gap: 20px !important; }
          .landing-section { padding: 48px 16px !important; }
          .landing-section h2 { font-size: 28px !important; letter-spacing: -0.5px !important; }
          .landing-grid-3 { grid-template-columns: 1fr !important; max-width: 100% !important; }
          .landing-grid-2 { grid-template-columns: 1fr !important; gap: 32px !important; }
          .landing-footer { padding: 24px 16px !important; flex-direction: column !important; text-align: center !important; align-items: center !important; }
          .landing-mockup { padding: 16px !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="landing-nav" style={s.nav}>
        <Logo dark />
        <div style={{ display: 'flex', gap: 32 }}>
          {['Produit', 'Tarifs', 'À propos'].map(l => (
            <span key={l} style={{ fontSize: 13, color: '#9ca3af', cursor: 'pointer', letterSpacing: 0.2 }}
              onMouseEnter={e => e.target.style.color = '#0a0a0a'}
              onMouseLeave={e => e.target.style.color = '#9ca3af'}>{l}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/login')} style={s.btnGhost}>Connexion</button>
          <button onClick={() => navigate('/register')} style={s.btnBlack}>Démarrer →</button>
        </div>
      </nav>

      {/* HERO */}
      <div className="landing-hero" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 680, borderBottom: '0.5px solid #e8e6e0' }}>
        {/* Left */}
        <div className="landing-hero-left" style={{ padding: '80px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '0.5px solid #e8e6e0' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 20, padding: '5px 14px', fontSize: 11, color: '#555', width: 'fit-content', marginBottom: 36, animation: 'badgePulse 2s ease infinite' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
            ARK · IA native · Aucun rival
          </div>
          <h1 style={{ fontSize: 56, fontWeight: 500, lineHeight: 1.04, letterSpacing: -2.5, color: '#0a0a0a', margin: '0 0 24px', maxWidth: 480 }}>
            Le CRM qui pense avec vous.
          </h1>
          <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 400 }}>
            Le premier CRM SaaS pour courtiers ORIAS. ARK analyse votre portefeuille en temps réel, détecte les opportunités et rédige pour vous.
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 56 }}>
            <button onClick={() => navigate('/register')} style={s.btnBlack}>Essayer gratuitement →</button>
            <button style={s.btnGhost}>Voir la démo</button>
          </div>
          {/* Stats */}
          <div className="landing-hero-stats" style={{ display: 'flex', gap: 40, paddingTop: 32, borderTop: '0.5px solid #e8e6e0' }}>
            {[['32 000', 'courtiers ORIAS ciblés'], ['0', 'concurrent avec IA native'], ['50', 'spots Founder restants']].map(([n, l]) => (
              <div key={n}>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#0a0a0a', letterSpacing: -0.5 }}>{n}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Mockup */}
        <div className="landing-mockup" style={{ background: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: '100%', maxWidth: 520, background: '#1a1a1a', borderRadius: 14, overflow: 'hidden', border: '0.5px solid #2a2a2a' }}>
            {/* Window bar */}
            <div style={{ background: '#111', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '0.5px solid #2a2a2a' }}>
              {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
              <div style={{ flex: 1, background: '#222', borderRadius: 4, padding: '3px 10px', fontSize: 9, color: '#555', textAlign: 'center', margin: '0 10px', border: '0.5px solid #2a2a2a' }}>courtia.app</div>
            </div>
            {/* App layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', minHeight: 340 }}>
              {/* Mini sidebar */}
              <div style={{ background: '#0a0a0a', padding: '14px 0', display: 'flex', flexDirection: 'column', borderRight: '0.5px solid #111' }}>
                <div style={{ padding: '0 14px 14px', borderBottom: '0.5px solid #111', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 14, height: 14, background: 'white', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 6, height: 6, background: '#0a0a0a', transform: 'rotate(45deg)' }} />
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 500, color: 'white' }}>COURTIA</span>
                  </div>
                </div>
                {[['Tableau de bord', true], ['Clients', false], ['Contrats', false], ['Rapports', false], ['Tâches', false]].map(([l, a]) => (
                  <div key={l} style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 8, color: a ? 'white' : '#444', background: a ? '#1a1a1a' : 'transparent' }}>
                    <div style={{ width: 3, height: 3, borderRadius: '50%', background: a ? 'white' : '#333', flexShrink: 0 }} />
                    {l}
                  </div>
                ))}
                <div style={{ margin: 'auto 10px 0', background: 'rgba(37,99,235,0.1)', border: '0.5px solid rgba(37,99,235,0.2)', borderRadius: 7, padding: '8px 10px' }}>
                  <div style={{ fontSize: 8, fontWeight: 600, color: '#60a5fa', marginBottom: 2 }}>ARK · Actif</div>
                  <div style={{ fontSize: 7, color: '#444' }}>Ouvrir →</div>
                </div>
              </div>
              {/* Mini content */}
              <div style={{ background: '#f7f6f2', padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: '#0a0a0a', marginBottom: 10 }}>Tableau de bord</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                  {[['247 clients', '+12 mois'], ['189 contrats', 'actifs'], ['8 400€', 'commissions']].map(([v, l]) => (
                    <div key={v} style={{ background: 'white', borderRadius: 6, padding: '8px 8px', border: '0.5px solid #e8e6e0' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#0a0a0a', lineHeight: 1.1 }}>{v}</div>
                      <div style={{ fontSize: 7, color: '#9ca3af', marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'white', borderRadius: 6, border: '0.5px solid #e8e6e0', overflow: 'hidden' }}>
                  <div style={{ padding: '6px 8px', borderBottom: '0.5px solid #f0f0f0', fontSize: 8, fontWeight: 600, color: '#0a0a0a' }}>Clients récents</div>
                  {[['MR', 'Martin Renaud', 'Actif'], ['SB', 'Sophie Blanc', 'Actif'], ['KA', 'Karim Amara', 'Prospect']].map(([av, n, s]) => (
                    <div key={av} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderBottom: '0.5px solid #fafaf8' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 700, color: '#0a0a0a', flexShrink: 0 }}>{av}</div>
                      <span style={{ fontSize: 8, flex: 1, fontWeight: 500 }}>{n}</span>
                      <span style={{ fontSize: 7, padding: '1px 5px', borderRadius: 4, background: s === 'Actif' ? '#dcfce7' : '#dbeafe', color: s === 'Actif' ? '#166534' : '#1d4ed8' }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COMMENT ÇA MARCHE */}
      <div className="landing-section" style={{ padding: '96px 56px', background: '#f7f6f2', borderBottom: '0.5px solid #e8e6e0' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ ...s.label, marginBottom: 14 }}>COMMENT ÇA MARCHE</p>
          <h2 style={{ fontSize: 40, fontWeight: 500, letterSpacing: -1.5, color: '#0a0a0a' }}>Opérationnel en 10 minutes.</h2>
          <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 10 }}>Pas de formation. Pas de migration complexe.</p>
        </div>
        <div className="landing-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 900, margin: '0 auto' }}>
          {[
            { num: '01', icon: '📥', title: 'Importez vos clients', desc: 'Chargez votre base existante ou ajoutez vos clients manuellement. COURTIA structure chaque fiche automatiquement.' },
            { num: '02', icon: '🧠', title: 'ARK analyse votre portefeuille', desc: 'En temps réel, ARK détecte les opportunités, calcule les scores de risque et identifie les contrats à renouveler en priorité.' },
            { num: '03', icon: '⚡', title: 'Gagnez du temps chaque jour', desc: 'Relances personnalisées, rapports clairs, recommandations actionnables. Vous conseillez — ARK fait le reste.' },
          ].map(step => (
            <div key={step.num} className="hover-lift" style={{ ...s.card, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 52, fontWeight: 700, color: '#f7f6f2', lineHeight: 1, userSelect: 'none' }}>{step.num}</div>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{step.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#0a0a0a', marginBottom: 8 }}>{step.title}</div>
              <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.7 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FONCTIONNALITÉS */}
      <div className="landing-section" style={{ padding: '96px 56px', background: 'white', borderBottom: '0.5px solid #e8e6e0' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ ...s.label, marginBottom: 14 }}>FONCTIONNALITÉS</p>
          <h2 style={{ fontSize: 40, fontWeight: 500, letterSpacing: -1.5, color: '#0a0a0a' }}>Tout ce dont un courtier a besoin.</h2>
        </div>
        <div className="landing-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 960, margin: '0 auto' }}>
          {[
            { icon: '🧠', title: 'ARK IA native', desc: 'Analyse de portefeuille, détection d\'opportunités, rédaction commerciale — intégré, pas en add-on.' },
            { icon: '📊', title: 'CRM assurance', desc: 'Gestion des clients, contrats, scores de risque et fidélité. Conçu pour les courtiers ORIAS, pas adapté.' },
            { icon: '✉️', title: 'Relances automatiques', desc: 'ARK détecte les échéances, rédige les emails personnalisés et vous propose d\'envoyer en 1 clic.' },
            { icon: '📈', title: 'Rapports dirigeant', desc: 'Vue portefeuille complète, top clients, répartition par type, commissions — en temps réel.' },
            { icon: '👥', title: 'Multi-collaborateurs', desc: 'Invitez vos collaborateurs, définissez les accès et travaillez en équipe sur le même portefeuille.' },
            { icon: '⚖️', title: 'Conformité DDA/RGPD', desc: 'ARK connaît les obligations réglementaires françaises et vous alerte avant tout risque de non-conformité.' },
          ].map(f => (
            <div key={f.title} className="hover-lift" style={{ ...s.card }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PRICING */}
      <div className="landing-section" style={{ padding: '96px 56px', background: '#f7f6f2', borderBottom: '0.5px solid #e8e6e0' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <p style={{ ...s.label, marginBottom: 14 }}>TARIFICATION</p>
          <h2 style={{ fontSize: 40, fontWeight: 500, letterSpacing: -1.5, color: '#0a0a0a', marginBottom: 8 }}>50 spots. Prix garantis à vie.</h2>
          <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>Après les 50 premiers abonnés, les tarifs passent à 49€ / 99€ / 199€.</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 20, padding: '6px 16px', fontSize: 12, color: '#d97706' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b' }} />
            31 places prises sur 50 — il reste 19 spots Founder
          </div>
        </div>

        <div className="landing-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 900, margin: '48px auto 0' }}>
          {[
            { name: 'START', price: '39€', tag: 'Founder · Limité', feats: ['100 clients', 'ARK basique', 'Tableau de bord Indicateurs', 'Support email'], featured: false },
            { name: 'PRO', price: '69€', tag: 'Le plus choisi', feats: ['500 clients', '**ARK complet**', '**Rapports avancés**', 'Support prioritaire', 'Multi-collaborateurs'], featured: true },
            { name: 'ELITE', price: '129€', tag: 'Illimité', feats: ['Clients illimités', '**ARK vocal**', '**API publique**', 'Account Manager dédié', 'Formations incluses'], featured: false },
          ].map(p => (
            <div key={p.name} className="hover-lift" style={{
              borderRadius: 14, padding: 32, display: 'flex', flexDirection: 'column',
              background: p.featured ? '#0a0a0a' : 'white',
              border: p.featured ? 'none' : '0.5px solid #e8e6e0'
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: p.featured ? '#555' : '#9ca3af', marginBottom: 12 }}>{p.tag.toUpperCase()}</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: p.featured ? 'rgba(255,255,255,0.4)' : '#aaa', marginBottom: 6 }}>{p.name}</div>
              <div style={{ fontSize: 48, fontWeight: 500, letterSpacing: -2, lineHeight: 1, color: p.featured ? 'white' : '#0a0a0a', marginBottom: 4 }}>{p.price}</div>
              <div style={{ fontSize: 12, color: p.featured ? '#555' : '#9ca3af', marginBottom: 24 }}>/mois · garanti à vie</div>
              <div style={{ height: '0.5px', background: p.featured ? '#1a1a1a' : '#f0f0f0', marginBottom: 24 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginBottom: 28 }}>
                {p.feats.map(f => {
                  const bold = f.startsWith('**') && f.endsWith('**')
                  const text = bold ? f.slice(2, -2) : f
                  return (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: p.featured ? (bold ? 'white' : 'rgba(255,255,255,0.5)') : (bold ? '#0a0a0a' : '#6b7280'), fontWeight: bold ? 600 : 400 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: p.featured ? '#2563eb' : '#e5e7eb', flexShrink: 0 }} />
                      {text}
                    </div>
                  )
                })}
              </div>
              <button onClick={() => navigate('/register')} style={{
                width: '100%', padding: '12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: p.featured ? 'none' : '0.5px solid #e8e6e0',
                background: p.featured ? '#2563eb' : 'white', color: p.featured ? 'white' : '#0a0a0a',
                fontFamily: 'Arial, sans-serif'
              }}>
                {p.featured ? 'Rejoindre maintenant' : 'Commencer'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ARK DÉMO */}
      <div className="landing-section" style={{ padding: '96px 56px', background: '#0a0a0a', borderBottom: '0.5px solid #111' }}>
        <div className="landing-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
          {/* Left */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: '#555', marginBottom: 20 }}>ARK — INTELLIGENCE NATIVE</p>
            <h2 style={{ fontSize: 44, fontWeight: 500, lineHeight: 1.06, letterSpacing: -1.5, color: 'white', marginBottom: 20 }}>
              ARK travaille pendant que vous conseillez.
            </h2>
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.8, marginBottom: 40 }}>
              ARK n'est pas un chatbot ajouté. C'est une intelligence intégrée au cœur de COURTIA qui lit votre portefeuille, détecte les signaux faibles et vous propose les bonnes actions au bon moment.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                ['Détection d\'opportunités', 'Renouvellements, cross-sell, résiliations — détectés avant vous.'],
                ['Rédaction intelligente', 'Emails, relances, propositions — générés et personnalisés en 1 clic.'],
                ['Conformité automatique', 'DDA, RGPD, ORIAS, IDD — ARK connaît les règles et les applique.'],
              ].map(([t, d]) => (
                <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb', marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 3 }}>{t}</div>
                    <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Right — demo */}
          <div style={{ background: '#111', borderRadius: 14, border: '0.5px solid #1a1a1a', overflow: 'hidden', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 14, borderBottom: '0.5px solid #1a1a1a' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s ease infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'white', letterSpacing: 0.5 }}>ARK DÉMO</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#555' }}>Essayez maintenant</span>
            </div>
            <ArkDemo />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="landing-footer" style={{ padding: '32px 56px', background: '#f7f6f2', borderTop: '0.5px solid #e8e6e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Logo dark />
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Construit pour les 32 000 courtiers ORIAS français</p>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['CGU', 'Confidentialité', 'Contact'].map(l => (
            <span key={l} style={{ fontSize: 12, color: '#9ca3af', cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#d1d5db' }}>© 2026 COURTIA · Dalil Rhasrhass</div>
      </div>
    </div>
  )
}
