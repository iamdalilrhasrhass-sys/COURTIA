// Seed Academy — 20 skill cards + 8 courses
const pool = require('../src/db');

async function seedAcademy() {
  console.log('[seed-academy] Démarrage...');

  // ── SKILL CARDS ──────────────────────────────────────
  const cards = [
    // BRONZE (1-4)
    { slug: 'premier-client', title: 'Premier client créé', description: 'Vous avez ajouté votre première fiche client dans COURTIA.', rarity: 'bronze', category: 'bases', xp_reward: 30, unlock_condition_type: 'client_count', unlock_condition_value: 1, icon: 'user-plus' },
    { slug: 'profil-cabinet', title: 'Profil cabinet complété', description: 'Votre cabinet est prêt à être piloté proprement.', rarity: 'bronze', category: 'bases', xp_reward: 20, unlock_condition_type: 'profile_complete', unlock_condition_value: 1, icon: 'building' },
    { slug: 'premiere-tache', title: 'Première tâche planifiée', description: 'Vous avez structuré votre première action commerciale.', rarity: 'bronze', category: 'organisation', xp_reward: 25, unlock_condition_type: 'task_count', unlock_condition_value: 1, icon: 'check-square' },
    { slug: 'premiere-relance', title: 'Première relance programmée', description: 'Vous commencez à reprendre le contrôle de votre suivi client.', rarity: 'bronze', category: 'relance', xp_reward: 30, unlock_condition_type: 'reminder_count', unlock_condition_value: 1, icon: 'bell' },
    // SILVER (5-8)
    { slug: 'portefeuille-structure', title: 'Portefeuille structuré', description: 'Vous avez créé 25 clients dans COURTIA.', rarity: 'silver', category: 'bases', xp_reward: 60, unlock_condition_type: 'client_count', unlock_condition_value: 25, icon: 'users' },
    { slug: 'suivi-commercial-actif', title: 'Suivi commercial actif', description: 'Vous avez planifié 10 actions de suivi.', rarity: 'silver', category: 'organisation', xp_reward: 50, unlock_condition_type: 'task_count', unlock_condition_value: 10, icon: 'clipboard-list' },
    { slug: 'import-maitrise', title: 'Import maîtrisé', description: 'Vous avez importé votre premier fichier client.', rarity: 'silver', category: 'productivite', xp_reward: 45, unlock_condition_type: 'import_count', unlock_condition_value: 1, icon: 'upload' },
    { slug: 'courtier-organise', title: 'Courtier organisé', description: 'Votre portefeuille commence à devenir lisible et pilotable.', rarity: 'silver', category: 'organisation', xp_reward: 55, unlock_condition_type: 'profile_complete', unlock_condition_value: 5, icon: 'layout' },
    // GOLD (9-12)
    { slug: 'relanceur-confirme', title: 'Relanceur confirmé', description: 'Vous avez préparé 25 relances commerciales.', rarity: 'gold', category: 'relance', xp_reward: 100, unlock_condition_type: 'reminder_count', unlock_condition_value: 25, icon: 'repeat' },
    { slug: 'opportunite-ark', title: 'Opportunité détectée', description: 'ARK a identifié une opportunité dans votre portefeuille.', rarity: 'gold', category: 'ark', xp_reward: 80, unlock_condition_type: 'ark_opportunity', unlock_condition_value: 1, icon: 'zap' },
    { slug: 'prospection-structuree', title: 'Prospection structurée', description: 'Vous avez lancé votre première campagne ARK REACH.', rarity: 'gold', category: 'prospection', xp_reward: 90, unlock_condition_type: 'campaign_count', unlock_condition_value: 1, icon: 'target' },
    { slug: 'multi-equipement', title: 'Multi-équipement Hunter', description: 'Vous avez identifié des opportunités de ventes croisées.', rarity: 'gold', category: 'vente', xp_reward: 85, unlock_condition_type: 'cross_sell', unlock_condition_value: 3, icon: 'layers' },
    // DIAMOND (13-16)
    { slug: 'pilote-portefeuille', title: 'Pilote de portefeuille', description: 'Vous utilisez COURTIA comme un vrai cockpit quotidien.', rarity: 'diamond', category: 'bases', xp_reward: 150, unlock_condition_type: 'active_days', unlock_condition_value: 7, icon: 'bar-chart' },
    { slug: 'strategie-commerciale', title: 'Stratège commercial', description: 'Vous avez transformé vos données en actions mesurables.', rarity: 'diamond', category: 'vente', xp_reward: 130, unlock_condition_type: 'dashboard_active', unlock_condition_value: 1, icon: 'trending-up' },
    { slug: 'pipeline-maitrise', title: 'Pipeline maîtrisé', description: 'Votre suivi commercial atteint un niveau avancé.', rarity: 'diamond', category: 'prospection', xp_reward: 140, unlock_condition_type: 'prospect_count', unlock_condition_value: 20, icon: 'git-branch' },
    { slug: 'cabinet-augmente', title: 'Cabinet augmenté', description: 'Vous utilisez ARK pour prioriser vos actions quotidiennes.', rarity: 'diamond', category: 'ark', xp_reward: 120, unlock_condition_type: 'ark_interactions', unlock_condition_value: 20, icon: 'cpu' },
    // EPIC (17-20)
    { slug: 'elite-relance', title: 'Elite Relance', description: 'Vous avez construit une discipline de relance performante.', rarity: 'epic', category: 'relance', xp_reward: 250, unlock_condition_type: 'reminder_count', unlock_condition_value: 100, icon: 'award' },
    { slug: 'machine-commerciale', title: 'Machine commerciale', description: 'Votre cabinet fonctionne avec un vrai système de croissance.', rarity: 'epic', category: 'vente', xp_reward: 300, unlock_condition_type: 'full_pipeline', unlock_condition_value: 1, icon: 'zap' },
    { slug: 'ambassadeur', title: 'Ambassadeur COURTIA', description: 'Vous avez partagé votre progression professionnelle.', rarity: 'epic', category: 'reseau', xp_reward: 200, unlock_condition_type: 'shared', unlock_condition_value: 1, icon: 'share-2' },
    { slug: 'courtier-augmente', title: 'Courtier augmenté', description: 'Vous avez atteint un niveau avancé dans l\'usage de l\'IA métier.', rarity: 'epic', category: 'ark', xp_reward: 350, unlock_condition_type: 'ark_master', unlock_condition_value: 1, icon: 'sparkles' },
  ];

  for (const card of cards) {
    await pool.query(
      `INSERT INTO skill_cards (slug, title, description, rarity, category, xp_reward, unlock_condition_type, unlock_condition_value, icon)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (slug) DO NOTHING`,
      [card.slug, card.title, card.description, card.rarity, card.category, card.xp_reward, card.unlock_condition_type, card.unlock_condition_value, card.icon]
    );
  }
  console.log(`[seed-academy] ${cards.length} cartes insérées.`);

  // ── COURSES ───────────────────────────────────────────
  const courses = [
    {
      slug: 'bases-portefeuille-structure',
      title: 'Les bases d\'un portefeuille bien structuré',
      category: 'bases',
      difficulty: 'débutant',
      duration_minutes: 6,
      xp_reward: 40,
      content: `Un portefeuille bien structuré est la clé d'un cabinet performant.\n\n**Pourquoi structurer ?**\n- Avoir une vision claire de vos clients actifs, dormants et prospects.\n- Prioriser vos actions commerciales.\n- Anticiper les échéances plutôt que les subir.\n\n**Comment faire avec COURTIA ?**\n1. Créez une fiche client pour chaque personne physique ou morale.\n2. Renseignez au minimum : nom, email, téléphone, statut.\n3. Ajoutez les contrats dès que possible.\n4. Utilisez les tags pour segmenter (ex: "haut-potentiel", "à-relancer").\n\n**Bonnes pratiques :**\n- Mettez à jour le statut client régulièrement.\n- Utilisez la recherche et les filtres.\n- Planifiez une revue de portefeuille chaque semaine.`,
      key_points: ['Créer une fiche client complète', 'Segmenter avec les tags', 'Planifier une revue hebdomadaire', 'Mettre à jour les statuts'],
      quiz: [
        { question: 'Quel est le premier geste pour structurer son portefeuille ?', options: ['Créer une fiche client complète', 'Envoyer un email', 'Augmenter ses tarifs', 'Attendre la fin du mois'], correct: 0 },
        { question: 'À quelle fréquence revoir son portefeuille ?', options: ['Une fois par an', 'Tous les jours', 'Chaque semaine', 'Jamais'], correct: 2 }
      ]
    },
    {
      slug: 'relancer-sans-insister',
      title: 'Relancer un client sans être insistant',
      category: 'relance',
      difficulty: 'débutant',
      duration_minutes: 5,
      xp_reward: 40,
      content: `La relance est un art subtil entre persévérance et respect du client.\n\n**Principes clés :**\n1. **Rappeler le contexte** — "Je fais suite à notre échange du...".\n2. **Apporter une valeur** — "J'ai une mise à jour concernant votre contrat".\n3. **Proposer une action simple** — "Souhaitez-vous que je vous prépare un comparatif ?".\n4. **Ne pas culpabiliser** — Évitez "Vous n'avez pas répondu".\n5. **Garder une trace** — Notez chaque relance dans COURTIA.\n\n**Avec ARK :**\nARK peut vous préparer un message de relance personnalisé. Vous validez avant d'envoyer.`,
      key_points: ['Toujours rappeler le contexte', 'Apporter une valeur concrète', 'Proposer une action simple', 'Garder une trace dans COURTIA'],
      quiz: [
        { question: 'Quelle est la meilleure formulation de relance ?', options: ['"Vous n\'avez pas répondu."', '"Je reviens vers vous concernant votre échéance auto du mois prochain. Souhaitez-vous que je vous prépare une comparaison ?"', '"Dernière relance avant suppression."', '"Pourquoi ne répondez-vous pas ?"'], correct: 1 }
      ]
    },
    {
      slug: 'echeance-en-opportunite',
      title: 'Transformer une échéance en opportunité',
      category: 'vente',
      difficulty: 'intermédiaire',
      duration_minutes: 7,
      xp_reward: 50,
      content: `Une échéance n'est pas une formalité administrative — c'est le meilleur moment pour vendre.\n\n**Pourquoi ?**\n- Le client est déjà en réflexion sur son contrat.\n- Il est plus ouvert à la discussion.\n- C'est le moment idéal pour proposer une évolution.\n\n**Méthode :**\n1. Anticipez l'échéance (30 jours avant si possible).\n2. Contactez le client avec une proposition personnalisée.\n3. Profitez-en pour vérifier si ses besoins ont évolué.\n4. Proposez un multi-équipement si pertinent.\n\n**Avec COURTIA :**\nLe dashboard Échéances vous montre tous les renouvellements à venir.`,
      key_points: ['Anticiper 30 jours avant', 'Contacter avec une proposition', 'Vérifier l\'évolution des besoins', 'Proposer du multi-équipement'],
      quiz: [
        { question: 'Quand contacter un client avant son échéance ?', options: ['La veille', '30 jours avant', 'Le jour même', 'Après l\'échéance'], correct: 1 }
      ]
    },
    {
      slug: 'detecter-clients-dormants',
      title: 'Détecter les clients dormants',
      category: 'vente',
      difficulty: 'intermédiaire',
      duration_minutes: 5,
      xp_reward: 45,
      content: `Un client dormant est un client que vous risquez de perdre sans vous en rendre compte.\n\n**Signes d'un client dormant :**\n- Pas d'interaction depuis 3 mois ou plus.\n- Contrat toujours actif mais plus de suivi.\n- Email ou téléphone non répondus.\n\n**Comment réagir :**\n1. Identifiez les clients sans activité récente.\n2. Préparez une relance personnalisée.\n3. Proposez un rendez-vous bilan.\n4. Si pas de réponse, relancez à J+7.\n\n**Avec COURTIA :**\nLes filtres clients vous permettent de voir rapidement qui n'a pas été contacté récemment.`,
      key_points: ['Identifier les inactifs', 'Préparer une relance personnalisée', 'Proposer un bilan', 'Relancer à J+7 si nécessaire'],
      quiz: [
        { question: 'À partir de combien de temps sans contact un client est-il considéré dormant ?', options: ['1 semaine', '1 mois', '3 mois', '1 an'], correct: 2 }
      ]
    },
    {
      slug: 'utiliser-ark',
      title: 'Utiliser ARK pour préparer sa journée',
      category: 'ark',
      difficulty: 'débutant',
      duration_minutes: 5,
      xp_reward: 40,
      content: `ARK n'est pas un simple chatbot — c'est votre assistant métier.\n\n**Ce que ARK peut faire pour vous :**\n- Résumer la situation d'un client.\n- Suggérer des actions prioritaires.\n- Préparer un email de relance.\n- Analyser votre portefeuille.\n- Détecter des opportunités commerciales.\n\n**Exemple d'utilisation quotidienne :**\nAvant d'ouvrir votre journée, demandez à ARK :\n"Donne-moi les 3 priorités du jour pour mon portefeuille."\n\n**Règle d'or :**\nARK propose, vous décidez. Ne déléquez jamais votre jugement à l'IA.`,
      key_points: ['ARK résume, analyse, suggère', 'Demander les priorités du jour', 'Valider avant d\'agir', 'ARK ne remplace pas le courtier'],
      quiz: [
        { question: 'Quelle est la règle d\'or avec ARK ?', options: ['ARK décide à ma place', 'ARK propose, je décide', 'Je fais tout ce que ARK dit', 'ARK n\'est pas utile'], correct: 1 }
      ]
    },
    {
      slug: 'campagne-ark-reach',
      title: 'Préparer une campagne avec ARK REACH',
      category: 'ark',
      difficulty: 'avancé',
      duration_minutes: 8,
      xp_reward: 60,
      content: `ARK REACH structure votre prospection de A à Z.\n\n**Étapes clés :**\n1. **Importez vos prospects** depuis un fichier ou manuellement.\n2. **Segmentez** par catégorie, ville, niche.\n3. **Créez une campagne** avec objectif et cible.\n4. **ARK génère les messages** (email, SMS, LinkedIn).\n5. **Validez chaque message** avant envoi.\n6. **Suivez les réponses** dans le tableau de bord.\n\n**Important :**\nAucun message n'est envoyé sans votre validation. Le mode dry-run est activé par défaut.`,
      key_points: ['Importer et segmenter', 'ARK génère les messages', 'Validation humaine obligatoire', 'Mode dry-run par défaut', 'Suivi des réponses'],
      quiz: [
        { question: 'Que se passe-t-il avant l\'envoi d\'un message ARK REACH ?', options: ['Le message est envoyé automatiquement', 'Le courtier doit valider', 'Le client reçoit sans prévenir', 'Rien, c\'est instantané'], correct: 1 }
      ]
    },
    {
      slug: 'objections-commerciales',
      title: 'Répondre aux objections commerciales',
      category: 'vente',
      difficulty: 'avancé',
      duration_minutes: 7,
      xp_reward: 55,
      content: `Les objections sont normales — elles montrent que le client réfléchit.\n\n**Objections fréquentes et réponses :**\n\n1. "Je n'ai pas le temps."\n→ "Je comprends. 5 minutes suffisent pour voir si une économie est possible."\n\n2. "Je suis déjà bien couvert."\n→ "Justement, un bilan rapide permet de vérifier qu'il n'y a pas de doublon ou d'oubli."\n\n3. "Je verrai ça plus tard."\n→ "Je peux vous préparer un comparatif que vous regarderez quand vous aurez un moment."\n\n4. "C'est plus cher ailleurs ?"\n→ "Pas forcément. Je vous propose une analyse personnalisée sans engagement."`,
      key_points: ['Accueillir l\'objection', 'Proposer une solution simple', 'Ne pas insister', 'Garder une trace de l\'échange'],
      quiz: [
        { question: 'Que faire face à une objection ?', options: ['Insister plus fort', 'Comprendre le besoin derrière l\'objection', 'Raccrocher', 'Baisser les prix tout de suite'], correct: 1 }
      ]
    },
    {
      slug: 'rgpd-prospection',
      title: 'Les bases RGPD à respecter en prospection',
      category: 'conformite',
      difficulty: 'intermédiaire',
      duration_minutes: 6,
      xp_reward: 50,
      content: `La prospection commerciale est encadrée par le RGPD.\n\n**Règles essentielles :**\n1. **Consentement** — Le prospect doit avoir accepté d'être contacté.\n2. **Finalité** — Vous devez informer de l'utilisation des données.\n3. **Opt-out** — Chaque message doit permettre de se désinscrire.\n4. **Traçabilité** — Conservez la preuve du consentement.\n5. **Durée** — Ne conservez pas les données inactives plus de 3 ans.\n\n**Avec COURTIA :**\nARK REACH respecte ces règles : opt-out intégré, validation humaine, dry-run.`,
      key_points: ['Consentement obligatoire', 'Finalité transparente', 'Opt-out dans chaque message', 'Traçabilité des consentements', 'Pas de données conservées inutilement'],
      quiz: [
        { question: 'Que doit contenir chaque message de prospection ?', options: ['Un prix', 'Un lien de désinscription', 'Une photo', 'Aucune mention'], correct: 1 }
      ]
    },
  ];

  for (const course of courses) {
    const cardRes = await pool.query('SELECT id FROM skill_cards WHERE slug = $1', [course.slug.replace(/-/g, '-')]);
    // Find the matching skill card (loosely — use category-based matching or none)
    const cardMatch = await pool.query(
      `SELECT id FROM skill_cards WHERE category = $1 ORDER BY random() LIMIT 1`,
      [course.category]
    );
    const skillCardId = cardMatch.rows.length > 0 ? cardMatch.rows[0].id : null;

    await pool.query(
      `INSERT INTO academy_courses (slug, title, category, difficulty, duration_minutes, xp_reward, content, key_points, quiz_json, skill_card_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (slug) DO NOTHING`,
      [course.slug, course.title, course.category, course.difficulty, course.duration_minutes, course.xp_reward,
       course.content, course.key_points, JSON.stringify(course.quiz), skillCardId]
    );
  }
  console.log(`[seed-academy] ${courses.length} cours insérés.`);

  console.log('[seed-academy] Terminé.');
  process.exit(0);
}

seedAcademy().catch(err => {
  console.error('[seed-academy] Erreur:', err.message);
  process.exit(1);
});
