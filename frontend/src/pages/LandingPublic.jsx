import React, { useState } from 'react'

function Icon({ name, size = 18, ...props }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    ...props,
  }

  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    calendar: <><path d="M7 3v3" /><path d="M17 3v3" /><path d="M4 8h16" /><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 13h3" /><path d="M13 13h3" /><path d="M8 17h3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clipboard: <><path d="M9 4h6l1 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l1-2Z" /><path d="m8 14 2 2 5-5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /><path d="M8 13h8" /><path d="M8 17h5" /></>,
    folder: <><path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M8 13h8" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>,
    message: <><path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" /><path d="M8 10h8" /><path d="M8 14h5" /></>,
    radar: <><circle cx="12" cy="12" r="9" /><path d="M12 12 18 8" /><path d="M7 12a5 5 0 0 1 5-5" /><path d="M9 15a4 4 0 0 0 6-1" /></>,
    shield: <><path d="M12 3 20 7v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7Z" /><path d="m8.5 12 2.2 2.2L16 9" /></>,
    spark: <><path d="M12 2 14 9l7 3-7 3-2 7-2-7-7-3 7-3Z" /><path d="M19 3v4" /><path d="M21 5h-4" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v3" /><path d="M21 12h-3" /><path d="M12 21v-3" /><path d="M3 12h3" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  }

  return <svg {...common}>{paths[name] || paths.spark}</svg>
}

const makeIcon = (name) => function CourtiaIcon(props) { return <Icon name={name} {...props} /> }

const ArrowRight = makeIcon('arrow')
const CalendarDays = makeIcon('calendar')
const Check = makeIcon('check')
const ChevronRight = makeIcon('chevron')
const ClipboardCheck = makeIcon('clipboard')
const Clock3 = makeIcon('clock')
const FileText = makeIcon('file')
const FolderKanban = makeIcon('folder')
const Mail = makeIcon('mail')
const MessageSquareText = makeIcon('message')
const Radar = makeIcon('radar')
const ShieldCheck = makeIcon('shield')
const Sparkles = makeIcon('spark')
const Target = makeIcon('target')
const Users = makeIcon('users')

const modules = [
  { name: 'Clients', detail: 'Historique complet', status: '3 actions', icon: Users, color: '#8fe7ff', x: '6%', y: '17%', z: 64 },
  { name: 'Contrats', detail: 'Échéance J-30', status: 'alerte', icon: ShieldCheck, color: '#a986ff', x: '68%', y: '12%', z: 74 },
  { name: 'Relances', detail: 'Client non relancé', status: 'priorité', icon: Target, color: '#ff65bb', x: '77%', y: '43%', z: 96 },
  { name: 'Agenda', detail: 'RDV à préparer', status: '10:30', icon: CalendarDays, color: '#8dffcf', x: '58%', y: '72%', z: 58 },
  { name: 'Documents', detail: 'Pièce manquante', status: 'à classer', icon: FileText, color: '#ff9a55', x: '12%', y: '70%', z: 78 },
  { name: 'DDA', detail: 'Compte rendu prêt', status: 'export', icon: ClipboardCheck, color: '#d8f4ff', x: '-1%', y: '45%', z: 84 },
  { name: 'Emails', detail: 'Résumé prêt', status: '2 signaux', icon: Mail, color: '#b9a4ff', x: '35%', y: '1%', z: 44 },
  { name: 'ARK', detail: 'Priorités du jour', status: 'live', icon: Sparkles, color: '#f8a8d8', x: '36%', y: '82%', z: 112 },
]

const productCards = [
  {
    title: 'Fiche client augmentée',
    text: 'Historique, contrats, échanges, documents et prochaines actions au même endroit.',
    metric: '360°',
    icon: Users,
    rows: ['Client actif', '2 contrats', 'Prochaine action J+1'],
  },
  {
    title: 'Relances intelligentes',
    text: 'ARK repère les dossiers à relancer et aide à structurer la séquence.',
    metric: 'J+3',
    icon: Target,
    rows: ['Relance devis', 'Priorité haute', 'Message préparé'],
  },
  {
    title: 'Contrats suivis',
    text: 'Échéances, renouvellements, opportunités et alertes portefeuille.',
    metric: 'J-30',
    icon: ShieldCheck,
    rows: ['Échéance proche', 'Renouvellement', 'Opportunité détectée'],
  },
  {
    title: 'Documents classés',
    text: 'Les pièces reçues sont résumées, reliées au bon client et prêtes à exploiter.',
    metric: 'OK',
    icon: FolderKanban,
    rows: ['RI reçu', 'Justificatif classé', 'Dossier incomplet'],
  },
  {
    title: 'DDA structurée',
    text: 'Compte rendu clair, daté, exportable et exploitable.',
    metric: 'DDA',
    icon: ClipboardCheck,
    rows: ['Besoin identifié', 'Conseil tracé', 'Export prêt'],
  },
  {
    title: 'Agenda opérationnel',
    text: 'Les rendez-vous deviennent des actions concrètes à suivre.',
    metric: '10:30',
    icon: CalendarDays,
    rows: ['RDV client', 'Brief prêt', 'Documents à vérifier'],
  },
]

const morningBrief = [
  { value: '4', label: 'clients à relancer', tone: 'cyan' },
  { value: '2', label: 'contrats proches échéance', tone: 'violet' },
  { value: '1', label: 'dossier incomplet', tone: 'orange' },
  { value: '3', label: 'opportunités à traiter', tone: 'pink' },
  { value: '1', label: 'rendez-vous à préparer', tone: 'green' },
]

const audiences = [
  ['Courtier indépendant', 'Retrouver vite les informations importantes et relancer sans dépendre uniquement de la mémoire.'],
  ['Petit cabinet en croissance', 'Installer une discipline de suivi sans complexifier le quotidien de l’équipe.'],
  ['Cabinet avec assistante', 'Partager les priorités, les dossiers incomplets et les relances dans une même vue.'],
  ['Cabinet avec commerciaux', 'Rendre le portefeuille lisible, suivre les actions et mieux préparer les rendez-vous.'],
  ['Structure organisée', 'Standardiser les workflows DDA, documents, relances et pilotage commercial.'],
]

const pricing = [
  {
    name: 'Starter',
    price: '89 €',
    suffix: 'HT/mois',
    intro: 'Pour structurer les premiers suivis.',
    intent: 'Utile pour démarrer, volontairement limité.',
    features: ['Fiches clients essentielles', 'Suivi relances simple', 'Documents et notes', 'Morning brief léger'],
  },
  {
    name: 'Pro',
    price: '199 €',
    suffix: 'HT/mois',
    intro: 'Pour piloter réellement le cabinet avec ARK.',
    intent: 'L’offre logique pour un cabinet qui veut reprendre le contrôle.',
    featured: true,
    features: ['Cockpit opérationnel complet', 'ARK priorités et relances', 'DDA structurée', 'Documents, emails et agenda', 'Pilotage portefeuille'],
  },
  {
    name: 'Premium',
    price: 'Sur devis',
    suffix: 'cabinet structuré',
    intro: 'Pour multi-utilisateurs, besoins avancés et accompagnement.',
    intent: 'Cadrage, migration, workflows et accompagnement renforcé.',
    features: ['Multi-utilisateurs', 'Workflows avancés', 'Accompagnement migration', 'Support prioritaire', 'Paramétrage cabinet'],
  },
]

function BubbleMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 600 600" aria-hidden="true">
      <defs>
        <filter id="courtiaLandingBlur"><feGaussianBlur stdDeviation="6" /></filter>
        <filter id="courtiaLandingSoft"><feGaussianBlur stdDeviation="2" /></filter>
        <linearGradient id="courtiaLandingIris" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff80e0" stopOpacity=".96" />
          <stop offset="22%" stopColor="#c080ff" stopOpacity=".94" />
          <stop offset="42%" stopColor="#80a8ff" stopOpacity=".94" />
          <stop offset="58%" stopColor="#80f0d8" stopOpacity=".92" />
          <stop offset="78%" stopColor="#fff080" stopOpacity=".9" />
          <stop offset="100%" stopColor="#ff80b0" stopOpacity=".96" />
        </linearGradient>
        <linearGradient id="courtiaLandingIris2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#80ffe0" stopOpacity=".62" />
          <stop offset="42%" stopColor="#ff80c0" stopOpacity=".58" />
          <stop offset="100%" stopColor="#a080ff" stopOpacity=".62" />
        </linearGradient>
        <radialGradient id="courtiaLandingMembrane" cx="40%" cy="40%" r="62%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="70%" stopColor="#fff" stopOpacity=".05" />
          <stop offset="100%" stopColor="#a080ff" stopOpacity=".36" />
        </radialGradient>
        <clipPath id="courtiaLandingCClip"><path d="M 473 200 A 200 200 0 1 0 473 400 L 413 365 A 130 130 0 1 1 413 235 Z" /></clipPath>
      </defs>
      <path d="M 473 200 A 200 200 0 1 0 473 400 L 413 365 A 130 130 0 1 1 413 235 Z" fill="url(#courtiaLandingIris)" opacity=".42" filter="url(#courtiaLandingBlur)" transform="scale(1.08) translate(-22,-22)" />
      <path d="M 473 200 A 200 200 0 1 0 473 400 L 413 365 A 130 130 0 1 1 413 235 Z" fill="url(#courtiaLandingIris)" opacity=".58" />
      <path d="M 473 200 A 200 200 0 1 0 473 400 L 413 365 A 130 130 0 1 1 413 235 Z" fill="url(#courtiaLandingIris2)" opacity=".48" style={{ mixBlendMode: 'screen' }} />
      <path d="M 473 200 A 200 200 0 1 0 473 400 L 413 365 A 130 130 0 1 1 413 235 Z" fill="url(#courtiaLandingMembrane)" />
      <path d="M 473 200 A 200 200 0 1 0 473 400" fill="none" stroke="white" strokeWidth="1.5" opacity=".62" />
      <path d="M 413 235 A 130 130 0 1 1 413 365" fill="none" stroke="white" strokeWidth="1" opacity=".46" />
      <g clipPath="url(#courtiaLandingCClip)">
        <ellipse cx="170" cy="220" rx="55" ry="90" fill="#fff" transform="rotate(-25 170 220)" opacity=".28" filter="url(#courtiaLandingSoft)" />
        <ellipse cx="202" cy="430" rx="46" ry="26" fill="#fff" opacity=".18" filter="url(#courtiaLandingSoft)" />
        <circle cx="150" cy="190" r="4" fill="#fff" opacity=".92" />
        <circle cx="120" cy="330" r="3" fill="#fff" opacity=".72" />
      </g>
      <g opacity=".9">
        <circle cx="445" cy="155" r="22" fill="url(#courtiaLandingMembrane)" stroke="#f8d7ff" strokeWidth="1.4" />
        <circle cx="478" cy="135" r="16" fill="url(#courtiaLandingMembrane)" stroke="#b8fbff" strokeWidth="1.1" />
        <circle cx="420" cy="138" r="11" fill="url(#courtiaLandingMembrane)" stroke="#fff" strokeWidth=".8" opacity=".76" />
        <circle cx="500" cy="158" r="7" fill="url(#courtiaLandingMembrane)" stroke="#fff" strokeWidth=".7" opacity=".72" />
      </g>
      <path d="M 200 180 A 180 180 0 0 1 350 130" fill="none" stroke="white" strokeWidth="2" opacity=".36" filter="url(#courtiaLandingSoft)" />
    </svg>
  )
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="courtia-section-head">
      <p className="courtia-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {text && <p className="courtia-section-text">{text}</p>}
    </div>
  )
}

function CockpitScene() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  function handlePointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: py * -8, y: px * 10 })
  }

  return (
    <div className="courtia-scene" onPointerMove={handlePointerMove} onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
      <div className="scene-depth" style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
        <div className="scene-orbit orbit-a" />
        <div className="scene-orbit orbit-b" />
        <div className="scene-orbit orbit-c" />
        <div className="scene-core">
          <div className="core-glow" />
          <BubbleMark className="core-bubble" />
          <div className="core-panel">
            <span>Morning Brief ARK</span>
            <strong>7 priorités cabinet</strong>
            <small>Relances · DDA · échéances</small>
          </div>
        </div>
        {modules.map((mod) => {
          const Icon = mod.icon
          return (
            <article
              className="scene-module"
              key={mod.name}
              style={{ left: mod.x, top: mod.y, '--module-color': mod.color, transform: `translateZ(${mod.z}px)` }}
            >
              <div className="module-head">
                <span><Icon size={15} /></span>
                <b>{mod.name}</b>
              </div>
              <p>{mod.detail}</p>
              <div className="module-row">
                <i />
                <span>{mod.status}</span>
              </div>
            </article>
          )
        })}
        <div className="scene-console">
          <div>
            <span className="console-dot" />
            <b>Dossier Martin</b>
            <small>Pièce manquante · relance prête</small>
          </div>
          <div className="console-bars"><span /><span /><span /></div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPublic() {
  const go = (path) => {
    window.location.assign(path)
  }

  return (
    <div className="courtia-premium-landing">
      <style>{globalLandingReset + landingStyles}</style>
      <div className="aurora-field" aria-hidden="true" />

      <header className="courtia-nav-wrap">
        <nav className="courtia-nav" aria-label="Navigation principale">
          <button className="courtia-brand" onClick={() => go('/')} aria-label="Accueil COURTIA">
            <BubbleMark className="brand-mark" />
            <span><b>COURTIA</b><small>Aurora cockpit</small></span>
          </button>
          <div className="nav-links">
            <a href="#cockpit">Cockpit</a>
            <a href="#ordre">Ordre</a>
            <a href="#ark">ARK</a>
            <a href="#pricing">Tarifs</a>
          </div>
          <button className="nav-demo" onClick={() => go('/demo')}>Demander une démo <ArrowRight size={16} /></button>
        </nav>
      </header>

      <main>
        <section className="hero-shell">
          <div className="hero-copy">
            <p className="hero-badge"><Radar size={14} /> Cockpit IA métier pour courtiers en assurance</p>
            <h1>Le cockpit IA qui pilote le quotidien des courtiers.</h1>
            <p className="hero-lead">
              COURTIA centralise clients, contrats, relances, documents, échanges et obligations DDA dans une interface claire. ARK prépare les priorités du jour pour aider le courtier à garder le contrôle de son portefeuille.
            </p>
            <div className="hero-actions">
              <button className="primary-action" onClick={() => go('/demo')}>Demander une démo <ArrowRight size={18} /></button>
              <a className="secondary-action" href="#cockpit">Voir le cockpit</a>
            </div>
            <div className="hero-proof">
              <div><b>95%</b><span>Jusqu’à 95% du temps gagné sur certaines tâches répétitives, workflow par workflow.</span></div>
              <div><b>DDA</b><span>Traçabilité et compte rendu structurés, prêts à exploiter.</span></div>
              <div><b>199 €</b><span>Offre Pro pensée pour piloter réellement le cabinet.</span></div>
            </div>
          </div>
          <CockpitScene />
        </section>

        <section id="cockpit" className="courtia-section product-section">
          <SectionTitle
            eyebrow="Ce que COURTIA fait vraiment"
            title="Un cockpit opérationnel, pas une couche d’IA décorative."
            text="Chaque brique rend le cabinet plus lisible : les clients, contrats, documents, relances et rendez-vous deviennent des actions suivies."
          />
          <div className="product-grid">
            {productCards.map((card, index) => {
              const Icon = card.icon
              return (
                <article
                  className="product-card"
                  key={card.title}
                  style={{ '--reveal-delay': `${index * 40}ms` }}
                >
                  <div className="card-visual">
                    <div className="metric-orb"><Icon size={18} /><strong>{card.metric}</strong></div>
                    <div className="mini-window">
                      {card.rows.map((row) => <span key={row}><i />{row}</span>)}
                    </div>
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section id="ordre" className="courtia-section order-section">
          <SectionTitle
            eyebrow="COURTIA remet de l’ordre"
            title="Le cabinet passe du bruit quotidien à une lecture claire du portefeuille."
          />
          <div className="before-after">
            <article className="chaos-panel">
              <div className="panel-label">Avant COURTIA</div>
              <h3>Les informations vivent partout.</h3>
              <div className="messy-stack">
                {['Infos dans les mails', 'Documents dispersés', 'Relances faites de mémoire', 'Échéances oubliées', 'Portefeuille difficile à piloter'].map((item, index) => (
                  <span key={item} style={{ '--r': `${index % 2 ? '-' : ''}${5 + index * 2}deg`, '--x': `${(index - 2) * 9}px` }}>{item}</span>
                ))}
              </div>
            </article>
            <article className="clarity-panel">
              <div className="panel-label">Avec COURTIA</div>
              <h3>Chaque priorité ressort au bon moment.</h3>
              <div className="clean-console">
                {['Portefeuille clair', 'Historique client complet', 'Relances suivies', 'Documents liés au dossier', 'Actions du jour préparées'].map((item, index) => (
                  <div key={item}><Check size={15} /><span>{item}</span><b>{index === 0 ? 'live' : 'ok'}</b></div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section id="ark" className="courtia-section ark-section">
          <div className="ark-copy">
            <p className="courtia-eyebrow">ARK prépare la journée</p>
            <h2>ARK ne remplace pas le courtier. Il prépare, trie, résume et suggère.</h2>
            <p className="courtia-section-text">Le courtier garde la décision, la responsabilité et la relation client. ARK transforme le bruit du cabinet en priorités prêtes à traiter.</p>
          </div>
          <div className="morning-brief-card">
            <div className="brief-top">
              <div><span>Morning Brief ARK</span><strong>Aujourd’hui</strong></div>
              <Clock3 size={20} />
            </div>
            <div className="brief-grid">
              {morningBrief.map((item) => <div className={`brief-item ${item.tone}`} key={item.label}><b>{item.value}</b><span>{item.label}</span></div>)}
            </div>
            <div className="ark-suggestions">
              {[
                'Ce client n’a pas été relancé depuis 12 jours.',
                'Le contrat arrive à échéance dans 30 jours.',
                'Il manque une pièce au dossier.',
                'Ce prospect mérite une relance aujourd’hui.',
                'Résumé du dernier échange prêt.',
              ].map((line) => <div key={line}><MessageSquareText size={15} /><span>{line}</span><ChevronRight size={14} /></div>)}
            </div>
          </div>
        </section>

        <section className="courtia-section outcomes-section">
          <SectionTitle
            eyebrow="Ce que le courtier récupère"
            title="Du temps, oui. Mais surtout une discipline de suivi plus fiable."
            text="COURTIA aide le cabinet à mieux préparer, mieux relancer, mieux classer et mieux exploiter son portefeuille."
          />
          <div className="outcome-grid">
            {[
              ['Clarté', 'Savoir où en est chaque client, sans fouiller dans trois outils.'],
              ['Régularité commerciale', 'Relancer au bon moment, même quand les urgences s’accumulent.'],
              ['Relation client', 'Préparer les rendez-vous avec l’historique et les documents utiles.'],
              ['Image professionnelle', 'Présenter un suivi propre, clair et structuré.'],
            ].map(([title, text]) => <article key={title}><span /><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </section>

        <section className="courtia-section compare-section">
          <SectionTitle eyebrow="Pas juste un CRM" title="Un CRM classique stocke. COURTIA structure le quotidien." />
          <div className="compare-grid">
            <article>
              <h3>CRM classique</h3>
              <ul>
                <li>Stocke des fiches.</li>
                <li>Dépend fortement de la discipline humaine.</li>
                <li>Laisse les relances au courtier.</li>
                <li>Peu adapté aux obligations DDA.</li>
              </ul>
            </article>
            <article className="courtia-side">
              <h3>COURTIA</h3>
              <ul>
                <li>Structure les priorités quotidiennes.</li>
                <li>Relie clients, contrats, documents et relances.</li>
                <li>Intègre ARK dans les workflows du cabinet.</li>
                <li>Pense métier courtage et pilotage portefeuille.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="courtia-section audience-section">
          <SectionTitle eyebrow="Pour qui ?" title="Pensé pour les cabinets qui veulent mieux suivre leur portefeuille." />
          <div className="audience-grid">
            {audiences.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </section>

        <section id="pricing" className="courtia-section pricing-section">
          <SectionTitle
            eyebrow="Tarifs"
            title="Une offre Pro à 199 € HT/mois pour piloter réellement le cabinet."
            text="Starter reste utile pour démarrer. Pro est l’offre centrale. Premium accompagne les cabinets structurés."
          />
          <div className="pricing-grid">
            {pricing.map((plan) => (
              <article className={`price-card ${plan.featured ? 'featured' : ''}`} key={plan.name}>
                {plan.featured && <span className="recommended">Offre principale</span>}
                <h3>{plan.name}</h3>
                <p>{plan.intro}</p>
                <div className="price-line"><strong>{plan.price}</strong><span>{plan.suffix}</span></div>
                <small>{plan.intent}</small>
                <ul>{plan.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul>
                <button onClick={() => go(plan.featured ? '/demo' : '/tarifs')}>{plan.featured ? 'Demander une démo' : 'Voir le détail'}</button>
              </article>
            ))}
          </div>
        </section>

        <section className="courtia-section credibility-section">
          <div className="credibility-card">
            <div>
              <p className="courtia-eyebrow">Promesse crédible</p>
              <h2>Jusqu’à 95% du temps gagné sur certaines tâches répétitives.</h2>
            </div>
            <p>Le gain dépend du volume de dossiers, du niveau d’organisation du cabinet et des workflows activés. L’objectif n’est pas de promettre une promesse abstraite : l’objectif est de structurer les tâches répétitives qui ralentissent le suivi.</p>
          </div>
        </section>

        <section className="final-cta">
          <BubbleMark className="final-mark" />
          <h2>Voir comment COURTIA s’intègre à votre cabinet.</h2>
          <p>Une démonstration orientée courtage : clients, contrats, relances, documents, DDA, ARK et priorités du jour.</p>
          <div className="hero-actions center"><button className="primary-action" onClick={() => go('/demo')}>Demander une démo <ArrowRight size={18} /></button><button className="secondary-action button" onClick={() => go('/tarifs')}>Voir les tarifs</button></div>
        </section>
      </main>

      <footer className="courtia-footer">
        <span>COURTIA · Cockpit IA premium pour courtiers en assurance</span>
        <div><a href="#cockpit">Cockpit</a><a href="#ark">ARK</a><a href="/tarifs">Tarifs</a><a href="/contact">Contact</a></div>
      </footer>
    </div>
  )
}

const globalLandingReset = `
  html, body, #root { margin: 0; width: 100%; min-height: 100%; overflow-x: hidden; }
  body { background: #02030b; }
`

const landingStyles = `
  .courtia-premium-landing,.courtia-premium-landing *,.courtia-premium-landing *:before,.courtia-premium-landing *:after{box-sizing:border-box}.courtia-premium-landing{--bg:#02030b;--panel:rgba(255,255,255,.07);--panel2:rgba(255,255,255,.035);--line:rgba(222,229,255,.16);--text:#f8f8ff;--muted:#c7c9da;--soft:#8f93ad;--cyan:#8fe7ff;--violet:#a986ff;--pink:#ff65bb;--orange:#ff9a55;--green:#8dffcf;min-height:100vh;background:radial-gradient(circle at 15% 3%,rgba(169,134,255,.31),transparent 28rem),radial-gradient(circle at 85% 10%,rgba(143,231,255,.18),transparent 34rem),linear-gradient(142deg,#141035 0%,#07091c 38%,#02030b 78%);color:var(--text);font-family:'Plus Jakarta Sans','Inter',system-ui,sans-serif;overflow-x:hidden;position:relative}.aurora-field{position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:76px 76px;mask-image:radial-gradient(circle at 50% 12%,#000 0 28%,transparent 78%);z-index:0}.courtia-premium-landing main,.courtia-nav-wrap,.courtia-footer{position:relative;z-index:1}.courtia-nav-wrap{position:sticky;top:16px;z-index:20;width:min(1160px,calc(100% - 32px));margin:18px auto 0}.courtia-nav{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:12px 14px 12px 18px;border:1px solid rgba(255,255,255,.13);border-radius:26px;background:rgba(7,8,25,.74);backdrop-filter:blur(24px);box-shadow:0 22px 80px rgba(0,0,0,.28)}.courtia-brand{display:flex;align-items:center;gap:12px;background:none;border:0;color:inherit;cursor:pointer;text-align:left}.brand-mark{width:34px;height:34px;overflow:visible}.courtia-brand b{display:block;font-size:.98rem}.courtia-brand small{display:block;color:var(--soft);font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:.13em;text-transform:uppercase}.nav-links{display:flex;gap:8px}.nav-links a{color:rgba(248,248,255,.72);text-decoration:none;font-size:.9rem;padding:9px 12px;border-radius:999px}.nav-links a:hover{background:rgba(255,255,255,.08);color:#fff}.nav-demo,.primary-action,.secondary-action{display:inline-flex;align-items:center;justify-content:center;gap:10px;border-radius:999px;border:0;min-height:46px;font-weight:800;letter-spacing:-.02em;cursor:pointer;text-decoration:none;white-space:normal}.nav-demo,.primary-action{background:linear-gradient(135deg,#a9f1ff 0%,#b9a4ff 48%,#ff71bd 100%);color:#060717;box-shadow:0 22px 58px rgba(255,101,187,.22)}.nav-demo{padding:0 18px}.primary-action{padding:0 24px}.secondary-action{padding:0 22px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.055);color:#f7f7ff}.hero-shell{width:min(1160px,calc(100% - 36px));margin:0 auto;min-height:calc(100vh - 120px);display:grid;grid-template-columns:minmax(0,1.05fr) minmax(400px,.95fr);align-items:center;gap:40px;padding:110px 0 60px}.hero-badge,.courtia-eyebrow{display:inline-flex;align-items:center;gap:9px;width:max-content;max-width:100%;min-width:0;padding:10px 14px;border:1px solid rgba(143,231,255,.22);border-radius:999px;background:rgba(255,255,255,.052);color:#dff7ff;font-family:'JetBrains Mono',monospace;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase}.hero-copy h1{margin:18px 0 0;overflow-wrap:break-word;font-size:clamp(3.0rem,4.8vw,4.8rem);line-height:1.05;letter-spacing:-.045em;max-width:760px}.hero-lead{margin:18px 0 0;overflow-wrap:break-word;max-width:650px;color:var(--muted);font-size:clamp(1.0rem,1.4vw,1.14rem);line-height:1.55}.hero-actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:30px}.hero-actions.center{justify-content:center}.hero-proof{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:24px;max-width:750px}.hero-proof div{min-height:86px;padding:12px 14px;border:1px solid rgba(255,255,255,.11);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.032))}.hero-proof b{display:block;font-size:1.72rem;letter-spacing:-.06em}.hero-proof span{display:block;margin-top:8px;color:var(--soft);font-size:.82rem;line-height:1.38}.courtia-scene{min-height:560px;display:grid;place-items:center;perspective:1200px;overflow:visible}.scene-depth{position:relative;width:min(540px,100%);aspect-ratio:1;transform-style:preserve-3d;transition:transform .16s ease-out}.scene-depth:before{content:'';position:absolute;inset:7%;border-radius:50%;background:radial-gradient(circle at 40% 38%,rgba(143,231,255,.26),transparent 29%),radial-gradient(circle at 62% 67%,rgba(255,101,187,.20),transparent 36%),radial-gradient(circle,rgba(169,134,255,.18),transparent 68%);filter:blur(14px);transform:translateZ(-80px)}.scene-orbit{position:absolute;inset:9%;border:1px solid rgba(255,255,255,.14);border-radius:50%;transform:rotateX(62deg) rotateZ(-18deg);box-shadow:inset 0 0 90px rgba(143,231,255,.05)}.orbit-b{inset:20%;border-style:dashed;opacity:.72;transform:rotateX(64deg) rotateZ(24deg)}.orbit-c{inset:-2%;opacity:.45;transform:rotateX(58deg) rotateZ(40deg)}.scene-core{position:absolute;inset:25%;display:grid;place-items:center;transform:translateZ(120px)}.core-glow{position:absolute;inset:-20%;border-radius:50%;background:radial-gradient(circle,rgba(169,134,255,.34),transparent 62%);filter:blur(30px);animation:pulseGlow 7s ease-in-out infinite}.core-bubble{width:100%;height:100%;overflow:visible;filter:drop-shadow(0 44px 90px rgba(127,95,255,.34));animation:floatCore 7s ease-in-out infinite}.core-panel{position:absolute;bottom:-18px;left:50%;width:280px;transform:translateX(-50%) translateZ(90px);text-align:center;padding:16px 18px;border:1px solid rgba(143,231,255,.2);border-radius:999px;background:rgba(2,3,11,.70);backdrop-filter:blur(18px);box-shadow:0 18px 56px rgba(0,0,0,.3)}.core-panel span,.core-panel small{display:block;color:var(--soft);font-size:.72rem}.core-panel strong{display:block;color:#fff;font-size:1rem}.scene-module{position:absolute;width:160px;min-height:100px;padding:12px 14px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:linear-gradient(145deg,rgba(18,22,48,.88),rgba(14,15,34,.64));box-shadow:0 24px 62px rgba(0,0,0,.28);backdrop-filter:blur(20px);transform-style:preserve-3d;animation:floatCard 8s ease-in-out infinite}.scene-module:before{content:'';position:absolute;inset:-1px;border-radius:inherit;background:radial-gradient(circle at 12% 0%,var(--module-color),transparent 35%);opacity:.16;pointer-events:none}.module-head{display:flex;align-items:center;gap:9px}.module-head span{width:28px;height:28px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--module-color),transparent 82%);color:var(--module-color)}.module-head b{font-size:.96rem}.scene-module p{margin:11px 0 10px;color:#c8cadc;font-size:.78rem;line-height:1.35}.module-row{display:flex;align-items:center;gap:8px;color:#fff;font-size:.72rem}.module-row i{width:8px;height:8px;border-radius:50%;background:var(--module-color);box-shadow:0 0 18px var(--module-color)}.scene-console{position:absolute;left:24%;right:16%;bottom:4%;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;border:1px solid rgba(255,255,255,.13);border-radius:18px;background:rgba(2,3,11,.62);backdrop-filter:blur(18px);transform:translateZ(70px)}.scene-console b,.scene-console small{display:block}.scene-console small{color:var(--soft);margin-top:2px}.console-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:8px;box-shadow:0 0 20px var(--green)}.console-bars{display:flex;gap:5px;align-items:end}.console-bars span{width:8px;border-radius:99px;background:linear-gradient(#8fe7ff,#ff65bb)}.console-bars span:nth-child(1){height:22px}.console-bars span:nth-child(2){height:38px}.console-bars span:nth-child(3){height:28px}.courtia-section{width:min(1160px,calc(100% - 36px));margin:0 auto;padding:88px 0}.courtia-section-head{max-width:850px;margin-bottom:34px}.courtia-section-head h2,.ark-copy h2,.credibility-card h2,.final-cta h2{margin:16px 0 0;font-size:clamp(2.35rem,5vw,4.7rem);line-height:.96;letter-spacing:-.064em}.courtia-section-text{color:var(--muted);font-size:1.08rem;line-height:1.66;max-width:720px;margin:18px 0 0}.product-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.product-card,.outcome-grid article,.audience-grid article,.price-card,.compare-grid article,.chaos-panel,.clarity-panel,.morning-brief-card,.credibility-card{border:1px solid rgba(255,255,255,.13);background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.035));border-radius:30px;box-shadow:0 30px 120px rgba(0,0,0,.26);position:relative;overflow:hidden}.product-card{padding:22px}.card-visual{height:170px;border-radius:24px;background:radial-gradient(circle at 24% 24%,rgba(143,231,255,.18),transparent 34%),rgba(2,3,11,.32);border:1px solid rgba(255,255,255,.09);position:relative;padding:16px;overflow:hidden}.metric-orb{position:absolute;right:16px;top:16px;width:78px;height:78px;border-radius:28px;background:linear-gradient(135deg,rgba(143,231,255,.16),rgba(255,101,187,.12));display:grid;place-items:center;border:1px solid rgba(255,255,255,.14)}.metric-orb strong{display:block;font-size:1.05rem}.mini-window{position:absolute;left:16px;right:70px;bottom:16px;display:grid;gap:8px}.mini-window span{display:flex;gap:8px;align-items:center;padding:9px 10px;border-radius:12px;background:rgba(255,255,255,.07);color:#dfe3f8;font-size:.74rem}.mini-window i{width:7px;height:7px;border-radius:50%;background:var(--cyan)}.product-card h3,.outcome-grid h3,.audience-grid h3,.price-card h3,.compare-grid h3,.chaos-panel h3,.clarity-panel h3{margin:20px 0 9px;font-size:1.28rem;letter-spacing:-.035em}.product-card p,.outcome-grid p,.audience-grid p,.price-card p{color:var(--muted);line-height:1.55;margin:0}.before-after{display:grid;grid-template-columns:1fr 1fr;gap:18px}.chaos-panel,.clarity-panel{padding:30px}.panel-label,.recommended{display:inline-flex;padding:8px 11px;border-radius:999px;background:rgba(255,255,255,.075);color:#dff7ff;font-family:'JetBrains Mono',monospace;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase}.messy-stack{min-height:300px;position:relative;margin-top:26px}.messy-stack span{position:relative;display:block;width:78%;margin:12px auto;padding:16px 18px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(255,255,255,.055);color:#d7d8ea;transform:translateX(var(--x)) rotate(var(--r));box-shadow:0 18px 48px rgba(0,0,0,.2)}.clean-console{display:grid;gap:12px;margin-top:26px}.clean-console div{display:grid;grid-template-columns:24px 1fr auto;align-items:center;gap:12px;padding:15px 16px;border-radius:18px;background:rgba(2,3,11,.32);border:1px solid rgba(143,231,255,.14)}.clean-console svg{color:var(--green)}.clean-console b{color:var(--cyan);font-size:.72rem;text-transform:uppercase}.ark-section{display:grid;grid-template-columns:.85fr 1.15fr;gap:28px;align-items:center}.morning-brief-card{padding:28px}.brief-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.brief-top span{display:block;color:var(--soft);font-family:'JetBrains Mono',monospace;font-size:.75rem;text-transform:uppercase;letter-spacing:.12em}.brief-top strong{font-size:2rem;letter-spacing:-.05em}.brief-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}.brief-item{padding:15px;border-radius:20px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1)}.brief-item b{display:block;font-size:2rem;line-height:1}.brief-item span{display:block;color:var(--muted);font-size:.76rem;line-height:1.25;margin-top:7px}.brief-item.cyan b{color:var(--cyan)}.brief-item.violet b{color:var(--violet)}.brief-item.orange b{color:var(--orange)}.brief-item.pink b{color:var(--pink)}.brief-item.green b{color:var(--green)}.ark-suggestions{display:grid;gap:10px;margin-top:18px}.ark-suggestions div{display:grid;grid-template-columns:22px 1fr 18px;align-items:center;gap:11px;padding:13px;border-radius:16px;background:rgba(2,3,11,.32);color:#e9ebff}.ark-suggestions svg{color:var(--cyan)}.outcome-grid,.audience-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.outcome-grid article,.audience-grid article{padding:24px}.outcome-grid article span{display:block;width:40px;height:40px;border-radius:15px;background:linear-gradient(135deg,var(--cyan),var(--pink));opacity:.82}.compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.compare-grid article{padding:30px}.compare-grid ul,.price-card ul{list-style:none;margin:20px 0 0;padding:0;display:grid;gap:12px;color:#d8daec}.compare-grid li{display:flex;gap:10px;align-items:flex-start}.compare-grid li:before{content:'';width:8px;height:8px;border-radius:50%;margin-top:8px;background:#6b6f88}.courtia-side{border-color:rgba(143,231,255,.25)!important;background:radial-gradient(circle at 12% 0%,rgba(143,231,255,.13),transparent 34%),linear-gradient(180deg,rgba(255,255,255,.078),rgba(255,255,255,.035))!important}.courtia-side li:before{background:linear-gradient(135deg,var(--cyan),var(--pink))}.audience-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.pricing-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.price-card{padding:28px;display:flex;flex-direction:column}.price-card.featured{border-color:rgba(143,231,255,.36);background:radial-gradient(circle at 30% 0%,rgba(143,231,255,.18),transparent 32%),radial-gradient(circle at 80% 10%,rgba(255,101,187,.14),transparent 30%),rgba(255,255,255,.075);transform:translateY(-12px)}.price-line{margin:22px 0 8px}.price-line strong{display:block;font-size:clamp(2.5rem,4vw,4rem);letter-spacing:-.07em}.price-line span,.price-card small{display:block;color:var(--soft)}.price-card li{display:flex;gap:10px;align-items:center;color:#e1e3f3}.price-card li svg{color:var(--green);flex:0 0 auto}.price-card button{margin-top:auto;min-height:46px;border-radius:999px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;font-weight:800;cursor:pointer}.price-card.featured button{background:linear-gradient(135deg,#a9f1ff,#ff71bd);color:#060717}.credibility-card{padding:36px;display:grid;grid-template-columns:1fr .8fr;gap:28px;align-items:center}.credibility-card p{color:var(--muted);line-height:1.68}.final-cta{width:min(980px,calc(100% - 36px));margin:24px auto 80px;text-align:center;padding:54px 34px;border:1px solid rgba(143,231,255,.2);border-radius:38px;background:radial-gradient(circle at 50% 0%,rgba(143,231,255,.16),transparent 34%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.032));box-shadow:0 30px 120px rgba(0,0,0,.28)}.final-mark{width:86px;height:86px;margin:0 auto 10px;overflow:visible}.final-cta p{max-width:680px;margin:18px auto 0;color:var(--muted);line-height:1.64}.courtia-footer{width:min(1160px,calc(100% - 36px));margin:0 auto;padding:28px 0 44px;border-top:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;color:var(--soft);font-size:.9rem}.courtia-footer a{color:#cfd1e8;text-decoration:none;margin-left:16px}@keyframes floatCore{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.025)}}@keyframes floatCard{0%,100%{margin-top:0}50%{margin-top:-8px}}@keyframes pulseGlow{0%,100%{opacity:.72;transform:scale(1)}50%{opacity:1;transform:scale(1.12)}}@media(max-width:1080px){.hero-shell{grid-template-columns:1fr;min-height:auto}.courtia-scene{min-height:550px}.product-grid{grid-template-columns:repeat(2,1fr)}.ark-section,.credibility-card{grid-template-columns:1fr}.outcome-grid{grid-template-columns:repeat(2,1fr)}.audience-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:820px){.nav-links,.nav-demo{display:none}.courtia-nav-wrap{position:relative;top:auto}.hero-shell{width:min(720px,calc(100% - 28px));padding:46px 0}.hero-copy h1{font-size:clamp(2.32rem,9.8vw,4.05rem);line-height:1;letter-spacing:-.05em}.hero-badge,.courtia-eyebrow{white-space:normal;border-radius:18px;font-size:.66rem}.hero-proof,.before-after,.pricing-grid,.compare-grid{grid-template-columns:1fr}.brief-grid{grid-template-columns:repeat(2,1fr)}.product-grid,.outcome-grid,.audience-grid{grid-template-columns:1fr}.price-card.featured{transform:none}.courtia-scene{min-height:620px;overflow:hidden}.scene-depth{width:min(560px,100%)}.scene-module{position:relative!important;left:auto!important;top:auto!important;transform:none!important;width:100%;min-height:auto;animation:none}.scene-depth{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;aspect-ratio:auto}.scene-core,.scene-orbit,.scene-console{display:none}.courtia-section{width:min(720px,calc(100% - 28px));padding:60px 0}.courtia-section-head h2,.ark-copy h2,.credibility-card h2,.final-cta h2{font-size:clamp(2.3rem,10vw,3.4rem)}}@media(max-width:520px){.hero-actions .primary-action,.hero-actions .secondary-action{width:100%}.hero-proof div{min-height:auto}.brief-grid{grid-template-columns:1fr}.courtia-scene{min-height:auto}.scene-depth{grid-template-columns:1fr}.courtia-footer a{margin-left:0;margin-right:14px}.courtia-section-head h2,.ark-copy h2,.credibility-card h2,.final-cta h2{letter-spacing:-.045em}.hero-copy h1{font-size:clamp(2.05rem,8.75vw,2.55rem);letter-spacing:-.04em}.hero-badge{font-size:.58rem;line-height:1.35}.hero-actions{gap:10px}.hero-actions .primary-action,.hero-actions .secondary-action{width:100%;padding-left:16px;padding-right:16px}.hero-proof div{padding:16px}.scene-module{padding:13px}.module-head b{font-size:.9rem}}@media(max-width:820px){.hero-badge{width:100%;justify-content:center;text-align:center;white-space:normal;word-break:normal;overflow-wrap:anywhere}.hero-badge svg{flex:0 0 auto}.hero-shell,.courtia-section,.courtia-nav-wrap,.final-cta{max-width:calc(100vw - 28px)}.hero-copy,.hero-lead,.hero-copy h1{max-width:100%;min-width:0}.hero-lead{font-size:1rem}.hero-proof{display:grid;grid-template-columns:1fr;gap:12px}.courtia-premium-landing{overflow-x:hidden}.scene-module{box-sizing:border-box}.nav-links,.nav-demo{display:none!important}}@supports not (color:color-mix(in srgb,white,black)){.module-head span{background:rgba(143,231,255,.12)}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`
