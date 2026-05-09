import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Archive,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  HelpCircle,
  Lock,
  Map,
  Scale,
  ShieldCheck,
  Sparkles,
  Server,
  UserCheck,
} from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import { applySeo } from '../lib/seo'

const processors = ['Vercel', 'Render', 'Stripe', 'Resend', 'Anthropic', 'Google', 'Microsoft', 'Meta WhatsApp', 'Yousign', 'Cloudflare R2']

function TrustHero({ eyebrow, title, description, icon: Icon = ShieldCheck, canonicalPath }) {
  useEffect(() => {
    applySeo({
      title: `${title} — COURTIA`,
      description,
      canonicalPath,
    })
  }, [canonicalPath, description, title])

  return (
    <section className="mk-section">
      <span className="mk-eyebrow"><Icon size={13} /> {eyebrow}</span>
      <h1 className="mk-section-title">{title}</h1>
      <p className="mk-section-sub">{description}</p>
    </section>
  )
}

function InfoGrid({ items }) {
  return (
    <div className="mk-grid">
      {items.map((item) => {
        const Icon = item.icon || CheckCircle2
        return (
          <article className="mk-card" key={item.title}>
            <Icon size={18} color="#8eeaff" />
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        )
      })}
    </div>
  )
}

function TrustCallout({ children, to = '/contact', label = 'Contacter COURTIA' }) {
  return (
    <section className="mk-section">
      <div className="mk-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <p className="mk-section-sub" style={{ margin: 0 }}>{children}</p>
        <Link to={to} className="mk-button primary">{label} <ArrowRight size={14} /></Link>
      </div>
    </section>
  )
}

export function SecurityPublic() {
  return (
    <MarketingShell activePath="/securite">
      <TrustHero
        eyebrow="Sécurité"
        title="Une base sécurité lisible pour cabinets exigeants"
        description="COURTIA protège les données métier avec une architecture cloisonnée, des accès contrôlés, des logs maîtrisés et des intégrations activées uniquement par action explicite."
        canonicalPath="/securite"
        icon={ShieldCheck}
      />
      <InfoGrid items={[
        { icon: Lock, title: 'Accès protégés', text: 'Authentification JWT, routes admin protégées côté backend, rôles API et refus propre des comptes non autorisés.' },
        { icon: Database, title: 'Données maîtrisées', text: 'Les tokens OAuth et secrets restent côté serveur. Les données sensibles ne sont jamais exposées dans le front.' },
        { icon: Server, title: 'Hébergement & services', text: 'Infrastructure Vercel / Render, backups et exploitation documentée dans les runbooks production.' },
        { icon: Activity, title: 'Observabilité', text: 'Sentry, logs structurés et redaction PII pour diagnostiquer sans divulguer de données inutiles.' },
        { icon: UserCheck, title: 'Responsabilité humaine', text: 'ARK assiste le courtier, mais ne remplace jamais la décision professionnelle ni le devoir de conseil.' },
        { icon: Archive, title: 'Traçabilité', text: 'Audit log, documents DDA, statuts et historique d’actions pour garder une trace exploitable.' },
      ]} />
      <section className="mk-section">
        <h2 className="mk-section-title">Sous-traitants techniques</h2>
        <p className="mk-section-sub">Les services suivants peuvent intervenir selon les modules activés par le cabinet.</p>
        <div className="mk-chip-row">
          {processors.map((name) => <span className="mk-chip" key={name}>{name}</span>)}
        </div>
      </section>
      <TrustCallout label="Parler sécurité">
        Besoin d’un point sécurité avant démo ou contractualisation ? COURTIA fournit une lecture claire des traitements, intégrations et responsabilités.
      </TrustCallout>
    </MarketingShell>
  )
}

export function RgpdPublic() {
  return (
    <MarketingShell activePath="/rgpd">
      <TrustHero
        eyebrow="RGPD"
        title="RGPD, DPA et droits utilisateurs"
        description="COURTIA documente les données collectées, leurs finalités, les sous-traitants, les durées de conservation et les droits applicables aux cabinets utilisateurs."
        canonicalPath="/rgpd"
        icon={Scale}
      />
      <InfoGrid items={[
        { icon: FileText, title: 'Finalités explicites', text: 'Gestion client, contrats, tâches, documents DDA, intégrations choisies, assistance ARK et support.' },
        { icon: Lock, title: 'Collecte minimale', text: 'Pas d’aspiration massive d’emails ou d’agenda sans consentement et configuration explicite du cabinet.' },
        { icon: Archive, title: 'Export & suppression', text: 'Les exports RGPD et demandes de suppression sont traités selon le rôle et le périmètre cabinet.' },
        { icon: UserCheck, title: 'Droits des personnes', text: 'Accès, rectification, opposition, limitation, portabilité et suppression selon les cas applicables.' },
        { icon: Sparkles, title: 'IA encadrée', text: 'ARK produit des recommandations indicatives et actionnables, toujours soumises à validation humaine.' },
        { icon: Database, title: 'DPA', text: 'Le DPA COURTIA est prévu dans le parcours conformité et disponible sur demande pendant la bêta.' },
      ]} />
      <section className="mk-section">
        <div className="mk-table-wrap">
          <table className="mk-table">
            <thead>
              <tr><th>Donnée</th><th>Utilisation</th><th>Activation</th></tr>
            </thead>
            <tbody>
              <tr><td>Clients / contrats / tâches</td><td>Pilotage du portefeuille</td><td>Compte cabinet</td></tr>
              <tr><td>Google Agenda</td><td>Préparation RDV et Morning Brief</td><td>OAuth explicite</td></tr>
              <tr><td>Gmail / Outlook</td><td>Historique et relances email</td><td>OAuth explicite</td></tr>
              <tr><td>WhatsApp Business</td><td>Conversations et relances</td><td>Configuration Meta</td></tr>
              <tr><td>Documents DDA</td><td>Traçabilité conseil</td><td>Génération utilisateur</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <TrustCallout to="/legal/confidentialite" label="Lire la confidentialité">
        La politique de confidentialité publique détaille les traitements principaux et les canaux de contact.
      </TrustCallout>
    </MarketingShell>
  )
}

export function ChangelogPublic() {
  const releases = [
    { version: 'V1 Launch', date: 'Mai 2026', items: ['Fondations sécurité et feature flags', 'Onboarding cabinet', 'Billing Stripe prêt', 'Google/Gmail/Calendar prêts', 'Documents DDA', 'Yousign', 'Commissions', 'WhatsApp Business', 'ARK V1 proactif', 'Notifications et Cmd+K'] },
    { version: 'Closeout', date: 'Mai 2026', items: ['Landing Aurora restaurée', 'Smoke prod vert', 'Vidéos et docs marketing', 'Growth playbook', 'Routes import et intégrations prêtes'] },
  ]
  return (
    <MarketingShell activePath="/changelog">
      <TrustHero
        eyebrow="Changelog"
        title="Ce qui a été livré dans COURTIA"
        description="Un historique lisible des grandes briques produit, sécurité et métier courtier livrées dans la V1."
        canonicalPath="/changelog"
        icon={BookOpen}
      />
      <section className="mk-section">
        <div className="mk-grid">
          {releases.map((release) => (
            <article className="mk-card" key={release.version}>
              <span className="mk-chip">{release.date}</span>
              <h3>{release.version}</h3>
              <ul className="mk-plain-list">
                {release.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </MarketingShell>
  )
}

export function RoadmapPublic() {
  const lanes = [
    { title: 'Now', text: 'Stabiliser la V1, smoke prod, retours bêta, activation progressive des cabinets pilotes.' },
    { title: 'Next', text: 'Approfondir ARK, automatiser imports, enrichir DDA, finaliser vérifications OAuth/Meta.' },
    { title: 'Later', text: 'Premium multi-cabinet, webhooks Make/Zapier, reporting avancé, intégrations téléphonie.' },
  ]
  return (
    <MarketingShell activePath="/roadmap">
      <TrustHero
        eyebrow="Roadmap"
        title="Une trajectoire produit claire, sans promesses magiques"
        description="COURTIA avance par briques métier utiles : cockpit, conformité, intégrations, ARK actionnable et pilotage cabinet."
        canonicalPath="/roadmap"
        icon={Map}
      />
      <InfoGrid items={lanes.map((lane) => ({ icon: Sparkles, title: lane.title, text: lane.text }))} />
      <TrustCallout label="Rejoindre la bêta">
        Les cabinets bêta peuvent contribuer à prioriser les prochaines intégrations et workflows métier.
      </TrustCallout>
    </MarketingShell>
  )
}

export function HelpPublic() {
  return (
    <MarketingShell activePath="/aide">
      <TrustHero
        eyebrow="Aide"
        title="Centre d’aide COURTIA"
        description="Les réponses essentielles pour comprendre le cockpit, l’onboarding, les intégrations et les responsabilités métier."
        canonicalPath="/aide"
        icon={HelpCircle}
      />
      <InfoGrid items={[
        { icon: BookOpen, title: 'Démarrer', text: 'Créez votre compte, renseignez le cabinet, importez vos clients puis ouvrez votre premier Morning Brief.' },
        { icon: Sparkles, title: 'ARK', text: 'ARK priorise les actions mais ne décide pas seul. Le courtier valide chaque recommandation.' },
        { icon: Lock, title: 'Intégrations', text: 'Google, Gmail, WhatsApp et Yousign restent en “configuration requise” tant que les secrets ne sont pas actifs.' },
        { icon: FileText, title: 'Documents', text: 'COURTIA aide à structurer FIC, mandat et devoir de conseil. Les contenus doivent être vérifiés par le cabinet.' },
        { icon: Activity, title: 'Smoke & incidents', text: 'Le runbook production décrit les contrôles health, auth, admin et double préfixe API.' },
        { icon: Scale, title: 'RGPD', text: 'Les demandes RGPD passent par le contact indiqué et sont traitées selon le périmètre cabinet.' },
      ]} />
      <TrustCallout label="Demander de l’aide">
        Une question avant votre démo ? Nous pouvons préparer un parcours adapté à votre cabinet.
      </TrustCallout>
    </MarketingShell>
  )
}

export function StatusPublic() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || 'https://api.courtiark.fr/api'
    fetch(`${base.replace(/\/$/, '')}/status`, { headers: { Accept: 'application/json' } })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setStatus(data))
      .catch(() => setStatus(null))
  }, [])

  const integrations = status?.integrations || {}
  const serviceCards = [
    { title: 'Frontend', value: status ? 'ready' : 'monitoring', icon: CheckCircle2 },
    { title: 'API', value: status?.api || status?.status || 'monitoring', icon: Server },
    { title: 'DB', value: status?.database || 'monitoring', icon: Database },
    { title: 'Email', value: integrations.email_transactional || 'configuration_required', icon: FileText },
    { title: 'SMS', value: integrations.sms || 'configuration_required', icon: Activity },
    { title: 'Intégrations', value: Object.values(integrations).some((v) => v === 'configuration_required') ? 'configuration_required' : 'configured', icon: Lock },
  ]

  return (
    <MarketingShell activePath="/status">
      <TrustHero
        eyebrow="Status"
        title="Statut des services COURTIA"
        description="Vue publique indicative des briques principales. Les incidents détaillés sont traités via le runbook interne et les alertes d’infrastructure."
        canonicalPath="/status"
        icon={Activity}
      />
      <InfoGrid items={[
        ...serviceCards.map((card) => ({
          icon: card.icon,
          title: card.title,
          text: card.value === 'configured' || card.value === 'ready' || card.value === 'connected'
            ? 'Opérationnel.'
            : card.value === 'configuration_required'
              ? 'Configuration requise pour activer ce module.'
              : 'Surveillance en cours.',
        })),
      ]} />
      {status?.maintenance?.active && (
        <section className="mk-section">
          <div className="mk-card">
            <h3>Maintenance</h3>
            <p>{status.maintenance.message || 'Une maintenance est en cours.'}</p>
          </div>
        </section>
      )}
      <section className="mk-section">
        <div className="mk-card">
          <h3>Contrôles recommandés</h3>
          <p>Vérifiez `/api/health`, `/api/status`, login courtier, login Dalil, `/admin`, `/admin/costs`, logout et absence de double préfixe API après chaque déploiement.</p>
        </div>
      </section>
    </MarketingShell>
  )
}
