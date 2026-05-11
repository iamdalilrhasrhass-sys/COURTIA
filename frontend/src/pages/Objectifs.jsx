import { useState, useEffect } from 'react'
import { Target, TrendingUp, Trophy, Users, Crown, Award, Loader2, Sparkles } from 'lucide-react'
import { VibeBackdrop } from '../components/vibe'
import PageHeader from '../components/PageHeader'
import SimpleCard from '../components/SimpleCard'
import api from '../api'
import toast from 'react-hot-toast'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#5B4DF5', ark: '#8B5CF6', cyan: '#22D3EE',
  success: '#22C55E', warning: '#F59E0B',
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0)

function GaugeRing({ label, current, target, fmt = (v) => v, color = T.accent }) {
  const pct = target ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0
  const r = 60, c = 2 * Math.PI * r
  const stroke = (pct / 100) * c
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <defs>
            <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.8" />
            </linearGradient>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx="80" cy="80" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="none" />
          <circle
            cx="80" cy="80" r={r}
            stroke={`url(#grad-${label})`}
            strokeWidth="10" fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - stroke}
            transform="rotate(-90 80 80)"
            filter={`url(#glow-${label})`}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ color, fontSize: 28, fontWeight: 800 }}>{pct}%</div>
          <div style={{ color: T.textMuted, fontSize: 11 }}>{fmt(current)}</div>
          <div style={{ color: T.textMuted, fontSize: 10 }}>/ {fmt(target)}</div>
        </div>
      </div>
      <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{label}</div>
    </div>
  )
}

export default function Objectifs() {
  const [current, setCurrent] = useState(null)
  const [ranking, setRanking] = useState([])
  const [commissions, setCommissions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  async function loadAll() {
    setLoading(true)
    try {
      const [c, r, com] = await Promise.all([
        api.get('/objectifs/current'),
        api.get('/objectifs/ranking').catch(() => ({ data: { ranking: [] } })),
        api.get('/commissions/dashboard').catch(() => ({ data: null })),
      ])
      setCurrent(c.data)
      setRanking(r.data.ranking || [])
      setCommissions(com.data)
    } catch (err) {
      toast.error('Erreur chargement objectifs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  async function saveTargets(targets) {
    try {
      await api.post('/objectifs/set', targets)
      toast.success('Objectifs mis à jour ✓')
      setEditTarget(null)
      loadAll()
    } catch (err) {
      toast.error('Erreur enregistrement')
    }
  }

  if (loading && !current) return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} className="animate-spin" color={T.ark} />
    </div>
  )

  const obj = current?.objectif || {}
  const prog = current?.progression || {}

  return (
    <>
      <VibeBackdrop intensity="medium" />
      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <PageHeader
          breadcrumb={[{ label: 'Pilotage', to: '/dashboard' }, { label: 'Objectifs & Commissions' }]}
          title={<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Target size={24} color={T.success} /> Objectifs annuels & Commissions
          </span>}
          subtitle="Pilotez votre année : CA, clients, contrats, commissions"
        />

        {/* 3 jauges principales */}
        <SimpleCard padding={32} style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30, justifyItems: 'center' }}>
            <GaugeRing
              label="CA Annuel"
              current={Math.round((prog.ca?.current_cents || 0) / 100)}
              target={Math.round((prog.ca?.target_cents || 0) / 100)}
              fmt={fmtEur}
              color={T.accent}
            />
            <GaugeRing
              label="Nouveaux clients"
              current={prog.new_clients?.current || 0}
              target={prog.new_clients?.target || 0}
              color={T.cyan}
            />
            <GaugeRing
              label="Nouveaux contrats"
              current={prog.new_contracts?.current || 0}
              target={prog.new_contracts?.target || 0}
              color={T.ark}
            />
          </div>
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              onClick={() => setEditTarget({
                ca_target_eur: Math.round((obj.ca_target_cents || 0) / 100),
                new_clients_target: obj.new_clients_target || 0,
                new_contracts_target: obj.new_contracts_target || 0,
              })}
              style={{
                background: 'rgba(91,77,245,0.12)', color: T.accent,
                border: '1px solid rgba(91,77,245,0.25)',
                padding: '8px 16px', borderRadius: 8,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ✏️ Modifier mes objectifs {obj.year}
            </button>
          </div>
        </SimpleCard>

        {/* Décomposition commissions */}
        {commissions && (
          <SimpleCard padding={24} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: T.text, fontSize: 16, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} color={T.success} /> Décomposition commissions {commissions.year}
              </h3>
              <div style={{ color: T.success, fontSize: 18, fontWeight: 700 }}>
                {fmtEur(commissions.total_eur)}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <BreakdownTable title="Par produit" rows={commissions.by_product || []} keyName="product" />
              <BreakdownTable title="Par compagnie" rows={commissions.by_company || []} keyName="provider" />
              <BreakdownTable title="Par mois" rows={commissions.by_month || []} keyName="month" />
            </div>
          </SimpleCard>
        )}

        {/* Ranking équipe */}
        <SimpleCard padding={24}>
          <h3 style={{ color: T.text, fontSize: 16, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={18} color={T.warning} /> Ranking équipe
          </h3>
          {ranking.length === 0 ? (
            <div style={{ color: T.textSecondary, fontSize: 13, padding: 20, textAlign: 'center' }}>
              Aucun membre d'équipe pour le moment.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ranking.map((m) => (
                <div key={m.user_id} style={{
                  background: m.rank === 1 ? 'rgba(245,158,11,0.06)' : T.cardBg,
                  border: `1px solid ${m.rank === 1 ? 'rgba(245,158,11,0.20)' : T.cardBorder}`,
                  borderRadius: 10, padding: 12,
                  display: 'grid', gridTemplateColumns: '40px 1fr 100px 100px 100px',
                  gap: 12, alignItems: 'center',
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: m.rank === 1 ? T.warning : m.rank <= 3 ? T.accent : T.cardBorder,
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {m.rank === 1 ? <Crown size={14} /> : m.rank}
                  </div>
                  <div>
                    <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ color: T.textMuted, fontSize: 11 }}>{m.email}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: T.textMuted, fontSize: 10, textTransform: 'uppercase' }}>CA</div>
                    <div style={{ color: T.text, fontSize: 12, fontWeight: 600 }}>{fmtEur(m.ca_cents / 100)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: T.textMuted, fontSize: 10, textTransform: 'uppercase' }}>Clients</div>
                    <div style={{ color: T.text, fontSize: 12 }}>{m.clients_count}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: T.textMuted, fontSize: 10, textTransform: 'uppercase' }}>Contrats</div>
                    <div style={{ color: T.text, fontSize: 12 }}>{m.quotes_count}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SimpleCard>

        {editTarget && <EditTargetsModal initial={editTarget} onSave={saveTargets} onClose={() => setEditTarget(null)} />}
      </div>
    </>
  )
}

function BreakdownTable({ title, rows, keyName }) {
  return (
    <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 8, padding: 12 }}>
      <div style={{ color: T.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ color: T.textMuted, fontSize: 11, textAlign: 'center', padding: 10 }}>—</div>
      ) : rows.map((r, idx) => (
        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: T.text, borderBottom: idx < rows.length - 1 ? `1px solid ${T.cardBorder}` : 'none' }}>
          <span>{r[keyName]}</span>
          <span style={{ color: T.success, fontWeight: 600 }}>{fmtEur(r.commission_eur)}</span>
        </div>
      ))}
    </div>
  )
}

function EditTargetsModal({ initial, onSave, onClose }) {
  const [vals, setVals] = useState(initial)
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(8px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#0A0A18', border: '1px solid rgba(91,77,245,0.30)',
        borderRadius: 16, padding: 28, maxWidth: 460, width: '90%',
      }}>
        <h3 style={{ color: T.text, fontSize: 18, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={18} color={T.success} /> Objectifs {new Date().getFullYear()}
        </h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ color: T.textSecondary, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>CA cible (€)</label>
            <input type="number" value={vals.ca_target_eur}
              onChange={e => setVals({ ...vals, ca_target_eur: Number(e.target.value) })}
              style={{ width: '100%', padding: 10, marginTop: 4, background: 'rgba(255,255,255,0.05)', color: T.text, border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontSize: 13 }} />
          </div>
          <div>
            <label style={{ color: T.textSecondary, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Nouveaux clients cible</label>
            <input type="number" value={vals.new_clients_target}
              onChange={e => setVals({ ...vals, new_clients_target: Number(e.target.value) })}
              style={{ width: '100%', padding: 10, marginTop: 4, background: 'rgba(255,255,255,0.05)', color: T.text, border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontSize: 13 }} />
          </div>
          <div>
            <label style={{ color: T.textSecondary, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Nouveaux contrats cible</label>
            <input type="number" value={vals.new_contracts_target}
              onChange={e => setVals({ ...vals, new_contracts_target: Number(e.target.value) })}
              style={{ width: '100%', padding: 10, marginTop: 4, background: 'rgba(255,255,255,0.05)', color: T.text, border: `1px solid ${T.cardBorder}`, borderRadius: 8, fontSize: 13 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'transparent', color: T.textSecondary, border: `1px solid ${T.cardBorder}`, padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Annuler</button>
          <button onClick={() => onSave({
            ca_target_cents: vals.ca_target_eur * 100,
            new_clients_target: vals.new_clients_target,
            new_contracts_target: vals.new_contracts_target,
            commissions_target_cents: Math.round(vals.ca_target_eur * 100 * 0.12),
          })} style={{ background: T.accent, color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}
