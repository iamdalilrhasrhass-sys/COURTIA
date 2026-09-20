import { useEffect, useState } from 'react'
import { Activity, Clock, FileUp, GitBranch, Sparkles, Users } from 'lucide-react'
import { adminFetch } from '../lib/adminApi'
import { localeCourante } from '../lib/monnaie'

/**
 * Suivi des essais (interne) — /admin/essais
 *
 * Chaque valeur affichée vient de `GET /api/admin/super/trials`, calculé en base
 * (statut serveur, dates réelles, compteurs réels). Aucun score, aucune
 * estimation : un champ non mesuré s'affiche « — ».
 */

const COULEURS = {
  TRIAL_ACTIVE: { bg: 'rgba(34,197,94,0.12)', texte: '#86EFAC', label: 'Essai actif' },
  TRIAL_EXPIRED: { bg: 'rgba(239,68,68,0.12)', texte: '#FCA5A5', label: 'Essai terminé' },
  SUBSCRIPTION_ACTIVE: { bg: 'rgba(139,92,246,0.14)', texte: '#C4B5FD', label: 'Abonné' },
  NOT_STARTED: { bg: 'rgba(148,163,184,0.12)', texte: '#CBD5E1', label: 'Sans essai' },
}

const dateFr = (v) => (v ? new Date(v).toLocaleDateString(localeCourante()) : '—')
const dateHeureFr = (v) => (v ? new Date(v).toLocaleString(localeCourante()) : '—')
const nombre = (v) => (v === null || v === undefined ? '—' : v)

export default function AdminEssais() {
  const [donnees, setDonnees] = useState(null)
  const [erreur, setErreur] = useState(null)
  const [chargement, setChargement] = useState(true)

  const charger = () => {
    setChargement(true)
    setErreur(null)
    adminFetch('/trials')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        setDonnees(await r.json())
      })
      .catch((e) => setErreur(`Suivi indisponible (${e.message}).`))
      .finally(() => setChargement(false))
  }

  useEffect(() => { charger() }, [])

  const essais = donnees?.essais || []

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 48px', color: '#fff', background: '#050510' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Interne</div>
            <h1 style={{ fontSize: 25, fontWeight: 800, margin: '4px 0' }}>Suivi des essais</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              {donnees ? `${donnees.total} cabinet(s) — essai de ${donnees.duree_essai_jours} jours — valeurs mesurées en base.` : 'Chargement du suivi…'}
            </p>
          </div>
          <button onClick={charger} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff' }}>
            Actualiser
          </button>
        </div>

        {chargement && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Chargement…</p>}
        {erreur && <p style={{ color: '#FCA5A5', fontSize: 13 }}>{erreur}</p>}

        {!chargement && !erreur && essais.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Aucun cabinet en essai pour le moment.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {essais.map((e) => {
            const couleur = COULEURS[e.trial_status] || COULEURS.NOT_STARTED
            return (
              <div key={e.user_id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{e.cabinet}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{e.email}</div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: couleur.bg, color: couleur.texte }}>
                    {couleur.label}{e.trial_status === 'TRIAL_ACTIVE' ? ` — ${e.jours_restants} j restants` : ''}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.62)' }}>
                  <div><Clock size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />Compte créé : {dateFr(e.compte_cree_le)}</div>
                  <div>Essai : {dateFr(e.essai_debute_le)} → {dateFr(e.essai_finit_le)}</div>
                  <div>Abonnement : {e.subscription_status || '—'} / {e.plan || '—'}</div>
                  <div><Activity size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />Dernière activité : {dateHeureFr(e.derniere_activite)}</div>
                  <div><Users size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />Clients : {nombre(e.clients_crees)}</div>
                  <div><FileUp size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />Documents : {nombre(e.documents_deposes)}</div>
                  <div><Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />Conversations ARK : {nombre(e.conversations_ark)}</div>
                  <div><GitBranch size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />Cartes pipeline : {nombre(e.cartes_pipeline)}</div>
                  <div>Onboarding : {nombre(e.etapes_validees)}/5 étape(s){e.onboarding_termine_le ? ' — terminé' : ''}</div>
                </div>
              </div>
            )
          })}
        </div>

        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.32)', marginTop: 18 }}>
          Les compteurs sont des mesures réelles. Aucun score ni objectif n'est calculé ici.
        </p>
      </div>
    </div>
  )
}
