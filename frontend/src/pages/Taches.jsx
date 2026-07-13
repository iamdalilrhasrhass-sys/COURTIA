import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ListTodo, CheckCircle2, Clock, AlertTriangle, Sparkles, Zap, Plus, Search,
  ChevronRight, Calendar, User, Target, TrendingUp
} from 'lucide-react'

const T = {
  bg: '#050510', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)', cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.06)', arkBorder: 'rgba(139,92,246,0.15)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const DEMO_TACHES = [
  { id: 1, titre: 'Préparer argumentaire renouvellement RC Pro', client: 'Martin Conseil', contexte: 'Échéance dans 21 jours', priorite: 'haute', date: '2026-05-11', source: 'ARK', ark: 'ARK a détecté une échéance RC Pro. Préparer une relance personnalisée orientée renouvellement + proposition prévoyance.' },
  { id: 2, titre: 'Relancer devis Auto #247 sans réponse', client: 'Karim B.', contexte: 'Devis envoyé il y a 6 jours', priorite: 'haute', date: '2026-05-11', source: 'ARK', ark: 'Devis auto envoyé il y a 6 jours. Client déjà actif Habitation. Forte probabilité de conversion.' },
  { id: 3, titre: 'Envoyer FIC mise à jour', client: 'Sophie L.', contexte: 'Contrat Santé actif', priorite: 'moyenne', date: '2026-05-12', source: 'Manuel' },
  { id: 4, titre: 'Vérifier attestation Assurance PJ', client: 'Cabinet Moreau', contexte: 'Attestation PJ en attente', priorite: 'moyenne', date: '2026-05-12', source: 'ARK', ark: 'Document PJ marqué À vérifier. Contrôler validité avant échéance dans 42 jours.' },
  { id: 5, titre: 'Appeler Nadia R. pour proposition Prévoyance', client: 'Nadia R.', contexte: 'Aucune couverture Prévoyance', priorite: 'haute', date: '2026-05-10', source: 'ARK', ark: 'Cliente fidèle Santé actif. Aucune couverture Prévoyance. Potentiel 680 €/an.' },
  { id: 6, titre: 'Compléter dossier Groupe Ardent', client: 'Groupe Ardent', contexte: 'Documents manquants', priorite: 'basse', date: '2026-05-14', source: 'Manuel' },
  { id: 7, titre: 'Relancer BatiSens Pro pour Prévoyance TNS', client: 'BatiSens Pro', contexte: 'Devis Prévoyance accepté', priorite: 'moyenne', date: '2026-05-11', source: 'ARK', ark: 'Devis Prévoyance accepté il y a 10 jours. Transformer en contrat.' },
  { id: 8, titre: 'Mettre à jour coordonnées client', client: 'Maison Lefèvre', contexte: 'Coordonnées incomplètes', priorite: 'basse', date: '2026-05-15', source: 'Manuel' },
  { id: 9, titre: 'Envoyer devis Cyber au Cabinet Moreau', client: 'Cabinet Moreau', contexte: 'Détection opportunité Cyber', priorite: 'haute', date: '2026-05-10', source: 'ARK', ark: 'Client pro avec RC Pro et PJ. Aucune couverture Cyber. Potentiel 1 800 €/an.' },
  { id: 10, titre: 'Vérifier pièces identité client', client: 'Leroy Marie', contexte: 'Permis expiré', priorite: 'moyenne', date: '2026-05-13', source: 'Manuel' },
]

const PRIORITE_STYLE = {
  haute: { bg: 'rgba(239,68,68,0.08)', text: '#EF4444', label: 'Haute' },
  moyenne: { bg: 'rgba(245,158,11,0.08)', text: '#F59E0B', label: 'Moyenne' },
  basse: { bg: 'rgba(100,116,139,0.08)', text: '#9CA3AF', label: 'Basse' },
}

const FILTERS = ['Toutes', 'En retard', 'Aujourd\'hui', 'Cette semaine', 'Priorité haute', 'ARK', 'Client', 'Contrat', 'Devis', 'Terminées']

function KpiCard({ icon: Icon, title, value, accent }) {
  return (
    <div className="courtia-mobile-kpi" style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 10, padding: '12px 16px', flex: '1 1 auto', minWidth: 130 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase' }}>{title}</span>
        <Icon size={14} color={accent || T.accent} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{value}</div>
    </div>
  )
}

export default function Taches() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Toutes')

  const filtered = useMemo(() => {
    let list = DEMO_TACHES
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t => t.titre.toLowerCase().includes(q) || t.client.toLowerCase().includes(q))
    }
    if (filter === 'En retard') list = list.filter(t => new Date(t.date) < new Date('2026-05-11'))
    else if (filter === 'Aujourd\'hui') list = list.filter(t => t.date === '2026-05-11')
    else if (filter === 'Cette semaine') list = list.filter(t => new Date(t.date) <= new Date('2026-05-17'))
    else if (filter === 'Priorité haute') list = list.filter(t => t.priorite === 'haute')
    else if (filter === 'ARK') list = list.filter(t => t.source === 'ARK')
    else if (filter === 'Terminées') list = []
    return list
  }, [search, filter])

  const stats = useMemo(() => ({
    retard: DEMO_TACHES.filter(t => new Date(t.date) < new Date('2026-05-11')).length,
    aujourdhui: DEMO_TACHES.filter(t => t.date === '2026-05-11').length,
    semaine: DEMO_TACHES.filter(t => new Date(t.date) <= new Date('2026-05-17')).length,
    ark: DEMO_TACHES.filter(t => t.source === 'ARK').length,
    terminees: 22,
  }), [])

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 40px', color: T.text }}>
      <div style={{ position: 'fixed', width: 500, height: 500, background: 'radial-gradient(circle, rgba(245,158,11,0.03) 0%, transparent 70%)', top: -100, right: -100, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <ListTodo size={16} color={T.accent} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actions</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Tâches</h1>
            <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>Gérez vos actions prioritaires avec les recommandations ARK.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/taches/new')} style={btnStyle(T.accent)}><Plus size={13} /> Nouvelle</button>
            <button onClick={() => navigate('/morning-brief')} style={btnStyle(T.ark)}><Zap size={13} /> Prioriser avec ARK</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <KpiCard icon={Clock} title="En retard" value={stats.retard} accent={T.danger} />
          <KpiCard icon={Target} title="Aujourd'hui" value={stats.aujourdhui} accent={T.warning} />
          <KpiCard icon={Calendar} title="Cette semaine" value={stats.semaine} />
          <KpiCard icon={Sparkles} title="Générées par ARK" value={stats.ark} accent={T.ark} />
          <KpiCard icon={CheckCircle2} title="Terminées" value={stats.terminees} accent={T.success} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: filter === f ? T.accent + '22' : T.cardBg,
                color: filter === f ? T.accent : T.textSecondary,
                border: filter === f ? '1px solid ' + T.accent + '40' : '1px solid ' + T.cardBorder,
                cursor: 'pointer',
              }}>{f}</button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} color={T.textMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{
              padding: '8px 12px 8px 32px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: T.cardBg, color: T.text, border: '1px solid ' + T.cardBorder,
              width: 200, outline: 'none',
            }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(t => {
            const prio = PRIORITE_STYLE[t.priorite] || PRIORITE_STYLE.basse
            return (
              <motion.div key={t.id}
                whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
                style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: '14px 16px', transition: 'all 0.15s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: prio.bg, color: prio.text }}>{prio.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: t.source === 'ARK' ? T.arkBg : T.cardBg, color: t.source === 'ARK' ? T.ark : T.textMuted }}>
                        {t.source === 'ARK' ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Sparkles size={10} /> ARK</span> : 'Manuel'}
                      </span>
                      <span style={{ fontSize: 11, color: T.textMuted }}>{new Date(t.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>{t.titre}</div>
                    <div style={{ fontSize: 12, color: T.textSecondary }}><User size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />{t.client} · {t.contexte}</div>
                  </div>
                </div>
                {t.ark && (
                  <div style={{ background: T.arkBg, border: '1px solid ' + T.arkBorder, borderRadius: 6, padding: '6px 10px', marginTop: 8, fontSize: 10, color: '#c4b5fd' }}>
                    <Sparkles size={10} color={T.ark} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    <strong style={{ color: '#a78bfa' }}>ARK :</strong> {t.ark}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button onClick={() => navigate('/clients/1')} style={actionBtnStyle(T.accent)}><CheckCircle2 size={11} /> Terminer</button>
                  <button style={actionBtnStyle(null)}><Clock size={11} /> Reporter</button>
                  <button onClick={() => navigate('/clients/1')} style={actionBtnStyle(T.ark)}><User size={11} /> Voir client</button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
            <ListTodo size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Aucune tâche trouvée.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function btnStyle(color) {
  return {
    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
    background: color ? color + '15' : T.cardBg,
    color: color || T.text,
    border: color ? '1px solid ' + color + '30' : '1px solid ' + T.cardBorder,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  }
}

function actionBtnStyle(color) {
  return {
    padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 500,
    background: color ? color + '12' : T.cardBg,
    color: color || T.textSecondary,
    border: color ? '1px solid ' + color + '25' : '1px solid ' + T.cardBorder,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  }
}
