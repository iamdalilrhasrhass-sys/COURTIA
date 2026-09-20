/* ============================================================================
   COURTIA — Écran « Rapports »
   ----------------------------------------------------------------------------
   POURQUOI cette réécriture : cet écran était ENTIÈREMENT fabriqué. Il gardait
   en constantes des chiffres de démonstration (124 clients actifs, 312 contrats,
   312 400 de primes, « 38 % contre 58 % », « Dubois SCP », les compagnies
   « Aurora Assurances » / « Helios Protection »…) et n'appelait AUCUNE API. Un
   cabinet suisse sans un seul client y lisait donc un portefeuille inventé —
   reproduit en production le 20/09/2026.

   RÈGLE de cet écran désormais : chaque valeur affichée vient d'une API réelle
   du cabinet ; une mesure absente vaut « — » ou une phrase qui dit qu'elle n'est
   pas mesurée. Aucune constante de démonstration, aucune prose d'analyse
   inventée, aucun nom de compagnie d'exemple.

   SOURCES (les mêmes en démonstration, qui les remplace par ses données
   synthétiques — voir demo/reponsesDemo.js) :
     • GET /api/dashboard/stats → clients, contrats, primes, devis, tâches,
       commissions du mois, score de risque moyen, répartition par statut,
       répartition par produit, primes des 6 derniers mois ;
     • GET /api/clients         → lignes clients réelles (score de risque,
       prochaine échéance, dernier contact) pour le panneau « à risque » ;
     • GET /api/opportunites    → opportunités réellement détectées.

   Les dates suivent la locale du cabinet (lib/monnaie.js : fr-CH en Suisse).
   ========================================================================== */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, AlertTriangle, Zap, Sparkles, FileText, Users, Euro, Target,
  Shield, BarChart3, PieChart, Activity, ArrowUp, ArrowDown, Clock,
  Lightbulb, RefreshCw, CheckCircle2,
} from 'lucide-react'
import api from '../api'
import { fmtMontant, fmtNombre, fmtDate } from '../lib/monnaie'

// ─── Jetons de thème (inchangés : design system COURTIA) ───────────────────
const T = {
  bg: '#050510',
  cardBg: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.06)',
  cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textDim: '#4B5563',
  accent: '#5B4DF5',
  accentBg: 'rgba(91,77,245,0.08)',
  accentBorder: 'rgba(91,77,245,0.20)',
  ark: '#8B5CF6',
  arkBg: 'rgba(139,92,246,0.06)',
  arkBorder: 'rgba(139,92,246,0.15)',
  success: '#22C55E',
  successBg: 'rgba(34,197,94,0.06)',
  successBorder: 'rgba(34,197,94,0.15)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.06)',
  warningBorder: 'rgba(245,158,11,0.15)',
  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.06)',
  dangerBorder: 'rgba(239,68,68,0.15)',
}

// Devise et locale centrales du cabinet (CHF + fr-CH en Suisse, EUR + fr-FR sinon).
const fmtEur = (v) => fmtMontant(v, { maximumFractionDigits: 0 })
const fmtNum = (v) => fmtNombre(v)
const NON_MESURE = '—'

/** Nombre exploitable, sinon null (« pas de mesure ») — jamais 0 par défaut. */
function nombreOuNull(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function libelleDate(valeur) {
  return valeur ? fmtDate(valeur) : NON_MESURE
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, title, value, accent, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: T.cardBg, border: '1px solid ' + T.cardBorder,
        borderRadius: 12, padding: '16px 18px', flex: 1, minWidth: 155,
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = T.cardHover; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = T.cardBg; e.currentTarget.style.borderColor = T.cardBorder }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={accent} />
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>{value}</div>
      {subtitle && (
        <div style={{ marginTop: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: T.textMuted }}>{subtitle}</span>
        </div>
      )}
    </motion.div>
  )
}

// ─── Section Header ─────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: T.arkBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={17} color={T.ark} />
      </div>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
      {badge && (
        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: T.arkBg, color: T.ark }}>
          {badge}
        </span>
      )}
    </div>
  )
}

// ─── Barre horizontale ──────────────────────────────────────────────────────
function HorizontalBar({ label, pct, count, couleur }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: T.textSecondary }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
          {count} <span style={{ color: T.textMuted, fontWeight: 400 }}>({pct} %)</span>
        </span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: Math.max(0, Math.min(100, pct)) + '%' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 3, background: couleur }}
        />
      </div>
    </div>
  )
}

// ─── Histogramme mensuel (une seule série : la valeur mesurée) ──────────────
function BarChartMensuel({ data, height = 180 }) {
  const valeurs = data.map((d) => Number(d.valeur) || 0)
  const maxVal = Math.max(...valeurs, 0)
  const chartHeight = height || 180
  if (!data.length || maxVal <= 0) {
    return <CarteNonMesure>Aucune prime mensuelle enregistrée : l&apos;histogramme reste vide.</CarteNonMesure>
  }
  return (
    <div style={{
      width: '100%', height: chartHeight,
      background: 'rgba(255,255,255,0.015)', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.03)',
      padding: '12px 8px 4px', position: 'relative', overflow: 'hidden',
    }}>
      {[0.25, 0.5, 0.75, 1].map((pct) => (
        <div key={pct} style={{
          position: 'absolute', left: 0, right: 0,
          bottom: 24 + (chartHeight - 32) * pct,
          height: 1, background: 'rgba(255,255,255,0.03)',
        }} />
      ))}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: chartHeight - 24, paddingBottom: 24 }}>
        {data.map((d, i) => {
          const barH = (Number(d.valeur) / maxVal) * (chartHeight - 40)
          return (
            <div key={d.label + i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: T.textSecondary }}>{fmtEur(d.valeur)}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: barH }}
                transition={{ duration: 0.6, delay: i * 0.06 }}
                style={{
                  width: '100%', maxWidth: 48, borderRadius: '6px 6px 0 0', minHeight: 4,
                  background: 'linear-gradient(180deg, rgba(139,92,246,0.8) 0%, rgba(91,77,245,0.4) 100%)',
                  boxShadow: '0 0 12px rgba(139,92,246,0.15)',
                }}
              />
              <span style={{ fontSize: 10, color: T.textMuted, textAlign: 'center', lineHeight: 1.2, fontWeight: 600 }}>{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Encadré « non mesuré » ─────────────────────────────────────────────────
function CarteNonMesure({ children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.10)',
      borderRadius: 10, padding: '14px 16px',
      fontSize: 12.5, color: T.textSecondary, lineHeight: 1.6,
    }}>
      {children}
    </div>
  )
}

// ─── Bandeau d'échec (une panne ne devient jamais un « 0 ») ─────────────────
function BoutonReessayer({ onClick, chargement }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={chargement}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 12px', borderRadius: 8, cursor: chargement ? 'default' : 'pointer',
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
        color: '#fff', fontSize: 12, fontWeight: 700,
      }}
    >
      <RefreshCw size={13} /> {chargement ? 'Chargement…' : 'Réessayer'}
    </button>
  )
}

// ─── Carte « section » : même habillage pour les panneaux ───────────────────
function Carte({ delay = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 16, padding: '18px 20px' }}
    >
      {children}
    </motion.div>
  )
}

// ─── Bloc chiffre « Devis » ─────────────────────────────────────────────────
function BlocChiffre({ label, valeur, couleur, rendu }) {
  const inconnu = valeur === null || valeur === undefined
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid ' + T.cardBorder, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: inconnu ? T.textMuted : couleur }}>
        {inconnu ? NON_MESURE : (rendu ? rendu(valeur) : fmtNum(valeur))}
      </div>
    </div>
  )
}

// ─── Écran ──────────────────────────────────────────────────────────────────
export default function Rapports() {
  const [stats, setStats] = useState(null)
  const [clients, setClients] = useState([])
  const [opportunites, setOpportunites] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [sourcesPartielles, setSourcesPartielles] = useState([])
  // Les opportunités ont-elles pu être LUES ? Un tableau vide renvoyé par l'API
  // est une mesure (« 0 opportunité ») ; une requête en échec, non (« — »).
  const [opportunitesLues, setOpportunitesLues] = useState(false)

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur(null)
    setSourcesPartielles([])

    // `allSettled` : une source qui tombe n'efface pas les deux autres, et son
    // échec est ANNONCÉ. Avant, chaque échec était remplacé par un tableau vide :
    // une panne s'affichait comme un portefeuille à zéro.
    const [statsR, clientsR, oppR] = await Promise.allSettled([
      api.get('/dashboard/stats'),
      api.get('/clients?limit=300'),
      api.get('/opportunites?limit=20'),
    ])

    const partielles = []
    if (statsR.status === 'fulfilled') {
      setStats(statsR.value?.data || null)
    } else {
      setStats(null)
      partielles.push('indicateurs du cabinet (/api/dashboard/stats)')
    }

    if (clientsR.status === 'fulfilled') {
      const brut = clientsR.value?.data
      setClients(Array.isArray(brut) ? brut : (brut?.data || []))
    } else {
      setClients([])
      partielles.push('liste des clients (/api/clients)')
    }

    if (oppR.status === 'fulfilled') {
      const brut = oppR.value?.data
      setOpportunites(Array.isArray(brut) ? brut : (brut?.opportunites || brut?.data || []))
      setOpportunitesLues(true)
    } else {
      setOpportunites([])
      setOpportunitesLues(false)
      partielles.push('opportunités (/api/opportunites)')
    }

    if (partielles.length === 3) {
      setErreur("Aucune donnée du cabinet n'a pu être chargée. Aucun chiffre n'est affiché à la place : réessayez.")
    } else {
      setSourcesPartielles(partielles)
    }
    setChargement(false)
  }, [])

  useEffect(() => { charger() }, [charger])

  // ── Valeurs mesurées (null = non mesuré, jamais 0 par défaut) ────────────
  const mesures = useMemo(() => {
    const clientsTotal = nombreOuNull(stats?.totalClients)
    const clientsActifs = nombreOuNull(stats?.clientsActifs)
    const contratsActifs = nombreOuNull(stats?.contratsActifs)
    const primesSuivies = nombreOuNull(stats?.primeTotale)
    const devisTotal = nombreOuNull(stats?.devisTotal)
    const devisSignes = nombreOuNull(stats?.devisSignes)
    const devisEnvoyes = nombreOuNull(stats?.devisEnAttente)
    const tachesEnRetard = nombreOuNull(stats?.tachesEnRetard)
    const opportunitesTotal = opportunitesLues
      ? opportunites.length
      : nombreOuNull(stats?.opportunites)
    const scoreRisqueMoyen = nombreOuNull(stats?.scoreRisqueMoyen)
    const commissionsMois = nombreOuNull(stats?.commissionsMois)
    const commissionsEnregistrees = nombreOuNull(stats?.commissionsMoisEnregistrees)

    // Taux de conversion devis = devis SIGNÉS / devis. Aucun devis ⇒ pas de
    // mesure : null, jamais 0 % (qui laisserait croire à un échec mesuré).
    const tauxConversion = (devisTotal && devisTotal > 0 && devisSignes !== null)
      ? Math.round((devisSignes / devisTotal) * 1000) / 10
      : null

    return {
      clientsTotal, clientsActifs, contratsActifs, primesSuivies,
      devisTotal, devisSignes, devisEnvoyes, tachesEnRetard,
      opportunitesTotal, scoreRisqueMoyen, tauxConversion,
      // Une commission n'est affichée que si la table en porte réellement une.
      commissionsMois: commissionsEnregistrees ? commissionsMois : null,
    }
  }, [stats, opportunites, opportunitesLues])

  // Répartition des clients par statut (mesurée, portée cabinet).
  const repartitionStatuts = useMemo(() => {
    const map = stats?.clientsParStatut || {}
    const entrees = Object.entries(map)
      .filter(([, n]) => Number(n) > 0)
      .map(([statut, n]) => ({ statut, count: Number(n) }))
      .sort((a, b) => b.count - a.count)
    const total = entrees.reduce((t, e) => t + e.count, 0)
    return { entrees, total }
  }, [stats])

  // Répartition des contrats actifs par produit (mesurée).
  const repartitionProduits = useMemo(() => {
    const lignes = Array.isArray(stats?.typesContrats) ? stats.typesContrats : []
    const totalPrimes = lignes.reduce((t, l) => t + (Number(l.total_primes) || 0), 0)
    return {
      lignes: lignes.map((l) => ({
        type: l.type || 'Type non renseigné',
        count: Number(l.count) || 0,
        prime: Number(l.total_primes) || 0,
        pct: totalPrimes > 0 ? Math.round(((Number(l.total_primes) || 0) / totalPrimes) * 100) : 0,
      })),
      totalPrimes,
    }
  }, [stats])

  // Primes des 6 derniers mois (mesurées) pour l'histogramme.
  const serieMensuelle = useMemo(() => {
    const lignes = Array.isArray(stats?.revenus6Mois) ? stats.revenus6Mois : []
    return lignes
      .filter((l) => l && (l.mois || l.revenue !== undefined))
      .map((l) => ({ label: String(l.mois || '').trim() || NON_MESURE, valeur: Number(l.revenue) || 0 }))
  }, [stats])

  // Clients au score de risque le plus élevé (lignes réelles, tri réel).
  const clientsARisque = useMemo(() => {
    return clients
      .map((c) => ({
        id: c.id,
        nom: c.company_name || `${c.nom || c.last_name || ''} ${c.prenom || c.first_name || ''}`.trim() || c.email || 'Client sans nom',
        statut: c.statut || c.status || null,
        score: nombreOuNull(c.score_risque ?? c.risk_score),
        prime: nombreOuNull(c.prime_totale ?? c.prime_annuelle_total),
        echeance: c.next_echeance || null,
        dernierContact: c.last_contact || null,
      }))
      .filter((c) => c.score !== null && c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [clients])

  const aDesMesures = Object.values(mesures).some((v) => v !== null && v !== undefined && v !== 0)
    || repartitionProduits.lignes.length > 0
    || clientsARisque.length > 0
    || serieMensuelle.length > 0

  return (
    <div style={{ minHeight: '100vh', color: T.text, position: 'relative', fontFamily: 'var(--c-font-body, Inter, system-ui, sans-serif)' }}>
      <div style={{ position: 'fixed', width: 700, height: 700, background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', top: -250, left: -200, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', width: 500, height: 500, background: 'radial-gradient(circle, rgba(91,77,245,0.04) 0%, transparent 70%)', bottom: -150, right: -150, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* ── EN-TÊTE ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <BarChart3 size={16} color={T.ark} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ark, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rapports</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 4px', color: T.text, letterSpacing: '-0.02em' }}>Rapports</h1>
          <p style={{ fontSize: 14, color: T.textMuted, margin: 0 }}>
            Indicateurs mesurés sur les données de votre cabinet. Une mesure absente s&apos;affiche « — ».
          </p>
        </div>

        {erreur && (
          <div style={{
            marginBottom: 20, padding: '12px 16px', borderRadius: 10,
            background: T.dangerBg, border: '1px solid ' + T.dangerBorder,
            color: '#FCA5A5', fontSize: 12.5, lineHeight: 1.5,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <AlertTriangle size={15} />
            <span style={{ flex: 1, minWidth: 220 }}>{erreur}</span>
            <BoutonReessayer onClick={charger} chargement={chargement} />
          </div>
        )}

        {!erreur && sourcesPartielles.length > 0 && (
          <div style={{
            marginBottom: 20, padding: '12px 16px', borderRadius: 10,
            background: T.warningBg, border: '1px solid ' + T.warningBorder,
            color: '#FCD34D', fontSize: 12.5, lineHeight: 1.5,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <AlertTriangle size={15} />
            <span style={{ flex: 1, minWidth: 220 }}>
              Source indisponible : {sourcesPartielles.join(', ')}. Les indicateurs concernés affichent « — » au lieu d&apos;un zéro.
            </span>
            <BoutonReessayer onClick={charger} chargement={chargement} />
          </div>
        )}

        {!erreur && (
          <>
            {/* ── KPI MESURÉS ── */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              <KpiCard icon={Users} title="Clients actifs" value={mesures.clientsActifs === null ? NON_MESURE : fmtNum(mesures.clientsActifs)} accent="#7C3AED" subtitle={mesures.clientsTotal === null ? 'total non mesuré' : `sur ${fmtNum(mesures.clientsTotal)} clients`} />
              <KpiCard icon={FileText} title="Contrats actifs" value={mesures.contratsActifs === null ? NON_MESURE : fmtNum(mesures.contratsActifs)} accent="#8B5CF6" subtitle="en cours" />
              <KpiCard icon={Euro} title="Primes suivies" value={mesures.primesSuivies === null ? NON_MESURE : fmtEur(mesures.primesSuivies)} accent="#22C55E" subtitle="contrats actifs" />
              <KpiCard icon={Target} title="Devis enregistrés" value={mesures.devisTotal === null ? NON_MESURE : fmtNum(mesures.devisTotal)} accent="#3B82F6" subtitle={mesures.devisEnvoyes === null ? 'envoyés non mesurés' : `${fmtNum(mesures.devisEnvoyes)} envoyés`} />
              <KpiCard icon={TrendingUp} title="Taux de conversion devis" value={mesures.tauxConversion === null ? NON_MESURE : mesures.tauxConversion.toFixed(1) + ' %'} accent="#F59E0B" subtitle="devis signés / devis" />
              <KpiCard icon={Clock} title="Tâches en retard" value={mesures.tachesEnRetard === null ? NON_MESURE : fmtNum(mesures.tachesEnRetard)} accent="#EF4444" subtitle="actions requises" />
              <KpiCard icon={Lightbulb} title="Opportunités" value={mesures.opportunitesTotal === null ? NON_MESURE : fmtNum(mesures.opportunitesTotal)} accent={T.ark} subtitle="détectées" />
              <KpiCard icon={Euro} title="Commissions du mois" value={mesures.commissionsMois === null ? NON_MESURE : fmtEur(mesures.commissionsMois)} accent="#06B6D4" subtitle={mesures.commissionsMois === null ? 'aucune enregistrée' : 'enregistrées'} />
            </div>

            {/* ── Répartition clients + primes mensuelles ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <Carte>
                <SectionHeader icon={Shield} title="Clients par statut" badge={repartitionStatuts.total ? fmtNum(repartitionStatuts.total) + ' clients' : 'non mesuré'} />
                {repartitionStatuts.entrees.length > 0 ? (
                  repartitionStatuts.entrees.map((e) => (
                    <HorizontalBar
                      key={e.statut}
                      label={e.statut}
                      count={fmtNum(e.count)}
                      pct={repartitionStatuts.total ? Math.round((e.count / repartitionStatuts.total) * 100) : 0}
                      couleur={T.ark}
                    />
                  ))
                ) : (
                  <CarteNonMesure>
                    Aucun client enregistré pour ce cabinet : il n&apos;y a aucune répartition à afficher.
                    Aucune répartition d&apos;exemple n&apos;est présentée.
                  </CarteNonMesure>
                )}
                {mesures.scoreRisqueMoyen !== null && (
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.textSecondary }}>
                    <Zap size={13} color={T.ark} />
                    Score de risque moyen mesuré : <strong style={{ color: T.text }}>{fmtNum(mesures.scoreRisqueMoyen)}/100</strong>
                  </div>
                )}
              </Carte>

              <Carte delay={0.1}>
                <SectionHeader icon={Activity} title="Primes des contrats actifs par mois" badge={serieMensuelle.length ? serieMensuelle.length + ' mois' : 'non mesuré'} />
                <BarChartMensuel data={serieMensuelle} height={200} />
              </Carte>
            </div>

            {/* ── Répartition produits + devis ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <Carte delay={0.15}>
                <SectionHeader icon={PieChart} title="Répartition des contrats actifs par produit" badge={repartitionProduits.lignes.length ? repartitionProduits.lignes.length + ' produits' : 'non mesuré'} />
                {repartitionProduits.lignes.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {repartitionProduits.lignes.map((p, i) => (
                      <div key={p.type + i} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                        borderBottom: i < repartitionProduits.lignes.length - 1 ? '1px solid ' + T.cardBorder : 'none',
                      }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: ['#8B5CF6', '#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'][i % 7],
                          flexShrink: 0,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.type}</div>
                          <div style={{ fontSize: 10, color: T.textMuted }}>{fmtNum(p.count)} contrat(s)</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{fmtEur(p.prime)}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: T.ark }}>{p.pct}% des primes</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <CarteNonMesure>
                    Aucun contrat actif enregistré : aucune répartition par produit ne peut être calculée.
                  </CarteNonMesure>
                )}
              </Carte>

              <Carte delay={0.2}>
                <SectionHeader icon={Target} title="Devis" badge={mesures.devisTotal === null ? 'non mesuré' : fmtNum(mesures.devisTotal) + ' devis'} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <BlocChiffre label="Devis enregistrés" valeur={mesures.devisTotal} couleur={T.accent} />
                  <BlocChiffre label="Devis envoyés" valeur={mesures.devisEnvoyes} couleur={T.warning} />
                  <BlocChiffre label="Devis signés" valeur={mesures.devisSignes} couleur={T.success} />
                  <BlocChiffre
                    label="Taux de conversion"
                    valeur={mesures.tauxConversion}
                    couleur={T.ark}
                    rendu={(v) => v.toFixed(1) + ' %'}
                  />
                </div>
                {mesures.devisTotal === null && (
                  <div style={{ marginTop: 14 }}>
                    <CarteNonMesure>
                      Les devis ne sont pas mesurables pour l&apos;instant : l&apos;indicateur n&apos;est pas remplacé par un chiffre, il reste « — ».
                    </CarteNonMesure>
                  </div>
                )}
              </Carte>
            </div>

            {/* ── Clients à risque + opportunités ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <Carte delay={0.25}>
                <SectionHeader icon={AlertTriangle} title="Clients au score de risque le plus élevé" badge={clientsARisque.length ? 'Top ' + clientsARisque.length : 'non mesuré'} />
                {clientsARisque.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {clientsARisque.map((c) => {
                      const couleur = c.score >= 80 ? T.danger : c.score >= 70 ? T.warning : '#F97316'
                      return (
                        <div key={c.id} style={{
                          background: 'rgba(239,68,68,0.03)',
                          border: '1px solid ' + T.dangerBorder,
                          borderLeft: '3px solid ' + couleur,
                          borderRadius: 10, padding: '12px 14px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nom}</span>
                              <span style={{ padding: '1px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: couleur + '18', color: couleur, flexShrink: 0 }}>
                                Score {fmtNum(c.score)}
                              </span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, flexShrink: 0 }}>
                              {c.prime === null ? NON_MESURE : fmtEur(c.prime)}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: T.textMuted }}>
                            {c.statut ? `Statut : ${c.statut}` : 'Statut non renseigné'}
                            {' · '}
                            {c.dernierContact ? `Dernier contact : ${libelleDate(c.dernierContact)}` : 'Dernier contact non renseigné'}
                            {' · '}
                            {c.echeance ? `Prochaine échéance : ${libelleDate(c.echeance)}` : 'Aucune échéance enregistrée'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <CarteNonMesure>
                    Aucun client ne porte de score de risque enregistré : aucune liste n&apos;est affichée.
                  </CarteNonMesure>
                )}
              </Carte>

              <Carte delay={0.3}>
                <SectionHeader icon={Lightbulb} title="Opportunités détectées" badge={opportunites.length ? opportunites.length + ' pistes' : 'non mesuré'} />
                {opportunites.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {opportunites.slice(0, 6).map((o, i) => {
                      const score = nombreOuNull(o.score)
                      return (
                        <div key={o.id ?? i} style={{
                          background: 'rgba(34,197,94,0.03)',
                          border: '1px solid ' + T.successBorder,
                          borderLeft: '3px solid ' + T.success,
                          borderRadius: 10, padding: '12px 14px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {o.client_name || o.client || 'Client non renseigné'}
                            </span>
                            {score !== null && <span style={{ fontSize: 12, fontWeight: 800, color: T.success, flexShrink: 0 }}>{fmtNum(score)}/100</span>}
                          </div>
                          <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.5 }}>
                            {o.product_target ? `Produit cible : ${o.product_target}` : 'Produit cible non renseigné'}
                            {o.product_current ? ` · actuel : ${o.product_current}` : ''}
                          </div>
                          <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 4 }}>
                            Montant estimé : non mesuré par COURTIA (aucun calcul réel ne remplace l&apos;estimation historique).
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <CarteNonMesure>
                    Aucune opportunité enregistrée pour ce cabinet : rien n&apos;est affiché.
                  </CarteNonMesure>
                )}
              </Carte>
            </div>

            {/* ── CE QUE L'ÉCRAN NE MESURE PAS (dit explicitement) ── */}
            <Carte delay={0.35}>
              <SectionHeader icon={Sparkles} title="Ce que COURTIA ne mesure pas encore" badge="aucune valeur d'exemple" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {[
                  ['Prévisions de commissions', "elles demandent une série de commissions réellement enregistrées ; l'écran Commissions les présente."],
                  ['Taux de résiliation et satisfaction client', "aucune mesure n'existe côté données : aucune valeur n'est affichée à la place."],
                  ['Analyse rédigée du mois', "ARK ne produit pas ici de commentaire non étayé : seuls les indicateurs mesurés ci-dessus sont affichés."],
                ].map(([titre, texte]) => (
                  <div key={titre} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <CheckCircle2 size={14} color={T.ark} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>{titre}</div>
                      <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>{texte}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Carte>

            {/* État vide honnête : cabinet réellement sans données mesurables */}
            {!chargement && !aDesMesures && (
              <div style={{ marginTop: 24 }}>
                <Carte>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Sparkles size={18} color={T.ark} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Aucune donnée à rapporter pour le moment</div>
                      <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>
                        Votre cabinet ne contient encore aucun client, contrat ou devis : cet écran ne peut donc rien mesurer.
                        Il se remplira dès la première donnée enregistrée.
                      </div>
                    </div>
                  </div>
                </Carte>
              </div>
            )}
          </>
        )}

        {/* ── SOURCES ── */}
        <div style={{ textAlign: 'center', paddingTop: 20 }}>
          <p style={{ fontSize: 11, color: T.textMuted, margin: 0 }}>
            Chiffres issus des données de votre cabinet (/api/dashboard/stats, /api/clients, /api/opportunites) ·
            mise à jour au chargement de la page · COURTIA
          </p>
        </div>

      </div>
    </div>
  )
}
