/* ============================================================================
   COURTIA — Démonstration : résolution des réponses d'API
   ----------------------------------------------------------------------------
   Chaque requête interceptée en mode démo est résolue ici, à partir du modèle
   synthétique de `donneesDemo.js`. Rien n'est inventé à l'écran : les réponses
   ont la forme attendue par les composants réels.

   Convention : `repondre(methode, chemin, corps)` renvoie `{ statut, donnees }`.
   Le repli (`defaut`) ne lève jamais : un écran qui appelle un endpoint non
   couvert reçoit une réponse vide cohérente plutôt qu'une erreur réseau.

   IMPORTANT : ce fichier est la seule frontière entre le produit et les données
   de démonstration. C'est ici — et nulle part ailleurs — que l'on adapte la
   démo quand l'API réelle évolue.
   ========================================================================== */

import {
  CABINET, CLIENTS, CONTRATS_DETAIL, TACHES, DOCUMENTS, OPPORTUNITES,
  PROSPECTS, MESSAGES, RENDEZ_VOUS, clientDetail, contratParId,
  statsPortefeuille, relancesDues, dossiersIncomplets, reponseArk, dateCourte, iso,
} from './donneesDemo'

/* ------------------------------------------------------------- utilitaires */
const nombre = (v, defaut) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : defaut
}

const paginer = (liste, params = {}) => {
  const page = nombre(params.page, 1)
  const limite = nombre(params.limit || params.per_page, 50)
  const debut = (page - 1) * limite
  const tranche = liste.slice(debut, debut + limite)
  return {
    data: tranche,
    clients: tranche,
    total: liste.length,
    page,
    limit: limite,
    pageSize: limite,
    totalPages: Math.max(1, Math.ceil(liste.length / limite)),
    hasMore: debut + limite < liste.length,
  }
}

const lireParams = (chemin) => {
  const i = chemin.indexOf('?')
  if (i < 0) return { chemin: chemin, params: {} }
  const brut = chemin.slice(i + 1)
  const params = {}
  for (const morceau of brut.split('&')) {
    const [k, v] = morceau.split('=')
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '')
  }
  return { chemin: chemin.slice(0, i), params }
}

/* ------------------------------------------------------- compte / facturation */
const UTILISATEUR = {
  id: 1,
  email: 'demo@cabinet-horizon.invalid',
  firstName: 'A.',
  lastName: 'Rochat',
  first_name: 'A.',
  last_name: 'Rochat',
  role: 'admin',
  cabinet_id: 1,
  cabinetId: 1,
  cabinetName: CABINET.nom,
  cabinet_name: CABINET.nom,
  is_demo: true,
}

const PLAN = {
  plan: 'pro',
  planId: 'pro',
  plan_id: 'pro',
  name: 'Pro',
  status: 'active',
  statut: 'actif',
  billingMode: 'demo',
  trial: false,
  seats: 5,
  seatsUsed: 2,
  usage: { tokens_used: 12480, tokens_limit: 250000, clients: CLIENTS.length, storage_mb: 42 },
  features: { ark: true, reach: true, capital: false, dda: true },
  limits: { clients: 500, tokens: 250000 },
}

/* ---------------------------------------------------------------------------
   Ligne de portefeuille : mêmes noms de champs BRUTS que l'API réelle, ceux
   lus par `normalizeClient` (src/lib/clientViewModel.js) :
     contracts_count · prime_annuelle_total · last_contact · segment · statut
   ------------------------------------------------------------------------- */
const ligneClient = (c) => {
  const contrats = CONTRATS_DETAIL.filter((k) => k.clientId === c.id)
  return {
    ...c,
    segment: c.type === 'entreprise' ? 'pro' : 'particulier',
    contracts_count: contrats.length,
    nb_contrats: contrats.length,
    prime_annuelle_total: contrats.reduce((a, k) => a + k.prime, 0),
    score: c.score,
    last_contact: c.dernierContact,
    ark: contrats.some((k) => k.echeance <= 30) ? 'Échéance proche' : null,
  }
}

/** Tableau enrichi de propriétés de pagination : certains écrans itèrent
 *  directement la réponse (`for (const c of res.data)` dans le moteur de
 *  priorités), d'autres lisent `.total` / `.page`. Un tableau supporte les deux. */
const listePaginee = (lignes, params) => {
  const page = nombre(params.page, 1)
  const limite = nombre(params.limit || params.per_page, 50)
  const tranche = lignes.slice((page - 1) * limite, (page - 1) * limite + limite)
  tranche.data = tranche
  tranche.clients = tranche
  tranche.total = lignes.length
  tranche.page = page
  tranche.limit = limite
  tranche.totalPages = Math.max(1, Math.ceil(lignes.length / limite))
  tranche.hasMore = (page - 1) * limite + limite < lignes.length
  return tranche
}

/* ============================================================== ROUTAGE ==== */
export function repondre(methode, cheminBrut, corps) {
  const { chemin, params } = lireParams(cheminBrut)
  const M = methode.toUpperCase()
  const morceaux = chemin.split('/').filter(Boolean)

  /* ------------------------------------------------ identité et abonnement */
  if (chemin === '/auth/me') return { statut: 200, donnees: { user: UTILISATEUR, data: UTILISATEUR, ...UTILISATEUR } }
  if (chemin === '/auth/login' || chemin === '/auth/register') {
    return { statut: 200, donnees: { message: 'Connexion réussie', user: UTILISATEUR, token: null } }
  }
  if (chemin === '/billing/me' || chemin === '/plans/info' || chemin === '/billing/status') {
    return { statut: 200, donnees: { ...PLAN, data: PLAN, plan_info: PLAN } }
  }
  if (chemin === '/billing/usage' || chemin === '/ark/my-usage') {
    return { statut: 200, donnees: { ...PLAN.usage, data: PLAN.usage } }
  }
  if (chemin === '/feature-flags') {
    return { statut: 200, donnees: { flags: {}, data: {} } }
  }
  if (chemin === '/notifications') {
    return { statut: 200, donnees: { data: [], notifications: [], unread: 0, total: 0 } }
  }

  /* -------------------------------------------------------------- tableau de bord */
  if (chemin === '/dashboard/stats' || chemin === '/portfolio/health-score') {
    const s = statsPortefeuille()
    const charge = {
      clients: s.clients, clientsActifs: s.clientsActifs, contrats: s.contrats,
      primes: s.primes, total_primes: s.primes, primeMoyenne: s.primeMoyenne,
      // Champs réellement lus par l'écran Cockpit : sans eux, il retombe sur ses
      // valeurs de repli codées en dur (312 contrats, 248 000 €).
      contratsActifs: s.contrats, primeTotale: s.primes,
      clientsParStatut: { actif: s.clientsActifs, prospect: 0, inactif: 0 },
      score_moyen: s.scoreMoyen, scoreMoyen: s.scoreMoyen, health_score: s.scoreMoyen,
      aProteger: s.aProteger, a_proteger: s.aProteger,
      aDevelopper: s.aDevelopper, a_developper: s.aDevelopper,
      echeances30j: s.echeances30j, echeances_30j: s.echeances30j,
      taches_ouvertes: s.tachesOuvertes, tachesOuvertes: s.tachesOuvertes,
      documents_attendus: s.documentsAttendus, documentsAttendus: s.documentsAttendus,
      opportunites: s.opportunites, prospects: s.prospects,
      messages_non_lus: s.messagesNonLus, messagesNonLus: s.messagesNonLus,
    }
    // Payload complet de l'API réelle (backend/src/routes/dashboard.js) : les
    // écrans de pilotage lisent ces champs-là, pas seulement les 4 du cockpit.
    const revenus6Mois = [5200, 5450, 5300, 5900, 6120, 6400].map((revenue, i) => ({
      mois: ['Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep'][i], revenue,
    }))
    const complet = {
      ...charge,
      totalClients: s.clients,
      commissionsMois: Math.round(s.primes / 12),
      contratsUrgents: s.echeances30j,
      tauxConversion: 75,
      scoreRisqueMoyen: s.scoreMoyen,
      clientsParSegment: {
        professionnel: CLIENTS.filter((c) => c.type === 'entreprise').length,
        particulier: CLIENTS.filter((c) => c.type !== 'entreprise').length,
      },
      revenus6Mois,
      typesContrats: CONTRATS_DETAIL.reduce((acc, c) => {
        const t = acc.find((x) => x.type === c.type)
        if (t) { t.count += 1; t.total_primes += c.prime } else { acc.push({ type: c.type, count: 1, total_primes: c.prime }) }
        return acc
      }, []),
      alertes: CONTRATS_DETAIL.filter((c) => c.echeance <= 30).map((c) => ({
        nom: c.nomClient, prenom: '', type_contrat: c.type,
        date_echeance: dateCourte(c.echeance), jours_restants: c.echeance,
      })),
      clientsRecents: CLIENTS.slice(0, 5).map((c) => ({
        id: c.id, nom: c.nom, prenom: c.prenom || '', statut: 'actif',
        score_risque: c.score, created_at: iso(-30),
      })),
    }
    return { statut: 200, donnees: { ...complet, data: complet, stats: complet } }
  }

  /* -------------------------------------------------------------------- clients */
  if (chemin === '/clients' && M === 'GET') {
    const recherche = (params.search || '').toLowerCase()
    let liste = CLIENTS.map(ligneClient)
    if (recherche) liste = liste.filter((c) => c.nom.toLowerCase().includes(recherche))
    return { statut: 200, donnees: listePaginee(liste, params) }
  }
  if (morceaux[0] === 'clients' && morceaux.length >= 2) {
    const id = Number(morceaux[1])
    if (morceaux[2] === 'contracts' || morceaux[2] === 'contrats') {
      return { statut: 200, donnees: { data: CONTRATS_DETAIL.filter((c) => c.clientId === id), contracts: CONTRATS_DETAIL.filter((c) => c.clientId === id) } }
    }
    if (morceaux[2] === 'score') {
      const c = CLIENTS.find((x) => x.id === id)
      return { statut: 200, donnees: { score: c?.score ?? 0, data: { score: c?.score ?? 0 } } }
    }
    const detail = clientDetail(id)
    if (!detail) return { statut: 404, donnees: { error: 'client_not_found' } }
    return { statut: 200, donnees: { ...detail, data: detail, client: detail } }
  }

  /* ------------------------------------------------------------------- contrats */
  if ((chemin === '/contrats' || chemin === '/contracts') && M === 'GET') {
    // ClientDetail fait `Array.isArray(res.data) ? res.data : []` :
    // une enveloppe { data: [...] } ferait disparaître les contrats SANS erreur.
    const clientId = Number(params.client_id || params.clientId)
    const source = clientId ? CONTRATS_DETAIL.filter((c) => c.clientId === clientId) : CONTRATS_DETAIL
    const liste = source.map((c) => ({
      id: c.id, type_contrat: c.type, type: c.type,
      compagnie: c.compagnie, company: c.compagnie,
      prime_annuelle: c.prime, prime: c.prime,
      date_echeance: dateCourte(c.echeance), echeance: dateCourte(c.echeance),
      statut: c.statut, status: c.statut,
      client_id: c.clientId, numero: c.numero,
    }))
    const arr = liste.slice()
    arr.data = arr; arr.contrats = arr; arr.contracts = arr; arr.total = arr.length
    return { statut: 200, donnees: arr }
  }
  if ((morceaux[0] === 'contrats' || morceaux[0] === 'contracts') && morceaux[1]) {
    const c = contratParId(morceaux[1])
    return c ? { statut: 200, donnees: { ...c, data: c, contract: c } }
             : { statut: 404, donnees: { error: 'contract_not_found' } }
  }

  /* --------------------------------------------------------------------- tâches */
  if (chemin === '/taches' && M === 'GET') {
    const clientId = Number(params.clientId || params.client_id)
    const source = clientId ? TACHES.filter((t) => t.clientId === clientId) : TACHES
    // Champs bruts attendus par le moteur de priorités local (src/lib/priorities.js)
    const liste = source.map((t) => ({
      ...t,
      client_id: t.clientId,
      date_echeance: t.dateEcheance,
      created_at: t.createdAt,
      statut: t.echeance < 0 ? 'en_retard' : 'a_faire',
    }))
    // Même contrainte : ClientDetail lit un tableau nu.
    const arr = liste.slice()
    arr.data = arr; arr.taches = arr; arr.tasks = arr; arr.total = arr.length
    return { statut: 200, donnees: arr }
  }

  /* ------------------------------------------------------------------ relances */
  if (chemin === '/relances' || chemin === '/relances/stats') {
    const dues = relancesDues()
    if (chemin.endsWith('/stats')) {
      return { statut: 200, donnees: {
        period_days: 30,
        totals: {
          total: dues.length, pending: dues.length, sent: 6,
          urgent_pending: dues.filter((t) => t.echeance < 0).length, ai_generated: dues.length,
        },
        period: { sent: 6, responses: 3, taux_reponse: 43 },
        by_type: [{ type: 'devis', count: dues.length }],
        by_channel: [{ channel: 'phone', count: dues.length }],
      } }
    }
    const TYPES = ['devis', 'echeance', 'silencieux', 'document', 'opportunite', 'prospect']
    const liste = dues.map((t, i) => {
      const c = t.client
      return {
        id: t.id,
        client_id: t.clientId || 0,
        client_name: c ? c.nom : (t.nomClient || 'Client inconnu'),
        client_email: c ? c.email : null,
        client_phone: c ? c.telephone : null,
        quote_id: 900 + i,
        quote_reference: `DEV-2026-${String(271 + i).padStart(4, '0')}`,
        quote_product: c ? (CONTRATS_DETAIL.find((k) => k.clientId === c.id)?.type || 'Contrat') : 'Contrat',
        type: TYPES[i % TYPES.length],
        channel: 'phone',          // évite toute tentative d'envoi réel
        priority: t.echeance < 0 ? 'high' : 'medium',
        status: 'pending',
        subject: t.titre,
        content: `Bonjour, je reviens vers vous concernant votre dossier.`,
        scheduled_at: t.createdAt,
        sent_at: null,
        ai_generated: true,
        ai_reasoning: t.echeance < 0
          ? `Relance en retard de ${Math.abs(t.echeance)} jours.`
          : 'Relance due aujourd’hui.',
        response_received: false,
        created_at: t.createdAt,
        metadata: { produit: t.type, potentiel: 1200, amount: 1200 },
      }
    })
    return { statut: 200, donnees: {
      relances: liste, data: liste, total: liste.length,
      pagination: { limit: liste.length, offset: 0 },
    } }
  }

  /* ------------------------------------------------------------------ documents */
  if (chemin === '/documents' && M === 'GET') {
    return { statut: 200, donnees: { ...paginer(DOCUMENTS, params), documents: DOCUMENTS } }
  }
  if (chemin === '/document-inbox/checklist' || chemin === '/document-inbox/stats') {
    const attendus = DOCUMENTS.filter((d) => d.statut !== 'recu')
    return { statut: 200, donnees: {
      checklist: attendus, documents: attendus, stats: { attendus: attendus.length, recus: DOCUMENTS.length - attendus.length },
      data: attendus,
    } }
  }
  if (morceaux[0] === 'document-inbox') {
    return { statut: 200, donnees: { data: DOCUMENTS.filter((d) => d.statut !== 'recu'), documents: DOCUMENTS.filter((d) => d.statut !== 'recu') } }
  }

  /* --------------------------------------------------------------- opportunités */
  if (chemin === '/opportunites' || chemin === '/opportunities') {
    return { statut: 200, donnees: { ...paginer(OPPORTUNITES, params), opportunites: OPPORTUNITES, data: OPPORTUNITES } }
  }

  /* ---------------------------------------------------------------- prospection */
  if (chemin === '/prospection' || chemin === '/prospects') {
    return { statut: 200, donnees: { ...paginer(PROSPECTS, params), prospects: PROSPECTS, data: PROSPECTS } }
  }

  /* ------------------------------------------------- widgets du tableau de bord
     Ces composants suivent le contrat `{ success, <champ nommé> }` : ils font
     `if (d.success) setX(d.x)`. Renvoyer `success: true` sans le champ nommé
     leur ferait stocker `undefined` — donc planter à l'écran suivant. */
  if (chemin.startsWith('/email/inbox')) {
    return { statut: 200, donnees: { success: true, inbox: MESSAGES, messages: MESSAGES, data: MESSAGES, total: MESSAGES.length } }
  }
  if (chemin === '/voice/settings') {
    return { statut: 200, donnees: { success: true, settings: {
      enabled: false, greeting: 'Bonjour, cabinet Horizon Assurances.',
      record: true, transcribe: true, callback: false,
    } } }
  }
  if (chemin.startsWith('/voice/history')) {
    const appels = RENDEZ_VOUS.slice(0, 3).map((r) => ({
      id: r.id, direction: 'sortant', client: r.titre, duree: 240,
      statut: 'termine', date: r.debut, resume: 'Échange de suivi, documents demandés.',
    }))
    return { statut: 200, donnees: { success: true, history: appels, data: appels } }
  }
  if (chemin === '/dda/dashboard') {
    // Contrat exact attendu par DDACompliance :
    //   dashboard.stats.{total,conforme,partiel,non_conforme,at_risk,avg_score}
    //   dashboard.worst[].{client_id,client_name,compliance_level,global_score,missing_items}
    const niveaux = ['conforme', 'partiel', 'non_conforme', 'at_risk', 'conforme']
    const notes = [94, 78, 61, 52, 88]
    const worst = CLIENTS.slice(0, 5).map((c, i) => ({
      client_id: c.id,
      client_name: c.nom,
      compliance_level: niveaux[i],
      global_score: notes[i],
      missing_items: i === 2 ? 3 : i === 3 ? 2 : i === 1 ? 1 : 0,
    }))
    return { statut: 200, donnees: { success: true, dashboard: {
      stats: {
        total: worst.length,
        conforme: worst.filter((w) => w.compliance_level === 'conforme').length,
        partiel: worst.filter((w) => w.compliance_level === 'partiel').length,
        non_conforme: worst.filter((w) => w.compliance_level === 'non_conforme').length,
        at_risk: worst.filter((w) => w.compliance_level === 'at_risk').length,
        avg_score: Math.round(worst.reduce((a, w) => a + w.global_score, 0) / worst.length),
      },
      worst,
    } } }
  }
  if (chemin === '/appointments') {
    return { statut: 200, donnees: { data: RENDEZ_VOUS, appointments: RENDEZ_VOUS, rendezVous: RENDEZ_VOUS } }
  }
  if (chemin === '/calendar/events/today') {
    return { statut: 200, donnees: { data: RENDEZ_VOUS, events: RENDEZ_VOUS } }
  }

  /* ------------------------------------------------------------------------ ARK
     Le cœur de la démonstration. La réponse est CALCULÉE depuis les données,
     jamais écrite en dur : si le jeu de démonstration change, la réponse change. */
  if (chemin === '/ark/chat' || chemin === '/ark-chat/message' || chemin === '/ark/chat/message') {
    const question = (corps && (corps.message || corps.question || corps.prompt)) || ''
    const texte = reponseArk(String(question))
    return { statut: 200, donnees: {
      response: texte, message: texte, answer: texte, content: texte, text: texte,
      data: { response: texte, message: texte },
      model: 'demo', tokens: 0,
    } }
  }
  if (chemin === '/ark-chat/suggestions' || chemin.startsWith('/ark/suggestions')) {
    const suggestions = [
      'Quels dossiers sont incomplets ?',
      'Quels prospects dois-je rappeler aujourd’hui ?',
      'Quelles échéances arrivent dans 30 jours ?',
      'Quelles opportunités ai-je sur mon portefeuille ?',
    ]
    return { statut: 200, donnees: { suggestions, data: suggestions } }
  }
  if (chemin.startsWith('/ark/history') || chemin.startsWith('/ark-chat/history')) {
    return { statut: 200, donnees: { messages: [], history: [], data: [] } }
  }
  if (chemin === '/ark-chat/context') {
    return { statut: 200, donnees: {
      cabinet: CABINET.nom, stats: statsPortefeuille(), data: statsPortefeuille(),
    } }
  }

  /* -------------------------------------------------------- ARK Intelligence
     Contrats relevés dans pages/ArkIntelligence.jsx. `products` et
     `opportunities` sont OBLIGATOIRES : le composant appelle
     `data.products.map()` et `c.opportunities.find()` — leur absence le fait
     planter dès qu'un client est présent. */
  if (chemin === '/ark-intelligence/churn-predict') {
    const top = CLIENTS.slice(0, 5).map((c, i) => ({
      client_id: c.id,
      client_name: c.nom,
      risk_level: ['eleve', 'critique', 'modere', 'faible', 'modere'][i],
      score: [52, 38, 68, 88, 72][i],
      churn_score: [52, 38, 68, 88, 72][i],
      lifetime_value: CONTRATS_DETAIL.filter((k) => k.clientId === c.id).reduce((a, k) => a + k.prime, 0),
      city: c.ville,
      factors: ['Aucun contact depuis 45 jours', 'Échéance à moins de 30 jours'],
      retention_plan: { steps: ['Appeler sous 48 h', 'Proposer une révision de garantie'], cost_eur: 0 },
    }))
    return { statut: 200, donnees: {
      at_risk_count: top.filter((t) => t.risk_level !== 'faible').length,
      top_risks: top, data: top, total: top.length,
    } }
  }
  if (chemin === '/ark-intelligence/cross-sell/matrix') {
    const produits = ['Prévoyance 3a', 'Protection juridique', 'Ménage', 'Prévoyance décès']
    const clients = CLIENTS.slice(0, 6).map((c) => {
      const detenus = CONTRATS_DETAIL.filter((k) => k.clientId === c.id).map((k) => k.type)
      const opps = produits.filter((p) => !detenus.includes(p)).slice(0, 2).map((p, i) => ({
        product: p,
        score: 82 - i * 11,
        estimated_eur: 900 - i * 320,
        estimated_revenue: 900 - i * 320,
        status: i === 0 ? 'owned' : 'opportunity',
        rationale: `Absent du dossier ${c.nom} — couverture à proposer.`,
      }))
      return {
        client_id: c.id, client_name: c.nom, city: c.ville, score: c.score,
        total_opportunity_eur: opps.reduce((a, o) => a + o.estimated_eur, 0),
        opportunities: opps,
      }
    })
    return { statut: 200, donnees: {
      clients, products: produits,
      total_potential_eur: clients.reduce((a, c) => a + c.total_opportunity_eur, 0),
    } }
  }
  if (chemin === '/ark-intelligence/renewals/optimize') {
    const proches = CONTRATS_DETAIL.filter((c) => c.echeance <= 90).sort((a, b) => a.echeance - b.echeance)
    const renewals = proches.map((c, i) => ({
      contract_id: c.id,
      days_to_echeance: c.echeance,
      recommendation: i % 2 === 0 ? 'migrate' : 'renew',
      client_name: c.nomClient,
      product: c.type,
      rationale: i % 2 === 0
        ? 'Prime supérieure à la moyenne du portefeuille — mise en concurrence conseillée.'
        : 'Prime cohérente — renouvellement à confirmer.',
      current_provider: c.compagnie,
      current_premium_eur: c.prime,
      recommended_provider: i % 2 === 0 ? 'Helios Protection' : c.compagnie,
      saving_eur: i % 2 === 0 ? Math.round(c.prime * 0.12) : 0,
    }))
    return { statut: 200, donnees: {
      renewals, data: renewals,
      total_contracts_90d: renewals.length,
      migrate_count: renewals.filter((r) => r.recommendation === 'migrate').length,
      renew_count: renewals.filter((r) => r.recommendation !== 'migrate').length,
      total_potential_saving_eur: renewals.reduce((a, r) => a + r.saving_eur, 0),
    } }
  }

  /* ----------------------------------------------------------------------- REACH */
  if (chemin === '/reach/dashboard' || chemin === '/reach/prospects' || chemin === '/reach/campaigns') {
    const liste = chemin.endsWith('/campaigns') ? [] : PROSPECTS
    return { statut: 200, donnees: { ...paginer(liste, params), data: liste, prospects: liste, campaigns: [] } }
  }
  if (chemin.startsWith('/reach/')) {
    return { statut: 200, donnees: { data: [], stats: {}, settings: {} } }
  }

  /* --------------------------------------------------------------------- divers */
  if (chemin === '/templates' || chemin === '/cabinet/members') {
    return { statut: 200, donnees: { data: [], total: 0 } }
  }
  if (chemin === '/integrations/connectors' || chemin === '/integrations/status') {
    return { statut: 200, donnees: { data: [], connectors: [], integrations: [] } }
  }
  if (chemin === '/messaging/channels') {
    return { statut: 200, donnees: { data: [], channels: [] } }
  }
  if (chemin === '/search') {
    const q = (params.q || '').toLowerCase()
    const trouve = q ? CLIENTS.filter((c) => c.nom.toLowerCase().includes(q)) : []
    return { statut: 200, donnees: { data: trouve, results: trouve } }
  }

  /* ---------------------------------------------------------------------- repli
     Réponse vide mais cohérente : un écran non couvert s'affiche sans données
     plutôt que de tomber en erreur. Aucun appel réseau n'est émis. */
  // Repli volontairement « sans succès » : les composants qui suivent le contrat
  // `if (d.success) setX(...)` conservent alors leur état initial au lieu de
  // stocker `undefined` et de casser au rendu suivant.
  if (M === 'GET') {
    return { statut: 200, donnees: { success: false, data: [], total: 0, demo: true } }
  }
  return { statut: 200, donnees: { success: false, demo: true, data: null } }
}
