import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CalendarDays, CheckCircle2, Clock, Plus, Search, Trash2, X, User, ChevronRight,
} from 'lucide-react'
import api from '../api'
import { normaliserTaches } from '../lib/tachesViewModel'
import { localeCourante } from '../lib/monnaie'

/**
 * Écran Rendez-vous — adossé à l'agenda réel du cabinet, sans jeu de données inventé.
 *
 * Avant cette correction, le menu « Rendez-vous » ouvrait l'écran « Tâches » :
 * le courtier cliquait « Rendez-vous » et lisait « Tâches ». Cette vue reprend
 * les entrées datées de l'agenda du cabinet (table `appointments`, servie par
 * `/api/taches` — même source que l'écran Tâches), les regroupe par journée et
 * n'affiche une action (créer, clôturer, supprimer) qu'après confirmation du
 * backend. Une liste vide s'affiche comme vide : aucun rendez-vous d'exemple.
 */

const T = {
  bg: '#050510', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)',
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  accent: '#5B4DF5', ark: '#8B5CF6',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const FILTRES = ['À venir', "Aujourd'hui", 'Cette semaine', 'Passés', 'Tous']

const jourLocal = (valeur) => {
  if (!valeur) return null
  const d = new Date(valeur)
  if (Number.isNaN(d.getTime())) return null
  const mois = String(d.getMonth() + 1).padStart(2, '0')
  const jour = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mois}-${jour}`
}

const AUJOURDHUI = jourLocal(new Date())

function libelleJour(iso) {
  if (!iso) return 'Sans date'
  if (iso === AUJOURDHUI) return "Aujourd'hui"
  const demain = new Date()
  demain.setDate(demain.getDate() + 1)
  if (iso === jourLocal(demain)) return 'Demain'
  const d = new Date(`${iso}T12:00:00`)
  return new Intl.DateTimeFormat(localeCourante(), { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
}

function heureFr(valeur) {
  if (!valeur) return '—'
  const d = new Date(valeur)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(localeCourante(), { hour: '2-digit', minute: '2-digit' }).format(d)
}

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

export default function RendezVous() {
  const navigate = useNavigate()
  const [rendezVous, setRendezVous] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [message, setMessage] = useState(null)
  const [clients, setClients] = useState([])
  const [filtre, setFiltre] = useState('À venir')
  const [recherche, setRecherche] = useState('')
  const [formulaire, setFormulaire] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [form, setForm] = useState({ titre: '', client_id: '', date: '', heure: '09:00', description: '' })

  const charger = () => {
    setChargement(true)
    setErreur(null)
    return api.get('/taches')
      .then(res => setRendezVous(normaliserTaches(res.data)))
      .catch(err => {
        // L'API est la seule source : si elle ne répond pas, on le dit.
        setRendezVous([])
        setErreur(err?.response?.status === 401
          ? 'Session expirée : reconnectez-vous.'
          : "Les rendez-vous n'ont pas pu être chargés. Réessayez dans un instant.")
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

  const stats = useMemo(() => {
    if (chargement || erreur) return { aujourdhui: null, semaine: null, avenir: null, passes: null }
    const fin = new Date()
    fin.setDate(fin.getDate() + ((7 - fin.getDay()) % 7))
    const finIso = jourLocal(fin)
    const datés = rendezVous.filter(r => jourLocal(r.echeance))
    return {
      aujourdhui: datés.filter(r => jourLocal(r.echeance) === AUJOURDHUI).length,
      semaine: datés.filter(r => jourLocal(r.echeance) >= AUJOURDHUI && jourLocal(r.echeance) <= finIso).length,
      avenir: datés.filter(r => jourLocal(r.echeance) > AUJOURDHUI).length,
      passes: datés.filter(r => jourLocal(r.echeance) < AUJOURDHUI).length,
    }
  }, [rendezVous, chargement, erreur])

  const liste = useMemo(() => {
    let resultat = rendezVous.slice().sort((a, b) => {
      const da = a.echeance ? new Date(a.echeance).getTime() : 0
      const db = b.echeance ? new Date(b.echeance).getTime() : 0
      return da - db
    })
    const iso = (r) => jourLocal(r.echeance)
    if (filtre === 'À venir') resultat = resultat.filter(r => iso(r) && iso(r) >= AUJOURDHUI)
    else if (filtre === "Aujourd'hui") resultat = resultat.filter(r => iso(r) === AUJOURDHUI)
    else if (filtre === 'Passés') resultat = resultat.filter(r => iso(r) && iso(r) < AUJOURDHUI)
    else if (filtre === 'Cette semaine') {
      const fin = new Date()
      fin.setDate(fin.getDate() + ((7 - fin.getDay()) % 7))
      const finIso = jourLocal(fin)
      resultat = resultat.filter(r => iso(r) && iso(r) >= AUJOURDHUI && iso(r) <= finIso)
    }
    if (recherche) {
      const q = recherche.toLowerCase()
      resultat = resultat.filter(r =>
        (r.titre || '').toLowerCase().includes(q) || (r.client_nom || '').toLowerCase().includes(q))
    }
    return resultat
  }, [rendezVous, filtre, recherche])

  // Regroupement par journée : un agenda se lit par jour, pas par identifiant.
  const groupes = useMemo(() => {
    const parJour = new Map()
    liste.forEach(r => {
      const cle = jourLocal(r.echeance) || 'sans-date'
      if (!parJour.has(cle)) parJour.set(cle, [])
      parJour.get(cle).push(r)
    })
    return [...parJour.entries()]
  }, [liste])

  const creer = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (!form.titre.trim()) { setMessage({ type: 'erreur', texte: 'Le titre est obligatoire.' }); return }
    if (!form.date || !form.heure) { setMessage({ type: 'erreur', texte: 'La date et l’heure sont obligatoires.' }); return }
    setEnvoi(true)
    try {
      const debut = new Date(`${form.date}T${form.heure}:00`)
      if (Number.isNaN(debut.getTime())) throw new Error('date_invalide')
      const res = await api.post('/taches', {
        titre: form.titre.trim(),
        description: form.description.trim(),
        client_id: form.client_id ? Number(form.client_id) : null,
        echeance: debut.toISOString(),
        statut: 'a_faire',
      })
      // Un identifiant renvoyé par l'API = le rendez-vous existe réellement.
      if (!res.data?.id) {
        setMessage({ type: 'erreur', texte: "Le rendez-vous n'a pas été enregistré : réponse inattendue du serveur." })
      } else {
        setMessage({ type: 'succes', texte: `Rendez-vous « ${res.data.title || form.titre} » enregistré.` })
        setFormulaire(false)
        setForm({ titre: '', client_id: '', date: '', heure: '09:00', description: '' })
        await charger()
      }
    } catch (err) {
      const api_message = err?.response?.data?.message
      setMessage({ type: 'erreur', texte: api_message || "Le rendez-vous n'a pas été enregistré. Réessayez." })
    } finally {
      setEnvoi(false)
    }
  }

  const basculerStatut = async (rv) => {
    setMessage(null)
    try {
      const res = await api.put(`/taches/${rv.id}`, { statut: rv.terminee ? 'a_faire' : 'terminee' })
      if (!res.data?.id) throw new Error('confirmation absente')
      await charger()
    } catch (err) {
      setMessage({ type: 'erreur', texte: `Le changement d'état n'a pas été enregistré (${err?.response?.status || 'réseau'}).` })
    }
  }

  const supprimer = async (rv) => {
    if (!window.confirm(`Supprimer le rendez-vous « ${rv.titre} » ?`)) return
    setMessage(null)
    try {
      const res = await api.delete(`/taches/${rv.id}`)
      if (!res.data?.success) throw new Error('confirmation absente')
      setMessage({ type: 'succes', texte: 'Rendez-vous supprimé.' })
      await charger()
    } catch (err) {
      setMessage({ type: 'erreur', texte: `La suppression n'a pas été enregistrée (${err?.response?.status || 'réseau'}).` })
    }
  }

  const aVenirCount = rendezVous.filter(r => jourLocal(r.echeance) && jourLocal(r.echeance) >= AUJOURDHUI).length

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 40px', color: T.text }}>
      <div style={{ position: 'fixed', width: 500, height: 500, background: 'radial-gradient(circle, rgba(91,77,245,0.05) 0%, transparent 70%)', top: -120, right: -120, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <CalendarDays size={16} color={T.accent} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Agenda cabinet</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Rendez-vous</h1>
            <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>
              Les rendez-vous enregistrés dans COURTIARK, par jour.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setFormulaire(v => !v)} style={btnStyle(T.accent)}>
              {formulaire ? <><X size={13} /> Fermer</> : <><Plus size={13} /> Nouveau rendez-vous</>}
            </button>
            <button onClick={() => navigate('/taches')} style={btnStyle(T.ark)}><ChevronRight size={13} /> Voir les tâches</button>
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
            <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Objet du rendez-vous *" style={champStyle} required />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={{ ...champStyle, flex: '1 1 200px' }}>
                <option value="">Aucun client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{[c.prenom, c.nom].filter(Boolean).join(' ') || c.email || `Client #${c.id}`}</option>
                ))}
              </select>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...champStyle, flex: '0 0 180px' }} required />
              <input type="time" value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} style={{ ...champStyle, flex: '0 0 130px' }} required />
            </div>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Note (facultatif)" rows={2} style={champStyle} />
            <button type="submit" disabled={envoi} style={{ ...btnStyle(T.success), alignSelf: 'flex-start', opacity: envoi ? 0.6 : 1 }}>
              <CheckCircle2 size={13} /> {envoi ? 'Enregistrement…' : 'Enregistrer le rendez-vous'}
            </button>
          </form>
        )}

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <KpiCard icon={Clock} title="Aujourd'hui" value={stats.aujourdhui} />
          <KpiCard icon={CalendarDays} title="Cette semaine" value={stats.semaine} />
          <KpiCard icon={ChevronRight} title="À venir" value={stats.avenir} accent={T.ark} />
          <KpiCard icon={CheckCircle2} title="Passés" value={stats.passes} accent={T.textMuted} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTRES.map(f => (
              <button key={f} onClick={() => setFiltre(f)} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: filtre === f ? T.accent + '22' : T.cardBg,
                color: filtre === f ? T.accent : T.textSecondary,
                border: filtre === f ? '1px solid ' + T.accent + '40' : '1px solid ' + T.cardBorder,
                cursor: 'pointer',
              }}>{f}</button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} color={T.textMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} style={{
              padding: '8px 12px 8px 32px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: T.cardBg, color: T.text, border: '1px solid ' + T.cardBorder,
              width: 200, outline: 'none',
            }} />
          </div>
        </div>

        {chargement ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: T.textMuted, fontSize: 13 }}>Chargement des rendez-vous…</div>
        ) : erreur ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#FCA5A5', fontSize: 13 }}>
            {erreur}
            <div style={{ marginTop: 12 }}>
              <button onClick={charger} style={btnStyle(T.accent)}>Réessayer</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {groupes.map(([jour, items]) => (
                <div key={jour}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: jour === AUJOURDHUI ? T.accent : T.textMuted, margin: 0 }}>
                      {jour === 'sans-date' ? 'Sans date' : libelleJour(jour)}
                    </h2>
                    <span style={{ fontSize: 11, color: T.textMuted }}>{items.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map(rv => (
                      <motion.div key={rv.id}
                        whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
                        style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: '14px 16px', opacity: rv.terminee ? 0.6 : 1 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{heureFr(rv.echeance)}</span>
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: rv.terminee ? 'rgba(34,197,94,0.1)' : T.cardBg, color: rv.terminee ? T.success : T.textMuted }}>
                            {rv.terminee ? 'Traité' : 'À venir'}
                          </span>
                          <div style={{ flex: 1 }} />
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>{rv.titre}</div>
                        <div style={{ fontSize: 12, color: T.textSecondary }}>
                          {rv.client_nom
                            ? <><User size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />{rv.client_nom}</>
                            : 'Aucun client associé'}
                          {rv.description ? ` · ${rv.description}` : ''}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                          <button onClick={() => basculerStatut(rv)} style={actionBtnStyle(T.success)}>
                            <CheckCircle2 size={11} /> {rv.terminee ? 'Rouvrir' : 'Marquer traité'}
                          </button>
                          {rv.client_id && (
                            <button onClick={() => navigate(`/clients/${rv.client_id}`)} style={actionBtnStyle(T.ark)}>
                              <User size={11} /> Voir client
                            </button>
                          )}
                          <button onClick={() => supprimer(rv)} style={actionBtnStyle(T.danger)}>
                            <Trash2 size={11} /> Supprimer
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {liste.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
                <CalendarDays size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ fontSize: 14, margin: 0 }}>
                  {rendezVous.length === 0
                    ? 'Aucun rendez-vous pour ce cabinet.'
                    : 'Aucun rendez-vous dans ce filtre.'}
                </p>
                {rendezVous.length === 0 && (
                  <div style={{ marginTop: 14 }}>
                    <button onClick={() => setFormulaire(true)} style={btnStyle(T.accent)}>
                      <Plus size={13} /> Planifier le premier rendez-vous
                    </button>
                  </div>
                )}
                {rendezVous.length > 0 && aVenirCount === 0 && filtre === 'À venir' && (
                  <p style={{ fontSize: 12, marginTop: 6 }}>Aucune date à venir : consultez « Passés » ou « Tous ».</p>
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
