import { useState, useEffect } from 'react'
import { UserPlus, Target, MapPin, TrendingUp, Zap, Search, CalendarDays } from 'lucide-react'
import api from '../api'
import { fmtMontant, localeCourante } from '../lib/monnaie'

/* Aucun jeu de données d'exemple : cet écran affichait six entreprises inventées
   (Entreprise Lambert, Clinique Vétérinaire du Parc, SARL Dupuis Transport…)
   dès que l'API ne répondait pas — ce qui est le cas en production, faute de
   route backend /api/prospection. Un pipeline vide et une erreur explicite
   valent mieux qu'un pipeline imaginaire.

   ÉTAT RÉEL (vérifié) : aucune route `/api/prospection` n'existe côté backend
   (`grep -rn prospection backend/src/routes backend/src/server.js` ne renvoie
   que des libellés marketing dans reach.js). L'écran est donc en « module
   indisponible », et il le DIT — au lieu de laisser croire à une panne de
   chargement passagère. */

const STATUT_STYLE = {
  nouveau:  { bg: 'rgba(59,130,246,0.10)', text: '#3B82F6' },
  contacte: { bg: 'rgba(245,158,11,0.10)', text: '#F59E0B' },
  qualifie: { bg: 'rgba(139,92,246,0.10)', text: '#8B5CF6' },
  rdv:      { bg: 'rgba(34,197,94,0.10)',  text: '#22C55E' },
}

const STATUT_LABEL = {
  nouveau: 'Nouveau', contacte: 'Contacté', qualifie: 'Qualifié', rdv: 'RDV planifié',
}

/** Libellé d'état : « — » (non mesuré) tant que la donnée n'existe pas. */
const mesure = (valeur) => (valeur === null || valeur === undefined ? '—' : valeur)

export default function Prospection() {
  const [prospects, setProspects] = useState([])
  // `disponible` : null = chargement, true = l'API répond, false = module absent
  // ou en erreur. Les KPI n'affichent une valeur que lorsque `disponible === true`.
  const [disponible, setDisponible] = useState(null)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    let actif = true
    api.get('/prospection')
      .then(res => {
        if (!actif) return
        const payload = res && res.data
        const liste = Array.isArray(payload) ? payload
          : Array.isArray(payload && payload.data) ? payload.data
          : Array.isArray(payload && payload.prospects) ? payload.prospects
          : null
        setProspects(Array.isArray(liste) ? liste : [])
        setDisponible(true)
      })
      .catch((err) => {
        if (!actif) return
        // 404 = la route n'existe pas (module non livré) : ce n'est PAS une panne
        // de chargement. On distingue les deux cas plutôt que d'afficher un
        // message vague qui laisse espérer une nouvelle tentative.
        const statut = err?.response?.status
        setDisponible(false)
        setErreur(statut === 404
          ? "Le module de prospection n'est pas livré dans COURTIA : aucune route /api/prospection n'existe. Aucun prospect n'est affiché, et aucun ne sera inventé."
          : `Le module de prospection est injoignable (${statut ? `HTTP ${statut}` : 'réseau'}). Aucun prospect n'est affiché tant que le chargement n'a pas abouti.`)
      })
    return () => { actif = false }
  }, [])

  const totalPotentiel = prospects.reduce((s, p) => s + (Number(p.potentiel) || 0), 0)
  const rdvPlanifies = prospects.filter(p => String(p.statut || p.status || '').toLowerCase().includes('rdv')).length

  return (
    <div style={{ padding: 32, minHeight: '100vh' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Prospection</h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Pipeline de nouveaux clients potentiels</p>
      </div>

      {/* KPIs — « — » tant que rien n'est mesuré (jamais un 0 qui ferait croire
          à un pipeline vide alors que le module est absent). */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Prospects', value: disponible === true ? prospects.length : '—', icon: UserPlus, accent: '#5B4DF5' },
          { label: 'Potentiel', value: (disponible === true && prospects.length) ? fmtMontant(totalPotentiel, { maximumFractionDigits: 0 }) : '—', icon: TrendingUp, accent: '#22C55E' },
          { label: 'RDV planifiés', value: disponible === true ? rdvPlanifies : '—', icon: CalendarDays, accent: '#F59E0B' },
          { label: 'Qualifiés', value: disponible === true ? prospects.filter(p => ['qualifie', 'rdv'].includes(String(p.statut || p.status || '').toLowerCase())).length : '—', icon: Target, accent: '#3B82F6' },
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
      {disponible === true && prospects.length === 0 && (
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
        {/* Bouton inactif assumé : il n'ouvrait aucun formulaire (le clic ne
            faisait rien). Un bouton qui ne fait rien vaut moins qu'un bouton
            annoncé comme indisponible. */}
        <button type="button" disabled aria-disabled="true"
          title="La création manuelle de prospect n'est pas disponible : le module prospection n'est pas livré."
          style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.03)', color: '#4B5563', border: '1px solid rgba(255,255,255,0.06)', cursor: 'not-allowed' }}>
          + Nouveau prospect (indisponible)
        </button>
      </div>

      {/* ARK — ne parle que de ce qui est réellement mesuré */}
      <div style={{
        background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Zap size={16} color="#8B5CF6" />
        <p style={{ fontSize: 13, color: '#c4b5fd', margin: 0 }}>
          <strong style={{ color: '#a78bfa' }}>ARK</strong> — {
            disponible === true
              ? `${prospects.length} prospect${prospects.length > 1 ? 's' : ''} en pipeline. ${
                  (() => {
                    if (!prospects.length) return 'Aucun prospect à analyser pour le moment.'
                    const top = [...prospects].sort((a, b) => (Number(b.potentiel) || 0) - (Number(a.potentiel) || 0))[0]
                    const nom = top?.nom || top?.societe || 'Prospect non nommé'
                    const potentiel = Number(top?.potentiel)
                    const ph = Number.isFinite(potentiel)
                      ? `Le plus fort potentiel : ${nom} (${fmtMontant(potentiel, { maximumFractionDigits: 0 })})`
                      : `Le plus fort potentiel : ${nom}`
                    const rdv = prospects.filter((p) => p.statut === 'rdv')
                    return rdv.length
                      ? `${ph}. ${rdv.length > 1 ? rdv.length + ' rendez-vous sont' : (rdv[0]?.nom || 'Un prospect') + ' a un rendez-vous'} planifié${rdv.length > 1 ? 's' : ''}.`
                      : `${ph}. Prochaine action : qualifier les prospects sans rendez-vous.`
                  })()
                }`
              : "aucun prospect n'est analysable : le module prospection n'est pas disponible."
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
              const statutBrut = String(p.statut || p.status || '').toLowerCase()
              const s = STATUT_STYLE[statutBrut] || { bg: 'rgba(255,255,255,0.05)', text: '#9CA3AF' }
              const potentiel = Number(p.potentiel)
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#fff' }}>{mesure(p.nom || p.societe)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#9CA3AF' }}>{mesure(p.secteur)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} /> {mesure(p.ville)}
                  </td>
                  {/* Un potentiel absent reste « — » : jamais un 0 €. */}
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#22C55E' }}>
                    {Number.isFinite(potentiel) ? `${potentiel.toLocaleString(localeCourante())} CHF` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.text }}>
                      {STATUT_LABEL[statutBrut] || mesure(p.statut || p.status)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#9CA3AF' }}>{mesure(p.date)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
