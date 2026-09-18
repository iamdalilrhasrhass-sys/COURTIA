/* ============================================================================
   COURTIA — Démonstration : modèle de données SYNTHÉTIQUE
   ----------------------------------------------------------------------------
   Cabinet fictif « Cabinet Horizon Assurances ». Aucune donnée réelle, aucun
   client, aucun prospect, aucun montant issu de la production.

   Ce fichier décrit un MODÈLE MÉTIER. La correspondance vers les formes exactes
   attendues par chaque écran est faite dans `reponsesDemo.js` : ainsi le jeu de
   données reste lisible, et les adaptateurs restent proches de l'API réelle.

   Registre de courtage : le cabinet exerce en France (ORIAS) et en Suisse.
   Compagnies et adresses sont inventées ; les e-mails utilisent le domaine
   réservé `.invalid` (RFC 2606) et ne peuvent donc atteindre aucune boîte.
   ========================================================================== */

export const CABINET = {
  id: 1,
  nom: 'Cabinet Horizon Assurances',
  ville: 'Genève',
  pays: 'Suisse',
  orias: '00 000 000',
  courtier: 'A. Rochat',
  role: 'Courtier responsable',
}

/* ------------------------------------------------------------------ Dates */
const BASE = new Date()
BASE.setHours(0, 0, 0, 0)
export const decale = (jours) => {
  const d = new Date(BASE)
  d.setDate(d.getDate() + jours)
  return d
}
export const iso = (jours) => decale(jours).toISOString()
export const dateCourte = (jours) => decale(jours).toISOString().slice(0, 10)

/* ---------------------------------------------------------------- Clients */
export const CLIENTS = [
  {
    id: 2001, prenom: 'Anne', nom: 'Delacroix', type: 'personne',
    email: 'anne.delacroix@example.invalid', telephone: '+41 22 000 00 11',
    adresse: '12 rue du Perron', codePostal: '1204', ville: 'Genève', pays: 'Suisse',
    statut: 'actif', score: 92, risque: 'faible', depuis: dateCourte(-820),
    notes: 'Cliente historique. Trois contrats, dont un pilier 3a.',
    dernierContact: dateCourte(-21),
  },
  {
    id: 2002, prenom: 'Pascal', nom: 'Meylan', type: 'personne',
    email: 'pascal.meylan@example.invalid', telephone: '+41 21 000 00 22',
    adresse: '8 avenue de Rumine', codePostal: '1005', ville: 'Lausanne', pays: 'Suisse',
    statut: 'actif', score: 74, risque: 'moyen', depuis: dateCourte(-410),
    notes: 'Aucun pilier 3a au dossier malgré un profil cadre.',
    dernierContact: dateCourte(-9),
  },
  {
    id: 2003, nom: 'Batilog SA', type: 'entreprise',
    email: 'contact@batilog.example.invalid', telephone: '+41 22 000 00 33',
    adresse: '4 route des Acacias', codePostal: '1227', ville: 'Carouge', pays: 'Suisse',
    statut: 'actif', score: 88, risque: 'faible', depuis: dateCourte(-1205),
    notes: 'Deux pièces manquantes : liste du personnel 2026 et décompte de salaires T2.',
    dernierContact: dateCourte(-14),
  },
  {
    id: 2004, prenom: 'Sofia', nom: 'Kunz', type: 'personne',
    email: 'sofia.kunz@example.invalid', telephone: '+41 22 000 00 44',
    adresse: '3 chemin de la Vuarpillière', codePostal: '1260', ville: 'Nyon', pays: 'Suisse',
    statut: 'actif', score: 68, risque: 'moyen', depuis: dateCourte(-260),
    notes: 'Permis de circulation attendu depuis 30 jours.',
    dernierContact: dateCourte(-30),
  },
  {
    id: 2005, prenom: 'Yvan', nom: 'Rochat', type: 'personne',
    email: 'yvan.rochat@example.invalid', telephone: '+41 24 000 00 55',
    adresse: '17 rue du Lac', codePostal: '1400', ville: 'Yverdon-les-Bains', pays: 'Suisse',
    statut: 'actif', score: 81, risque: 'faible', depuis: dateCourte(-640),
    notes: 'Solde restant lié à l’hypothèque, échéance à surveiller.',
    dernierContact: dateCourte(-6),
  },
  {
    id: 2006, nom: 'Étude Moret & Associés', type: 'entreprise',
    email: 'cabinet@moret-associes.example.invalid', telephone: '+41 22 000 00 66',
    adresse: '2 rue de la Corraterie', codePostal: '1204', ville: 'Genève', pays: 'Suisse',
    statut: 'actif', score: 86, risque: 'faible', depuis: dateCourte(-980),
    notes: 'RC professionnelle à échéance rapprochée.',
    dernierContact: dateCourte(-2),
  },
  {
    id: 2007, prenom: 'Léa', nom: 'Fournier', type: 'personne',
    email: 'lea.fournier@example.invalid', telephone: '+41 27 000 00 77',
    adresse: '9 rue de Loèche', codePostal: '1950', ville: 'Sion', pays: 'Suisse',
    statut: 'actif', score: 59, risque: 'élevé', depuis: dateCourte(-150),
    notes: 'Couverture incomplète : aucune protection juridique.',
    dernierContact: dateCourte(-45),
  },
  {
    id: 2008, nom: 'Boulangerie du Bourg', type: 'entreprise',
    email: 'bourg@boulangerie.example.invalid', telephone: '+41 21 000 00 88',
    adresse: '5 place Robin', codePostal: '1800', ville: 'Vevey', pays: 'Suisse',
    statut: 'actif', score: 72, risque: 'moyen', depuis: dateCourte(-530),
    notes: 'Chiffre d’affaires 2025 attendu pour le renouvellement.',
    dernierContact: dateCourte(-17),
  },
]

/* --------------------------------------------------------------- Contrats */
const CONTRATS = [
  [3001, 2001, 'Ménage & RC privée', 'Aurora Assurances', 480, 42, 'actif'],
  [3002, 2001, 'Véhicule', 'Helios Protection', 1120, 12, 'actif'],
  [3003, 2001, 'Prévoyance 3a', 'Serenis Risk', 6800, 96, 'actif'],
  [3004, 2002, 'Maladie complémentaire', 'Novalia Courtage', 1420, 28, 'actif'],
  [3005, 2002, 'Protection juridique', 'Oria Garanties', 260, 200, 'actif'],
  [3006, 2003, 'Dommages bâtiment', 'Atlas Assurances', 9400, 7, 'actif'],
  [3007, 2003, 'LAA entreprise', 'Nivalis Pro', 7300, 61, 'actif'],
  [3008, 2004, 'Véhicule', 'Helios Protection', 890, 19, 'actif'],
  [3009, 2005, 'Solde restant — hypothèque', 'Serenis Risk', 2100, 55, 'actif'],
  [3010, 2005, 'Ménage', 'Aurora Assurances', 410, 130, 'actif'],
  [3011, 2006, 'RC professionnelle', 'Solenys Assur', 3400, 3, 'actif'],
  [3012, 2006, 'Protection juridique', 'Oria Garanties', 620, 88, 'actif'],
  [3013, 2007, 'Maladie complémentaire', 'Novalia Courtage', 980, 36, 'actif'],
  [3014, 2008, 'Commerce', 'Atlas Assurances', 2650, 21, 'actif'],
  [3015, 2008, 'LAA entreprise', 'Nivalis Pro', 1980, 21, 'actif'],
]

const clientParId = (id) => CLIENTS.find((c) => c.id === id)

export const CONTRATS_DETAIL = CONTRATS.map(([id, clientId, type, compagnie, prime, echeance, statut]) => ({
  id, clientId, type, compagnie, prime, echeance,
  statut,
  numero: `CT-${id}`,
  dateEcheance: dateCourte(echeance),
  dateDebut: dateCourte(-300 + echeance),
  client: clientParId(clientId) || null,
  nomClient: clientParId(clientId)?.nom || '',
}))

/* ------------------------------------------------------------------ Tâches */
export const TACHES = [
  [4001, 'Relancer la Fiduciaire Béroche pour l’import de portefeuille', 'relance', 0, null, 'courriel', 'a_faire', 'haute'],
  [4002, 'Appeler Valais Broker Group', 'appel', 0, null, 'telephone', 'a_faire', 'haute'],
  [4003, 'Préparer le devis Cabinet pour le Groupe Vernex', 'devis', 1, null, 'courriel', 'a_faire', 'haute'],
  [4004, 'Récupérer l’attestation d’employeur de Mme Delacroix', 'document', -2, 2001, 'courriel', 'a_faire', 'haute'],
  [4005, 'Récupérer la liste du personnel de Batilog SA', 'document', -1, 2003, 'courriel', 'a_faire', 'haute'],
  [4006, 'Contrôler l’échéance RC professionnelle — Étude Moret', 'echeance', 3, 2006, 'interne', 'a_faire', 'normale'],
  [4007, 'Préparer le renouvellement dommages — Batilog SA', 'echeance', 5, 2003, 'interne', 'a_faire', 'normale'],
  [4008, 'Récupérer le permis de circulation de Mme Kunz', 'document', -5, 2004, 'courriel', 'a_faire', 'haute'],
  [4009, 'Envoyer le récapitulatif d’essai — Fribourg Risk Partners', 'relance', 0, null, 'courriel', 'a_faire', 'normale'],
  [4010, 'Relancer Jura Assurance Conseil', 'relance', -3, null, 'courriel', 'a_faire', 'normale'],
  [4011, 'Préparer la démonstration Riviera Assurances', 'demo', 2, null, 'interne', 'a_faire', 'normale'],
  [4012, 'Relancer Alpina Courtage', 'relance', 1, null, 'courriel', 'a_faire', 'basse'],
].map(([id, titre, type, echeance, clientId, canal, statut, priorite]) => ({
  id, titre, type, echeance, clientId, canal, statut, priorite,
  description: titre,
  dateEcheance: dateCourte(echeance),
  createdAt: iso(-10),
  client: clientId ? clientParId(clientId) : null,
  nomClient: clientId ? clientParId(clientId)?.nom : '',
}))

/* --------------------------------------------------------------- Documents */
export const DOCUMENTS = [
  [7001, 'Attestation d’employeur 2026', 2001, 'attendu', -21, 'courriel'],
  [7002, 'Liste du personnel 2026', 2003, 'attendu', -14, 'courriel'],
  [7003, 'Décompte de salaires T2', 2003, 'attendu', -14, 'courriel'],
  [7004, 'Permis de circulation', 2004, 'en_retard', -30, 'courriel'],
  [7005, 'Chiffre d’affaires 2025', 2008, 'attendu', -17, 'courriel'],
  [7006, 'Police RC professionnelle', 2006, 'recu', -2, 'import'],
  [7007, 'Avenant véhicule', 2002, 'recu', -9, 'courriel'],
].map(([id, nom, clientId, statut, depuis, canal]) => ({
  id, nom, clientId, statut, canal,
  demandeLe: dateCourte(depuis),
  ancienneteJours: Math.abs(depuis),
  taille: 0,
  client: clientParId(clientId),
  nomClient: clientParId(clientId)?.nom || '',
}))

/* ------------------------------------------------------------ Opportunités */
export const OPPORTUNITES = [
  [5001, 2002, 'Prévoyance 3a non équipée', 'Deux contrats au dossier, aucun pilier 3a. Profil salarié cadre.', 4200, 78],
  [5002, 2004, 'Assurance ménage absente', 'Un seul contrat véhicule, aucune couverture habitation déclarée.', 380, 61],
  [5003, 2007, 'Protection juridique absente', 'Assurance maladie uniquement, aucune protection juridique.', 240, 55],
  [5004, 2001, 'Véhicule à renouveler', 'Échéance dans 12 jours, prime supérieure à la moyenne du portefeuille.', 210, 83],
].map(([id, clientId, titre, description, gain, score]) => ({
  id, clientId, titre, description, gain, score,
  potentiel: gain,
  statut: 'nouvelle',
  client: clientParId(clientId),
  nomClient: clientParId(clientId)?.nom || '',
}))

/* ------------------------------------------------------------ Prospection */
export const PROSPECTS = [
  [1001, 'Courtilia SA', 'M. Perrin', 'Lausanne', 'VD', '6 collaborateurs', 'interesse', 'LinkedIn', 88, 2400],
  [1002, 'Fiduciaire Béroche & Cie', 'Mme Saugy', 'Neuchâtel', 'NE', '4 collaborateurs', 'a_repondu', 'Recommandation', 76, 1800],
  [1003, 'Alpina Courtage', 'M. Dumont', 'Sion', 'VS', '3 collaborateurs', 'a_contacter', 'Registre FINMA', 71, 1500],
  [1004, 'Riviera Assurances', 'Mme Favez', 'Vevey', 'VD', '9 collaborateurs', 'demo_planifiee', 'Site web', 82, 3200],
  [1006, 'Groupe Vernex', 'Mme Bianchi', 'Genève', 'GE', '18 collaborateurs', 'negociation', 'Partenariat', 91, 5400],
  [1008, 'Fribourg Risk Partners', 'Mme Jordan', 'Fribourg', 'FR', '7 collaborateurs', 'interesse', 'Recommandation', 79, 2100],
  [1010, 'Valais Broker Group', 'M. Chappaz', 'Martigny', 'VS', '11 collaborateurs', 'demo_planifiee', 'Partenariat', 85, 3900],
].map(([id, societe, contact, ville, canton, taille, statut, source, score, potentiel]) => ({
  id, societe, contact, ville, canton, pays: 'Suisse', taille, statut, source, score, potentiel,
  email: `contact@${societe.toLowerCase().replace(/[^a-z]+/g, '-')}.example.invalid`,
  telephone: '+41 22 000 00 00',
  dernierContact: null,
  prochaineAction: 'Proposer un essai encadré',
}))

/* ------------------------------------------------------------ Messagerie */
export const MESSAGES = [
  [6001, 'Fiduciaire Béroche & Cie', 'Re: import de portefeuille', 'Oui je veux bien voir comment se passe l’import. Vous avez un format de fichier à respecter ?', -1, true],
  [6002, 'Groupe Vernex', 'Re: devis Cabinet', 'Nous validons le principe, il reste la question des 18 utilisateurs.', -1, true],
  [6003, 'Mme Delacroix', 'Attestation employeur', 'Je vous l’envoie dès que les RH me la transmettent.', -6, false],
].map(([id, expediteur, objet, extrait, quand, nonLu]) => ({
  id, expediteur, objet, extrait, nonLu,
  recuLe: iso(quand),
  lu: !nonLu,
  canal: 'courriel',
}))

/* ------------------------------------------------------------------ Rendez-vous */
export const RENDEZ_VOUS = [
  [8001, 'Démonstration — Riviera Assurances', 2, '10:00', 'visio'],
  [8002, 'Point annuel — Mme Delacroix', 4, '14:30', 'cabinet'],
  [8003, 'Appel — Groupe Vernex (décision devis)', 0, '16:00', 'telephone'],
].map(([id, titre, dans, heure, lieu]) => ({
  id, titre, heure, lieu,
  date: dateCourte(dans),
  debut: `${dateCourte(dans)}T${heure}:00`,
  client: null,
}))


/* ------------------------------------------------------------------- DEVIS
   CYCLE COMMERCIAL COHÉRENT : un devis naît d'un prospect ou d'un client
   existant, et son montant découle des contrats réels du portefeuille.
   Statuts alignés sur l'écran (signe | envoye | brouillon | refuse). */
export const DEVIS = [
  [9101, 'Groupe Vernex',   'P-1006', 5400, 'envoye',   -6,  'Cabinet 18 postes',  'Trimestriel'],
  [9102, 'Riviera Assurances', 'P-1004', 3200, 'envoye', -3,  'Cabinet 9 postes',   'Trimestriel'],
  [9103, 'Batilog SA',      null, 16700, 'signe',      -42, 'Multirisque + LAA',  'Annuel'],
  [9104, 'Fiduciaire Béroche & Cie', 'P-1002', 1800, 'brouillon', -1, 'Cabinet 4 postes', 'Trimestriel'],
  [9105, 'Étude Moret & Associés', null, 4020, 'signe',   -88, 'RC pro + PJ',      'Annuel'],
  [9106, 'Courtilia SA',    'P-1001', 2400, 'envoye',    -9,  'Cabinet 6 postes',   'Trimestriel'],
].map(([id, clientNom, prospectId, montant, statut, emis, objet, periodicite]) => ({
  id, client_nom: clientNom, prospect_id: prospectId, montant, statut,
  objet, periodicite,
  reference: `DEV-2026-${String(id).slice(-4)}`,
  date_emission: dateCourte(emis),
  date_validite: dateCourte(emis + 30),
  emis_depuis_jours: Math.abs(emis),
}))

/* -------------------------------------------------------------- PARTENAIRES
   Apporteurs d'affaires : mêmes personnes que les prospects convertis, pour
   que l'histoire reste cohérente d'un écran à l'autre. */
export const PARTENAIRES = [
  [9201, 'Groupe Vernex',   'apporteur', 'actif',    12, 5400, 'Genève'],
  [9202, 'Valais Broker Group', 'apporteur', 'actif', 7, 3900, 'Martigny'],
  [9203, 'Alpina Courtage', 'prescripteur', 'en_attente', 3, 1500, 'Sion'],
  [9204, 'Courtilia SA',    'prescripteur', 'actif',  5, 2400, 'Lausanne'],
].map(([id, nom, type, statut, dossiers, volume, ville]) => ({
  id, nom, type, statut, dossiers, volume, ville,
  email: `contact@${nom.toLowerCase().replace(/[^a-z]+/g, '-')}.example.invalid`,
  depuis: dateCourte(-120 - id % 90),
}))

/* --------------------------------------------------------- AUTOMATISATIONS
   Uniquement des règles RÉELLEMENT présentes dans le produit (relances,
   collecte de pièces, surveillance d'échéances, brief du matin). */
export const AUTOMATISATIONS = [
  [9301, 'Relance des devis sans réponse', 'J+7 après envoi', 'actif', 2, 6],
  [9302, 'Collecte des pièces manquantes', 'J+3 puis J+10', 'actif', 5, 17],
  [9303, 'Alerte échéance contrat', 'J-30 avant échéance', 'actif', 7, 0],
  [9304, 'Brief du matin ARK', 'Chaque jour 7h00', 'actif', 1, 0],
  [9305, 'Détection client silencieux', 'Aucun contact depuis 45 j', 'actif', 3, 0],
].map(([id, nom, declencheur, statut, executions, enAttente]) => ({
  id, nom, declencheur, statut, executions, en_attente: enAttente,
  derniere_execution: iso(-1),
}))

/* =========================================================== Agrégats ==== */
export const contratParId = (id) => CONTRATS_DETAIL.find((c) => c.id === Number(id))
export const clientDetail = (id) => {
  const c = CLIENTS.find((x) => x.id === Number(id))
  if (!c) return null
  return {
    ...c,
    contrats: CONTRATS_DETAIL.filter((k) => k.clientId === c.id),
    taches: TACHES.filter((t) => t.clientId === c.id),
    documents: DOCUMENTS.filter((d) => d.clientId === c.id),
    opportunites: OPPORTUNITES.filter((o) => o.clientId === c.id),
  }
}

export const primesTotales = () => CONTRATS_DETAIL.reduce((s, c) => s + c.prime, 0)

export const statsPortefeuille = () => {
  const contrats = CONTRATS_DETAIL
  const primes = primesTotales()
  return {
    clients: CLIENTS.length,
    clientsActifs: CLIENTS.filter((c) => c.statut === 'actif').length,
    contrats: contrats.length,
    primes,
    primeMoyenne: Math.round(primes / contrats.length),
    scoreMoyen: Math.round(CLIENTS.reduce((s, c) => s + c.score, 0) / CLIENTS.length),
    aProteger: CLIENTS.filter((c) => c.score < 70).length,
    aDevelopper: CLIENTS.filter((c) => c.score >= 80).length,
    echeances30j: contrats.filter((c) => c.echeance <= 30).length,
    tachesOuvertes: TACHES.filter((t) => t.statut !== 'termine').length,
    documentsAttendus: DOCUMENTS.filter((d) => d.statut !== 'recu').length,
    opportunites: OPPORTUNITES.length,
    prospects: PROSPECTS.length,
    messagesNonLus: MESSAGES.filter((m) => m.nonLu).length,
  }
}

export const relancesDues = () => TACHES.filter((t) => t.echeance <= 0).sort((a, b) => a.echeance - b.echeance)
export const dossiersIncomplets = () =>
  CLIENTS.map((c) => ({ ...c, manquants: DOCUMENTS.filter((d) => d.clientId === c.id && d.statut !== 'recu') }))
    .filter((c) => c.manquants.length)
    .sort((a, b) => b.manquants.length - a.manquants.length)

/** Réponse d'ARK — TOUJOURS calculée depuis les données ci-dessus, jamais écrite en dur. */
export const reponseArk = (question = '') => {
  const q = question.toLowerCase()
  const dossiers = dossiersIncomplets()
  const relances = relancesDues()
  const s = statsPortefeuille()

  if (/dossier|pi[eè]ce|manqu|incomplet/.test(q)) {
    if (!dossiers.length) return 'Aucun dossier incomplet : toutes les pièces attendues sont arrivées.'
    return `${dossiers.length} dossiers sont incomplets :\n`
      + dossiers.map((c) => `• ${c.nom} — ${c.manquants.map((m) => m.nom).join(', ')} (demandé il y a ${Math.max(...c.manquants.map((m) => m.ancienneteJours))} jours)`).join('\n')
      + `\n\nLe plus ancien attend depuis ${Math.max(...dossiers.flatMap((c) => c.manquants.map((m) => m.ancienneteJours)))} jours.`
  }
  if (/rappeler|relanc|retard|aujourd/.test(q)) {
    return `${relances.length} relances sont dues aujourd’hui :\n`
      + relances.slice(0, 6).map((t) => `• ${t.titre}${t.echeance < 0 ? ` — ${Math.abs(t.echeance)} jours de retard` : ''}`).join('\n')
  }
  if (/[eé]ch[eé]ance|renouvel|30 jours/.test(q)) {
    const proches = CONTRATS_DETAIL.filter((c) => c.echeance <= 30).sort((a, b) => a.echeance - b.echeance)
    return `${proches.length} contrats arrivent à échéance dans les 30 jours :\n`
      + proches.map((c) => `• ${c.type} — ${c.nomClient} (dans ${c.echeance} jours, ${c.compagnie})`).join('\n')
  }
  if (/opportunit|d[eé]velopp|cross/.test(q)) {
    return `${OPPORTUNITES.length} opportunités détectées sur le portefeuille, pour ${OPPORTUNITES.reduce((a, o) => a + o.gain, 0).toLocaleString('fr-CH')} CHF de potentiel :\n`
      + OPPORTUNITES.map((o) => `• ${o.nomClient} — ${o.titre} (${o.gain.toLocaleString('fr-CH')} CHF)`).join('\n')
  }
  if (/portefeuille|r[eé]sum|journ[eé]e|brief|bilan/.test(q)) {
    return `Votre cabinet en un coup d’œil :\n`
      + `• ${s.clients} clients suivis, ${s.contrats} contrats\n`
      + `• ${s.primes.toLocaleString('fr-CH')} CHF de primes annuelles gérées\n`
      + `• ${relances.length} relances dues aujourd’hui\n`
      + `• ${dossiers.length} dossiers incomplets\n`
      + `• ${s.echeances30j} échéances dans les 30 jours\n`
      + `• ${OPPORTUNITES.length} opportunités non exploitées`
  }
  return 'Je peux répondre sur les dossiers incomplets, les relances dues, les échéances proches, les opportunités ou faire le point sur le portefeuille.'
}

export const QUESTION_ARK_DEMO = 'Quels dossiers sont incomplets ?'
