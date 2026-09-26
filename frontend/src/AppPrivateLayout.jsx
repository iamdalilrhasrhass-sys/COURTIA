import { Outlet, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import ArkBubbleV2 from './components/ark/ArkBubbleV2'
import Sidebar from './components/Sidebar'
import PaywallModal from './components/PaywallModal'
import ImpersonationBanner from './components/ImpersonationBanner'
import CommandPalette from './components/ui/CommandPalette'
import { AuroraBackground } from './components/aurora/Aurora3D'
// Mode demonstration : l'application y est montee sous /demo, les navigations programmees
// doivent donc rester dans la demonstration (sinon le visiteur tombe sur le mur de connexion).
import { estModeDemo } from './demo/modeDemo'
import AuroraMobileTopbar from './components/aurora/AuroraMobileTopbar'
import AuroraBottomNav from './components/aurora/AuroraBottomNav'
// Règle de viewport mobile de l'application : le hook partagé utilisé par
// AuroraMobileLayout/AuroraTableMobile (« max-width: 768px »). Aucune nouvelle
// détection n'est introduite ici.
import { useMediaQuery } from './components/aurora/AuroraMobileLayout'
import { Particles, ScrollGlow } from './components/vibe/VibePage'
import ArkNeuralPulse from './components/widgets/ArkNeuralPulse'
import { usePlanStore } from './stores/planStore'
import { onPaywallTriggered } from './api'
import api from './api'
import TrialExpiredModal from './components/TrialExpiredModal'
import { decisionEssai } from './lib/essaiUi'

export default function AppPrivateLayout() {
  const navigate = useNavigate()
  const fetchPlanInfo = usePlanStore(s => s.fetchPlanInfo)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [paywallError, setPaywallError] = useState(null)
  // Statut d'essai : il vient du SERVEUR (/api/billing/status → trial_state).
  // Le bandeau et la modale de fin d'essai ne dépendent jamais d'une date
  // calculée par le navigateur.
  const [billingStatut, setBillingStatut] = useState(null)
  const [paywallEssaiMasque, setPaywallEssaiMasque] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Mot de passe temporaire : le cabinet se connecte avec le mot de passe
  // initial remis par COURTIARK (must_change_password, renvoyé par /api/auth/me).
  // On l'invite à en choisir un — sans jamais l'y obliger : aucune route n'est
  // bridée tant qu'il utilise le mot de passe initial.
  const [motDePasseTemporaire, setMotDePasseTemporaire] = useState(false)

  useEffect(() => { fetchPlanInfo() }, [fetchPlanInfo])
  useEffect(() => { return onPaywallTriggered(err => setPaywallError(err)) }, [])

  useEffect(() => {
    let annule = false
    api.get('/billing/status')
      .then((r) => { if (!annule) setBillingStatut(r.data?.status || null) })
      .catch(() => { if (!annule) setBillingStatut(null) })
    return () => { annule = true }
  }, [])

  useEffect(() => {
    let annule = false
    api.get('/auth/me')
      .then((r) => { if (!annule) setMotDePasseTemporaire(r.data?.must_change_password === true) })
      .catch(() => { /* indicateur informatif : jamais bloquant */ })
    return () => { annule = true }
  }, [])

  // Une route métier refusée en 402 « trial_expired » ouvre la même modale que
  // le statut : un seul discours, quelle que soit la porte d'entrée.
  useEffect(() => {
    return onPaywallTriggered((err) => {
      if (err?.error === 'trial_expired') {
        setBillingStatut((prec) => ({ ...(prec || {}), trial_state: 'TRIAL_EXPIRED', trial_end_at: err.trial_end_at || null }))
        setPaywallEssaiMasque(false)
      }
    })
  }, [])

  const essai = decisionEssai(billingStatut)

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === 'k') {
      e.preventDefault()
      setCmdOpen(prev => !prev)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <AuroraBackground>
      <Particles count={50} />
      <ScrollGlow />
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      
      {/* Aurora Mobile Components — UNIQUEMENT sur mobile.
          La barre était montée sans condition : sur desktop, on voyait donc en
          permanence un second logo COURTIARK, un hamburger et une cloche rognée
          au-dessus du cockpit (relevé en production le 21/09/2026). La condition
          est la règle de viewport du produit (« max-width: 768px »), la même que
          celle qui masque déjà la barre de navigation basse et retire le
          rembourrage `md:` du contenu. */}
      {isMobile && (
        <>
          <AuroraMobileTopbar onMenuClick={() => setMobileMenuOpen(true)} />
          <AuroraBottomNav />
        </>
      )}

      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      
      <main className="flex-1 ml-0 md:ml-[240px] pt-[60px] md:pt-0 pb-[80px] md:pb-0 aurora-mobile-content-wrapper" style={{ background: '#050510', minHeight: '100vh' }}>
        <ImpersonationBanner />

        {essai.bandeau && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            flexWrap: 'wrap', padding: '9px 18px',
            background: essai.bandeau.urgence ? 'rgba(245,158,11,0.12)' : 'rgba(91,77,245,0.12)',
            borderBottom: '1px solid ' + (essai.bandeau.urgence ? 'rgba(245,158,11,0.3)' : 'rgba(91,77,245,0.28)'),
          }}>
            <span style={{ fontSize: 12.5, color: essai.bandeau.urgence ? '#FCD34D' : '#C4B5FD', fontWeight: 600 }}>
              {essai.bandeau.titre} — {essai.bandeau.texte}
            </span>
            <button
              onClick={() => navigate(estModeDemo() ? '/demo/billing' : '/billing')}
              style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff' }}
            >
              Voir les offres
            </button>
          </div>
        )}

        {motDePasseTemporaire && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            flexWrap: 'wrap', padding: '9px 18px',
            background: 'rgba(124,58,237,0.14)', borderBottom: '1px solid rgba(124,58,237,0.32)',
          }}>
            <span style={{ fontSize: 12.5, color: '#DDD6FE', fontWeight: 600 }}>
              Mot de passe temporaire — choisissez votre mot de passe personnel dans Paramètres &gt; Sécurité.
            </span>
            <button
              onClick={() => navigate(estModeDemo() ? '/demo/parametres' : '/parametres')}
              style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff' }}
            >
              Modifier mon mot de passe
            </button>
          </div>
        )}

        {essai.etat === 'TRIAL_EXPIRED' && !essai.paywall && (
          <div style={{ padding: '9px 18px', background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.3)', fontSize: 12.5, color: '#FCA5A5', fontWeight: 600 }}>
            Essai terminé — lecture seule. Vos données sont conservées ; choisissez un abonnement pour reprendre les modifications.
          </div>
        )}

        <Outlet />
      </main>
      <TrialExpiredModal
        paywall={essai.paywall && !paywallEssaiMasque ? essai.paywall : null}
        onClose={() => setPaywallEssaiMasque(true)}
      />
      <PaywallModal
        open={!!paywallError}
        error={paywallError}
        onClose={() => setPaywallError(null)}
        onUpgrade={(plan) => navigate(estModeDemo() ? `/demo/billing?plan=${plan}` : `/billing?plan=${plan}`)}
      />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* ARK Assistant — composant RÉEL du produit (components/ark/ArkBubbleV2).
          Il existait mais n'était monté nulle part : l'API /api/ark/chat était
          donc inatteignable depuis le cockpit. Monté ici, dans le layout privé,
          c'est-à-dire au bon endroit produit. */}
      <ArkBubbleV2 />

      {/* ARK Neural Pulse — indicateur signature */}
      <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 200, opacity: 0.55, pointerEvents: 'none' }}>
        <ArkNeuralPulse isThinking={false} confidence={78} label="ARK actif" width={200} height={80} />
      </div>

      <button
        onClick={() => setCmdOpen(true)}
        title="Ouvrir la palette (⌘K)"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px',
          background: '#080808', color: 'white',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, cursor: 'pointer',
          fontSize: 12, fontWeight: 600,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
        onMouseLeave={e => e.currentTarget.style.background = '#080808'}
      >
        <span style={{ fontSize: 13 }}>⌘K</span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Recherche</span>
      </button>
    </div>
    </AuroraBackground>
  )
}
