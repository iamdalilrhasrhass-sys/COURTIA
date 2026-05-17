import { useEffect } from 'react'
import { ArrowRight, PlayCircle, Users, CalendarClock, BarChart3, Bot, TrendingUp, Building2, Sun, FileCheck, Zap, Eye, MessageSquare } from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import DemoRequestForm from '../components/marketing/DemoRequestForm'
import { applySeo } from '../lib/seo'

const TOUR = [
  { icon: Sun, title: 'Morning Brief', text: 'ARK analyse votre portefeuille et priorise vos actions du jour : relances, échéances, opportunités.' },
  { icon: Users, title: 'Clients & Contrats', text: 'Fiches client 360° enrichies par l\'IA, contrats suivis en temps réel, relances automatisées.' },
  { icon: Bot, title: 'IA & ARK', text: 'Assistant métier intégré : scoring, recommandations, cross-sell, transcriptions, veille marché.' },
  { icon: TrendingUp, title: 'Business', text: 'Pilotage de l\'activité : commissions, campagnes SMS/email, parrainage, module fiscal.' },
  { icon: Building2, title: 'Cabinet', text: 'Gestion d\'équipe, portail client, white-label réseau, API, abonnement, paramétrage.' },
]

const WHATS_THERE = [
  'Dashboard cockpit avec Morning Brief',
  'Gestion clients, contrats, relances',
  'Devis & comparateur',
  'Coffre documentaire',
  'Agenda & tâches',
  'ARK Coach métier (scoring, cross-sell)',
  'Bordereau de commissions',
  'Wallet Tokens (crédits IA)',
]

const IN_PROGRESS = [
  'ARK Voice (appels sortants)',
  'Renewal Machine (rétention automatique)',
  'Campagnes SMS & Email',
  'Portail Client',
  'White-label Réseau',
  'API publique & Webhooks',
]

export default function DemoPublic() {
  useEffect(() => {
    applySeo({
      title: 'Démo COURTIA — Le cockpit IA des courtiers',
      description: 'Découvrez COURTIA en conditions réelles : Morning Brief, gestion clients, ARK assistant IA, pilotage business.',
      canonicalPath: '/demo',
    })
  }, [])

  return (
    <MarketingShell activePath="/demo">
      {/* HERO */}
      <section className="mk-section" style={{ textAlign: 'center', paddingTop: 40 }}>
        <span className="mk-eyebrow"><PlayCircle size={12} /> Démo COURTIA</span>
        <h1 className="mk-section-title" style={{ fontSize: 'clamp(32px,5vw,48px)', lineHeight: 1.15 }}>
          Découvrez COURTIA<br />en conditions réelles
        </h1>
        <p className="mk-section-sub" style={{ maxWidth: 640, margin: '16px auto 0' }}>
          Pas une visite gadget. Un vrai parcours courtier : Morning Brief, clients, contrats, ARK, business, cabinet. 
          Voyez exactement ce que COURTIA sait faire aujourd'hui.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
          <a href="/register" className="mk-button primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Créer un compte <ArrowRight size={14} />
          </a>
          <a href="/tarifs" className="mk-button secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Voir les tarifs <ArrowRight size={14} />
          </a>
        </div>
      </section>

      {/* PARCOURS DE DÉMO */}
      <section className="mk-section">
        <h2 className="mk-section-title" style={{ textAlign: 'center', marginBottom: 8 }}>Le parcours de démo</h2>
        <p className="mk-section-sub" style={{ textAlign: 'center', marginBottom: 32, maxWidth: 560, margin: '0 auto 32px' }}>
          Ce que vous verrez pendant la démo — chaque section correspond à un vrai module de COURTIA
        </p>
        <div className="mk-grid">
          {TOUR.map((step, i) => (
            <article key={i} className="mk-card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <step.icon size={20} color="#8B5CF6" />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#8B5CF6', textTransform: 'uppercase' }}>Étape {i+1}</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6, margin: 0 }}>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* DISPONIBLE VS EN COURS */}
      <section className="mk-section">
        <div className="mk-split">
          <div className="mk-card">
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#10B981', marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileCheck size={20} /> Disponible aujourd'hui
            </h3>
            <ul style={{ padding: 0, listStyle: 'none', margin: 0 }}>
              {WHATS_THERE.map((item, i) => (
                <li key={i} style={{ padding: '6px 0', fontSize: 14, color: '#D1D5DB', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>✓ {item}</li>
              ))}
            </ul>
          </div>
          <div className="mk-card">
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#8B5CF6', marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={20} /> En cours de connexion
            </h3>
            <ul style={{ padding: 0, listStyle: 'none', margin: 0 }}>
              {IN_PROGRESS.map((item, i) => (
                <li key={i} style={{ padding: '6px 0', fontSize: 14, color: '#9CA3AF', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>→ {item}</li>
              ))}
            </ul>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 12, marginBottom: 0 }}>
              Ces modules sont en finale de développement. Disponibles par vagues progressives.
            </p>
          </div>
        </div>
      </section>

      {/* POUR QUI */}
      <section className="mk-section">
        <h2 className="mk-section-title" style={{ textAlign: 'center', marginBottom: 8 }}>Conçu pour les courtiers</h2>
        <p className="mk-section-sub" style={{ textAlign: 'center', margin: '0 auto 32px', maxWidth: 560 }}>
          COURTIA s'adapte à toutes les structures de courtage
        </p>
        <div className="mk-grid">
          <div className="mk-card">
            <Eye size={20} color="#8B5CF6" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Courtier indépendant</h3>
            <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6, margin: 0 }}>Pilotez votre cabinet seul avec ARK comme assistant. Tout dans un seul cockpit.</p>
          </div>
          <div className="mk-card">
            <Users size={20} color="#8B5CF6" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Cabinet multi-courtiers</h3>
            <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6, margin: 0 }}>Gérez votre équipe, attribuez les portefeuilles, suivez la performance collective.</p>
          </div>
          <div className="mk-card">
            <Building2 size={20} color="#8B5CF6" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Réseau de cabinets</h3>
            <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.6, margin: 0 }}>Déployez COURTIA en marque blanche, centralisez le reporting, pilotez votre réseau.</p>
          </div>
        </div>
      </section>

      {/* DEMO REQUEST */}
      <section className="mk-section">
        <div className="mk-split">
          <div className="mk-card">
            <h2 className="mk-section-title" style={{ marginTop: 0 }}>Réserver ma démo</h2>
            <p className="mk-section-sub">
              Indiquez votre contexte cabinet. Nous adaptons la démo à vos priorités commerciales.
            </p>
            <div style={{ marginTop: 14 }}><DemoRequestForm /></div>
          </div>
          <div className="mk-card">
            <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Après la démo, vous repartez avec</h3>
            <ul style={{ padding: 0, listStyle: 'none', margin: 0 }}>
              {[
                'Checklist d\'implémentation cabinet (Semaine 1 à 3)',
                'Recommandation de plan (Starter / Pro / Cabinet)',
                'Priorités ARK adaptées à votre portefeuille',
                'Plan d\'onboarding et de migration des données',
              ].map((item, i) => (
                <li key={i} style={{ padding: '8px 0', fontSize: 14, color: '#D1D5DB', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: '#10B981', flexShrink: 0 }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 16, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={14} /> Aucun engagement. Démo gratuite, 30 minutes.
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
