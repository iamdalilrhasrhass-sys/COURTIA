/**
 * Admin Dashboard - API Costs & Quotas
 */

import React, { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { Download, TrendingUp } from 'lucide-react'
import { getAuthToken, buildApiUrl } from '../api/sessionPolicy'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function cardClass(extra = '') {
  return `courtia-depth-card rounded-xl border border-white/20 bg-white/90 p-4 shadow-[0_16px_38px_rgba(15,23,42,0.14)] backdrop-blur-xl ${extra}`.trim()
}

function money(value, digits = 2) {
  const n = Number(value || 0)
  if (Number.isNaN(n)) return '$0.00'
  return `$${n.toFixed(digits)}`
}

export default function AdminCostsDashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  async function fetchCostData() {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(buildApiUrl('/admin/costs', API_URL), {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      })
      if (!response.ok) {
        if (response.status === 403) {
          setError('Accès refusé: rôle administrateur requis.')
        } else {
          setError(`Erreur serveur (${response.status})`)
        }
        setLoading(false)
        return
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching costs:', err)
      setError('Erreur lors du chargement des coûts IA.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCostData()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  const exportCsv = () => {
    window.location.href = buildApiUrl('/admin/costs/export?format=csv', API_URL)
  }

  if (loading) {
    return <div className="text-center py-10">Chargement...</div>
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">{error}</div>
  }

  if (!data) {
    return <div className="text-center py-10">Erreur lors du chargement</div>
  }

  if (data.trackingAvailable === false) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold">Coûts IA ARK</h1>
        <div className={cardClass('text-slate-700')}>
          <p className="font-semibold mb-2">Aucune donnée de coût IA disponible pour le moment.</p>
          <p>{data.message || 'Activez le tracking ARK pour commencer le suivi.'}</p>
        </div>
      </div>
    )
  }

  const stats = data.globalStats || {}
  const topUsers = Array.isArray(data.topUsers) ? data.topUsers : []
  const requestsTrend = Array.isArray(data.requestsTrend) ? data.requestsTrend : []
  const requestsByType = Array.isArray(data.requestsByType) ? data.requestsByType : []
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tableau de bord Coûts IA</h1>
          <p className="text-gray-500 mt-1">Période: {data.period}</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          <Download size={16} /> Exporter CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={cardClass()}>
          <div className="text-sm text-gray-500">Courtiers actifs</div>
          <div className="text-2xl md:text-3xl font-bold mt-2">{stats.total_users || 0}</div>
          <p className="text-xs text-gray-400 mt-1">Ce mois</p>
        </div>
        <div className={cardClass()}>
          <div className="text-sm text-gray-500">Requêtes totales</div>
          <div className="text-2xl md:text-3xl font-bold mt-2">{stats.total_requests || 0}</div>
          <p className="text-xs text-gray-400 mt-1">Haiku: {stats.haiku_requests || 0} | Opus: {stats.opus_requests || 0}</p>
        </div>
        <div className={cardClass()}>
          <div className="text-sm text-gray-500">Coût total</div>
          <div className="text-2xl md:text-3xl font-bold mt-2">{money(stats.total_cost_usd, 2)}</div>
          <p className="text-xs text-gray-400 mt-1">USD ce mois</p>
        </div>
        <div className={cardClass('bg-blue-50 border-blue-200')}>
          <div className="text-sm text-gray-500">Coût moyen/requête</div>
          <div className="text-2xl md:text-3xl font-bold mt-2">{money(stats.avg_cost_per_request, 4)}</div>
          <p className="text-xs text-gray-400 mt-1">Par jour: {money(stats.cost_per_day, 4)} | Par user: {money(stats.cost_per_user, 4)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass()}>
          <h2 className="font-semibold mb-3">Requêtes par jour</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={requestsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="haiku_count" stroke="#3b82f6" name="Haiku" />
                <Line type="monotone" dataKey="opus_count" stroke="#ef4444" name="Opus" />
                <Line type="monotone" dataKey="daily_cost" stroke="#10b981" name="Coût ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={cardClass()}>
          <h2 className="font-semibold mb-3">Répartition par type</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={requestsByType}
                  dataKey="count"
                  nameKey="request_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {requestsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={cardClass()}>
        <h2 className="font-semibold mb-3 inline-flex items-center gap-2"><TrendingUp size={18} />Top consommateurs</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-3 py-2">Courtier</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2 text-right">Requêtes</th>
                <th className="px-3 py-2 text-right">Haiku</th>
                <th className="px-3 py-2 text-right">Opus</th>
                <th className="px-3 py-2 text-right">Coût</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="px-3 py-2">{user.first_name} {user.last_name}</td>
                  <td className="px-3 py-2 text-gray-500">{user.email}</td>
                  <td className="px-3 py-2">{user.pricing_tier || '—'}</td>
                  <td className="px-3 py-2 text-right">{user.request_count || 0}</td>
                  <td className="px-3 py-2 text-right text-blue-600">{user.haiku_count || 0}</td>
                  <td className="px-3 py-2 text-right text-red-600">{user.opus_count || 0}</td>
                  <td className="px-3 py-2 text-right font-semibold">{money(user.total_cost_usd, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={cardClass()}>
        <h2 className="font-semibold mb-3">Détail par type de requête</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Nombre</th>
                <th className="px-3 py-2 text-right">Coût total</th>
                <th className="px-3 py-2 text-right">Coût moyen</th>
              </tr>
            </thead>
            <tbody>
              {requestsByType.map((type) => (
                <tr key={type.request_type} className="border-b">
                  <td className="px-3 py-2">{type.request_type || 'Général'}</td>
                  <td className="px-3 py-2 text-right">{type.count || 0}</td>
                  <td className="px-3 py-2 text-right">{money(type.total_cost, 4)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{money(type.avg_cost, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
