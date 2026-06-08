const AGENTS = {
  ark_marketing: {
    cle: 'ark_marketing',
    nom: 'ARK Marketing',
    role: 'Crée des publications, des briefs visuels et un calendrier éditorial.',
    categorie: 'business',
    branchement_requis: 'Publication automatique LinkedIn, Instagram ou fiche Google à brancher.',
    prompt: `Tu es ARK Marketing. Tu prépares le contenu social d'une entreprise : publications, briefs visuels, calendrier éditorial. Tu restes concret, sobre, sans promesse trompeuse ni chiffre inventé. Tu réponds uniquement via l'outil, en français.`,
    outil: {
      name: 'enregistrer_marketing',
      description: 'Enregistre les publications et le calendrier éditorial.',
      input_schema: {
        type: 'object',
        properties: {
          publications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                plateforme: { type: 'string' },
                contenu: { type: 'string' },
                hashtags: { type: 'array', items: { type: 'string' } },
                brief_visuel: { type: 'string' },
              },
              required: ['plateforme', 'contenu'],
            },
          },
          calendrier_editorial: {
            type: 'array',
            items: {
              type: 'object',
              properties: { jour: { type: 'string' }, theme: { type: 'string' } },
              required: ['jour', 'theme'],
            },
          },
        },
        required: ['publications'],
      },
    },
  },
  ark_visibilite: {
    cle: 'ark_visibilite',
    nom: 'ARK Visibilité',
    role: 'Rédige des articles de référencement, méta-données et mots-clés.',
    categorie: 'business',
    branchement_requis: 'Publication site ou WordPress à brancher.',
    prompt: `Tu es ARK Visibilité. Tu rédiges des contenus de référencement utiles : article structuré, méta-titre, méta-description, mots-clés, liens internes suggérés. Pas de bourrage de mots-clés, pas de donnée inventée. Tu réponds uniquement via l'outil, en français.`,
    outil: {
      name: 'enregistrer_visibilite',
      description: 'Enregistre l’article de référencement.',
      input_schema: {
        type: 'object',
        properties: {
          titre_article: { type: 'string' },
          corps_article: { type: 'string' },
          meta_titre: { type: 'string' },
          meta_description: { type: 'string' },
          mots_cles_cibles: { type: 'array', items: { type: 'string' } },
          liens_internes_suggeres: { type: 'array', items: { type: 'string' } },
        },
        required: ['titre_article', 'corps_article', 'meta_titre', 'meta_description', 'mots_cles_cibles'],
      },
    },
  },
  ark_prospection: {
    cle: 'ark_prospection',
    nom: 'ARK Prospection',
    role: 'Prépare des séquences email, LinkedIn et scripts d’appel.',
    categorie: 'business',
    produit_des_actions: true,
    branchement_requis: 'Sourcing et automatisation LinkedIn externes à brancher. Email Brevo déjà prévu par le dispatch.',
    prompt: `Tu es ARK Prospection. Tu prépares une séquence de prospection B2B courte, personnalisée et conforme. Tu ajoutes toujours une porte de sortie et tu n'envoies rien : tout doit être validé par un humain avant départ. Tu réponds uniquement via l'outil, en français.`,
    outil: {
      name: 'enregistrer_prospection',
      description: 'Enregistre la séquence de prospection.',
      input_schema: {
        type: 'object',
        properties: {
          resume_cible: { type: 'string' },
          sequence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                etape: { type: 'integer' },
                canal: { type: 'string', enum: ['linkedin', 'email', 'appel', 'whatsapp'] },
                delai_jours: { type: 'integer' },
                contenu: { type: 'string' },
              },
              required: ['etape', 'canal', 'contenu'],
            },
          },
          script_appel: { type: 'string' },
          questions_qualification: { type: 'array', items: { type: 'string' } },
        },
        required: ['resume_cible', 'sequence'],
      },
    },
  },
  ark_finances: {
    cle: 'ark_finances',
    nom: 'ARK Finances',
    role: 'Analyse chiffre d’affaires, commissions, trésorerie et alertes.',
    categorie: 'business',
    branchement_requis: 'Connexion comptabilité ou banque à brancher.',
    prompt: `Tu es ARK Finances. Tu analyses uniquement les données fournies. Tu n'inventes aucun chiffre : si une donnée manque, tu la listes dans donnees_manquantes. Tu réponds uniquement via l'outil, en français.`,
    outil: {
      name: 'enregistrer_finances',
      description: 'Enregistre le point de pilotage financier.',
      input_schema: {
        type: 'object',
        properties: {
          synthese: { type: 'string' },
          indicateurs: {
            type: 'array',
            items: {
              type: 'object',
              properties: { libelle: { type: 'string' }, valeur: { type: 'string' }, commentaire: { type: 'string' } },
              required: ['libelle', 'valeur'],
            },
          },
          alertes: { type: 'array', items: { type: 'string' } },
          donnees_manquantes: { type: 'array', items: { type: 'string' } },
        },
        required: ['synthese', 'indicateurs'],
      },
    },
  },
  ark_juridique: {
    cle: 'ark_juridique',
    nom: 'ARK Juridique',
    role: 'Aide à rédiger CGV, mentions, RGPD et contrats. Ce n’est pas un avocat.',
    categorie: 'business',
    branchement_requis: null,
    prompt: `Tu es ARK Juridique. Tu aides à rédiger, mais tu n'es pas avocat et tu ne garantis pas la conformité. Tu listes toujours les points à faire valider par un juriste avant usage. Tu réponds uniquement via l'outil, en français.`,
    outil: {
      name: 'enregistrer_juridique',
      description: 'Enregistre le document juridique préparé.',
      input_schema: {
        type: 'object',
        properties: {
          type_document: { type: 'string' },
          contenu: { type: 'string' },
          avertissements_conformite: { type: 'array', items: { type: 'string' } },
          a_valider_avec_juriste: { type: 'array', items: { type: 'string' } },
        },
        required: ['type_document', 'contenu', 'a_valider_avec_juriste'],
      },
    },
  },
  ark_recrutement: {
    cle: 'ark_recrutement',
    nom: 'ARK Recrutement',
    role: 'Prépare annonces, critères de tri et questions d’entretien.',
    categorie: 'business',
    branchement_requis: 'Diffusion Indeed ou LinkedIn à brancher.',
    prompt: `Tu es ARK Recrutement. Tu rédiges une annonce, des critères de tri et une grille d'entretien. Tous les critères doivent être non discriminatoires et centrés sur les compétences. Tu réponds uniquement via l'outil, en français.`,
    outil: {
      name: 'enregistrer_recrutement',
      description: 'Enregistre le kit de recrutement.',
      input_schema: {
        type: 'object',
        properties: {
          annonce: { type: 'string' },
          criteres_tri: { type: 'array', items: { type: 'string' } },
          questions_entretien: { type: 'array', items: { type: 'string' } },
          signaux_alerte: { type: 'array', items: { type: 'string' } },
        },
        required: ['annonce', 'criteres_tri', 'questions_entretien'],
      },
    },
  },
  ark_accueil: {
    cle: 'ark_accueil',
    nom: 'ARK Accueil',
    role: 'Qualifie les appels : intention, urgence, résumé et action suggérée.',
    categorie: 'business',
    branchement_requis: 'Téléphonie temps réel Vapi ou Twilio à brancher.',
    prompt: `Tu es ARK Accueil. À partir d'une transcription ou d'un motif d'appel, tu qualifies l'appel : intention, urgence, résumé, action suggérée, transfert humain si nécessaire. Tu réponds uniquement via l'outil, en français.`,
    outil: {
      name: 'enregistrer_accueil',
      description: 'Enregistre la qualification de l’appel.',
      input_schema: {
        type: 'object',
        properties: {
          intention: { type: 'string' },
          urgence: { type: 'string', enum: ['faible', 'moyenne', 'haute'] },
          resume: { type: 'string' },
          action_suggeree: { type: 'string' },
          transfert_humain: { type: 'boolean' },
          message_rappel: { type: 'string' },
        },
        required: ['intention', 'urgence', 'resume', 'action_suggeree', 'transfert_humain'],
      },
    },
  },
}

function getAgent(cle) {
  const agent = AGENTS[cle]
  if (!agent) {
    const error = new Error(`Agent inconnu : ${cle}`)
    error.status = 404
    throw error
  }
  return agent
}

function listAgents() {
  return Object.values(AGENTS).map(({ cle, nom, role, categorie, produit_des_actions, branchement_requis }) => ({
    cle,
    nom,
    role,
    categorie,
    produit_des_actions: Boolean(produit_des_actions),
    branchement_requis,
  }))
}

module.exports = {
  AGENTS,
  getAgent,
  listAgents,
}
