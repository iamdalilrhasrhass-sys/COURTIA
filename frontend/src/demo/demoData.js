/* ============================================================================
   COURTIA — DÉMO GUIDÉE : jeu de données 100 % SYNTHÉTIQUE
   ----------------------------------------------------------------------------
   Aucune donnée réelle. Aucun accès à la production.
   - Cabinet, personnes, contrats, montants : entièrement fictifs.
   - Adresses e-mail en `.invalid` (RFC 2606, non routable) : un message issu de
     cette démo ne peut pas partir vers une vraie boîte.
   - Téléphones manifestement factices.
   - Compagnies : celles du design system interne (fictives).
   ========================================================================== */

export const CABINET = {
  nom: 'Cabinet Horizon Assurances',
  ville: 'Genève',
  canton: 'GE',
  courtier: 'A. Rochat',
  role: 'Courtier responsable',
  mention: 'Démonstration — cabinet fictif',
}

const BASE = new Date()
BASE.setHours(0, 0, 0, 0)
export const jour = (n) => { const d = new Date(BASE); d.setDate(d.getDate() + n); return d }
export const iso = (n) => jour(n).toISOString().slice(0, 10)
export const fr = (n) => jour(n).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' })
export const frLong = (n) => jour(n).toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' })

export const STATUT = {
  NEW: 'Nouveau', TO_CONTACT: 'À contacter', CONTACTED: 'Contacté', REPLIED: 'A répondu',
  INTERESTED: 'Intéressé', DEMO: 'Démo planifiée', NEGOTIATION: 'Négociation',
  WON: 'Gagné', LOST: 'Perdu', DO_NOT_CONTACT: 'Ne pas contacter',
}

/* ---------------------------------------------------------------- PROSPECTS */
export const PROSPECTS = [
  { id: 'P-1001', societe: 'Courtilia SA', contact: 'M. Perrin', ville: 'Lausanne', canton: 'VD',
    taille: '6 collaborateurs', statut: 'INTERESTED', source: 'LinkedIn', score: 88, potentiel: 2400,
    dernier: -3, prochaine: 0, note: 'A demandé un comparatif avant décision.' },
  { id: 'P-1002', societe: 'Fiduciaire Béroche & Cie', contact: 'Mme Saugy', ville: 'Neuchâtel', canton: 'NE',
    taille: '4 collaborateurs', statut: 'REPLIED', source: 'Recommandation', score: 76, potentiel: 1800,
    dernier: -6, prochaine: 0, note: 'Veut voir l’import de portefeuille.' },
  { id: 'P-1003', societe: 'Alpina Courtage', contact: 'M. Dumont', ville: 'Sion', canton: 'VS',
    taille: '3 collaborateurs', statut: 'TO_CONTACT', source: 'Registre FINMA', score: 71, potentiel: 1500,
    dernier: null, prochaine: 1, note: 'Cabinet récent, très digitalisé.' },
  { id: 'P-1004', societe: 'Riviera Assurances', contact: 'Mme Favez', ville: 'Vevey', canton: 'VD',
    taille: '9 collaborateurs', statut: 'DEMO', source: 'Site web', score: 82, potentiel: 3200,
    dernier: -2, prochaine: 2, note: 'Démo planifiée, besoin multi-utilisateurs.' },
  { id: 'P-1006', societe: 'Groupe Vernex', contact: 'Mme Bianchi', ville: 'Genève', canton: 'GE',
    taille: '18 collaborateurs', statut: 'NEGOTIATION', source: 'Partenariat', score: 91, potentiel: 5400,
    dernier: -1, prochaine: 0, note: 'Devis Cabinet en cours, décision cette semaine.' },
  { id: 'P-1008', societe: 'Fribourg Risk Partners', contact: 'Mme Jordan', ville: 'Fribourg', canton: 'FR',
    taille: '7 collaborateurs', statut: 'INTERESTED', source: 'Recommandation', score: 79, potentiel: 2100,
    dernier: -4, prochaine: 0, note: 'Veut un essai sur 3 utilisateurs.' },
  { id: 'P-1007', societe: 'Jura Assurance Conseil', contact: 'M. Froidevaux', ville: 'Delémont', canton: 'JU',
    taille: '3 collaborateurs', statut: 'CONTACTED', source: 'Registre FINMA', score: 58, potentiel: 1200,
    dernier: -8, prochaine: 0, note: 'Pas de réponse au premier message.' },
  { id: 'P-1010', societe: 'Valais Broker Group', contact: 'M. Chappaz', ville: 'Martigny', canton: 'VS',
    taille: '11 collaborateurs', statut: 'DEMO', source: 'Partenariat', score: 85, potentiel: 3900,
    dernier: -5, prochaine: 1, note: 'Essai en cours, 2 utilisateurs actifs.' },
  { id: 'P-1009', societe: 'Montreux Assurances', contact: 'M. Copt', ville: 'Montreux', canton: 'VD',
    taille: '2 collaborateurs', statut: 'NEW', source: 'Registre FINMA', score: 52, potentiel: 900,
    dernier: null, prochaine: 3, note: 'À qualifier.' },
  { id: 'P-1005', societe: 'Léman Patrimoine', contact: 'M. Nguyen', ville: 'Nyon', canton: 'VD',
    taille: '5 collaborateurs', statut: 'CONTACTED', source: 'Salon', score: 64, potentiel: 1400,
    dernier: -11, prochaine: 1, note: 'Attentif au suivi LSA.' },
]

/* ------------------------------------------------------------------ CLIENTS */
export const CLIENTS = [
  { id: 'C-2001', nom: 'Mme Anne Delacroix', ville: 'Genève', depuis: -820, score: 92, risque: 'faible',
    contrats: [
      { id: 'CT-3001', produit: 'Ménage & RC privée', compagnie: 'Aurora Assurances', prime: 480, echeance: 42 },
      { id: 'CT-3002', produit: 'Véhicule', compagnie: 'Helios Protection', prime: 1120, echeance: 12 },
      { id: 'CT-3003', produit: 'Prévoyance 3a', compagnie: 'Serenis Risk', prime: 6800, echeance: 96 },
    ], manquants: ['Attestation d’employeur 2026'], dernier: -21 },
  { id: 'C-2002', nom: 'M. Pascal Meylan', ville: 'Lausanne', depuis: -410, score: 74, risque: 'moyen',
    contrats: [
      { id: 'CT-3004', produit: 'Maladie complémentaire', compagnie: 'Novalia Courtage', prime: 1420, echeance: 28 },
      { id: 'CT-3005', produit: 'Protection juridique', compagnie: 'Oria Garanties', prime: 260, echeance: 200 },
    ], manquants: [], dernier: -9 },
  { id: 'C-2003', nom: 'Société Batilog SA', ville: 'Carouge', depuis: -1205, score: 88, risque: 'faible',
    contrats: [
      { id: 'CT-3006', produit: 'Dommages bâtiment', compagnie: 'Atlas Assurances', prime: 9400, echeance: 7 },
      { id: 'CT-3007', produit: 'LAA entreprise', compagnie: 'Nivalis Pro', prime: 7300, echeance: 61 },
    ], manquants: ['Liste du personnel 2026', 'Décompte de salaires T2'], dernier: -14 },
  { id: 'C-2004', nom: 'Mme Sofia Kunz', ville: 'Nyon', depuis: -260, score: 68, risque: 'moyen',
    contrats: [{ id: 'CT-3008', produit: 'Véhicule', compagnie: 'Helios Protection', prime: 890, echeance: 19 }],
    manquants: ['Permis de circulation (recto/verso)'], dernier: -30 },
  { id: 'C-2005', nom: 'M. Yvan Rochat', ville: 'Yverdon', depuis: -640, score: 81, risque: 'faible',
    contrats: [
      { id: 'CT-3009', produit: 'Solde restant — hypothèque', compagnie: 'Serenis Risk', prime: 2100, echeance: 55 },
      { id: 'CT-3010', produit: 'Ménage', compagnie: 'Aurora Assurances', prime: 410, echeance: 130 },
    ], manquants: [], dernier: -6 },
  { id: 'C-2006', nom: 'Étude Moret & Associés', ville: 'Genève', depuis: -980, score: 86, risque: 'faible',
    contrats: [
      { id: 'CT-3011', produit: 'RC professionnelle', compagnie: 'Solenys Assur', prime: 3400, echeance: 3 },
      { id: 'CT-3012', produit: 'Protection juridique', compagnie: 'Oria Garanties', prime: 620, echeance: 88 },
    ], manquants: [], dernier: -2 },
  { id: 'C-2007', nom: 'Mme Léa Fournier', ville: 'Sion', depuis: -150, score: 59, risque: 'élevé',
    contrats: [{ id: 'CT-3013', produit: 'Maladie complémentaire', compagnie: 'Novalia Courtage', prime: 980, echeance: 36 }],
    manquants: [], dernier: -45 },
  { id: 'C-2008', nom: 'Boulangerie du Bourg', ville: 'Vevey', depuis: -530, score: 72, risque: 'moyen',
    contrats: [
      { id: 'CT-3014', produit: 'Commerce', compagnie: 'Atlas Assurances', prime: 2650, echeance: 21 },
      { id: 'CT-3015', produit: 'LAA entreprise', compagnie: 'Nivalis Pro', prime: 1980, echeance: 21 },
    ], manquants: ['Chiffre d’affaires 2025'], dernier: -17 },
]

/* -------------------------------------------------------------- TÂCHES/REL. */
export const TACHES = [
  { id: 'T-4001', titre: 'Relancer Mme Saugy (Fiduciaire Béroche)', type: 'Relance', echeance: 0, prospectId: 'P-1002', canal: 'Courriel', etat: 'à faire' },
  { id: 'T-4002', titre: 'Appeler M. Chappaz (Valais Broker Group)', type: 'Appel', echeance: 0, prospectId: 'P-1010', canal: 'Téléphone', etat: 'à faire' },
  { id: 'T-4003', titre: 'Préparer le devis Cabinet — Groupe Vernex', type: 'Devis', echeance: 1, prospectId: 'P-1006', canal: 'Courriel', etat: 'à faire' },
  { id: 'T-4004', titre: 'Récupérer l’attestation d’employeur — Mme Delacroix', type: 'Document', echeance: -2, clientId: 'C-2001', canal: 'Courriel', etat: 'à faire' },
  { id: 'T-4005', titre: 'Récupérer la liste du personnel — Batilog SA', type: 'Document', echeance: -1, clientId: 'C-2003', canal: 'Courriel', etat: 'à faire' },
  { id: 'T-4006', titre: 'Contrôler l’échéance RC pro — Étude Moret', type: 'Échéance', echeance: 3, clientId: 'C-2006', canal: 'Interne', etat: 'à faire' },
  { id: 'T-4009', titre: 'Envoyer le récapitulatif d’essai — Fribourg Risk Partners', type: 'Relance', echeance: 0, prospectId: 'P-1008', canal: 'Courriel', etat: 'à faire' },
  { id: 'T-4010', titre: 'Récupérer le permis de circulation — Mme Kunz', type: 'Document', echeance: -5, clientId: 'C-2004', canal: 'Courriel', etat: 'à faire' },
  { id: 'T-4011', titre: 'Relancer M. Froidevaux (Jura Assurance Conseil)', type: 'Relance', echeance: -3, prospectId: 'P-1007', canal: 'Courriel', etat: 'à faire' },
  { id: 'T-4007', titre: 'Relancer M. Dumont (Alpina Courtage)', type: 'Relance', echeance: 1, prospectId: 'P-1003', canal: 'Courriel', etat: 'à faire' },
  { id: 'T-4008', titre: 'Préparer la démo Riviera Assurances', type: 'Démo', echeance: 2, prospectId: 'P-1004', canal: 'Interne', etat: 'à faire' },
  { id: 'T-4012', titre: 'Préparer le renouvellement dommages — Batilog SA', type: 'Échéance', echeance: 5, clientId: 'C-2003', canal: 'Interne', etat: 'à faire' },
]

/* --------------------------------------------------------------- DOCUMENTS */
export const DOCUMENTS = [
  { id: 'D-7001', nom: 'Attestation d’employeur 2026', clientId: 'C-2001', statut: 'attendu', depuis: -21, canal: 'Courriel' },
  { id: 'D-7002', nom: 'Liste du personnel 2026', clientId: 'C-2003', statut: 'attendu', depuis: -14, canal: 'Courriel' },
  { id: 'D-7003', nom: 'Décompte de salaires T2', clientId: 'C-2003', statut: 'attendu', depuis: -14, canal: 'Courriel' },
  { id: 'D-7004', nom: 'Permis de circulation', clientId: 'C-2004', statut: 'en retard', depuis: -30, canal: 'Courriel' },
  { id: 'D-7005', nom: 'Chiffre d’affaires 2025', clientId: 'C-2008', statut: 'attendu', depuis: -17, canal: 'Courriel' },
  { id: 'D-7006', nom: 'Police RC professionnelle', clientId: 'C-2006', statut: 'reçu', depuis: -2, canal: 'Import' },
  { id: 'D-7007', nom: 'Avenant véhicule', clientId: 'C-2002', statut: 'reçu', depuis: -9, canal: 'Courriel' },
]

/* ----------------------------------------------------------- OPPORTUNITÉS */
export const OPPORTUNITES = [
  { id: 'O-5001', clientId: 'C-2002', titre: 'Prévoyance 3a non équipée',
    detail: 'Deux contrats au dossier, aucun pilier 3a. Profil salarié cadre.', gain: 4200 },
  { id: 'O-5002', clientId: 'C-2004', titre: 'Assurance ménage absente',
    detail: 'Un seul contrat véhicule, aucune couverture habitation déclarée.', gain: 380 },
  { id: 'O-5003', clientId: 'C-2007', titre: 'Protection juridique absente',
    detail: 'Assurance maladie uniquement. Aucune protection juridique.', gain: 240 },
  { id: 'O-5004', clientId: 'C-2001', titre: 'Véhicule à renouveler',
    detail: 'Échéance dans 12 jours, prime au-dessus de la moyenne du portefeuille.', gain: 210 },
]

/* -------------------------------------------------------------- MESSAGES */
export const MESSAGES = [
  { id: 'M-6001', de: 'Fiduciaire Béroche & Cie', objet: 'Re: import de portefeuille',
    extrait: 'Oui je veux bien voir comment se passe l’import. Vous avez un format de fichier à respecter ?', quand: -1, nonLu: true },
  { id: 'M-6002', de: 'Groupe Vernex', objet: 'Re: devis Cabinet',
    extrait: 'Nous validons le principe, il reste la question des 18 utilisateurs.', quand: -1, nonLu: true },
  { id: 'M-6003', de: 'Mme Delacroix', objet: 'Attestation employeur',
    extrait: 'Je vous l’envoie dès que les RH me la transmettent.', quand: -6, nonLu: false },
]

/* -------------------------------------------------------------- ACTIVITÉ */
export const ACTIVITE = [
  { id: 'A-1', quand: -0.2, texte: 'Attestation reçue pour Étude Moret & Associés', type: 'Document' },
  { id: 'A-2', quand: -0.5, texte: 'Réponse reçue de Fiduciaire Béroche & Cie', type: 'Message' },
  { id: 'A-3', quand: -1, texte: 'Devis Cabinet envoyé à Groupe Vernex', type: 'Devis' },
  { id: 'A-4', quand: -1.4, texte: 'Appel consigné avec Valais Broker Group', type: 'Appel' },
  { id: 'A-5', quand: -2, texte: 'Démo planifiée pour Riviera Assurances', type: 'RDV' },
]

/* ============================================================ SÉLECTEURS */
export const parId = {
  prospect: (id) => PROSPECTS.find((p) => p.id === id) || null,
  client: (id) => CLIENTS.find((c) => c.id === id) || null,
}

export const contratsTous = () =>
  CLIENTS.flatMap((c) => c.contrats.map((ct) => ({ ...ct, client: c })))
    .sort((a, b) => a.echeance - b.echeance)

export const dossiersIncomplets = () =>
  CLIENTS.filter((c) => c.manquants.length).sort((a, b) => b.manquants.length - a.manquants.length)

export const relancesDues = () =>
  TACHES.filter((t) => t.echeance <= 0).sort((a, b) => a.echeance - b.echeance)

export const prospectsPrioritaires = (n = 3) =>
  [...PROSPECTS]
    .sort((a, b) => {
      const da = a.prochaine === 0 ? 0 : a.prochaine > 0 ? 2 : 1
      const db = b.prochaine === 0 ? 0 : b.prochaine > 0 ? 2 : 1
      if (da !== db) return da - db
      return b.score - a.score
    })
    .slice(0, n)

export const portefeuille = () => {
  const contrats = contratsTous()
  const primes = contrats.reduce((s, c) => s + c.prime, 0)
  return {
    clients: CLIENTS.length,
    contrats: contrats.length,
    primes,
    moyenne: Math.round(primes / contrats.length),
    scoreMoyen: Math.round(CLIENTS.reduce((s, c) => s + c.score, 0) / CLIENTS.length),
    aProteger: CLIENTS.filter((c) => c.score < 70).length,
    aDevelopper: CLIENTS.filter((c) => c.score >= 80).length,
  }
}

/** Totaux utilisés par le brief ARK — toujours calculés, jamais écrits en dur. */
export const totaux = () => ({
  prospectsPrioritaires: prospectsPrioritaires(3).length,
  dossiersIncomplets: dossiersIncomplets().length,
  relances: relancesDues().length,
  echeances30j: contratsTous().filter((c) => c.echeance <= 30).length,
  opportunites: OPPORTUNITES.length,
  messages: MESSAGES.filter((m) => m.nonLu).length,
})

/* ------------------------------------------------- RELANCE PROPOSÉE PAR ARK
   Le texte est construit ici (et non dans l'écran) pour que le scénario puisse
   le « taper » caractère par caractère : la saisie simulée et le texte final
   sont donc rigoureusement identiques. */
const estNegociation = PROSPECTS.find((p) => p.id === 'P-1006')

export const RELANCE_MESSAGE =
  `Bonjour ${(estNegociation?.contact || '').replace('Mme ', 'Madame ').replace('M. ', 'Monsieur ')},\n\n`
  + `Je reviens vers vous concernant le devis Cabinet évoqué la semaine dernière. `
  + `Vous m’aviez indiqué une décision pour cette semaine — je reste à votre disposition `
  + `si un point mérite d’être ajusté, notamment sur le nombre d’utilisateurs.\n\n`
  + `Souhaitez-vous que nous en reparlions 15 minutes cette semaine ?\n\n`
  + `${CABINET.courtier}\n${CABINET.nom}`

/** Réponse d'ARK à « Quels dossiers sont incomplets ? » — entièrement calculée. */
export const REPONSE_ARK_DOSSIERS = () => {
  const d = dossiersIncomplets()
  return `${d.length} dossiers sont incomplets :\n`
    + d.map((c) => `• ${c.nom} — ${c.manquants.join(', ')} (demandé il y a ${Math.abs(c.dernier)} jours)`).join('\n')
    + `\n\nLe plus ancien attend depuis ${Math.max(...d.map((c) => Math.abs(c.dernier)))} jours.`
}

export const QUESTION_ARK = 'Quels dossiers sont incomplets ?'

