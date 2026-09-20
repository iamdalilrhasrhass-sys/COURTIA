import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ListTodo, CheckCircle2, Clock, Sparkles, Zap, Plus, Search, Trash2, X, Calendar, User
} from 'lucide-react'
import api from '../api'
import { normaliserTaches, statistiquesTaches } from '../lib/tachesViewModel'

/**
 * Écran Tâches — adossé à la base, sans jeu de données inventé.
 *
 * Avant cette correction, la page partait d'une liste de 10 tâches de
 * démonstration (« Martin Conseil », « Karim B. »…) et la conservait dès que
 * l'API répondait une liste vide : un cabinet neuf voyait les tâches d'un autre.
 * Les compteurs affichaient aussi « Terminées : 22 » en dur. Ici, tout vient de
 * `GET /api/taches` et toute action (créer, terminer, supprimer) n'est affichée
 * qu'après confirmation du backend.
 */

const T = {
  bg: '#050510', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)',
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.06)', arkBorder: 'rgba(139,92,246,0.15)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const PRIORITE_STYLE = {
  haute: { bg: 'rgba(239,68,68,0.08)', text: '#EF4444', label: 'Haute' },
  normale: { bg: 'rgba(245,158,11,0.08)', text: '#F59E0B', label: 'Normale' },
  moyenne: { bg: 'rgba(245,158,11,0.08)', text: '#F59E0B', label: 'Moyenne' },
  basse: { bg: 'rgba(100,116,139,0.08)', text: '#9CA3AF', label: 'Basse' },
}

const AUJOURDHUI_ISO = new Date().toISOString().slice(0, 10)
const FILTRES = ['À faire', 'Toutes', 'En retard', "Aujourd'hui", 'Cette semaine', 'Terminées']

function KpiCard({ icon: Icon, title, value, accent }) {
  return (
    <div style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 10, padding: '12px 16px', flex: '1 1 auto', minWidth: 130 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase' }}>{title}</span>
        <Icon size={14} color={accent || T.accent} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{value === null ? '—' : value}</div>
    </div>
  )
}

export default function Taches() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('À faire')
  const [taches, setTaches] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [message, setMessage] = useState(null)
  const [clients, setClients] = useState([])
  const [formulaire, setFormulaire] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [form, setForm] = useState({ titre: '', description: '', client_id: '', echeance: '' })

  const charger = () => {
    setChargement(true)
    setErreur(null)
    return api.get('/taches')
      .then(res => setTaches(normaliserTaches(res.data)))
      .catch(err => {
        // L'API est la seule source : si elle ne répond pas, on le dit.
        setTaches([])
        setErreur(err?.response?.status === 401
          ? 'Session expirée : reconnectez-vous.'
          : "Les tâches n'ont pas pu être chargées. Réessayez dans un instant.")
      })
      .finally(() => setChargement(false))
  }

  useEffect(() => { charger() }, [])

  useEffect(() => {
    api.get('/clients')
      .then(res => {
        const d = res.data
        const liste = Array.isArray(d) ? d : Array.isArray(d?.clients) ? d.clients : Array.isArray(d?.data) ? d.data : []
        setClients(liste)
      })
      .catch(() => setClients([]))
  }, [])

  const stats = useMemo(
    () => statistiquesTaches(chargement || erreur ? null : taches, AUJOURDHUI_ISO),
    [taches, chargement, erreur]
  )

  const filtered = useMemo(() => {
    let list = taches
    if (filter === 'À faire') list = list.filter(t => !t.terminee)
    else if (filter === 'Terminées') list = list.filter(t => t.terminee)
    else if (filter === 'En retard') list = list.filter(t => !t.terminee && t.echeance && String(t.echeance).slice(0, 10) < AUJOURDHUI_ISO)
    else if (filter === "Aujourd'hui") list = list.filter(t => t.echeance && String(t.echeance).slice(0, 10) === AUJOURDHUI_ISO)
    else if (filter === 'Cette semaine') {
      const fin = new Date(AUJOURDHUI_ISO + 'T00:00:00Z')
      fin.setUTCDate(fin.getUTCDate() + ((7 - fin.getUTCDay()) % 7))
      list = list.filter(t => t.echeance && String(t.echeance).slice(0, 10) <= fin.toISOString().slice(0, 10))
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t => (t.titre || '').toLowerCase().includes(q) || (t.client_nom || '').toLowerCase().includes(q))
    }
    return list
  }, [taches, search, filter])

  const creer = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (!form.titre.trim()) { setMessage({ type: 'erreur', texte: 'Le titre est obligatoire.' }); return }
    if (!form.echeance) { setMessage({ type: 'erreur', texte: "L'échéance est obligatoire." }); return }
    setEnvoi(true)
    try {
      const res = await api.post('/taches', {
        titre: form.titre.trim(),
        description: form.description.trim(),
        client_id: form.client_id ? Number(form.client_id) : null,
        echeance: new Date(form.echeance + 'T09:00:00').toISOString(),
        statut: 'a_faire',
      })
      // Un identifiant renvoyé par l'API = la tâche existe réellement.
      if (!res.data?.id) {
        setMessage({ type: 'erreur', texte: "La tâche n'a pas été enregistrée : réponse inattendue du serveur." })
      } else {
        setMessage({ type: 'succes', texte: `Tâche « ${res.data.title || form.titre} » créée.` })
        setFormulaire(false)
        setForm({ titre: '', description: '', client_id: '', echeance: '' })
        await charger()
      }
    } catch (err) {
      const api_message = err?.response?.data?.message
      setMessage({ type: 'erreur', texte: api_message || "La tâche n'a pas été enregistrée. Réessayez." })
    } finally {
      setEnvoi(false)
    }
  }

  const basculerStatut = async (tache) => {
    setMessage(null)
    const nouveau = tache.terminee ? 'a_faire' : 'terminee'
    try {
      const res = await api.put(`/taches/${tache.id}`, { statut: nouveau })
      if (!res.data?.id) throw new Error('confirmation absente')
      await charger()
    } catch (err) {
      setMessage({ type: 'erreur', texte: `Le changement d'état n'a pas été enregistré (${err?.response?.status || 'réseau'}).` })
    }
  }

  const supprimer = async (tache) => {
    if (!window.confirm(`Supprimer la tâche « ${tache.titre} » ?`)) return
    setMessage(null)
    try {
      const res = await api.delete(`/taches/${tache.id}`)
      if (!res.data?.success) throw new Error('confirmation absente')
      setMessage({ type: 'succes', texte: 'Tâche supprimée.' })
      await charger()
    } catch (err) {
      setMessage({ type: 'erreur', texte: `La suppression n'a pas été enregistrée (${err?.response?.status || 'réseau'}).` })
    }
  }

  const libelle = (valeur) => (valeur === null ? '—' : valeur)

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
            <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>Vos actions réelles, enregistrées dans COURTIA.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setFormulaire(v => !v)} style={btnStyle(T.accent)}>
              {formulaire ? <><X size={13} /> Fermer</> : <><Plus size={13} /> Nouvelle</>}
            </button>
            <button onClick={() => navigate('/morning-brief')} style={btnStyle(T.ark)}><Zap size={13} /> Prioriser avec ARK</button>
          </div>
        </div>

        {message && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 12.5,
            background: message.type === 'erreur' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
            border: '1px solid ' + (message.type === 'erreur' ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'),
            color: message.type === 'erreur' ? '#FCA5A5' : '#86EFAC',
          }}>{message.texte}</div>
        )}

        {formulaire && (
          <form onSubmit={creer} style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Titre de la tâche *" style={champStyle} required />
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (facultatif)" rows={2} style={champStyle} />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={{ ...champStyle, flex: '1 1 200px' }}>
                <option value="">Aucun client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{[c.prenom, c.nom].filter(Boolean).join(' ') || c.email || `Client #${c.id}`}</option>
                ))}
              </select>
              <input type="date" value={form.echeance} onChange={e => setForm(f => ({ ...f, echeance: e.target.value }))} style={{ ...champStyle, flex: '0 0 180px' }} required />
            </div>
            <button type="submit" disabled={envoi} style={{ ...btnStyle(T.success), alignSelf: 'flex-start', opacity: envoi ? 0.6 : 1 }}>
              <CheckCircle2 size={13} /> {envoi ? 'Enregistrement…' : 'Créer la tâche'}
            </button>
          </form>
        )}

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <KpiCard icon={Clock} title="En retard" value={libelle(stats.retard)} accent={T.danger} />
          <KpiCard icon={Calendar} title="Aujourd'hui" value={libelle(stats.aujourdhui)} />
          <KpiCard icon={Calendar} title="Cette semaine" value={libelle(stats.semaine)} />
          <KpiCard icon={Sparkles} title="Terminées" value={libelle(stats.terminees)} accent={T.success} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTRES.map(f => (
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

        {chargement ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: T.textMuted, fontSize: 13 }}>Chargement des tâches…</div>
        ) : erreur ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#FCA5A5', fontSize: 13 }}>
            {erreur}
            <div style={{ marginTop: 12 }}>
              <button onClick={charger} style={btnStyle(T.accent)}>Réessayer</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(t => {
                const prio = PRIORITE_STYLE[t.priorite] || PRIORITE_STYLE.normale
                return (
                  <motion.div key={t.id}
                    whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
                    style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: '14px 16px', transition: 'all 0.15s', opacity: t.terminee ? 0.6 : 1 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: prio.bg, color: prio.text }}>{prio.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: t.terminee ? 'rgba(34,197,94,0.1)' : T.cardBg, color: t.terminee ? T.success : T.textMuted }}>
                            {t.terminee ? 'Terminée' : 'À faire'}
                          </span>
                          <span style={{ fontSize: 11, color: T.textMuted }}>
                            {t.echeance ? new Date(t.echeance).toLocaleDateString('fr-FR') : 'Sans échéance'}
                          </span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>{t.titre}</div>
                        <div style={{ fontSize: 12, color: T.textSecondary }}>
                          {t.client_nom
                            ? <><User size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />{t.client_nom}</>
                            : 'Aucun client associé'}
                          {t.description ? ` · ${t.description}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <button onClick={() => basculerStatut(t)} style={actionBtnStyle(T.success)}>
                        <CheckCircle2 size={11} /> {t.terminee ? 'Rouvrir' : 'Terminer'}
                      </button>
                      {t.client_id && (
                        <button onClick={() => navigate(`/clients/${t.client_id}`)} style={actionBtnStyle(T.ark)}>
                          <User size={11} /> Voir client
                        </button>
                      )}
                      <button onClick={() => supprimer(t)} style={actionBtnStyle(T.danger)}>
                        <Trash2 size={11} /> Supprimer
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
                <ListTodo size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ fontSize: 14, margin: 0 }}>
                  {taches.length === 0 ? 'Aucune tâche pour ce cabinet.' : 'Aucune tâche dans ce filtre.'}
                </p>
                {taches.length === 0 && (
                  <p style={{ fontSize: 12, marginTop: 6 }}>Créez la première avec « Nouvelle ».</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const champStyle = {
  padding: '9px 12px', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.04)',
  color: '#fff', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', fontFamily: 'inherit',
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
