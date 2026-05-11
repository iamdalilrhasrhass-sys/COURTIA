import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  FileSpreadsheet, Download, TrendingUp, TrendingDown, Calculator,
  Calendar, Building2, PieChart, RefreshCw, FileText, Euro, Receipt
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'
import api from '../../api'

const MONTHS = ['', 'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']

export default function ComptabiliteV2() {
  const [summary, setSummary] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [period, setPeriod] = useState('year') // year, quarter, month
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadData()
  }, [year])

  async function loadData() {
    setLoading(true)
    try {
      const [summaryRes, entriesRes] = await Promise.all([
        api.get(`/accounting/summary/${year}`),
        api.get('/accounting/entries', { params: { year, limit: 50 } })
      ])
      setSummary(summaryRes.data)
      setEntries(entriesRes.data?.data || [])
    } catch (err) {
      console.error('Failed to load accounting data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function downloadFEC() {
    setGenerating(true)
    try {
      const params = period === 'year' 
        ? { year } 
        : period === 'quarter'
        ? { start: `${year}-${(Math.floor((new Date().getMonth()) / 3) * 3) + 1}-01`, end: `${year}-${(Math.floor((new Date().getMonth()) / 3) * 3) + 3}-30` }
        : { start: `${year}-${new Date().getMonth() + 1}-01`, end: `${year}-${new Date().getMonth() + 1}-31` }

      const res = await api.get('/accounting/fec', { params, responseType: 'blob' })
      
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `FEC_${year}.txt`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Erreur export FEC: ' + (err.response?.data?.error || err.message))
    } finally {
      setGenerating(false)
    }
  }

  async function generateFromCommissions() {
    setGenerating(true)
    try {
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`
      
      const res = await api.post('/accounting/generate-from-commissions', { startDate, endDate })
      alert(`${res.data.generated} écritures générées depuis les commissions`)
      loadData()
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message))
    } finally {
      setGenerating(false)
    }
  }

  const chartData = summary?.by_month?.map(m => ({
    name: MONTHS[m.month],
    Produits: m.produits_eur,
    Charges: m.charges_eur,
    Résultat: m.resultat_eur
  })) || []

  const resultatPositif = (summary?.totals?.resultat_net_eur || 0) >= 0

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileSpreadsheet size={28} color="#8B5CF6" />
            Comptabilité
          </h1>
          <p style={{ color: '#64748B', marginTop: 4 }}>Export FEC et suivi comptable</p>
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
            value={period}
            onChange={e => setPeriod(e.target.value)}
            style={{ padding: '10px 16px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, background: 'white' }}
          >
            <option value="year">Année complète</option>
            <option value="quarter">Trimestre en cours</option>
            <option value="month">Mois en cours</option>
          </select>
          <button
            onClick={generateFromCommissions}
            disabled={generating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#F0F9FF', color: '#0369A1', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            <Calculator size={16} /> Générer écritures
          </button>
          <button
            onClick={downloadFEC}
            disabled={generating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            <Download size={16} /> {generating ? 'Export...' : 'Télécharger FEC'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 80, textAlign: 'center', color: '#64748B' }}>Chargement...</div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#64748B', fontSize: 14 }}>Chiffre d'affaires</span>
                <TrendingUp size={20} color="#10B981" />
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#10B981' }}>
                {summary?.totals?.produits_eur?.toLocaleString('fr-FR')} €
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                Commissions encaissées
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 }}
              style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#64748B', fontSize: 14 }}>Charges</span>
                <TrendingDown size={20} color="#EF4444" />
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#EF4444' }}>
                {summary?.totals?.charges_eur?.toLocaleString('fr-FR')} €
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                Frais déductibles
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
              style={{ 
                background: resultatPositif 
                  ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                  : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', 
                borderRadius: 16, 
                padding: 24, 
                color: 'white' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 14, opacity: 0.9 }}>Résultat net</span>
                <Euro size={20} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {resultatPositif ? '+' : ''}{summary?.totals?.resultat_net_eur?.toLocaleString('fr-FR')} €
              </div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                {resultatPositif ? 'Bénéfice' : 'Déficit'}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }}
              style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#64748B', fontSize: 14 }}>Écritures</span>
                <Receipt size={20} color="#8B5CF6" />
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A' }}>
                {summary?.entries_count || 0}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                Mouvements comptables
              </div>
            </motion.div>
          </div>

          {/* Graphique évolution */}
          {chartData.length > 0 && (
            <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: '#0F172A' }}>
                Évolution mensuelle {year}
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorProduits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCharges" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => `${v}€`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value?.toLocaleString('fr-FR')} €`]} />
                  <Legend />
                  <Area type="monotone" dataKey="Produits" stroke="#10B981" fill="url(#colorProduits)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Charges" stroke="#EF4444" fill="url(#colorCharges)" strokeWidth={2} />
                  <Line type="monotone" dataKey="Résultat" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: '#8B5CF6', r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Répartition par compagnie */}
          {summary?.by_insurer?.length > 0 && (
            <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: '#0F172A' }}>
                Répartition par compagnie
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {summary.by_insurer.map((ins, i) => {
                  const percent = summary.totals.produits_eur > 0 
                    ? Math.round((ins.total_eur / summary.totals.produits_eur) * 100) 
                    : 0
                  return (
                    <motion.div
                      key={ins.insurer}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      style={{ 
                        padding: 16, 
                        background: '#F8FAFC', 
                        borderRadius: 12,
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Building2 size={16} color="#8B5CF6" />
                        <span style={{ fontWeight: 500, color: '#0F172A', fontSize: 14 }}>{ins.insurer}</span>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981' }}>
                        {ins.total_eur?.toLocaleString('fr-FR')} €
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ height: 4, background: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${percent}%`, background: 'linear-gradient(90deg, #8B5CF6 0%, #06B6D4 100%)', borderRadius: 2 }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{percent}% du CA</div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Dernières écritures */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: 0 }}>
                Dernières écritures
              </h3>
              <button 
                onClick={loadData}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#F1F5F9', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                <RefreshCw size={14} color="#64748B" />
              </button>
            </div>
            
            {entries.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                <FileText size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                <p>Aucune écriture comptable</p>
                <p style={{ fontSize: 13 }}>Utilisez "Générer écritures" pour créer les écritures depuis vos commissions</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>N°</th>
                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>Date</th>
                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>Journal</th>
                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>Compte</th>
                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 12 }}>Libellé</th>
                    <th style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: 12 }}>Débit</th>
                    <th style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: 12 }}>Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(0, 15).map(entry => (
                    <tr key={entry.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={{ padding: 12, fontSize: 13, color: '#64748B' }}>{entry.ecriture_num}</td>
                      <td style={{ padding: 12, fontSize: 13 }}>
                        {new Date(entry.ecriture_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ padding: 12, fontSize: 13 }}>
                        <span style={{ padding: '2px 8px', background: '#F0F9FF', color: '#0369A1', borderRadius: 4, fontSize: 11 }}>
                          {entry.journal_code}
                        </span>
                      </td>
                      <td style={{ padding: 12, fontSize: 13, fontFamily: 'monospace' }}>{entry.compte_num}</td>
                      <td style={{ padding: 12, fontSize: 13, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.ecriture_lib}
                      </td>
                      <td style={{ padding: 12, fontSize: 13, textAlign: 'right', fontWeight: entry.debit_eur > 0 ? 500 : 400, color: entry.debit_eur > 0 ? '#0F172A' : '#94A3B8' }}>
                        {entry.debit_eur > 0 ? `${entry.debit_eur?.toLocaleString('fr-FR')} €` : '-'}
                      </td>
                      <td style={{ padding: 12, fontSize: 13, textAlign: 'right', fontWeight: entry.credit_eur > 0 ? 500 : 400, color: entry.credit_eur > 0 ? '#10B981' : '#94A3B8' }}>
                        {entry.credit_eur > 0 ? `${entry.credit_eur?.toLocaleString('fr-FR')} €` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Info FEC */}
          <div style={{ marginTop: 24, padding: 20, background: '#F0F9FF', borderRadius: 12, border: '1px solid #BAE6FD' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <FileSpreadsheet size={20} color="#0369A1" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, color: '#0369A1', marginBottom: 4 }}>
                  À propos du FEC
                </div>
                <div style={{ fontSize: 13, color: '#0C4A6E', lineHeight: 1.6 }}>
                  Le Fichier des Écritures Comptables (FEC) est obligatoire pour toute entreprise tenant une comptabilité informatisée.
                  Il doit être transmis à l'administration fiscale en cas de contrôle. Le format respecte les normes DGFIP avec 
                  les 18 colonnes réglementaires : JournalCode, JournalLib, EcritureNum, EcritureDate, CompteNum, CompteLib, etc.
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
