import { useState, useEffect } from 'react'
import { UserPlus, Target, MapPin, TrendingUp, Zap, Search, CalendarDays } from 'lucide-react'
import api from '../api'

/* Aucun jeu de données d'exemple : cet écran affichait six entreprises inventées
   (Entreprise Lambert, Clinique Vétérinaire du Parc, SARL Dupuis Transport…)
   dès que l'API ne répondait pas — ce qui est le cas en production, faute de
   route backend /api/prospection. Un pipeline vide et une erreur explicite
   valent mieux qu'un pipeline imaginaire. */

const STATUT_STYLE = {
  nouveau:  { bg: 'rgba(59,130,246,0.10)', text: '#3B82F6' },
  contacte: { bg: 'rgba(245,158,11,0.10)', text: '#F59E0B' },
  qualifie: { bg: 'rgba(139,92,246,0.10)', text: '#8B5CF6' },
  rdv:      { bg: 'rgba(34,197,94,0.10)', text: '#22C55E' },
}

const STATUT_LABEL = {
  nouveau: 'Nouveau', contacte: 'Contacté', qualifie: 'Qualifié', rdv: 'RDV planifié',
}

export default function Prospection() {
  const [prospects, setProspects] = useState([])
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    api.get('/prospection')
      .then(res => {
        const payload = res && res.data
        const liste = Array.isArray(payload) ? payload
          : Array.isArray(payload && payload.data) ? payload.data
          : Array.isArray(payload && payload.prospects) ? payload.prospects
          : Array.isArray(payload && payload.documents) ? payload.documents
          : null
        if (Array.isArray(liste) && liste.length > 0) setProspects(liste)
      })
      .catch(() => setErreur(
        "Le module prospection n'est pas disponible : aucune donnée n'a pu être chargée. " +
        "Aucun prospect n'est affiché tant que le chargement n'a pas abouti."
      ))
  }, [])

  const totalPotentiel = prospects.reduce((s, p) => s + p.potentiel, 0)

  return (
    <div style={{ padding: 32, minHeight: '100vh' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Prospection</h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Pipeline de nouveaux clients potentiels</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Prospects', value: prospects.length, icon: UserPlus, accent: '#5B4DF5' },
          { label: 'Potentiel', value: `${(totalPotentiel / 1000).toFixed(0)}k €`, icon: TrendingUp, accent: '#22C55E' },
          { label: 'RDV planifiés', value: prospects.filter(p => String(p.statut || p.status || '').toLowerCase().includes('rdv')).length, icon: CalendarDays, accent: '#F59E0B' },
          { label: 'Qualifiés', value: prospects.filter(p => ['qualifie', 'rdv'].includes(String(p.statut || p.status || '').toLowerCase())).length, icon: Target, accent: '#3B82F6' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>{kpi.label}</span>
              <kpi.icon size={16} color={kpi.accent} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Aucune donnée inventée : on dit ce qui s'est passé */}
      {erreur && (
        <div role="alert" style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)',
          color: '#FCD34D', fontSize: 12,
        }}>
          {erreur}
        </div>
      )}
      {!erreur && prospects.length === 0 && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          color: '#9CA3AF', fontSize: 12,
        }}>
          Aucun prospect enregistré pour le moment.
        </div>
      )}

      {/* Barre de recherche + filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, padding: '8px 14px',
        }}>
          <Search size={14} color="#6B7280" />
          <input placeholder="Rechercher un prospect..." style={{
            background: 'none', border: 'none', color: '#fff', fontSize: 13, outline: 'none', flex: 1,
          }} />
        </div>
        <button style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.05)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
          + Nouveau prospect
        </button>
      </div>

      {/* ARK */}
      <div style={{
        background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Zap size={16} color="#8B5CF6" />
        <p style={{ fontSize: 13, color: '#c4b5fd', margin: 0 }}>
          <strong style={{ color: '#a78bfa' }}>ARK</strong> — {prospects.length} prospect{prospects.length > 1 ? 's' : ''} en pipeline. {
            (() => {
              if (!prospects.length) return 'Aucun prospect à analyser pour le moment.'
              const parts = [...prospects].sort((a, b) => b.potentiel - a.potentiel)
              const top = parts[0]
              const ph = `Le plus fort potentiel : ${top.nom} (${(top.potentiel || 0).toLocaleString('fr-FR')} €)`
              const rdv = prospects.filter((p) => p.statut === 'rdv')
              return rdv.length
                ? `${ph}. ${rdv.length > 1 ? rdv.length + ' rendez-vous sont' : rdv[0].nom + ' a un rendez-vous'} planifié${rdv.length > 1 ? 's' : ''}.`
                : `${ph}. Prochaine action : qualifier les prospects sans rendez-vous.`
            })()
          }
        </p>
      </div>

      {/* Tableau */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Prospect</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Secteur</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Ville</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Potentiel</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Statut</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map(p => {
              const s = STATUT_STYLE[p.statut]
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.nom}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#9CA3AF' }}>{p.secteur}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} /> {p.ville}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#22C55E' }}>{p.potentiel.toLocaleString('fr-FR')} €</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.text }}>
                      {STATUT_LABEL[p.statut]}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#9CA3AF' }}>{p.date}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
