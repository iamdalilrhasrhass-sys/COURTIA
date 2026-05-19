import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Brain,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  Gauge,
  LineChart,
  LockKeyhole,
  LogIn,
  Menu,
  MousePointerClick,
  SearchCheck,
  ShieldCheck,
  Target,
  Users,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import { applySeo } from '../lib/seo'
import './LandingPublicV4.css'

const proofNodes = [
  ['CRM clients', Users],
  ['Devis & opportunités', Target],
  ['Contrats & échéances', CalendarClock],
  ['Relances', Bell],
  ['Reporting', LineChart],
  ['ARK', Brain],
  ['Stripe live', CreditCard],
  ['Google OAuth', ShieldCheck],
  ['API opérationnelle', Workflow],
]

const painCards = [
  ['Dossiers dispersés', 'Les informations utiles vivent entre emails, fichiers, notes et outils métier.', FolderKanban],
  ['Relances oubliées', 'Le suivi dépend trop souvent de la mémoire et du dernier message reçu.', Bell],
  ['Échéances mal suivies', 'Les renouvellements sensibles arrivent trop tard dans la journée du cabinet.', CalendarClock],
  ['Opportunités non exploitées', 'Les signaux commerciaux existent, mais restent noyés dans le portefeuille.', Target],
  ['Vision portefeuille floue', 'Difficile de voir ce qui avance, bloque ou demande une action immédiate.', Gauge],
  ['Temps administratif lourd', 'La préparation, la recherche et la synthèse grignotent le temps commercial.', ClipboardList],
]

const timeline = [
  ['08h30', 'Priorités du jour', 'ARK met en avant les dossiers critiques, échéances et relances à traiter.'],
  ['Avant rendez-vous', 'Préparation dossier', 'ARK résume le contexte client pour arriver mieux préparé.'],
  ['Après échange', 'Relance suggérée', 'ARK propose une relance exploitable que le courtier valide avant envoi.'],
  ['Portefeuille', 'Opportunités détectées', 'ARK signale les pistes de multi-équipement, renouvellement ou suivi sensible.'],
  ['Fin de journée', 'Actions restantes', 'ARK aide à garder une vision claire de ce qui reste à faire.'],
]

const features = [
  ['Fiches clients enrichies', 'Retrouvez l’historique utile, les actions et les points sensibles au même endroit.', Users],
  ['Pipeline devis & opportunités', 'Suivez les devis en cours et les prochaines actions commerciales.', Target],
  ['Contrats & échéances', 'Gardez une vision claire des échéances et renouvellements.', CalendarClock],
  ['Relances intelligentes', 'Priorisez les relances sans disperser votre journée.', Bell],
  ['Documents & traçabilité', 'Structurez les pièces importantes autour du dossier client.', FileText],
  ['Reporting portefeuille', 'Visualisez ce qui avance, bloque ou mérite attention.', LineChart],
  ['Assistant ARK', 'Préparez briefs, priorités et suggestions sans déléguer la décision.', Brain],
  ['Abonnement & billing', 'Pilotez le plan, les accès et le suivi de facturation depuis le cockpit.', CreditCard],
  ['Intégrations à connecter', 'Email, agenda et documents sont prévus pour être branchés progressivement.', Zap],
]

const demoBlocks = ['Dashboard cabinet', 'Fiche client', 'Devis & opportunités', 'Relances & contrats', 'ARK & reporting']

const plans = [
  {
    name: 'Starter',
    price: '89 €',
    suffix: 'HT/mois',
    text: 'Pour structurer le suivi cabinet et poser les fondamentaux CRM IA.',
    cta: 'Demander accès',
    to: '/demo',
    featured: false,
    items: ['Fiches clients', 'Suivi devis', 'Relances essentielles', 'Documents structurés'],
  },
  {
    name: 'Pro',
    price: '199 €',
    suffix: 'HT/mois',
    text: 'Pour déployer ARK, le pilotage quotidien et l’exécution commerciale du cabinet.',
    cta: 'Démarrer Pro',
    to: '/demo',
    featured: true,
    items: ['ARK quotidien', 'Priorités & relances', 'Reporting portefeuille', 'Automatisations selon configuration'],
  },
  {
    name: 'Cabinet',
    price: 'Sur devis',
    suffix: '',
    text: 'Pour équipe, besoins avancés, accompagnement et configuration personnalisée.',
    cta: 'Demander une démo',
    to: '/demo',
    featured: false,
    items: ['Multi-utilisateur', 'Configuration avancée', 'Accompagnement', 'Déploiement progressif'],
  },
]

const faqItems = [
  [
    'COURTIA remplace-t-il mon logiciel métier ?',
    'COURTIA n’a pas vocation à remplacer brutalement tout votre existant. L’objectif est d’ajouter un cockpit clair au-dessus de votre organisation : clients, devis, relances, opportunités, contrats et priorités. Vous gardez vos habitudes métier, mais vous gagnez une vision plus lisible et plus actionnable de votre portefeuille.',
  ],
  [
    'ARK peut-il décider à ma place ?',
    'Non. ARK prépare, analyse, suggère et priorise. Le courtier reste décisionnaire. L’intérêt est de gagner du temps sur la préparation, la relance et le suivi, sans déléguer les décisions métier ou contractuelles à une IA.',
  ],
  [
    'COURTIA est-il adapté à un petit cabinet ?',
    'Oui, surtout si le cabinet veut mieux structurer son suivi sans recruter immédiatement. COURTIA aide à éviter les oublis, retrouver les informations importantes et prioriser les actions commerciales. L’offre Starter permet de poser les bases, tandis que Pro devient intéressante quand le cabinet veut exploiter ARK plus sérieusement.',
  ],
  [
    'Pourquoi l’offre Pro est-elle l’offre principale ?',
    'Parce que la valeur de COURTIA se révèle vraiment quand le cabinet utilise ARK pour piloter les priorités, les relances, les opportunités et le reporting. Starter structure le suivi. Pro transforme COURTIA en vrai cockpit quotidien.',
  ],
  [
    'Comment fonctionnent les abonnements ?',
    'COURTIA fonctionne avec des abonnements mensuels hors taxes, gérés via Stripe lorsque le paiement est activé. Starter permet de structurer les fondamentaux. Pro concentre la valeur quotidienne autour d’ARK, du pilotage, des relances et du reporting. Cabinet se traite sur devis pour adapter le déploiement à une équipe, un volume ou une organisation plus spécifique.',
  ],
  [
    'Peut-on importer ses clients ?',
    'L’objectif est de permettre une reprise progressive des données utiles : clients, contacts, contrats, échéances et opportunités. Selon votre organisation actuelle, l’import peut être préparé proprement pour éviter de transférer du désordre dans un nouvel outil.',
  ],
  [
    'Quelles intégrations sont disponibles ?',
    'COURTIA est pensé pour se connecter progressivement aux outils clés du cabinet : email, agenda, documents, paiement, données entreprise et automatisations. Les intégrations réellement actives sont affichées comme telles ; les autres sont présentées comme à connecter ou prévues, sans fausse promesse.',
  ],
  [
    'Les données sont-elles sécurisées ?',
    'La sécurité doit être traitée sérieusement : accès contrôlés, séparation des environnements, suivi des actions sensibles et absence d’exposition des secrets. COURTIA doit rester un outil de pilotage, pas une zone de risque supplémentaire pour le cabinet.',
  ],
  [
    'Comment fonctionne l’offre Cabinet ?',
    'L’offre Cabinet est destinée aux structures avec plusieurs utilisateurs, des besoins de configuration plus avancés ou un accompagnement spécifique. Elle se traite sur devis pour éviter de vendre une formule standard à un cabinet qui a besoin d’un déploiement plus précis.',
  ],
  [
    'Est-ce que COURTIA garantit plus de chiffre d’affaires ?',
    'Non, aucun outil sérieux ne doit garantir un chiffre d’affaires. COURTIA aide à mieux suivre, mieux prioriser et mieux exploiter les opportunités existantes. La performance dépend ensuite de l’organisation du cabinet, de la qualité du portefeuille et de l’exécution commerciale.',
  ],
  [
    'Peut-on demander une démonstration avant de choisir ?',
    'Oui. La démo sert justement à vérifier si COURTIA correspond à votre manière de travailler, à vos volumes, à vos priorités et à votre organisation actuelle. L’objectif n’est pas de vendre une promesse abstraite, mais de montrer concrètement comment le cockpit peut aider votre cabinet.',
  ],
]

function Nav() {
  const [open, setOpen] = useState(false)

  const links = [
    ['#fonctionnalites', 'Fonctionnalités'],
    ['#ark', 'ARK'],
    ['#tarifs', 'Tarifs'],
    ['/demo', 'Démo'],
  ]

  return (
    <header className="lp4-nav-wrap">
      <nav className="lp4-nav" aria-label="Navigation COURTIA">
        <a className="lp4-brand" href="#top" aria-label="COURTIA accueil">
          <span className="lp4-brand-mark">C</span>
          <span>
            <strong>COURTIA</strong>
            <em>ARK cockpit</em>
          </span>
        </a>

        <div className="lp4-nav-links">
          {links.map(([href, label]) => (
            href.startsWith('#') ? <a key={href} href={href}>{label}</a> : <Link key={href} to={href}>{label}</Link>
          ))}
        </div>

        <div className="lp4-nav-actions">
          <Link className="lp4-login" to="/login"><LogIn size={15} /> Se connecter</Link>
          <Link className="lp4-btn lp4-btn-primary" to="/demo">Demander une démo <ArrowRight size={15} /></Link>
        </div>

        <button className="lp4-menu" type="button" aria-label="Menu" onClick={() => setOpen((value) => !value)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open ? (
        <div className="lp4-mobile-menu">
          {links.map(([href, label]) => (
            href.startsWith('#') ? <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a> : <Link key={href} to={href} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          <Link to="/login" onClick={() => setOpen(false)}>Se connecter</Link>
          <Link className="lp4-btn lp4-btn-primary" to="/demo" onClick={() => setOpen(false)}>Demander une démo</Link>
        </div>
      ) : null}
    </header>
  )
}

function AuroraOrb() {
  return (
    <div className="lp4-orb-stage" aria-hidden="true">
      <div className="lp4-orb">
        <span />
        <span />
        <span />
      </div>
      <div className="lp4-orb-ring lp4-orb-ring-one" />
      <div className="lp4-orb-ring lp4-orb-ring-two" />
    </div>
  )
}

function HeroCockpit() {
  return (
    <div className="lp4-hero-visual">
      <div className="lp4-hero-beam" aria-hidden="true" />
      <div className="lp4-hero-sigil" aria-hidden="true">C</div>
      <AuroraOrb />
      <div className="lp4-depth-panel lp4-depth-panel-one" aria-hidden="true">
        <span>Pipeline devis</span>
        <strong>7 actions</strong>
      </div>
      <div className="lp4-depth-panel lp4-depth-panel-two" aria-hidden="true">
        <span>Risque échéance</span>
        <strong>Contrat santé</strong>
      </div>
      <div className="lp4-floating lp4-floating-one">
        <strong>Priorités du jour</strong>
        <span>3 dossiers à valider</span>
      </div>
      <div className="lp4-floating lp4-floating-two">
        <strong>Relances critiques</strong>
        <span>ARK suggère l’ordre</span>
      </div>
      <div className="lp4-floating lp4-floating-three">
        <strong>Courtier valide</strong>
        <span>La main reste humaine</span>
      </div>

      <div className="lp4-cockpit-card">
        <div className="lp4-window-bar">
          <span />
          <span />
          <span />
          <b>COURTIA cockpit</b>
        </div>
        <div className="lp4-cockpit-grid">
          <aside>
            <span className="is-active">ARK</span>
            <span>Clients</span>
            <span>Devis</span>
            <span>Contrats</span>
            <span>Relances</span>
          </aside>
          <main>
            <div className="lp4-brief">
              <small>Briefing ARK</small>
              <strong>Portefeuille sous contrôle</strong>
              <p>Relances sensibles, devis ouverts et échéances à valider.</p>
            </div>
            <div className="lp4-cockpit-radar" aria-hidden="true">
              <span />
              <span />
              <span />
              <b />
            </div>
            <div className="lp4-metrics-row">
              <div><span>Opportunités</span><strong>Détectées</strong></div>
              <div><span>Brief</span><strong>Préparé</strong></div>
              <div><span>Action</span><strong>À valider</strong></div>
            </div>
            <div className="lp4-action-line">
              <span>ARK prépare le briefing</span>
              <span>→</span>
              <span>Courtier valide l’action</span>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ eyebrow, title, children, align = 'left' }) {
  return (
    <div className={`lp4-section-head ${align === 'center' ? 'is-centered' : ''}`}>
      <span className="lp4-section-sigil" aria-hidden="true">C</span>
      {eyebrow ? <span className="lp4-kicker">{eyebrow}</span> : null}
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  )
}

export default function LandingPublic() {
  useEffect(() => {
    applySeo({
      title: 'COURTIA — Le cockpit IA des courtiers en assurance',
      description:
        'COURTIA centralise clients, devis, contrats, relances et priorités. ARK prépare, analyse et suggère sans retirer la main au courtier.',
      canonicalPath: '/',
    })
  }, [])

  return (
    <div className="lp4-page" id="top">
      <div className="lp4-scroll-progress" aria-hidden="true" />
      <div className="lp4-aurora" aria-hidden="true" />
      <div className="lp4-grid-bg" aria-hidden="true" />
      <Nav />

      <main>
        <section className="lp4-hero">
          <div className="lp4-brand-watermark" aria-hidden="true">COURTIA</div>
          <div className="lp4-hero-copy">
            <h1>COURTIA, le cockpit IA des courtiers en assurance</h1>
            <p>
              COURTIA centralise vos clients, devis, contrats et relances. ARK analyse votre portefeuille,
              prépare vos priorités et vous aide à piloter chaque journée sans perdre la main.
            </p>
            <div className="lp4-hero-actions">
              <Link className="lp4-btn lp4-btn-primary" to="/demo">Demander une démo <ArrowRight size={16} /></Link>
              <a className="lp4-btn lp4-btn-secondary" href="#tarifs">Voir les tarifs</a>
              <Link className="lp4-btn lp4-btn-ghost" to="/login">Se connecter</Link>
            </div>
          </div>
          <HeroCockpit />
        </section>

        <section className="lp4-proof lp4-section" id="preuve">
          <SectionTitle eyebrow="Socle produit" title="Un socle produit déjà opérationnel" align="center">
            Pas de fausses promesses. COURTIA met en avant ce qui peut être montré, testé et amélioré avec les courtiers.
          </SectionTitle>
          <div className="lp4-constellation">
            {proofNodes.map(([label, Icon], index) => (
              <div className="lp4-node" key={label} style={{ '--delay': `${index * 70}ms` }}>
                <Icon size={18} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lp4-section" id="probleme">
          <SectionTitle eyebrow="Terrain courtier" title="Les frictions qui ralentissent un cabinet">
            Une landing premium doit rester concrète : COURTIA part des vrais points de friction du quotidien.
          </SectionTitle>
          <div className="lp4-pain-grid">
            {painCards.map(([title, text, Icon]) => (
              <article className="lp4-impact-card" key={title}>
                <div className="lp4-icon-chip"><Icon size={18} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp4-section lp4-solution" id="solution">
          <div className="lp4-solution-copy">
            <SectionTitle eyebrow="Cockpit cabinet" title="COURTIA transforme le flux en actions à valider">
              COURTIA rassemble les informations importantes du cabinet dans un cockpit clair. ARK transforme ce flux en priorités, alertes et actions à valider.
            </SectionTitle>
            <div className="lp4-flow">
              {['Données', 'Priorités', 'Actions', 'Suivi'].map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
          <div className="lp4-control-room">
            <div className="lp4-room-row">
              <span>Clients</span>
              <span>Devis</span>
              <span>Contrats</span>
            </div>
            <div className="lp4-room-core">
              <Brain size={26} />
              <strong>ARK</strong>
              <small>briefing, signaux, priorités</small>
            </div>
            <div className="lp4-room-row">
              <span>Relances</span>
              <span>Opportunités</span>
              <span>Reporting</span>
            </div>
          </div>
        </section>

        <section className="lp4-section" id="ark">
          <SectionTitle eyebrow="Assistant intégré" title="ARK au quotidien">
            ARK accompagne la journée du courtier sans prendre sa place.
          </SectionTitle>
          <div className="lp4-timeline">
            {timeline.map(([time, title, text]) => (
              <article className="lp4-time-card" key={`${time}-${title}`}>
                <span>{time}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="lp4-hand-note">
            <MousePointerClick size={17} />
            <span>Le courtier garde la main sur les décisions métier, commerciales et contractuelles.</span>
          </div>
        </section>

        <section className="lp4-section" id="fonctionnalites">
          <SectionTitle eyebrow="Fonctionnalités" title="Un cockpit IA pensé pour scanner, décider, avancer" align="center">
            Des modules clairs, orientés usage cabinet, sans survente d’intégrations non branchées.
          </SectionTitle>
          <div className="lp4-feature-grid">
            {features.map(([title, text, Icon]) => (
              <article className="lp4-feature-card" key={title}>
                <Icon size={19} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp4-section lp4-demo" id="demo-produit">
          <SectionTitle eyebrow="Démo produit" title="Ce que vous pouvez montrer en démo">
            Une mise en scène claire du cockpit, de la fiche client, des relances, des opportunités et du briefing ARK.
          </SectionTitle>
          <div className="lp4-product-preview">
            <div className="lp4-preview-top">
              <span />
              <span />
              <span />
              <strong>COURTIA demo room</strong>
            </div>
            <div className="lp4-preview-body">
              <aside>
                {demoBlocks.map((block) => <span key={block}>{block}</span>)}
              </aside>
              <main>
                <div className="lp4-client-card">
                  <small>Fiche client</small>
                  <strong>Contrat santé à renouveler</strong>
                  <p>Historique, pièces, dernière relance et recommandation ARK.</p>
                </div>
                <div className="lp4-demo-stack">
                  <div><SearchCheck size={17} /> Opportunité détectée</div>
                  <div><Bell size={17} /> Relance prête à valider</div>
                  <div><LineChart size={17} /> Reporting portefeuille</div>
                </div>
              </main>
            </div>
          </div>
          <div className="lp4-centered-action">
            <Link className="lp4-btn lp4-btn-primary" to="/demo">Demander une démo <ArrowRight size={15} /></Link>
          </div>
        </section>

        <section className="lp4-section" id="tarifs">
          <SectionTitle eyebrow="Tarifs" title="Une grille simple, Pro au centre" align="center">
            Pro est l’offre principale pour exploiter ARK comme cockpit quotidien.
          </SectionTitle>
          <div className="lp4-pricing-grid">
            {plans.map((plan) => (
              <article className={`lp4-plan ${plan.featured ? 'is-featured' : ''}`} key={plan.name}>
                {plan.featured ? <div className="lp4-recommended">Recommandé</div> : null}
                <h3>{plan.name}</h3>
                <div className="lp4-price">
                  <strong>{plan.price}</strong>
                  {plan.suffix ? <span>{plan.suffix}</span> : null}
                </div>
                <p>{plan.text}</p>
                <ul>
                  {plan.items.map((item) => <li key={item}><CheckCircle2 size={15} /> {item}</li>)}
                </ul>
                <Link className={`lp4-btn ${plan.featured ? 'lp4-btn-primary' : 'lp4-btn-secondary'}`} to={plan.to}>
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="lp4-section lp4-security" id="securite">
          <div>
            <SectionTitle eyebrow="Contrôle" title="Sécurité et contrôle">
              COURTIA structure les informations du cabinet, sécurise les accès et garde une trace des actions sensibles.
            </SectionTitle>
          </div>
          <div className="lp4-shield-panel">
            <ShieldCheck size={34} />
            {['Données structurées', 'Accès sécurisés', 'Actions suivies', 'Courtier décisionnaire', 'ARK assiste mais ne décide pas seul'].map((item) => (
              <span key={item}><LockKeyhole size={14} /> {item}</span>
            ))}
          </div>
        </section>

        <section className="lp4-section" id="faq">
          <SectionTitle eyebrow="FAQ commerciale" title="Les questions que se posent vraiment les cabinets" align="center">
            Des réponses précises, rassurantes et honnêtes avant de demander une démonstration.
          </SectionTitle>
          <div className="lp4-faq">
            {faqItems.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}<ChevronDown size={18} /></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="lp4-final">
          <div className="lp4-final-orb" aria-hidden="true" />
          <span className="lp4-final-mark" aria-hidden="true">C</span>
          <h2>Structurez votre cabinet autour d’un cockpit IA clair.</h2>
          <p>
            COURTIA vous aide à structurer vos dossiers, prioriser vos actions et avancer avec plus de méthode,
            sans perdre la main sur vos décisions.
          </p>
          <div className="lp4-hero-actions">
            <Link className="lp4-btn lp4-btn-primary" to="/demo">Demander une démo <ArrowRight size={16} /></Link>
            <Link className="lp4-btn lp4-btn-secondary" to="/login">Se connecter</Link>
          </div>
        </section>
      </main>

      <footer className="lp4-footer">
        <span>COURTIA · Cockpit CRM IA pour courtiers en assurance</span>
        <nav aria-label="Liens légaux">
          <Link to="/mentions-legales">Mentions légales</Link>
          <Link to="/confidentialite">Confidentialité</Link>
          <Link to="/cgv">CGV</Link>
          <Link to="/demo">Démo</Link>
        </nav>
      </footer>
    </div>
  )
}
