/**
 * COURTIA REACH — Mock Service
 * Génère des données FR réalistes quand les API externes sont absentes.
 * Spécialisé assurance : prospects cohérents pour courtiers.
 */

const FRENCH_CITIES = [
  { city: 'Paris', cp: '75001', lat: 48.8566, lng: 2.3522 },
  { city: 'Lyon', cp: '69001', lat: 45.7640, lng: 4.8357 },
  { city: 'Marseille', cp: '13001', lat: 43.2965, lng: 5.3698 },
  { city: 'Bordeaux', cp: '33000', lat: 44.8378, lng: -0.5792 },
  { city: 'Lille', cp: '59000', lat: 50.6292, lng: 3.0573 },
  { city: 'Nantes', cp: '44000', lat: 47.2184, lng: -1.5536 },
  { city: 'Strasbourg', cp: '67000', lat: 48.5734, lng: 7.7521 },
  { city: 'Toulouse', cp: '31000', lat: 43.6047, lng: 1.4442 },
  { city: 'Nice', cp: '06000', lat: 43.7102, lng: 7.2620 },
  { city: 'Montpellier', cp: '34000', lat: 43.6108, lng: 3.8767 },
  { city: 'Rennes', cp: '35000', lat: 48.1173, lng: -1.6778 },
  { city: 'Sens', cp: '89100', lat: 48.1975, lng: 3.2832 },
  { city: 'Montereau', cp: '77130', lat: 48.3845, lng: 2.9564 },
  { city: 'Melun', cp: '77000', lat: 48.5391, lng: 2.6590 },
  { city: 'Fontainebleau', cp: '77300', lat: 48.4047, lng: 2.7016 },
  { city: 'Boulogne-Billancourt', cp: '92100', lat: 48.8357, lng: 2.2479 },
  { city: 'Auxerre', cp: '89000', lat: 47.7986, lng: 3.5672 },
  { city: 'Dijon', cp: '21000', lat: 47.3220, lng: 5.0415 },
  { city: 'Reims', cp: '51100', lat: 49.2628, lng: 4.0347 },
  { city: 'Grenoble', cp: '38000', lat: 45.1885, lng: 5.7245 },
];

const CATEGORIES = {
  garage: {
    label: 'Garage automobile',
    niches: ['auto_pro', 'flotte_auto', 'multirisque_pro'],
    names: ['Garage du Centre', 'Auto Service Premium', 'Garage des Alpes', 'Mécanique Express', 'Carrosserie Moderne', 'Speedy Auto', 'Garage Saint-Martin', 'Automobiles & Services'],
    insuranceNeeds: ['flotte_auto', 'rc_pro', 'multirisque_professionnelle', 'local_commercial'],
  },
  agent_assurance: {
    label: 'Agent général d\'assurance',
    niches: ['rc_pro', 'prevoyance', 'multirisque'],
    names: ['AGF Assurances', 'Cabinet Martin Assurances', 'Assurances du Centre', 'Générali Assurances', 'AXA Agence Conseil'],
    insuranceNeeds: ['acquisition_clients', 'productivite', 'crm'],
  },
  courtier: {
    label: 'Courtier en assurance',
    niches: ['rc_pro', 'prevoyance', 'multirisque'],
    names: ['Courtage & Conseil', 'Assur Pro Courtier', 'Cabinet Courtage Dupont', 'Courtier Plus', 'Solutions Assurances'],
    insuranceNeeds: ['acquisition_clients', 'productivite', 'crm'],
  },
  artisan: {
    label: 'Artisan du bâtiment',
    niches: ['decennale', 'rc_pro', 'prevoyance'],
    names: ['Bâtiment Rénovation', 'Construction Moderne', 'Maçonnerie Express', 'Électricité Générale', 'Plomberie Sanitaire'],
    insuranceNeeds: ['decennale', 'rc_pro', 'vehicule_utilitaire', 'prevoyance'],
  },
  taxi_vtc: {
    label: 'Taxi / VTC',
    niches: ['auto_pro', 'flotte', 'prevoyance'],
    names: ['Taxi Premium', 'VTC Confort', 'Taxi Express', 'Transport Elite', 'VTC Business'],
    insuranceNeeds: ['assurance_taxi_vtc', 'rc_circulation', 'flotte_auto', 'protection_revenu'],
  },
  restaurant: {
    label: 'Restaurant',
    niches: ['multirisque', 'local_commercial', 'sante_collective'],
    names: ['Le Bistrot Gourmand', 'Restaurant du Marché', 'La Table Française', 'Saveurs & Tradition', 'Brasserie Centrale'],
    insuranceNeeds: ['multirisque_professionnelle', 'perte_exploitation', 'local_commercial', 'sante_collective'],
  },
  mandataire: {
    label: 'Mandataire immobilier',
    niches: ['rc_pro', 'prevoyance', 'protection_juridique'],
    names: ['Immo Conseil', 'Habitat Prestige', 'Transaction Plus', 'Gestion Immo', 'Terrain & Maison'],
    insuranceNeeds: ['rc_pro', 'protection_juridique', 'prevoyance', 'prospection'],
  },
};

const FRENCH_FIRST_NAMES = ['Jean', 'Pierre', 'Marie', 'Sophie', 'Laurent', 'Nathalie', 'Philippe', 'Isabelle', 'François', 'Catherine', 'Michel', 'Caroline', 'David', 'Anne', 'Thomas', 'Julie', 'Nicolas', 'Stéphanie', 'Alexandre', 'Valérie'];
const FRENCH_LAST_NAMES = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function generatePhone() {
  return `+33 ${rand(1,7)} ${String(rand(10,99)).padStart(2,'0')} ${String(rand(10,99)).padStart(2,'0')} ${String(rand(10,99)).padStart(2,'0')} ${String(rand(10,99)).padStart(2,'0')}`;
}
function generateEmail(companyName) {
  const domains = ['gmail.com', 'orange.fr', 'free.fr', 'laposte.net', 'sfr.fr'];
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12);
  return `${slug}@${pick(domains)}`;
}

// ─── GÉNÉRER DES PROSPECTS ────────────────────────────────────────
function generateProspects({ category, city, count = 10 }) {
  const cityData = FRENCH_CITIES.find(c => c.city.toLowerCase() === city?.toLowerCase()) || pick(FRENCH_CITIES);
  const catInfo = CATEGORIES[category] || pick(Object.values(CATEGORIES));

  const prospects = [];
  for (let i = 0; i < count; i++) {
    const isCourtierBroker = category === 'courtier' || category === 'agent_assurance';
    const companyName = pick(catInfo.names) + (rand(0,1) ? ` ${pick(['& Associés', 'et Fils', 'SARL', 'EURL', ''])}` : '');
    const niche = pick(catInfo.insuranceNeeds);
    const rating = (rand(30, 50) / 10).toFixed(1);
    const reviewCount = rand(5, 200);

    prospects.push({
      company_name: companyName.trim(),
      contact_first_name: pick(FRENCH_FIRST_NAMES),
      contact_last_name: pick(FRENCH_LAST_NAMES),
      role: isCourtierBroker ? pick(['Courtier', 'Agent général', 'Directeur', 'Associé']) : 'Gérant',
      category,
      niche,
      city: cityData.city,
      address: `${rand(1,150)} ${pick(['rue', 'avenue', 'boulevard', 'place'])} ${pick(['de la République', 'du Général de Gaulle', 'Victor Hugo', 'Jean Jaurès', 'des Lilas', 'du Commerce'])}`,
      phone: generatePhone(),
      email: generateEmail(companyName),
      website: Math.random() > 0.3 ? `https://www.${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.fr` : '',
      rating: parseFloat(rating),
      review_count: reviewCount,
      latitude: cityData.lat + (Math.random() - 0.5) * 0.04,
      longitude: cityData.lng + (Math.random() - 0.5) * 0.04,
      google_maps_url: `https://maps.google.com/?q=${encodeURIComponent(companyName + ' ' + cityData.city)}`,
      insurance_need: niche,
      estimated_annual_premium: isCourtierBroker ? rand(1500, 4000) : rand(2000, 15000),
      raw_data: {},
    });
  }
  return prospects;
}

// ─── GÉNÉRER UNE ANALYSE ──────────────────────────────────────────
function generateAnalysis(prospect) {
  const cat = prospect.category;
  const rating = parseFloat(prospect.rating) || 4.0;

  const baseScores = {
    garage: { opp: 72, urg: 55, ease: 65 },
    agent_assurance: { opp: 55, urg: 40, ease: 45 },
    courtier: { opp: 55, urg: 40, ease: 45 },
    artisan: { opp: 80, urg: 70, ease: 75 },
    taxi_vtc: { opp: 78, urg: 65, ease: 60 },
    restaurant: { opp: 68, urg: 50, ease: 55 },
    mandataire: { opp: 65, urg: 45, ease: 60 },
  };

  const bs = baseScores[cat] || { opp: 65, urg: 50, ease: 55 };
  const ratingBonus = Math.round((rating - 3.5) * 10);

  const products = {
    garage: 'Multirisque Professionnelle + Flotte Auto',
    agent_assurance: 'Solution acquisition clients COURTIA REACH',
    courtier: 'Solution acquisition clients COURTIA REACH',
    artisan: 'Responsabilité Civile Décennale + RC Pro',
    taxi_vtc: 'Assurance Taxi/VTC + Protection Revenu',
    restaurant: 'Multirisque Professionnelle + Perte d\'Exploitation',
    mandataire: 'RC Pro + Protection Juridique',
  };

  const angles = {
    garage: 'Vos véhicules clients sont-ils bien couverts en cas de sinistre chez vous ?',
    agent_assurance: 'Et si vous doubliez vos rendez-vous qualifiés ce trimestre ?',
    courtier: 'Combien de temps perdez-vous à chercher des prospects au lieu de les convertir ?',
    artisan: 'Votre décennale est-elle vraiment adaptée à vos chantiers actuels ?',
    taxi_vtc: 'Votre assurance couvre-t-elle vraiment vos passagers et votre perte de revenu ?',
    restaurant: 'Que se passerait-il pour votre restaurant en cas d\'incendie ou d\'arrêt d\'activité ?',
    mandataire: 'Vos mandats sont-ils protégés en cas de litige avec un vendeur ?',
  };

  const objections = {
    garage: 'Déjà assuré, pas le temps, trop cher',
    agent_assurance: 'Pas de budget prospection, je gère seul',
    courtier: 'Pas de budget, je fais déjà du bouche-à-oreille',
    artisan: 'Mon assurance actuelle me suffit, pas prioritaire',
    taxi_vtc: 'Je paye déjà trop cher, pas envie de changer',
    restaurant: 'Déjà couvert par mon assureur depuis 10 ans',
    mandataire: 'Je ne vois pas le risque, mon activité est simple',
  };

  const opportunity = Math.min(100, bs.opp + ratingBonus + rand(-8, 12));
  const urgency = Math.min(100, bs.urg + ratingBonus + rand(-5, 8));
  const ease = Math.min(100, bs.ease + ratingBonus + rand(-6, 6));
  const premium = prospect.estimated_annual_premium || rand(2000, 12000);

  return {
    opportunity_score: opportunity,
    urgency_score: urgency,
    ease_score: ease,
    premium_potential_score: Math.min(100, Math.round((premium / 15000) * 100)),
    conversion_likelihood: Math.min(100, Math.round((ease + (rating * 10)) / 2)),
    estimated_annual_premium: premium,
    recommended_product: products[cat] || 'RC Pro + Multirisque',
    approach_angle: angles[cat] || 'Optimisons ensemble votre couverture assurance professionnelle.',
    probable_objection: objections[cat] || 'Déjà assuré',
    call_script: `Bonjour, ${prospect.contact_first_name || 'Madame/Monsieur'} ${prospect.contact_last_name || ''}, je suis courtier spécialisé. ${angles[cat] || ''} Je vous propose un audit gratuit de vos contrats en 10 minutes.`,
    email_template: `Objet : Votre couverture assurance professionnelle\n\nBonjour ${prospect.contact_first_name || ''},\n\n${angles[cat] || ''}\n\nJe vous propose un audit gratuit de votre couverture actuelle. Sans engagement.\n\nQuand seriez-vous disponible pour un échange de 10 minutes ?\n\nCordialement,`,
    linkedin_message: `Bonjour ${prospect.contact_first_name || ''}, je suis courtier spécialisé en assurance professionnelle. J'aide les ${CATEGORIES[cat]?.label || 'professionnels'} à sécuriser leur activité. Échangeons 5 minutes ?`,
    sms_template: `Bonjour, ${angles[cat] || ''} Audit gratuit 10 min ? Répondez OUI pour qu'on échange.`,
    next_best_action: opportunity > 75 ? 'Appeler dans les 24h' : opportunity > 50 ? 'Envoyer un email personnalisé' : 'Ajouter à une campagne de prospection',
    score_justification: `Score basé sur : secteur ${CATEGORIES[cat]?.label || cat} (potentiel ${bs.opp}/100), note Google ${rating}/5, prime estimée ${premium}€/an.`,
  };
}

// ─── GÉNÉRER DES RÉPONSES SIMULÉES ────────────────────────────────
function generateReplies(prospect, count = 3) {
  const sentiments = ['interested', 'quote_request', 'objection', 'cold', 'not_now'];
  const replies = [];

  const templates = {
    interested: {
      subject: 'Re: Proposition assurance professionnelle',
      body: `Bonjour,\n\nVotre proposition m'intéresse. Pouvez-vous m'envoyer plus de détails sur vos offres pour ${prospect.insurance_need?.replace(/_/g, ' ') || 'mon activité'} ?\n\nMerci,\n${prospect.contact_first_name || ''} ${prospect.contact_last_name || ''}`,
      sentiment: 'interested',
      ark_reply: `Merci pour votre retour ! Voici un résumé de ce que je propose pour votre activité. Souhaitez-vous qu'on fixe un appel de 10 minutes cette semaine ?`,
    },
    quote_request: {
      subject: 'Re: Demande de tarif',
      body: `Bonjour,\n\nPouvez-vous me faire un devis pour une ${prospect.insurance_need?.replace(/_/g, ' ') || 'assurance pro'} ?\n\nMon chiffre d'affaires est d'environ ${rand(50, 500)}k€.\n\nCordialement,`,
      sentiment: 'quote_request',
      ark_reply: `Avec plaisir. Pour être précis, j'ai besoin de quelques infos complémentaires. Je vous appelle demain à 10h, cela vous convient ?`,
    },
    objection: {
      subject: 'Re: Proposition',
      body: `Bonjour,\n\nJe suis déjà assuré depuis plusieurs années et je suis satisfait de mon contrat actuel. Merci pour votre proposition.\n\nCordialement,`,
      sentiment: 'objection',
      ark_reply: `Je comprends parfaitement. Gardez mes coordonnées, une révision annuelle gratuite ne coûte rien et peut vous faire économiser. Je vous recontacte dans 6 mois ?`,
    },
    cold: {
      subject: 'Re: Votre message',
      body: `Pas intéressé pour le moment, merci.`,
      sentiment: 'cold',
      ark_reply: `Merci pour votre réponse. Je reste disponible si vos besoins évoluent. Bonne continuation.`,
    },
    not_now: {
      subject: 'Re: Proposition assurance',
      body: `Bonjour,\n\nCe n'est pas le bon moment pour moi. Peut-être dans quelques mois.\n\nMerci,`,
      sentiment: 'not_now',
      ark_reply: `Pas de souci. Je vous recontacte dans 3 mois si vous le souhaitez. Notez mon numéro en attendant.`,
    },
  };

  for (let i = 0; i < count; i++) {
    const sentiment = sentiments[i % sentiments.length];
    const tpl = templates[sentiment];
    replies.push({
      from_address: prospect.email,
      subject: tpl.subject,
      body: tpl.body,
      sentiment,
      is_read: i === 0,
      ark_recommended_reply: tpl.ark_reply,
      received_at: new Date(Date.now() - rand(1, 72) * 3600000).toISOString(),
    });
  }
  return replies;
}

// ─── GÉNÉRER DES CAMPAGNES DEMO ────────────────────────────────────
function generateCampaigns(userId) {
  return [
    {
      name: 'Garages locaux — Assurance Pro',
      target_description: 'Garages automobiles dans un rayon de 30 km',
      channel: 'email',
      status: 'draft',
      steps: [
        { delay_days: 0, channel: 'email', subject_template: 'Vos véhicules clients sont-ils bien couverts ?', body_template: 'Bonjour,\n\nJe suis courtier spécialisé en assurance professionnelle. Les garages comme le vôtre ont souvent des lacunes dans leur couverture flotte et RC Pro.\n\nJe vous propose un audit gratuit de 10 minutes.\n\nCordialement,' },
        { delay_days: 2, channel: 'email', subject_template: 'Petit rappel — audit assurance garage', body_template: 'Bonjour,\n\nJe me permets de vous relancer concernant ma proposition d\'audit assurance pour votre garage.\n\nSans engagement, cela prend 10 minutes.\n\nCordialement,' },
        { delay_days: 5, channel: 'email', subject_template: 'Dernier message — économisez sur vos assurances pro', body_template: 'Bonjour,\n\nDernier message de ma part. Un courtier peut vous faire économiser 20 à 30 % sur vos contrats pro.\n\nJe reste disponible si besoin.\n\nCordialement,' },
      ],
    },
    {
      name: 'Taxis / VTC — Protection revenu + véhicule',
      target_description: 'Taxis et VTC dans un rayon de 20 km',
      channel: 'email',
      status: 'draft',
      steps: [
        { delay_days: 0, channel: 'email', subject_template: 'Votre assurance couvre-t-elle votre perte de revenu ?', body_template: 'Bonjour,\n\nEn tant que taxi/VTC, votre véhicule est votre outil de travail. Une panne ou un accident peut vous coûter cher.\n\nJe vous propose une couverture adaptée avec protection revenu.\n\nÉchangeons 5 minutes ?\n\nCordialement,' },
        { delay_days: 2, channel: 'email', subject_template: 'Relance — protection taxi/VTC', body_template: 'Bonjour,\n\nAvez-vous eu le temps de regarder ma proposition ? Une meilleure couverture peut vous protéger en cas d\'arrêt d\'activité.\n\nCordialement,' },
        { delay_days: 5, channel: 'email', subject_template: 'Assurance taxi : comparez gratuitement', body_template: 'Bonjour,\n\nJe peux comparer gratuitement votre contrat actuel avec les offres du marché. Sans engagement, en 5 minutes.\n\nCordialement,' },
      ],
    },
    {
      name: 'Courtiers & Agents — Acquisition clients avec COURTIA REACH',
      target_description: 'Courtiers et agents généraux souhaitant développer leur portefeuille',
      channel: 'email',
      status: 'draft',
      steps: [
        { delay_days: 0, channel: 'email', subject_template: 'Doublez vos rendez-vous qualifiés ce trimestre', body_template: 'Bonjour confrère,\n\nCOURTIA REACH est un moteur d\'acquisition qui trouve, score et prépare vos prospects automatiquement.\n\nRésultat : plus de temps pour conseiller, moins de temps à chercher.\n\nOn en parle ?\n\nCordialement,' },
        { delay_days: 2, channel: 'email', subject_template: 'REACH : 12 prospects chauds par semaine sans effort', body_template: 'Bonjour,\n\nImaginez recevoir chaque semaine 12 prospects qualifiés, déjà scorés, avec un script d\'appel prêt.\n\nC\'est ce que fait COURTIA REACH.\n\nDémo de 15 minutes ?\n\nCordialement,' },
        { delay_days: 5, channel: 'email', subject_template: 'Combien de prospects perdez-vous chaque mois ?', body_template: 'Bonjour,\n\nDernier message. La prospection manuelle fait perdre 60 % du temps d\'un courtier.\n\nCOURTIA REACH automatise cette charge.\n\nJe vous laisse ma carte.\n\nCordialement,' },
      ],
    },
  ];
}

module.exports = {
  generateProspects,
  generateAnalysis,
  generateReplies,
  generateCampaigns,
};
