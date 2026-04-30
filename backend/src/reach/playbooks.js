/**
 * COURTIA REACH — Playbooks Métiers
 * Playbooks spécialisés assurance par catégorie de prospect.
 */

const PLAYBOOKS = {
  garage: {
    label: 'Garage automobile',
    icon: 'Wrench',
    insurance_needs: ['RC Pro', 'Multirisque Professionnelle', 'Flotte Auto', 'Protection Juridique', 'Local Commercial'],
    signals: [
      'Garage indépendant (pas franchise)',
      'Plus de 3 employés → besoin flotte',
      'Avis Google < 4.0 → sensible au service',
      'Pas de site web → pas de présence digitale',
      'Véhicules clients stationnés → risque RC',
    ],
    pain_points: [
      'Responsabilité en cas de sinistre sur véhicule client',
      'Coût des primes qui augmente chaque année',
      'Pas le temps de comparer les contrats',
      'Crainte d\'être mal couvert en cas de gros sinistre',
    ],
    approach_angle: 'Vos véhicules clients sont-ils bien couverts en cas de sinistre dans votre garage ?',
    call_script: `Bonjour, je suis courtier spécialisé en assurance pour les professionnels de l'automobile.

Je travaille avec plusieurs garages indépendants comme le vôtre et je constate souvent des lacunes dans leur couverture RC Pro et Flotte Auto.

Je vous propose un audit gratuit de 10 minutes de votre couverture actuelle. Sans engagement.

Quand seriez-vous disponible cette semaine ?`,
    email_j0: {
      subject: 'Protection de votre garage — audit gratuit',
      body: `Bonjour,

Je suis courtier spécialisé en assurance automobile professionnelle.

Les garages indépendants comme le vôtre ont souvent des besoins spécifiques mal couverts par les contrats standards :
- Responsabilité civile pro pour les véhicules clients
- Flotte auto pour vos véhicules de service et d'essai
- Protection juridique en cas de litige

Je vous propose un audit gratuit de 10 minutes pour vérifier que vous êtes bien couvert, sans engagement.

Quand seriez-vous disponible pour un échange ?

Cordialement,
Votre courtier COURTIA`
    },
    email_j2: {
      subject: 'Petit rappel — audit assurance garage',
      body: `Bonjour,

Je me permets de vous relancer concernant ma proposition d'audit assurance pour votre garage.

C'est gratuit, sans engagement et prend 10 minutes.

Beaucoup de garages découvrent des économies de 20 à 30% sur leurs contrats après un simple audit.

Je reste à votre disposition.

Cordialement,`
    },
    email_j5: {
      subject: 'Dernier message — économisez sur vos assurances pro',
      body: `Bonjour,

Dernier message de ma part. 

Si vos contrats professionnels n'ont pas été revus depuis plus de 2 ans, il y a probablement des économies à faire.

Je vous laisse ma carte. N'hésitez pas à me contacter quand vous serez prêt.

Cordialement,`
    },
    sms: 'Bonjour, audit gratuit assurance garage ? Économisez jusqu\'à 30% sur vos contrats pro. Répondez OUI.',
    linkedin_assisted: `Bonjour, je suis courtier spécialisé en assurance automobile professionnelle. J'accompagne des garages indépendants dans l'optimisation de leur couverture RC Pro et Flotte. Échangeons 5 minutes ?`,
    objections: {
      'Déjà assuré': 'C\'est une bonne chose. Mon audit permet juste de vérifier que vos garanties sont toujours adaptées. Sans engagement, vous restez libre.',
      'Pas le temps': 'Je comprends. 10 minutes suffisent. Je m\'adapte à votre agenda, même en fin de journée.',
      'Trop cher': 'L\'audit est gratuit. Et souvent, on découvre qu\'on peut réduire la facture de 20 à 30% sans perdre en garanties.',
    },
    premium_estimate: { low: 2000, mid: 5000, high: 12000 },
  },

  taxi_vtc: {
    label: 'Taxi / VTC',
    icon: 'Car',
    insurance_needs: ['Assurance Taxi/VTC', 'RC Circulation', 'Flotte Auto', 'Protection Revenu', 'Prévoyance'],
    signals: [
      'Indépendant (pas plateforme)',
      'Véhicule récent → besoin protection valeur',
      'Travaille de nuit → risque accru',
      'Plusieurs véhicules → flotte',
      'Pas de protection revenu → angle fort',
    ],
    pain_points: [
      'Peur de l\'arrêt d\'activité en cas d\'accident',
      'Primes très élevées pour les taxis/VTC',
      'Franchises importantes en cas de sinistre',
      'Pas de revenu de remplacement pendant les réparations',
    ],
    approach_angle: 'Votre assurance couvre-t-elle vraiment votre perte de revenu en cas d\'accident ?',
    call_script: `Bonjour, je suis courtier spécialisé en assurance pour les professionnels du transport.

En tant que taxi/VTC, votre véhicule est votre outil de travail. Un accident peut vous coûter des semaines de revenu.

Je vous propose une couverture qui inclut la protection de votre revenu en cas d'arrêt d'activité.

Audit gratuit de 10 minutes ?`,
    email_j0: {
      subject: 'Protection taxi/VTC — audit gratuit',
      body: `Bonjour,

Je suis courtier spécialisé dans l'assurance des professionnels du transport.

Si vous êtes taxi ou VTC indépendant, vous savez que votre véhicule est votre gagne-pain. Un accident = plus de revenu.

Je vous propose :
- Une assurance adaptée aux taxis/VTC
- Une protection revenu en cas d'arrêt d'activité
- Des tarifs négociés

Audit gratuit de 10 minutes, sans engagement.

Cordialement,`
    },
    email_j2: {
      subject: 'Relance — protection taxi/VTC',
      body: `Bonjour,

Avez-vous eu le temps de regarder ma proposition ?

Une meilleure couverture peut vous éviter des semaines sans revenu en cas de sinistre.

10 minutes suffisent pour faire le point.`
    },
    email_j5: {
      subject: 'Assurance taxi : comparez gratuitement',
      body: `Bonjour,

Dernier message. Je peux comparer votre contrat actuel avec les offres du marché en 5 minutes, sans engagement.

Si vous payez plus de 3000€/an, il y a probablement des économies à faire.`
    },
    sms: 'Bonjour, assurance taxi/VTC avec protection revenu ? Audit gratuit 10 min. Répondez OUI.',
    linkedin_assisted: `Bonjour, courtier spécialisé transport. Je protège les taxis/VTC avec une couverture qui inclut la perte de revenu. Échangeons 5 minutes ?`,
    objections: {
      'Trop cher': 'Je comprends. Mais saviez-vous qu\'un bon courtier peut vous faire économiser 20 à 30% ? L\'audit est gratuit.',
      'Déjà couvert': 'Très bien. Mais couvre-t-il votre perte de revenu ? Beaucoup de contrats standards ne l\'incluent pas.',
    },
    premium_estimate: { low: 2500, mid: 5000, high: 10000 },
  },

  artisan: {
    label: 'Artisan BTP',
    icon: 'Hammer',
    insurance_needs: ['Décennale', 'RC Pro', 'Prévoyance', 'Véhicule Utilitaire', 'Protection Juridique'],
    signals: [
      'Artisan indépendant avec chantiers',
      'Pas de site web → difficile à trouver pour les clients',
      'Travaille sur des chantiers de particuliers → besoin décennale',
      'Véhicule utilitaire → besoin assurance pro',
      'Pas de prévoyance → angle fort',
    ],
    pain_points: [
      'Obligation légale de décennale',
      'Coût élevé de la décennale',
      'Responsabilité sur les chantiers',
      'Pas de protection en cas d\'arrêt de travail',
    ],
    approach_angle: 'Votre décennale est-elle vraiment adaptée à vos chantiers actuels ?',
    call_script: `Bonjour, je suis courtier spécialisé en assurance pour les artisans du bâtiment.

La garantie décennale est obligatoire, mais beaucoup d'artisans payent trop cher sans avoir les bonnes garanties.

Je vous propose un audit gratuit de 10 minutes de l'ensemble de vos contrats professionnels.

Quand seriez-vous disponible ?`,
    email_j0: {
      subject: 'Votre assurance décennale — audit gratuit',
      body: `Bonjour,

Je suis courtier spécialisé dans l'assurance des artisans du BTP.

Saviez-vous que beaucoup d'artisans payent leur décennale 20 à 30% trop cher sans le savoir ?

Je vous propose un audit gratuit de 10 minutes de l'ensemble de vos contrats :
- Décennale
- RC Pro
- Véhicule utilitaire
- Prévoyance

Sans engagement.

Cordialement,`
    },
    email_j2: {
      subject: 'Relance — votre décennale est-elle optimisée ?',
      body: `Bonjour,

Je me permets de vous relancer. Votre assurance décennale a-t-elle été revue récemment ?

Un audit gratuit peut vous faire économiser plusieurs centaines d'euros par an.

10 minutes suffisent.`
    },
    email_j5: {
      subject: 'Décennale artisan : comparez gratuitement',
      body: `Bonjour,

Dernier message. Si votre décennale n'a pas été comparée depuis 2 ans, vous payez probablement trop cher.

Je reste disponible pour un audit gratuit quand vous serez prêt.`
    },
    sms: 'Bonjour, décennale artisan trop chère ? Audit gratuit 10 min. Économisez jusqu\'à 30%. Répondez OUI.',
    linkedin_assisted: `Bonjour, courtier spécialisé BTP. J'optimise la décennale et la RC Pro des artisans. Audit gratuit de 10 minutes ?`,
    objections: {
      'Trop cher': 'Justement, l\'audit est gratuit. Et souvent on découvre des économies de 20-30% sur la décennale.',
      'Déjà assuré': 'Très bien. Mais votre contrat a-t-il été revu cette année ? Les garanties évoluent, vos besoins aussi.',
    },
    premium_estimate: { low: 1500, mid: 4000, high: 9000 },
  },

  restaurant: {
    label: 'Restaurant',
    icon: 'Utensils',
    insurance_needs: ['Multirisque Professionnelle', 'Perte d\'Exploitation', 'RC Pro', 'Local Commercial', 'Santé Collective'],
    signals: [
      'Restaurant indépendant',
      'Plus de 5 salariés → besoin santé collective',
      'Établissement avec terrasse → risque accru',
      'Pas de protection perte d\'exploitation → angle fort',
      'Cuisine ouverte → risque incendie',
    ],
    pain_points: [
      'Risque incendie élevé',
      'Perte d\'exploitation en cas de sinistre',
      'Responsabilité en cas d\'intoxication alimentaire',
      'Protection du local commercial',
    ],
    approach_angle: 'Que se passerait-il pour votre restaurant en cas d\'incendie ou d\'arrêt d\'activité ?',
    call_script: `Bonjour, je suis courtier spécialisé en assurance pour les restaurants et établissements de restauration.

Un sinistre dans un restaurant peut entraîner des semaines, voire des mois de fermeture. Sans protection perte d'exploitation, c'est la catastrophe.

Je vous propose un audit gratuit de 10 minutes de votre couverture actuelle.

Quand seriez-vous disponible ?`,
    email_j0: {
      subject: 'Protection de votre restaurant — audit gratuit',
      body: `Bonjour,

Je suis courtier spécialisé en assurance pour les restaurants.

Un incendie, un dégât des eaux, ou une intoxication alimentaire peuvent fermer votre établissement pendant des semaines.

Êtes-vous couvert pour :
- La perte d'exploitation ?
- La responsabilité civile professionnelle ?
- La protection de votre local commercial ?

Audit gratuit de 10 minutes. Sans engagement.

Cordialement,`
    },
    email_j2: {
      subject: 'Relance — votre restaurant est-il bien protégé ?',
      body: `Bonjour,

Petite relance concernant ma proposition d'audit assurance pour votre restaurant.

En 10 minutes, je peux vérifier que vous êtes bien couvert en cas de sinistre.

C'est gratuit et sans engagement.`
    },
    email_j5: {
      subject: 'Restaurant : protégez votre activité',
      body: `Bonjour,

Dernier message. La perte d'exploitation est l'assurance la plus importante pour un restaurateur. L'avez-vous ?

Je reste disponible si vous souhaitez faire le point un jour.`
    },
    sms: 'Bonjour, votre restaurant est-il protégé contre une fermeture suite à sinistre ? Audit gratuit 10 min.',
    linkedin_assisted: `Bonjour, courtier spécialisé en assurance restauration. Je protège les restaurants contre les risques d'incendie, perte d'exploitation et RC Pro. On en parle ?`,
    objections: {
      'Assuré depuis 20 ans': 'C\'est rassurant. Mais les contrats évoluent. Un audit gratuit vérifie juste que vos garanties suivent votre activité.',
      'Pas le budget': 'Je comprends. Mais une bonne assurance peut vous sauver en cas de sinistre. L\'audit est gratuit.',
    },
    premium_estimate: { low: 800, mid: 2500, high: 6000 },
  },

  courtier: {
    label: 'Courtier en assurance',
    icon: 'Briefcase',
    insurance_needs: ['Acquisition Clients', 'Productivité', 'CRM', 'IA', 'Prospection'],
    signals: [
      'Courtier indépendant',
      'Cabinet de moins de 5 personnes',
      'Pas de site web moderne',
      'Utilise Excel pour le suivi client',
      'Passe plus de 2h/jour en prospection',
    ],
    pain_points: [
      'Perte de temps en prospection manuelle',
      'Difficulté à trouver des prospects qualifiés',
      'Pas d\'outil de suivi des relances',
      'Taux de conversion faible',
    ],
    approach_angle: 'Combien de temps perdez-vous chaque jour à chercher des prospects au lieu de les conseiller ?',
    call_script: `Bonjour confrère,

Je suis courtier comme vous, et j'ai développé un outil qui automatise la prospection.

COURTIA REACH trouve, score et prépare vos prospects automatiquement. Résultat : plus de temps pour conseiller, moins de temps à chercher.

Démo de 15 minutes ?`,
    email_j0: {
      subject: 'Doublez vos rendez-vous qualifiés ce trimestre',
      body: `Bonjour confrère,

En tant que courtier, vous savez que la prospection prend 60% de votre temps pour 20% de résultats.

COURTIA REACH automatise cette charge :
- Trouve les prospects dans votre zone
- Les score selon leur potentiel assurance
- Prépare les scripts d'appel et emails

Résultat : 12 prospects qualifiés par semaine, prêts à être contactés.

Démo de 15 minutes ?

Cordialement,`
    },
    email_j2: {
      subject: 'REACH : vos prospects vous attendent',
      body: `Bonjour,

Imaginez recevoir chaque lundi une liste de 12 prospects assurance déjà scorés, avec le script d'appel prêt.

C'est ce que fait COURTIA REACH pour les courtiers.

15 minutes pour une démo ?`
    },
    email_j5: {
      subject: 'Combien de prospects perdez-vous chaque mois ?',
      body: `Bonjour,

Dernier message. Si vous passez plus de 10h/semaine en prospection, COURTIA REACH peut vous faire gagner 5h.

Je vous laisse ma carte.

Cordialement,`
    },
    sms: 'Confrère, COURTIA REACH automatise votre prospection. 12 prospects qualifiés/semaine. Démo 15 min ?',
    linkedin_assisted: `Bonjour confrère, COURTIA REACH automatise la prospection assurance. 12 prospects scorés par semaine, scripts prêts. On en parle ?`,
    objections: {
      'Pas de budget': 'Je comprends. Mais si vous gagnez 5h/semaine, vous pouvez traiter plus de dossiers. Le ROI est immédiat.',
    },
    premium_estimate: { low: 500, mid: 1500, high: 3000 },
  },
};

function getPlaybook(category) {
  return PLAYBOOKS[category] || null;
}

function getAllPlaybooks() {
  return Object.keys(PLAYBOOKS).map(key => ({
    category: key,
    ...PLAYBOOKS[key],
  }));
}

module.exports = { getPlaybook, getAllPlaybooks, PLAYBOOKS };
