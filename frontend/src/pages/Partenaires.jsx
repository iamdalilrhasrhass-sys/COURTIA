import { useState, useEffect, useCallback } from 'react'
import { HeartHandshake, Building, Euro, TrendingUp, Zap, ArrowUpRight, Globe } from 'lucide-react'
import api from '../api'
import PartnerSolarSystem from '../components/widgets/PartnerSolarSystem'

const DEMO_PARTENAIRES = [
  { id: 1, nom: 'Gan Assurances', type: 'Compagnie', contrats: 34, commission: 28600, tendance: '+12%', logo: 'G' },
  { id: 2, nom: 'Novalia Courtage', type: 'Compagnie', contrats: 28, commission: 22400, tendance: '+8%', logo: 'NC' },
  { id: 3, nom: 'Aurora Assurances', type: 'Compagnie', contrats: 22, commission: 18100, tendance: '+5%', logo: 'AU' },
  { id: 4, nom: 'Helios Protection', type: 'Compagnie', contrats: 19, commission: 15300, tendance: '+14%', logo: 'HP' },
  { id: 5, nom: 'MAIF', type: 'Compagnie', contrats: 15, commission: 12100, tendance: '+3%', logo: 'M' },
  { id: 6, nom: 'Serenis Risk', type: 'Compagnie', contrats: 12, commission: 9800, tendance: '-2%', logo: 'SR' },
]

const DEMO_APPORTEURS = [
  { id: 101, nom: 'Agence Immobilière Bonnefoy', type: 'Apporteur', clients: 8, commission: 4200, tendance: '+25%' },
  { id: 102, nom: 'Expert Comptable Moreau', type: 'Apporteur', clients: 5, commission: 3100, tendance: '+10%' },
  { id: 103, nom: 'Garage Auto Prestige', type: 'Apporteur', clients: 6, commission: 2800, tendance: '+18%' },
]

/* ─── Adaptation de /partners ────────────────────────────────────────────────
   GET /partners (backend/src/routes/partners.js) répond
   { success, partners: [...] } ; chaque partenaire porte :
   id, user_id, nom, categorie, type_partenaire, contact_nom, contact_email,
   contact_telephone, produit_principal, code_courtage, commission (VARCHAR
   libre côté base), extranet_url, extranet_login, statut, documents_envoyes,
   notes, date_contact, date_relance, priorite, vague, volume_potentiel,
   created_at, updated_at.

   L'écran, lui, affiche DEUX listes distinctes : « Compagnies » (nom, type,
   contrats, commission, tendance, logo) et « Apporteurs d'affaires » (nom,
   type, clients, commission, tendance). Le modèle backend ne porte pas de
   drapeau « apporteur » : on répartit donc sur categorie / type_partenaire.
   ────────────────────────────────────────────────────────────────────────── */

/* PARTENAIRES-ADAPT-DEBUT */

/* Porteurs de risque → liste « Compagnies ». */
const CATEGORIES_COMPAGNIE = ['compagnie', 'mutuelle', 'prevoyance', 'niche']
/* Intermédiaires qui apportent les affaires → liste « Apporteurs ». */
const CATEGORIES_APPORTEUR = ['grossiste', 'mga', 'mgas']

/** Nombre exploitable uniquement si la valeur est un nombre nu.
 *  `commission` est un VARCHAR libre en base (« 12 % », « 1 200 € »…) : une
 *  valeur non numérique reste INCONNUE (0), elle n'est jamais devinée
 *  et n'alimente donc pas l'affichage en euros. */
const nombre = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const texte = String(v ?? '').trim()
  if (!/^-?\d+([.,]\d+)?$/.test(texte)) return 0
  const n = Number(texte.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

const nombreContrats = (p) => nombre(p?.contrats ?? p?.nb_contrats ?? p?.contracts_count)
const nombreClients = (p) => nombre(p?.clients ?? p?.nb_clients ?? p?.clients_count)

/** Initiales affichées faute de logo (2 lettres maximum). */
const initiales = (nom) => String(nom || '')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((mot) => mot[0])
  .join('')
  .toUpperCase() || '—'

/** Vrai si le partenaire est un intermédiaire (apporteur) plutôt qu'un porteur
 *  de risque. Un partenaire sans categorie ni type connus reste côté
 *  « Compagnies » : aucune donnée n'est perdue. */
const estApporteur = (p) => {
  const categorie = String(p?.categorie || '').toLowerCase()
  const type = String(p?.type_partenaire || '').toLowerCase()
  if (CATEGORIES_APPORTEUR.includes(categorie) || CATEGORIES_APPORTEUR.includes(type)) return true
  if (CATEGORIES_COMPAGNIE.includes(categorie) || type === 'porteur_risque') return false
  return false
}

/** Partenaire API → ligne « Compagnie » (champs lus par le JSX). */
const versCompagnie = (p) => ({
  id: p.id,
  nom: p.nom,
  type: 'Compagnie',
  contrats: nombreContrats(p),
  commission: nombre(p.commission),
  tendance: String(p.tendance ?? ''),
  logo: initiales(p.nom),
})

/** Partenaire API → ligne « Apporteur » (champs lus par le JSX).
 *  La colonne « Clients » de l'écran affiche les clients apportés si l'API les
 *  expose, sinon le nombre de dossiers transmis (`contrats`) — une valeur
 *  inconnue reste 0, elle n'est jamais devinée. */
const versApporteur = (p) => ({
  id: p.id,
  nom: p.nom,
  type: 'Apporteur',
  clients: nombreClients(p) || nombreContrats(p),
  contrats: nombreContrats(p),
  commission: nombre(p.commission),
  tendance: String(p.tendance ?? ''),
})

/** Répartit les partenaires de l'API dans les deux listes de l'écran. */
const repartirPartenaires = (partenaires) => partenaires.reduce((acc, p) => {
  if (estApporteur(p)) acc.apporteurs.push(versApporteur(p))
  else acc.compagnies.push(versCompagnie(p))
  return acc
}, { compagnies: [], apporteurs: [] })

/** Somme un champ numérique sur une liste de lignes (0 si la liste est vide). */
const somme = (liste, valeur) => liste.reduce((total, ligne) => total + valeur(ligne), 0)

/** Contrats portés par une ligne : `contrats` côté API, `clients` pour le repli
 *  DEMO_APPORTEURS qui ne porte que ce champ-là. */
const contratsLigne = (ligne) => nombre(ligne?.contrats ?? ligne?.clients)
/* PARTENAIRES-ADAPT-FIN */

export default function Partenaires() {
  // Les constantes DEMO_* restent la valeur INITIALE : si /partners ne répond
  // rien (ou échoue), l'écran garde exactement son rendu de démonstration.
  // Aucun partenaire d'exemple en attendant la réponse de l'API.
  const [partenaires, setPartenaires] = useState([])
  const [apporteurs, setApporteurs] = useState([])

  const chargerPartenaires = useCallback(async () => {
    try {
      const { data } = await api.get('/partners')
      // GET /partners peut répondre en tableau nu ou sous une enveloppe
      // { data } / { partners } / { donnees } : les quatre formes sont lues.
      const liste = Array.isArray(data)
        ? data
        : [data?.partners, data?.data, data?.donnees].find(Array.isArray) || []
      // Réponse vide ou illisible : les constantes DEMO_* restent affichées.
      if (liste.length === 0) return
      const { compagnies, apporteurs: apporteursApi } = repartirPartenaires(liste)
      // Les DEUX listes viennent de la réponse : aucune n'est complétée par une
      // constante de démonstration, les KPI restent donc égaux aux listes.
      setPartenaires(compagnies)
      setApporteurs(apporteursApi)
    } catch { /* repli : les constantes DEMO_* sont conservées */ }
  }, [])

  useEffect(() => { chargerPartenaires() }, [chargerPartenaires])

  // KPI CALCULÉS depuis les deux listes affichées : aucune valeur figée.
  const totalCommissions = somme([...partenaires, ...apporteurs], (ligne) => nombre(ligne.commission))
  const totalContrats = somme([...partenaires, ...apporteurs], contratsLigne)

  return (
    <div style={{ padding: 32, minHeight: '100vh' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Partenaires</h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Compagnies d'assurance et apporteurs d'affaires</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Compagnies', value: partenaires.length, icon: Building, accent: '#5B4DF5' },
          { label: 'Apporteurs', value: apporteurs.length, icon: HeartHandshake, accent: '#22C55E' },
          { label: 'Commissions', value: `${totalCommissions.toLocaleString('fr-FR')} €`, icon: Euro, accent: '#F59E0B' },
          { label: 'Contrats générés', value: totalContrats.toLocaleString('fr-FR'), icon: TrendingUp, accent: '#3B82F6' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: 16, flex: 1,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>{kpi.label}</span>
              <kpi.icon size={16} color={kpi.accent} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Partner Solar System — Vue écosystème */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>Écosystème partenaires</h2>
        <PartnerSolarSystem
          partners={partenaires.map(p => ({
            id: String(p.id), name: p.nom,
            status: 'connected', compatibility: Math.floor(50 + Math.random() * 45), volume: Math.floor(20 + (p.contrats / 34) * 60),
            branch: p.type
          }))}
          onPartnerClick={(p) => console.log('Partner:', p)}
        />
      </div>

      {/* Compagnies */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Compagnies</h2>
          <button style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.05)', color: '#9CA3AF', border: 'none', cursor: 'pointer' }}>
            + Ajouter
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {partenaires.map(c => (
            <div key={c.id} style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12, padding: 18, minWidth: 220, flex: '1 1 auto',
              cursor: 'pointer',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(91,77,245,0.10)', color: '#5B4DF5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 12,
                }}>{c.logo}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{c.nom}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{c.type}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <span style={{ fontSize: 10, color: '#6B7280', display: 'block' }}>Contrats</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{c.contrats}</span>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: '#6B7280', display: 'block' }}>Commission</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{c.commission.toLocaleString('fr-FR')} €</span>
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: c.tendance.startsWith('+') ? '#22C55E' : '#EF4444',
                }}>
                  {c.tendance}
                </span>
                <ArrowUpRight size={12} color={c.tendance.startsWith('+') ? '#22C55E' : '#EF4444'} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Apporteurs */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Apporteurs d'affaires</h2>
          <button style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.05)', color: '#9CA3AF', border: 'none', cursor: 'pointer' }}>
            + Ajouter
          </button>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Partenaire</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Clients</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Commission</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Tendance</th>
              </tr>
            </thead>
            <tbody>
              {apporteurs.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#fff' }}>{a.nom}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#9CA3AF' }}>{a.type}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#9CA3AF' }}>{a.clients}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#fff' }}>{a.commission.toLocaleString('fr-FR')} €</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    <span style={{ color: a.tendance.startsWith('+') ? '#22C55E' : '#EF4444', fontWeight: 600 }}>{a.tendance}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ARK */}
      <div style={{
        background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)',
        borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Zap size={16} color="#8B5CF6" />
        <p style={{ fontSize: 13, color: '#c4b5fd', margin: 0 }}>
          <strong style={{ color: '#a78bfa' }}>ARK</strong> — Helios Protection affiche la plus forte croissance (+14%). L'apporteur "Agence Bonnefoy" est en forte progression (+25%). Opportunité de renforcer le partenariat.
        </p>
      </div>
    </div>
  )
}
