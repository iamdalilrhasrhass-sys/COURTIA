import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Sparkles,
  AlertTriangle,
  BrainCircuit,
  CalendarClock,
  ShieldAlert,
  RefreshCcw,
  BarChart3,
  BookOpenCheck,
  Building2,
  Radar,
  Cpu,
  BadgeEuro,
  MessageSquare,
  Mail,
} from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import DemoRequestForm from '../components/marketing/DemoRequestForm'
import { trackMarketingEvent } from '../lib/marketingEvents'
import { applySeo } from '../lib/seo'

const CORE_FEATURES = [
  { icon: Radar, title: 'Cockpit quotidien', desc: 'Vue d\'ensemble immédiate sur les risques, échéances et actions prioritaires.' },
  { icon: ShieldAlert, title: 'Clients à risque', desc: 'Détection proactive des signaux de résiliation et plan de rétention recommandé.' },
  { icon: Building2, title: 'Fiche client 360', desc: 'Identité, contrats, tâches, notes, recommandations ARK et prochaine action.' },
  { icon: CalendarClock, title: 'Contrats & échéances', desc: 'Pilotage des renouvellements 30/60/90 jours pour ne rater aucune relance.' },
  { icon: RefreshCcw, title: 'Tâches intelligentes', desc: 'Priorisation métier et tri par urgence, statut, client et source ARK.' },
  { icon: BookOpenCheck, title: 'Morning Brief', desc: 'Plan de journée actionnable pour savoir quoi faire en premier dès 8h.' },
  { icon: CalendarClock, title: 'Google Agenda', desc: 'Synchronisation des rendez-vous pour préparer chaque échange client avec ARK.' },
  { icon: MessageSquare, title: 'WhatsApp Business', desc: 'Threads clients centralisés dans COURTIA avec suivi des messages non traités.' },
  { icon: Mail, title: 'Gmail / Outlook', desc: 'Architecture prête pour unifier les emails métier sans fuite de données sensibles.' },
  { icon: BarChart3, title: 'Rapports cabinet', desc: 'KPIs portefeuille, clients actifs, prospects, primes et retard opérationnel.' },
  { icon: Cpu, title: 'Admin Costs IA', desc: 'Suivi des coûts ARK, tendances d\'usage et export CSV côté super_admin.' },
  { icon: BrainCircuit, title: 'ARK métier natif', desc: 'Assistant courtage intégré aux pages, pas un chatbot déconnecté du contexte.' },
]

const FAQ = [
  {
    q: 'COURTIA remplace-t-il mon CRM actuel ?',
    a: 'COURTIA peut coexister au démarrage, puis devenir votre cockpit principal lorsque vos workflows sont migrés.',
  },
  {
    q: 'ARK prend-il des décisions seul ?',
    a: 'Non. ARK recommande, explique et priorise. Le courtier garde toujours la validation finale.',
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Oui. Authentification JWT, routes protégées, séparation des rôles, et exposition minimale des données marketing.',
  },
  {
    q: 'Est-ce adapté aux petits cabinets ?',
    a: 'Oui. Le plan Starter vise les indépendants et les cabinets de 1 à 5 collaborateurs.',
  },
  {
    q: 'Peut-on importer des clients ?',
    a: 'Oui. Import portefeuille prévu via CSV/Excel avec normalisation des colonnes métier.',
  },
  {
    q: 'Combien coûte COURTIA ?',
    a: 'Starter 89€ HT/mois, Pro 159€ HT/mois (offre principale), Cabinet/Premium sur devis.',
  },
]

export default function LandingPublic() {
  useEffect(() => {
    applySeo({
      title: 'COURTIA — Le cockpit IA des courtiers en assurance',
      description: 'Centralisez clients, contrats, tâches et priorités. ARK analyse votre portefeuille et indique les actions qui comptent.',
      canonicalPath: '/',
    })
  }, [])

  const onDemoClick = () => {
    trackMarketingEvent('click_demo_cta', { section: 'hero' })
  }

  const onPricingClick = () => {
    trackMarketingEvent('click_pricing', { section: 'hero' })
  }

  return (
    <MarketingShell activePath="/">
      <section className="mk-hero mk-section">
        <div className="mk-hero-grid">
          <div>
            <span className="mk-eyebrow"><Sparkles size={12} /> Le cockpit IA des courtiers en assurance</span>
            <h1 className="mk-h1">
              COURTIA
              <br />
              Le cockpit IA des courtiers en assurance
            </h1>
            <p className="mk-lead">
              Centralisez vos clients, contrats, tâches et priorités. ARK analyse votre portefeuille et vous indique chaque jour les actions qui comptent vraiment.
            </p>
            <div className="mk-hero-actions">
              <Link to="/demo" className="mk-button primary" onClick={onDemoClick}>
                Demander une démo <ArrowRight size={14} />
              </Link>
              <Link to="/demo" className="mk-button secondary" onClick={onDemoClick}>
                Rejoindre la bêta privée
              </Link>
            </div>
            <div className="mk-chip-row">
              {['Pensé pour les courtiers français', 'IA native ARK', 'Google Agenda', 'WhatsApp Business', 'Portefeuille vivant', 'Bêta privée'].map((chip) => (
                <span key={chip} className="mk-chip">{chip}</span>
              ))}
            </div>
          </div>

          <div className="mk-mock" aria-label="Aperçu cockpit COURTIA">
            <div className="mk-mock-head">
              <span className="mk-dot" style={{ background: '#ef4444' }} />
              <span className="mk-dot" style={{ background: '#f59e0b' }} />
              <span className="mk-dot" style={{ background: '#10b981' }} />
            </div>
            <div className="mk-mock-kpis">
              <div className="mk-mini-card">
                <p className="mk-mini-label">Clients à risque</p>
                <p className="mk-mini-value">12</p>
              </div>
              <div className="mk-mini-card">
                <p className="mk-mini-label">Échéances 30j</p>
                <p className="mk-mini-value">18</p>
              </div>
              <div className="mk-mini-card">
                <p className="mk-mini-label">Relances today</p>
                <p className="mk-mini-value">9</p>
              </div>
              <div className="mk-mini-card">
                <p className="mk-mini-label">Opportunités</p>
                <p className="mk-mini-value">7</p>
              </div>
            </div>
            <ul className="mk-list">
              <li><strong>Priorité ARK:</strong> relancer 3 clients à échéance &lt; 15 jours.</li>
              <li><strong>Risque:</strong> 2 clients silencieux depuis 90+ jours.</li>
              <li><strong>Action:</strong> proposer un multi-équipement sur 4 mono-contrats.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mk-section" id="probleme">
        <span className="mk-eyebrow"><AlertTriangle size={12} /> Le quotidien est saturé</span>
        <h2 className="mk-section-title">Le quotidien d\'un courtier est saturé</h2>
        <p className="mk-section-sub">
          Clients à suivre, échéances dispersées, relances oubliées, tâches éclatées, reporting peu actionnable: les outils généralistes n\'apportent pas la priorisation métier nécessaire.
        </p>
        <div className="mk-grid">
          {[
            'Trop de clients à suivre sans ordre clair.',
            'Échéances disséminées entre outils.',
            'Relances manuelles et parfois oubliées.',
            'Données non exploitées pour décider vite.',
            'Aucune vision opérationnelle quotidienne.',
            'CRM génériques peu alignés avec le courtage français.',
          ].map((line) => (
            <div key={line} className="mk-card"><p>{line}</p></div>
          ))}
        </div>
      </section>

      <section className="mk-section" id="solution">
        <span className="mk-eyebrow"><BrainCircuit size={12} /> Solution COURTIA</span>
        <h2 className="mk-section-title">COURTIA transforme votre portefeuille en plan d\'action</h2>
        <p className="mk-section-sub">
          ARK lit les signaux de vos dossiers, priorise ce qui doit être traité aujourd\'hui, recommande la prochaine action et relie chaque insight au client concerné.
        </p>
      </section>

      <section className="mk-section" id="features">
        <span className="mk-eyebrow"><Sparkles size={12} /> Fonctionnalités principales</span>
        <h2 className="mk-section-title">Un cockpit métier, pas une vitrine de gadgets</h2>
        <div className="mk-grid">
          {CORE_FEATURES.map((feature) => (
            <article key={feature.title} className="mk-card">
              <feature.icon size={18} color="#98eaff" />
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mk-section" id="integrations">
        <span className="mk-eyebrow"><CalendarClock size={12} /> Intégrations connectées</span>
        <h2 className="mk-section-title">Agenda, WhatsApp et email dans un seul cockpit</h2>
        <p className="mk-section-sub">
          COURTIA prépare et centralise les intégrations clés du courtier: Google Agenda, WhatsApp Business, Gmail et Outlook.
          Les connexions actives dépendent de votre configuration cabinet, sans faux statut \"connecté\".
        </p>
        <div className="mk-grid">
          <article className="mk-card">
            <h3>Google Agenda</h3>
            <p>Rendez-vous du jour, préparation ARK et liens clients dans la fiche 360.</p>
          </article>
          <article className="mk-card">
            <h3>WhatsApp Business</h3>
            <p>Messages entrants/sortants, templates de relance et suivi des réponses.</p>
          </article>
          <article className="mk-card">
            <h3>Gmail / Outlook</h3>
            <p>Architecture OAuth prête pour centraliser les échanges email métier.</p>
          </article>
          <article className="mk-card">
            <h3>Webhooks Make / Zapier</h3>
            <p>Automations prêtes via webhooks entrants/sortants (activation progressive cabinet).</p>
          </article>
        </div>
      </section>

      <section className="mk-section" id="ark">
        <span className="mk-eyebrow"><Cpu size={12} /> ARK</span>
        <h2 className="mk-section-title">ARK, votre copilote métier</h2>
        <p className="mk-section-sub">
          ARK vous aide à savoir qui relancer, préparer un rendez-vous, détecter un risque, identifier une opportunité et prioriser la journée sans blabla générique.
        </p>
        <div className="mk-split">
          <div className="mk-card">
            <h3>ARK agit sur vos signaux réels</h3>
            <ul className="mk-plain-list">
              <li>Relancer les échéances proches.</li>
              <li>Traiter les clients silencieux.</li>
              <li>Proposer du multi-équipement.</li>
              <li>Prioriser les tâches en retard.</li>
              <li>Préparer le plan de journée.</li>
            </ul>
          </div>
          <div className="mk-card">
            <h3>ARK reste sous contrôle courtier</h3>
            <ul className="mk-plain-list">
              <li>Aucune décision automatique irréversible.</li>
              <li>Recommandations expliquées et actionnables.</li>
              <li>Validation humaine avant exécution.</li>
              <li>Traçabilité des actions critiques.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mk-section" id="comparatif">
        <span className="mk-eyebrow"><BarChart3 size={12} /> CRM classique vs COURTIA</span>
        <h2 className="mk-section-title">Pourquoi COURTIA est différent d\'un CRM générique</h2>
        <div className="mk-table-wrap">
          <table className="mk-table">
            <thead>
              <tr>
                <th>CRM générique</th>
                <th>COURTIA</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Données statiques</td><td>Portefeuille vivant piloté par signaux</td></tr>
              <tr><td>Tâches manuelles peu priorisées</td><td>Priorités ARK par urgence métier</td></tr>
              <tr><td>Peu de logique assurance</td><td>Conçu pour le courtage français</td></tr>
              <tr><td>Reporting passif</td><td>Pilotage quotidien + actions recommandées</td></tr>
              <tr><td>IA gadget</td><td>IA native dans les workflows</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mk-section" id="tarifs">
        <span className="mk-eyebrow"><BadgeEuro size={12} /> Tarifs</span>
        <h2 className="mk-section-title">Plans pensés pour les cabinets courtiers</h2>
        <p className="mk-section-sub">L\'offre Pro à 159€ HT/mois est le cœur de la proposition COURTIA.</p>
        <div className="mk-price-grid">
          <article className="mk-price-card">
            <p className="mk-price-eyebrow">Starter</p>
            <p className="mk-price">89€ <small>HT/mois</small></p>
            <ul className="mk-plain-list">
              <li>Clients, contrats, tâches</li>
              <li>Dashboard et rapports essentiels</li>
              <li>Idéal indépendant / petit cabinet</li>
            </ul>
          </article>
          <article className="mk-price-card featured">
            <p className="mk-price-eyebrow">Pro (offre principale)</p>
            <p className="mk-price">159€ <small>HT/mois</small></p>
            <ul className="mk-plain-list">
              <li>Morning Brief + ARK avancé</li>
              <li>Clients à risque & relances intelligentes</li>
              <li>Rapports avancés + Admin Costs</li>
            </ul>
          </article>
          <article className="mk-price-card">
            <p className="mk-price-eyebrow">Cabinet / Premium</p>
            <p className="mk-price">Sur devis</p>
            <ul className="mk-plain-list">
              <li>Multi-utilisateurs et intégrations</li>
              <li>Accompagnement opérationnel</li>
              <li>Support renforcé</li>
            </ul>
          </article>
        </div>
        <div className="mk-hero-actions" style={{ marginTop: 14 }}>
          <Link to="/tarifs" className="mk-button secondary" onClick={onPricingClick}>Voir le détail des plans</Link>
          <Link to="/demo" className="mk-button primary" onClick={onDemoClick}>Réserver une démo</Link>
        </div>
      </section>

      <section className="mk-section" id="roi">
        <span className="mk-eyebrow"><BarChart3 size={12} /> Valeur métier</span>
        <h2 className="mk-section-title">Combien vaut une relance oubliée ?</h2>
        <p className="mk-section-sub">
          COURTIA ne promet pas de miracle. Le produit vise à mieux suivre le portefeuille et à réduire les oublis opérationnels.
        </p>
        <div className="mk-grid">
          {[
            'Repérer les clients à risque avant qu’ils ne partent.',
            'Préparer les rendez-vous avec le contexte client complet.',
            'Mieux suivre les échéances et les tâches prioritaires.',
            'Centraliser agenda, WhatsApp, emails et actions métier.',
            'Aider le cabinet à prioriser les dossiers à forte valeur.',
            'Réduire les pertes liées aux relances tardives ou manquées.',
          ].map((line) => (
            <article key={line} className="mk-card">
              <p>{line}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mk-section" id="social-proof">
        <span className="mk-eyebrow"><Sparkles size={12} /> Bêta privée</span>
        <h2 className="mk-section-title">Ouverture progressive aux premiers cabinets partenaires</h2>
        <p className="mk-section-sub">
          COURTIA est en phase de bêta privée avec une première vague de courtiers. Le produit est co-construit avec des professionnels du terrain, sans témoignages inventés.
        </p>
      </section>

      <section className="mk-section" id="demo-request">
        <span className="mk-eyebrow"><ArrowRight size={12} /> Demande de démo</span>
        <h2 className="mk-section-title">Votre portefeuille mérite mieux qu\'un tableau figé.</h2>
        <p className="mk-section-sub">
          Votre portefeuille devient vivant. Chaque matin, ARK transforme vos données en priorités actionnables.
        </p>
        <div style={{ marginTop: 16 }}>
          <DemoRequestForm />
        </div>
      </section>

      <section className="mk-section" id="faq">
        <span className="mk-eyebrow"><Sparkles size={12} /> FAQ</span>
        <h2 className="mk-section-title">Questions fréquentes</h2>
        <div className="mk-faq">
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </MarketingShell>
  )
}
