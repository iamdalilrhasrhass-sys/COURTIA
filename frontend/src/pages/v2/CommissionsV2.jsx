import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Coins, TrendingUp, TrendingDown, Calendar, Building2, 
  FileText, Download, RefreshCw, Plus, Check, AlertTriangle,
  ChevronDown, Filter, Search, Calculator, X, Settings
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../../api'

const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const STATUS_COLORS = {
  expected: { bg: '#FEF3C7', text: '#92400E', label: 'Attendu' },
  partial: { bg: '#FEE2E2', text: '#991B1B', label: 'Partiel' },
  paid: { bg: '#D1FAE5', text: '#065F46', label: 'Payé' },
  overdue: { bg: '#FEE2E2', text: '#991B1B', label: 'En retard' },
  cancelled: { bg: '#F1F5F9', text: '#475569', label: 'Annulé' }
}

export default function CommissionsV2() {
  const [commissions, setCommissions] = useState([])
  const [stats, setStats] = useState(null)
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [filterInsurer, setFilterInsurer] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [showReconcileModal, setShowReconcileModal] = useState(false)
  const [reconcileResult, setReconcileResult] = useState(null)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    loadData()
  }, [year])

  async function loadData() {
    setLoading(true)
    try {
      const [commissionsRes, statsRes, rulesRes] = await Promise.all([
        api.get('/commissions', { params: { year } }),
        api.get('/commissions/stats', { params: { year } }),
        api.get('/commissions/rules')
      ])
      setCommissions(commissionsRes.data?.data || [])
      setStats(statsRes.data)
      setRules(rulesRes.data?.data || [])
    } catch (err) {
      console.error('Failed to load commissions:', err)
    } finally {
      setLoading(false)
    }
  }

  async function reconcileMonth() {
    setCalculating(true)
    try {
      const res = await api.get(`/commissions/reconcile/${year}/${month}`)
      setReconcileResult(res.data)
      loadData()
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message))
    } finally {
      setCalculating(false)
    }
  }

  async function downloadStatement() {
    try {
      const res = await api.get(`/commissions/statement/${year}/${month}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `releve_commissions_${year}_${String(month).padStart(2, '0')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Erreur export: ' + (err.response?.data?.error || err.message))
    }
  }

  async function calculatePeriod() {
    setCalculating(true)
    try {
      const res = await api.post('/commissions/calculate-period', { period: { year, month } })
      alert(`${res.data.calculated} commission(s) calculée(s) sur ${res.data.total} contrat(s)`)
      loadData()
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message))
    } finally {
      setCalculating(false)
    }
  }

  const filteredCommissions = commissions.filter(c => {
    if (filterInsurer && !c.insurer?.toLowerCase().includes(filterInsurer.toLowerCase())) return false
    if (filterStatus && c.status !== filterStatus) return false
    return true
  })

  const chartData = stats?.by_month?.map(m => ({
    name: MONTHS[m.month]?.slice(0, 3),
    Attendu: m.expected_amount_eur,
    Reçu: m.received_amount_eur
  })) || []

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Coins size={28} color="#F59E0B" />
            Commissions
          </h1>
          <p style={{ color: '#64748B', marginTop: 4 }}>Suivi et rapprochement automatique</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value, 10))}
            style={{ padding: '10px 16px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, background: 'white' }}
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={month}
            onChange={e => setMonth(parseInt(e.target.value, 10))}
            style={{ padding: '10px 16px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, background: 'white' }}
          >
            {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <button
            onClick={() => setShowRulesModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#F1F5F9', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}
          >
            <Settings size={16} /> Règles
          </button>
          <button
            onClick={calculatePeriod}
            disabled={calculating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#F0F9FF', color: '#0369A1', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            <Calculator size={16} /> Calculer
          </button>
          <button
            onClick={reconcileMonth}
            disabled={calculating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#ECFDF5', color: '#047857', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            <Check size={16} /> Rapprocher
          </button>
          <button
            onClick={downloadStatement}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            <Download size={16} /> Relevé PDF
          </button>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#64748B', fontSize: 14 }}>Total attendu {year}</span>
              <TrendingUp size={20} color="#F59E0B" />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A' }}>
              {stats.totals.expected_amount_eur?.toLocaleString('fr-FR')} €
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#64748B', fontSize: 14 }}>Total reçu {year}</span>
              <Coins size={20} color="#10B981" />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#10B981' }}>
              {stats.totals.received_amount_eur?.toLocaleString('fr-FR')} €
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#64748B', fontSize: 14 }}>Écart</span>
              {(stats.totals.received_amount_eur - stats.totals.expected_amount_eur) >= 0 ? 
                <TrendingUp size={20} color="#10B981" /> : <TrendingDown size={20} color="#EF4444" />}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: (stats.totals.received_amount_eur - stats.totals.expected_amount_eur) >= 0 ? '#10B981' : '#EF4444' }}>
              {(stats.totals.received_amount_eur - stats.totals.expected_amount_eur) >= 0 ? '+' : ''}
              {(stats.totals.received_amount_eur - stats.totals.expected_amount_eur).toLocaleString('fr-FR')} €
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#64748B', fontSize: 14 }}>Commissions</span>
              <FileText size={20} color="#8B5CF6" />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A' }}>
              {stats.totals.count}
            </div>
          </motion.div>
        </div>
      )}

      {/* Graphique */}
      {chartData.length > 0 && (
        <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: '#0F172A' }}>Évolution mensuelle</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `${v}€`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${value?.toLocaleString('fr-FR')} €`]} />
              <Legend />
              <Bar dataKey="Attendu" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Reçu" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Filtrer par compagnie..."
            value={filterInsurer}
            onChange={e => setFilterInsurer(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14 }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, background: 'white' }}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748B' }}>Chargement...</div>
        ) : filteredCommissions.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748B' }}>
            <Coins size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <p>Aucune commission trouvée</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 13 }}>Période</th>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 13 }}>Compagnie</th>
                <th style={{ padding: 16, textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 13 }}>Client</th>
                <th style={{ padding: 16, textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: 13 }}>Attendu</th>
                <th style={{ padding: 16, textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: 13 }}>Reçu</th>
                <th style={{ padding: 16, textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: 13 }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommissions.map(com => {
                const statusStyle = STATUS_COLORS[com.status] || STATUS_COLORS.expected
                const variance = (com.received_amount_eur || 0) - (com.expected_amount_eur || 0)
                return (
                  <tr key={com.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                    <td style={{ padding: 16, fontSize: 14 }}>
                      {MONTHS[com.period_month]} {com.period_year}
                    </td>
                    <td style={{ padding: 16, fontSize: 14, fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={16} color="#64748B" />
                        {com.insurer}
                      </div>
                    </td>
                    <td style={{ padding: 16, fontSize: 14 }}>
                      {com.client_prenom} {com.client_nom}
                    </td>
                    <td style={{ padding: 16, fontSize: 14, textAlign: 'right', fontWeight: 500 }}>
                      {com.expected_amount_eur?.toLocaleString('fr-FR')} €
                    </td>
                    <td style={{ padding: 16, fontSize: 14, textAlign: 'right', fontWeight: 600, color: '#10B981' }}>
                      {com.received_amount_eur?.toLocaleString('fr-FR')} €
                      {variance !== 0 && (
                        <span style={{ fontSize: 11, color: variance > 0 ? '#10B981' : '#EF4444', marginLeft: 6 }}>
                          ({variance > 0 ? '+' : ''}{variance.toLocaleString('fr-FR')})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 16, textAlign: 'center' }}>
                      <span style={{ padding: '4px 12px', borderRadius: 20, background: statusStyle.bg, color: statusStyle.text, fontSize: 12, fontWeight: 500 }}>
                        {statusStyle.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Par compagnie */}
      {stats?.by_insurer?.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#0F172A' }}>Par compagnie</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {stats.by_insurer.map((ins, i) => (
              <motion.div
                key={ins.insurer}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Building2 size={20} color="#8B5CF6" />
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{ins.insurer}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Reçu</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#10B981' }}>{ins.received_amount_eur?.toLocaleString('fr-FR')} €</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Commissions</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#0F172A' }}>{ins.count}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Règles */}
      <AnimatePresence>
        {showRulesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setShowRulesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'white', borderRadius: 20, padding: 32, width: 600, maxHeight: '80vh', overflow: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Règles de commission</h2>
                <button onClick={() => setShowRulesModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="#64748B" />
                </button>
              </div>
              
              {rules.length === 0 ? (
                <p style={{ color: '#64748B', textAlign: 'center', padding: 40 }}>Aucune règle configurée</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {rules.map(rule => (
                    <div key={rule.id} style={{ padding: 16, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{rule.product_type || 'Tous produits'}</div>
                          <div style={{ fontSize: 13, color: '#64748B' }}>{rule.company || 'Toutes compagnies'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600, color: '#8B5CF6' }}>{rule.rate_percent}%</div>
                          {rule.flat_fee_eur > 0 && <div style={{ fontSize: 12, color: '#64748B' }}>+ {rule.flat_fee_eur}€</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
