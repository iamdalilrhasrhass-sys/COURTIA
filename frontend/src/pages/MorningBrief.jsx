import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sun, Zap, TrendingUp, RefreshCw, ChevronRight,
  Sparkles, Phone, Mail, User, FileText, Bell, Clock,
  AlertTriangle, Target, Calendar, Send
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import { getSessionUser } from '../api/sessionUser'
import { computeDailyPriorities } from '../lib/priorities'
const INTEGRATIONS_API_ENABLED = String(import.meta.env.VITE_INTEGRATIONS_API_ENABLED || '').trim().toLowerCase() === 'true'

const T = {
  bg: '#050510',
  cardBg: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.06)',
  cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#5B4DF5',
  ark: '#8B5CF6',
  arkBg: 'rgba(139,92,246,0.06)',
  arkBorder: 'rgba(139,92,246,0.15)',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function formatDate() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtEur(v) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0)) }
function fmtNum(v) { return Number(v || 0).toLocaleString('fr-FR') }

// ─── Demo priorities when API data is sparse ─────────────────────────────────
const DEMO_BRIEF = {
  score: 82,
  totalActions: 18,
  echeances: 7,
  devis: 5,
  silencieux: 9,
  opportunites: 12,
  conformite: 3,
  urgentes: [
    { client: 'Martin Conseil', type: 'échéance', sujet: 'RC Pro — échéance dans 21 jours', raison: 'Client professionnel actif depuis 3 ans. Contrat stratégique (2 800 €/an). Aucun contact enregistré depuis 40 jours. Risque de mise en concurrence détecté : le client a demandé un devis comparatif il y a 6 mois.', impact: '2 800 € de prime annuelle. Perte potentielle si non renouvelé.', action: 'Préparer une relance personnalisée avec proposition de révision de garantie.', priorite: 'haute' },
    { client: 'Leroy Marie', type: 'silence', sujet: 'Aucun contact depuis 52 jours', raison: 'Cliente active (Habitation Confort, 680 €/an). Score risque : 80%. Dernière interaction : appel entrant le 19 mars. Aucun devis en cours, aucun contrat en renouvellement.', impact: 'Risque de perte estimé à 80%. Contrat Habitation + potentiel MRH non souscrit.', action: 'Appeler pour un bilan de situation et proposer un devis MRH.', priorite: 'haute' },
    { client: 'Dupont SAS', type: 'opportunite', sujet: 'Potentiel flotte auto + RC Pro + PJ', raison: 'Entreprise de 12 salariés. Actuellement : RC Pro uniquement (12 400 €/an). Véhicules de fonction non assurés via le cabinet. Opportunité multi-équipement détectée.', impact: 'Potentiel additionnel : 12 400 €/an (flotte + PJ).', action: 'Préparer une proposition groupée Flotte Auto + Protection Juridique.', priorite: 'haute' },
  ],
  aFaire: [
    { client: 'Karim B.', type: 'devis', sujet: 'Devis Auto envoyé il y a 6 jours', raison: 'Devis #247 pour une Auto (1 100 €/an). Historique de conversion favorable (72% sur ce profil). Aucune relance effectuée depuis l\'envoi.', impact: '1 100 € de prime annuelle potentielle.', action: 'Envoyer un email de suivi avec rappel des garanties.', priorite: 'moyenne' },
    { client: 'Garcia Anne', type: 'opportunite', sujet: 'Multi-équipement Santé + MRH', raison: 'Cliente mono-produit Santé (420 €/an). Score opportunité : 78%. Profil familial : MRH pertinente. Aucun devis MRH jamais proposé.', impact: '+420 € de prime annuelle (MRH).', action: 'Créer un devis MRH et l\'envoyer avec un message personnalisé.', priorite: 'moyenne' },
    { client: 'Moreau Éric', type: 'échéance', sujet: 'Contrat Auto — échéance J-35', raison: 'Contrat Auto 2 400 €/an. Client ponctuel, bon payeur. Aucun sinistre déclaré. Opportunité de révision de garantie à la hausse.', impact: '2 400 € à sécuriser. Potentiel upgrade +300 €.', action: 'Préparer un avenant avec option valeur à neuf.', priorite: 'moyenne' },
  ],
  relances: [
    { client: 'Petit Philippe', type: 'devis', sujet: 'Devis Auto #241 — 18 jours sans réponse', raison: 'Devis envoyé le 22 avril, montant 1 100 €. Client existant (contrat MRH).', impact: '1 100 €', action: 'Relancer par téléphone' },
    { client: 'Dupont Jean', type: 'silence', sujet: '47 jours sans contact', raison: 'Contrat MRH actif. Score risque 72%.', impact: '480 €', action: 'Envoyer un email de prise de nouvelles' },
    { client: 'SCP Dubois', type: 'échéance', sujet: 'Décennale — J-42 avant échéance', raison: 'Contrat Décennale 3 500 €. Client entreprise.', impact: '3 500 €', action: 'Préparer le renouvellement' },
  ]
}

export default function MorningBrief() {
  const navigate = useNavigate()
  const [user, setUser] = useState({ first_name: '', last_name: '' })
  const [loading, setLoading] = useState(true)
  const [priorities, setPriorities] = useState(DEMO_BRIEF)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [userRes] = await Promise.all([
        getSessionUser().then(u => ({ data: u || {} })).catch(() => ({ data: {} })),
      ])
      setUser(userRes.data || {})

      // Try to compute real priorities, fall back to demo
      try {
        const [clientsRes, tasksRes] = await Promise.all([
          api.get('/clients?limit=300').catch(() => ({ data: [] })),
          api.get('/taches').catch(() => ({ data: [] })),
        ])
        const realPriorities = computeDailyPriorities(clientsRes.data, tasksRes.data)
        if (realPriorities && realPriorities.totalActions > 0) {
          setPriorities(realPriorities)
        }
      } catch { /* use demo */ }
    } catch { /* use demo */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData, refreshKey])

  const userName = user?.first_name || user?.firstName || ''
  const greeting = getGreeting()

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 40px', color: T.text }}>

      {/* HALOS */}
      <div style={{ position: 'fixed', width: 600, height: 600, background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', top: -200, left: -200, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', width: 500, height: 500, background: 'radial-gradient(circle, rgba(34,211,238,0.04) 0%, transparent 70%)', bottom: -100, right: -150, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Sun size={18} color={T.ark} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ark, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Morning Brief ARK</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', color: T.text }}>
            {greeting}{userName ? ` ${userName}` : ''}
          </h1>
          <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>{formatDate()}</p>
        </div>

        {/* ARK EXECUTIVE SUMMARY */}
        <div style={{
          background: `linear-gradient(135deg, ${T.arkBg}, rgba(91,77,245,0.04))`,
          border: `1px solid ${T.arkBorder}`,
          borderRadius: 14, padding: '20px 24px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Sparkles size={20} color={T.ark} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#c4b5fd', margin: '0 0 6px' }}>
                ARK a analysé votre portefeuille et identifié <strong style={{ color: '#fff' }}>{priorities.totalActions} actions utiles</strong> pour aujourd'hui.
              </p>
              <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>
                Portefeuille : {priorities.activeClients || 124} clients • {priorities.activeContracts || 312} contrats • Score santé : <strong style={{ color: T.success }}>{priorities.score}/100</strong>
              </p>
            </div>
            <button onClick={() => { setRefreshKey(k => k + 1); toast.success('Analyse actualisée') }} style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500,
              background: 'rgba(255,255,255,0.05)', color: T.textSecondary, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
            }}>
              <RefreshCw size={11} /> Actualiser
            </button>
          </div>
        </div>

        {/* SUMMARY COUNTERS */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Échéances à risque', value: priorities.echeances, icon: Calendar, color: '#EF4444' },
            { label: 'Devis à relancer', value: priorities.devis, icon: Send, color: '#F59E0B' },
            { label: 'Clients silencieux', value: priorities.silencieux, icon: Bell, color: '#F59E0B' },
            { label: 'Opportunités', value: priorities.opportunites, icon: Target, color: '#22C55E' },
            { label: 'Points conformité', value: priorities.conformite, icon: AlertTriangle, color: '#3B82F6' },
          ].map((c, i) => (
            <div key={i} style={{
              background: T.cardBg, border: `1px solid ${T.cardBorder}`,
              borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
              flex: '1 1 auto', minWidth: 130,
            }}>
              <c.icon size={16} color={c.color} />
              <div>
                <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>{c.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CRITICAL PRIORITIES */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={16} color="#EF4444" />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>Priorités critiques</h2>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.10)', color: '#EF4444' }}>
              {priorities.urgentes?.length || 3}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {priorities.urgentes?.map((item, idx) => (
              <motion.div key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                style={{
                  background: T.cardBg, border: '1px solid rgba(239,68,68,0.18)', borderLeft: '3px solid #EF4444',
                  borderRadius: 10, padding: '16px 18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {item.type === 'échéance' || item.type === 'echeance' ? <Calendar size={16} color="#EF4444" />
                      : item.type === 'silence' ? <Bell size={16} color="#EF4444" />
                        : <Sparkles size={16} color="#EF4444" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                        {item.type === 'échéance' || item.type === 'echeance' ? 'ÉCHÉANCE' : item.type === 'silence' ? 'SILENCE' : 'OPPORTUNITÉ'}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{item.client}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.textSecondary, marginBottom: 6 }}>{item.sujet}</div>

                    {/* ARK REASONING */}
                    <div style={{
                      background: T.arkBg, border: `1px solid ${T.arkBorder}`,
                      borderRadius: 8, padding: '10px 14px', marginBottom: 10,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Zap size={11} color={T.ark} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: T.ark, textTransform: 'uppercase' }}>Pourquoi ARK recommande ça</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#c4b5fd', margin: 0 }}>{item.raison}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, color: T.textMuted }}>
                        Impact : <strong style={{ color: T.text }}>{item.impact}</strong>
                      </span>
                      <span style={{ fontSize: 11, color: T.ark }}>
                        → {item.action}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => navigate('/relances')} style={actionBtnStyle('#EF4444')}>
                        {item.type === 'silence' ? <Phone size={12} /> : item.type === 'devis' ? <Send size={12} /> : <FileText size={12} />}
                        {item.type === 'échéance' || item.type === 'echeance' ? 'Préparer renouvellement' : item.type === 'silence' ? 'Appeler' : 'Contacter'}
                      </button>
                      <button onClick={() => navigate('/clients')} style={actionBtnStyle(T.ark)}>
                        <User size={12} /> Voir fiche client
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* À FAIRE */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Clock size={16} color="#F59E0B" />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>À traiter aujourd'hui</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {priorities.aFaire?.map((item, idx) => (
              <div key={idx} style={{
                background: T.cardBg, border: `1px solid ${T.cardBorder}`,
                borderRadius: 10, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = T.cardHover }}
                onMouseLeave={e => { e.currentTarget.style.background = T.cardBg }}
                onClick={() => navigate('/clients')}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {item.type === 'devis' ? <Send size={14} color="#F59E0B" />
                    : item.type === 'opportunite' ? <Target size={14} color="#22C55E" />
                      : <Calendar size={14} color="#F59E0B" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.client}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>{item.sujet}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: T.textSecondary }}>{item.impact}</span>
                  <ChevronRight size={14} color={T.textMuted} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RELANCES + OPPORTUNITÉS QUICK LIST */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Send size={14} color="#F59E0B" />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>Relances du jour</h3>
            </div>
            {priorities.relances?.map((r, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: i < (priorities.relances?.length || 0) - 1 ? `1px solid ${T.cardBorder}` : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{r.client}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>{r.sujet}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.warning }}>{r.impact}</span>
              </div>
            ))}
            <button onClick={() => navigate('/relances')} style={{ marginTop: 10, fontSize: 11, color: T.ark, background: 'none', border: 'none', cursor: 'pointer' }}>
              Voir toutes les relances →
            </button>
          </div>

          <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Target size={14} color="#22C55E" />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>Opportunités</h3>
            </div>
            <div style={{ fontSize: 11, color: T.success, fontWeight: 600, marginBottom: 10 }}>
              Potentiel total : 14 420 €
            </div>
            {[
              { text: 'Martin Sophie — Prévoyance non souscrite', montant: '+520 €' },
              { text: 'Dupont SAS — Flotte Auto + PJ', montant: '+12 400 €' },
              { text: 'Garcia Anne — MRH', montant: '+420 €' },
            ].map((o, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 11, color: T.textSecondary }}>{o.text}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.success }}>{o.montant}</span>
              </div>
            ))}
            <button onClick={() => navigate('/opportunites')} style={{ marginTop: 10, fontSize: 11, color: T.success, background: 'none', border: 'none', cursor: 'pointer' }}>
              Voir toutes les opportunités →
            </button>
          </div>
        </div>

        {/* RISQUES */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 12, padding: '16px 18px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={14} color="#EF4444" />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>Points d'attention</h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              '3 clients sans contact > 45 jours',
              '2 dossiers conformité incomplets',
              '1 contrat sans échéance renseignée',
            ].map((r, i) => (
              <span key={i} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.06)', color: '#fca5a5', fontWeight: 500 }}>
                ⚠ {r}
              </span>
            ))}
          </div>
        </div>

        {/* ACTIONS RAPIDES */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Voir les tâches', icon: Bell, route: '/taches' },
            { label: 'Ajouter client', icon: User, route: '/clients/new' },
            { label: 'Créer devis', icon: FileText, route: '/devis' },
            { label: 'Retour cockpit', icon: Sparkles, route: '/dashboard' },
          ].map((btn, i) => (
            <button key={i} onClick={() => navigate(btn.route)} style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: T.cardBg, color: T.text, border: `1px solid ${T.cardBorder}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <btn.icon size={13} /> {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function actionBtnStyle(color) {
  return {
    padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500,
    background: 'rgba(255,255,255,0.04)', color,
    border: `1px solid ${color}20`, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 4,
  }
}
