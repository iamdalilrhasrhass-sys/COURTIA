const BASE_URL = 'https://courtia.fr'

const clusters = {
  crm: {
    fr: '/fr/crm-courtier-assurance',
    'fr-CH': '/ch/fr/logiciel-courtier-assurance-suisse',
    'de-CH': '/ch/de/versicherungsmakler-software',
    'it-CH': '/ch/it/software-broker-assicurativo',
    'en-GB': '/uk/insurance-broker-crm',
    'en-US': '/us/insurance-agency-management-software',
    'x-default': '/us/insurance-agency-management-software',
  },
  ai: {
    fr: '/fr/ia-courtier-assurance',
    'fr-CH': '/ch/fr/logiciel-courtier-assurance-suisse',
    'de-CH': '/ch/de/versicherungsmakler-software',
    'it-CH': '/ch/it/software-broker-assicurativo',
    'en-GB': '/uk/insurance-agency-management-software',
    'en-US': '/us/ai-assistant-insurance-brokers',
    'x-default': '/us/ai-assistant-insurance-brokers',
  },
  operations: {
    fr: '/fr/logiciel-courtier-assurance',
    'fr-CH': '/ch/fr/logiciel-courtier-assurance-suisse',
    'de-CH': '/ch/de/versicherungsmakler-software',
    'it-CH': '/ch/it/software-broker-assicurativo',
    'en-GB': '/uk/insurance-agency-management-software',
    'en-US': '/us/insurance-agency-management-software',
    'x-default': '/us/insurance-agency-management-software',
  },
  followup: {
    fr: '/fr/relance-client-assurance',
    'fr-CH': '/ch/fr/logiciel-courtier-assurance-suisse',
    'de-CH': '/ch/de/versicherungsmakler-software',
    'it-CH': '/ch/it/software-broker-assicurativo',
    'en-GB': '/uk/insurance-broker-crm',
    'en-US': '/us/insurance-broker-crm',
    'x-default': '/us/insurance-broker-crm',
  },
}

const commonFaq = {
  fr: [
    ['COURTIA remplace-t-il un CRM courtier classique ?', 'COURTIA peut remplacer une partie du suivi commercial ou compléter un outil métier existant. La différence majeure est le cockpit opérationnel: clients, contrats, relances, dossiers, échéances et priorités ARK restent reliés au même portefeuille.'],
    ['ARK agit-il sans validation humaine ?', 'ARK prépare, priorise et signale. Le courtier garde la décision, la relation client, la validation des messages et l’arbitrage commercial.'],
    ['La solution convient-elle à un cabinet solo ?', 'Oui. Un courtier seul peut commencer avec une base structurée, puis passer à un pilotage plus offensif avec Pro lorsque le volume de clients, d’échéances et de relances augmente.'],
    ['Pourquoi cette page existe-t-elle ?', 'Cette page cible une recherche précise du marché courtage et explique comment COURTIA répond concrètement à ce besoin au lieu de présenter un argument générique.'],
  ],
  en: [
    ['Can COURTIA replace a generic CRM?', 'COURTIA can replace part of the commercial follow-up stack or complement an existing agency management system. Its edge is the operational cockpit: clients, contracts, follow-ups, files, renewals and ARK priorities remain connected to the same book.'],
    ['Does ARK act without human approval?', 'ARK prepares, prioritizes and signals. The broker keeps the decision, client relationship, message validation and commercial judgment.'],
    ['Does it work for a small agency?', 'Yes. A solo broker or small agency can start with structured follow-up, then move to a more aggressive portfolio rhythm as clients, renewals and tasks increase.'],
    ['Why does this page exist?', 'This page targets a precise broker market search and explains how COURTIA solves that need instead of repeating a generic SaaS pitch.'],
  ],
  de: [
    ['Ersetzt COURTIA ein klassisches Makler-CRM?', 'COURTIA kann einen Teil der kommerziellen Nachverfolgung ersetzen oder ein bestehendes System ergänzen. Der Unterschied liegt im operativen Cockpit: Kunden, Verträge, Aufgaben, Fristen und ARK-Prioritäten bleiben verbunden.'],
    ['Handelt ARK ohne menschliche Freigabe?', 'ARK bereitet vor, priorisiert und signalisiert. Der Makler behält Entscheidung, Kundenbeziehung, Nachrichtenfreigabe und kommerzielle Einschätzung.'],
    ['Eignet sich COURTIA für kleine Maklerbüros?', 'Ja. Ein kleines Büro kann mit strukturierter Nachverfolgung starten und später zu einem offensiveren Portfolio-Rhythmus wechseln.'],
    ['Warum existiert diese Seite?', 'Diese Seite zielt auf eine präzise Suche im Maklermarkt und erklärt konkret, wie COURTIA diesen Bedarf löst.'],
  ],
  it: [
    ['COURTIA sostituisce un CRM broker classico?', 'COURTIA può sostituire una parte del follow-up commerciale o completare un sistema esistente. La differenza è il cockpit operativo: clienti, contratti, follow-up, pratiche, scadenze e priorità ARK restano collegati.'],
    ['ARK agisce senza approvazione umana?', 'ARK prepara, prioritizza e segnala. Il broker mantiene decisione, relazione cliente, validazione dei messaggi e giudizio commerciale.'],
    ['Funziona per piccoli studi?', 'Sì. Un piccolo studio può iniziare con un follow-up strutturato e passare a un ritmo più offensivo quando aumentano clienti, rinnovi e attività.'],
    ['Perché esiste questa pagina?', 'Questa pagina risponde a una ricerca precisa del mercato broker e spiega come COURTIA risolve quel bisogno.'],
  ],
}

const pageSpecs = [
  {
    key: 'operations-fr',
    market: 'fr',
    lang: 'fr',
    cluster: 'operations',
    path: '/fr/logiciel-courtier-assurance',
    title: 'Logiciel courtier assurance pour gérer portefeuille et relances | COURTIA',
    h1: 'Logiciel courtier assurance: gestion, relances, échéances et portefeuille dans un cockpit unique',
    description: 'COURTIA aide les courtiers assurance à centraliser clients, contrats, relances, dossiers et échéances avec ARK, l’assistant IA qui prépare les priorités commerciales.',
    angle: 'Cette page existe pour répondre aux courtiers qui ne cherchent pas un CRM générique, mais un outil métier capable de protéger le portefeuille, préparer les appels et rendre le suivi quotidien exploitable.',
    marketContext: 'En France, un cabinet de courtage porte souvent une charge invisible: renouvellements à anticiper, pièces manquantes, relances prospects, opportunités multi-équipement et suivi client après signature. COURTIA structure ce rythme dans une interface pensée pour le cabinet.',
    sections: ['Pourquoi un logiciel courtier doit être vertical', 'Comment COURTIA organise le portefeuille', 'ARK transforme le suivi en actions commerciales', 'Pour quels cabinets cette page est faite', 'Différence avec un CRM générique'],
  },
  {
    key: 'crm-fr',
    market: 'fr',
    lang: 'fr',
    cluster: 'crm',
    path: '/fr/crm-courtier-assurance',
    title: 'CRM courtier assurance orienté portefeuille et suivi client | COURTIA',
    h1: 'CRM courtier assurance: transformer le suivi client en moteur commercial',
    description: 'Découvrez COURTIA, un CRM courtier assurance pensé pour relier fiches clients, contrats, tâches, relances, échéances et opportunités commerciales.',
    angle: 'Cette page cible les cabinets qui veulent sortir du tableur et des rappels dispersés sans adopter un CRM généraliste trop éloigné du courtage.',
    marketContext: 'Le CRM d’un courtier doit connaître les contrats, les échéances, les familles, les entreprises, les pièces attendues et les opportunités. COURTIA part du portefeuille réel, pas d’un pipeline commercial abstrait.',
    sections: ['Un CRM pensé pour les contrats', 'Suivi client et historique exploitable', 'Relances reliées aux opportunités', 'Scoring portefeuille', 'Pourquoi COURTIA n’est pas un CRM générique'],
  },
  {
    key: 'ai-fr',
    market: 'fr',
    lang: 'fr',
    cluster: 'ai',
    path: '/fr/ia-courtier-assurance',
    title: 'IA pour courtier assurance: assistant ARK et priorités | COURTIA',
    h1: 'IA pour courtier assurance: ARK prépare les relances, appels et dossiers prioritaires',
    description: 'ARK, l’assistant IA de COURTIA, aide les courtiers assurance à prioriser le portefeuille, préparer les appels, suivre les dossiers et détecter les rebonds.',
    angle: 'Cette page explique une IA utile au courtage: pas un gadget conversationnel, mais un assistant qui prépare les actions qui protègent et développent le chiffre.',
    marketContext: 'Les cabinets ont rarement besoin de plus de bruit. Ils ont besoin d’une hiérarchie claire: qui appeler, quelle échéance surveiller, quelle pièce réclamer, quelle opportunité traiter aujourd’hui.',
    sections: ['Ce que l’IA doit faire pour un courtier', 'ARK comme copilote opérationnel', 'Priorisation des appels', 'Suivi des dossiers incomplets', 'Contrôle humain et conformité'],
  },
  {
    key: 'portfolio-fr',
    market: 'fr',
    lang: 'fr',
    cluster: 'operations',
    path: '/fr/gestion-portefeuille-courtier',
    title: 'Gestion portefeuille courtier assurance et opportunités | COURTIA',
    h1: 'Gestion portefeuille courtier: voir les clients à protéger et les comptes à développer',
    description: 'COURTIA aide les cabinets de courtage à piloter leur portefeuille assurance avec scoring, échéances, relances, dossiers et opportunités centralisées.',
    angle: 'Cette page existe pour les cabinets qui savent que leur portefeuille contient du potentiel mais n’ont pas une méthode simple pour le traiter chaque jour.',
    marketContext: 'Un portefeuille n’est pas seulement une liste de clients. C’est un actif commercial vivant: contrats à renouveler, clients silencieux, familles mono-équipées, entreprises à recontacter et dossiers à sécuriser.',
    sections: ['Portefeuille vivant plutôt que base morte', 'Scoring des priorités', 'Rétention et développement', 'Rituels commerciaux', 'Pilotage dirigeant'],
  },
  {
    key: 'followup-fr',
    market: 'fr',
    lang: 'fr',
    cluster: 'followup',
    path: '/fr/relance-client-assurance',
    title: 'Relance client assurance: méthode et automatisation contrôlée | COURTIA',
    h1: 'Relance client assurance: ne plus laisser prospects, dossiers et renouvellements sortir du radar',
    description: 'COURTIA structure les relances client assurance avec contexte, timing, priorité, historique et validation humaine pour sécuriser le portefeuille.',
    angle: 'Cette page répond au problème le plus concret du cabinet: la relance dépend trop souvent de la mémoire, d’un post-it ou d’un tableur.',
    marketContext: 'La relance utile n’est pas un message automatique envoyé au hasard. Elle dépend du contrat, du contexte client, du moment commercial et de l’action attendue.',
    sections: ['Relance avec contexte', 'Prospects chauds', 'Clients silencieux', 'Échéances et renouvellements', 'Validation par le courtier'],
  },
  {
    key: 'ch-fr',
    market: 'ch-fr',
    lang: 'fr',
    cluster: 'operations',
    path: '/ch/fr/logiciel-courtier-assurance-suisse',
    title: 'Logiciel courtier assurance Suisse romande | COURTIA',
    h1: 'Logiciel courtier assurance Suisse: cockpit portefeuille pour cabinets romands',
    description: 'COURTIA accompagne les courtiers suisses avec un cockpit de suivi portefeuille, relances, échéances, dossiers, langues et priorités commerciales.',
    angle: 'Cette page cible la Suisse romande, avec un besoin de suivi rigoureux, de relation client durable et d’adaptation linguistique.',
    marketContext: 'En Suisse, la confiance, la précision du suivi et la capacité à travailler en plusieurs langues comptent autant que la puissance logicielle. COURTIA structure le quotidien sans noyer le cabinet.',
    sections: ['Contexte suisse romand', 'Suivi portefeuille multilingue', 'Relances et échéances', 'ARK dans un cabinet suisse', 'Déploiement progressif'],
  },
  {
    key: 'ch-de',
    market: 'ch-de',
    lang: 'de',
    cluster: 'operations',
    path: '/ch/de/versicherungsmakler-software',
    title: 'Versicherungsmakler Software Schweiz für Bestand und Follow-up | COURTIA',
    h1: 'Versicherungsmakler Software Schweiz: Bestand, Fristen und Follow-up in einem Cockpit',
    description: 'COURTIA unterstützt Schweizer Versicherungsmakler mit Kundenbestand, Vertragsfristen, Aufgaben, Follow-ups und ARK-Prioritäten in einem klaren Cockpit.',
    angle: 'Diese Seite richtet sich an Schweizer Maklerbüros, die kein generisches CRM suchen, sondern operative Klarheit im Bestand.',
    marketContext: 'Maklerarbeit in der Schweiz braucht Präzision, Vertrauen und Übersicht. COURTIA verbindet Bestand, Fristen, Dossiers und kommerzielle Prioritäten.',
    sections: ['Schweizer Maklerkontext', 'Bestandsarbeit statt Tabellen', 'Fristen und Aufgaben', 'ARK Prioritäten', 'Mehrsprachige Einführung'],
  },
  {
    key: 'ch-it',
    market: 'ch-it',
    lang: 'it',
    cluster: 'operations',
    path: '/ch/it/software-broker-assicurativo',
    title: 'Software broker assicurativo Svizzera per portafoglio e follow-up | COURTIA',
    h1: 'Software broker assicurativo Svizzera: portafoglio, scadenze e follow-up in un cockpit',
    description: 'COURTIA aiuta i broker assicurativi svizzeri a gestire clienti, contratti, scadenze, pratiche, follow-up e priorità commerciali con ARK.',
    angle: 'Questa pagina risponde agli studi svizzeri che vogliono un cockpit operativo per il portafoglio, non un CRM generico.',
    marketContext: 'Nel mercato svizzero contano precisione, fiducia e continuità. COURTIA mantiene collegati clienti, contratti, scadenze e azioni commerciali.',
    sections: ['Contesto broker svizzero', 'Portafoglio e contratti', 'Scadenze e follow-up', 'ARK per le priorità', 'Adozione multilingue'],
  },
  {
    key: 'uk-crm',
    market: 'uk',
    lang: 'en',
    cluster: 'crm',
    path: '/uk/insurance-broker-crm',
    title: 'Insurance broker CRM for UK agencies and renewals | COURTIA',
    h1: 'Insurance broker CRM for UK agencies: clients, renewals and follow-up in one cockpit',
    description: 'COURTIA gives UK insurance brokers a focused CRM for client follow-up, renewals, documents, tasks, opportunities and ARK commercial priorities.',
    angle: 'This page is for UK brokers who need a practical agency cockpit rather than a generic sales CRM.',
    marketContext: 'UK agencies need renewal discipline, client context, document tracking and follow-up rhythm. COURTIA turns the book into daily commercial priorities.',
    sections: ['Why broker CRM must be vertical', 'Renewal and client context', 'Follow-up rhythm', 'ARK commercial priorities', 'Team adoption'],
  },
  {
    key: 'uk-ops',
    market: 'uk',
    lang: 'en',
    cluster: 'operations',
    path: '/uk/insurance-agency-management-software',
    title: 'Insurance agency management software UK | COURTIA',
    h1: 'Insurance agency management software for UK brokers who want operational clarity',
    description: 'COURTIA helps UK insurance agencies manage clients, policies, renewals, tasks, follow-ups and commercial priorities without drowning in admin.',
    angle: 'This page targets agencies that want to recover selling time by structuring the operational load around the book.',
    marketContext: 'The daily work of an agency is not only sales. It is follow-up, policy context, renewals, missing documents and decisions. COURTIA makes that work visible and actionable.',
    sections: ['Operational load in brokerages', 'Portfolio cockpit', 'Renewal visibility', 'Client follow-up', 'Why COURTIA is not generic software'],
  },
  {
    key: 'us-crm',
    market: 'us',
    lang: 'en',
    cluster: 'followup',
    path: '/us/insurance-broker-crm',
    title: 'Insurance broker CRM for US producers and agencies | COURTIA',
    h1: 'Insurance broker CRM for US producers: follow-up, renewals and book growth',
    description: 'COURTIA helps US insurance producers and agencies centralize clients, policies, tasks, renewals, follow-ups and ARK priorities in one cockpit.',
    angle: 'This page targets producers who need book-of-business discipline, not another generic sales board.',
    marketContext: 'US agencies live on renewal discipline, producer follow-up, cross-sell timing and clean client context. COURTIA makes these signals operational.',
    sections: ['Book-of-business discipline', 'Producer follow-up', 'Renewal timing', 'Cross-sell opportunities', 'ARK as an agency assistant'],
  },
  {
    key: 'us-ops',
    market: 'us',
    lang: 'en',
    cluster: 'operations',
    path: '/us/insurance-agency-management-software',
    title: 'Insurance agency management software for US agencies | COURTIA',
    h1: 'Insurance agency management software for US teams that need follow-up discipline',
    description: 'COURTIA supports US insurance agencies with client management, renewals, tasks, documents, referrals, follow-ups and AI-assisted commercial priorities.',
    angle: 'This page exists for US agencies comparing agency management tools and looking for a lighter, commercial-first cockpit.',
    marketContext: 'Agency management should not hide the next action. COURTIA keeps client context, producer work, documents and renewals tied to revenue priorities.',
    sections: ['US agency operations', 'Client and policy context', 'Tasks and documents', 'Follow-up discipline', 'Scaling producer teams'],
  },
  {
    key: 'us-ai',
    market: 'us',
    lang: 'en',
    cluster: 'ai',
    path: '/us/ai-assistant-insurance-brokers',
    title: 'AI assistant for insurance brokers and agencies | COURTIA',
    h1: 'AI assistant for insurance brokers: ARK prepares calls, follow-ups and renewal priorities',
    description: 'ARK, the AI assistant inside COURTIA, helps insurance brokers prepare calls, track missing files, prioritize renewals and surface cross-sell opportunities.',
    angle: 'This page explains what useful AI means for agencies: not generic chat, but prepared actions tied to the book of business.',
    marketContext: 'AI creates value for agencies when it reduces missed follow-ups, improves timing and gives producers a clear plan. ARK is designed around that operational reality.',
    sections: ['AI that understands agency work', 'Prepared calls', 'Renewal priorities', 'Missing files and documents', 'Human control'],
  },
]

function getFaqForLang(lang) {
  return commonFaq[lang] || commonFaq.en
}

function absolute(path) {
  return `${BASE_URL}${path}`
}

function buildParagraphs(spec) {
  return [
    spec.angle,
    spec.marketContext,
    `COURTIA relie les clients, contrats, tâches, relances et dossiers dans une même logique de portefeuille. L’objectif n’est pas de créer un écran de plus, mais de faire remonter les actions qui protègent le revenu, améliorent la rétention et rendent les opportunités commerciales visibles au bon moment.`,
    `ARK ajoute une couche de préparation: appels prioritaires, relances avec contexte, dossiers incomplets, échéances sensibles et comptes à développer. Le courtier garde la relation et la décision; le logiciel réduit le bruit et prépare le terrain.`,
  ]
}

function makeSchema(page) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'COURTIA', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: page.market.toUpperCase(), item: absolute(page.path.split('/').slice(0, 2).join('/') || '/') },
        { '@type': 'ListItem', position: 3, name: page.h1, item: page.canonical },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer,
        },
      })),
    },
  ]
}

function makePage(spec) {
  const cluster = clusters[spec.cluster]
  const internalLinks = Object.values(cluster).filter((path, index, arr) => arr.indexOf(path) === index && path !== spec.path).slice(0, 6)
  const page = {
    ...spec,
    canonical: absolute(spec.path),
    hreflang: Object.fromEntries(Object.entries(cluster).map(([lang, path]) => [lang, absolute(path)])),
    paragraphs: buildParagraphs(spec),
    faq: getFaqForLang(spec.lang),
    internalLinks,
    updatedAt: '2026-06-15',
  }
  page.schema = makeSchema(page)
  return page
}

const seoPages = pageSpecs.map(makePage)

export function getSeoPages() {
  return seoPages
}

export function getSeoPageByPath(path) {
  return seoPages.find((page) => page.path === path)
}

export function buildSitemapXml() {
  const urls = seoPages.map((page) => {
    const links = Object.entries(page.hreflang)
      .map(([hreflang, href]) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}" />`)
      .join('\n')
    return `  <url>\n    <loc>${page.canonical}</loc>\n${links}\n    <lastmod>${page.updatedAt}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`
}

export function buildRobotsTxt() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`
}
