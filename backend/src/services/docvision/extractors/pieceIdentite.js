/**
 * LOT 10 - Extracteur Pièce d'Identité
 * Extraction automatique des données d'une CNI, passeport ou permis
 * 
 * @module docvision/extractors/pieceIdentite
 */

const logger = require('../../../lib/logger')

// Schéma JSON attendu
//
// MARCHÉ SUISSE (défaut P2 CH-028) : l'énumération ne connaissait que les
// pièces FRANÇAISES (CNI, titre de séjour). Un cabinet suisse présentait une
// carte d'identité suisse ou un permis de séjour, et la lecture retombait sur
// « autre » — la pièce n'était donc jamais reconnue comme une pièce d'identité.
// Les types suisses sont AJOUTÉS (aucun type français n'est retiré : des
// documents déjà classés portent les anciennes valeurs).
const PIECE_IDENTITE_SCHEMA = {
  type: 'object',
  properties: {
    type_piece: {
      type: 'string',
      enum: ['cni', 'passeport', 'permis', 'titre_sejour', 'autre',
        'carte_identite_ch', 'permis_sejour', 'permis_circulation'],
      description: "Type de pièce (cni/carte_identite_ch = carte d'identité, permis_sejour/titre_sejour = titre de séjour, permis_circulation = carte grise, permis = permis de conduire)"
    },
    numero: { type: 'string', description: 'Numéro de la pièce' },
    nom: { type: 'string', description: 'Nom de famille' },
    nom_usage: { type: 'string', description: 'Nom d\'usage (si différent)' },
    prenom: { type: 'string', description: 'Prénom(s)' },
    sexe: { type: 'string', enum: ['M', 'F'], description: 'Sexe' },
    date_naissance: { type: 'string', description: 'Date de naissance (YYYY-MM-DD)' },
    lieu_naissance: { type: 'string', description: 'Lieu de naissance' },
    nationalite: { type: 'string', description: 'Nationalité' },
    taille: { type: 'number', description: 'Taille en cm (permis)' },
    adresse: { type: 'string', description: 'Adresse (si présente)' },
    date_emission: { type: 'string', description: 'Date d\'émission (YYYY-MM-DD)' },
    date_expiration: { type: 'string', description: 'Date d\'expiration (YYYY-MM-DD)' },
    autorite: { type: 'string', description: 'Autorité de délivrance' },
    mrz: { type: 'string', description: 'Zone de lecture automatique (MRZ) si visible' },
    categories_permis: {
      type: 'array',
      items: { type: 'string' },
      description: 'Catégories de permis (B, A, A2, etc.) - pour permis uniquement'
    }
  },
  required: ['type_piece', 'nom', 'prenom', 'date_naissance']
}

// Prompt système pour Claude Vision
//
// MARCHÉ SUISSE (défaut P2 CH-028) : ce prompt annonçait un « expert en lecture
// de documents d'identité FRANÇAIS » et ne décrivait que la CNI, le passeport et
// le permis français. Le modèle n'avait donc aucune raison de reconnaître une
// carte d'identité suisse ou un permis de séjour suisse, et reclassait la pièce
// en « autre ». Il lit désormais les deux marchés servis, sans RIEN affirmer sur
// le contenu d'une pièce suisse que la pièce ne montre pas : les consignes
// demandent de lire ce qui est imprimé, jamais de compléter.
const SYSTEM_PROMPT = `Tu es un expert en lecture de documents d'identité (France et Suisse).

TYPES DE DOCUMENTS:
1. CARTE NATIONALE D'IDENTITÉ FRANÇAISE (CNI)
   - Recto: photo, nom, prénoms, sexe, nationalité, date/lieu naissance
   - Verso: adresse, taille, date émission/expiration, n° carte
   - MRZ en bas (2 lignes de 36 caractères)

2. PASSEPORT
   - Page photo: nom, prénoms, date/lieu naissance, sexe, nationalité
   - MRZ en bas (2 lignes de 44 caractères)
   - N° passeport en haut à droite

3. PERMIS DE CONDUIRE
   - Nom, prénom (1, 2)
   - Date/lieu naissance (3)
   - Date émission (4a), expiration (4b)
   - N° permis (5)
   - Photo
   - Catégories (9) avec dates

4. CARTE D'IDENTITÉ SUISSE (Confédération suisse)
   - Le pays émetteur est imprimé sur la pièce (mentions en allemand, français,
     italien et romanche). Lis ce qui est écrit : ne suppose JAMAIS que la pièce
     est française.
   - Nom, prénoms, date de naissance, sexe, lieu d'origine/naissance, nationalité
   - N° de document et dates d'émission/expiration tels qu'imprimés
   - Ne présume pas du format du numéro : recopie-le tel qu'il apparaît.

5. PERMIS DE SÉJOUR / AUTORISATION DE SÉJOUR (Suisse)
   - Titre délivré à un ressortissant étranger ; le type de permis figure sur le
     document (lettre et libellé imprimés).
   - Nom, prénoms, date de naissance, nationalité, dates de validité, n° document

6. PERMIS DE CIRCULATION (carte grise suisse)
   - Document d'immatriculation d'un véhicule, titulaire et numéro de plaque
   - Nom/prénom du titulaire, adresse, immatriculation si visibles

INSTRUCTIONS:
- Dates au format YYYY-MM-DD
- Nom en MAJUSCULES
- Prénoms avec majuscule initiale
- Si plusieurs prénoms, les séparer par espace
- Sexe: M ou F
- Pour le permis, lister toutes les catégories visibles
- type_piece: utilise 'carte_identite_ch' pour une carte d'identité suisse,
  'permis_sejour' pour un titre de séjour suisse, 'permis_circulation' pour une
  carte grise suisse, 'cni' pour une CNI française, 'titre_sejour' pour un titre
  de séjour français.

ATTENTION À LA CONFIDENTIALITÉ:
- Ne jamais inventer de données
- Si un champ n'est pas lisible, mettre null

Réponds UNIQUEMENT avec un JSON valide.`

const USER_PROMPT = `Analyse cette pièce d'identité et extrais les informations personnelles.

Retourne un JSON avec:
- type_piece: cni/carte_identite_ch/passeport/permis/permis_circulation/titre_sejour/permis_sejour/autre
- numero: n° du document
- nom: nom de famille (MAJUSCULES)
- nom_usage: nom d'usage (si différent)
- prenom: prénom(s)
- sexe: M ou F
- date_naissance: YYYY-MM-DD
- lieu_naissance: ville/pays
- nationalite: nationalité
- taille: cm (si visible)
- adresse: adresse (si visible)
- date_emission: YYYY-MM-DD
- date_expiration: YYYY-MM-DD
- autorite: autorité émettrice
- mrz: zone MRZ (si visible)
- categories_permis: ["B", "A"] (pour permis)

JSON:`

/**
 * Marqueurs d'une pièce émise par la SUISSE. POURQUOI (défaut P2 CH-028) : le
 * détecteur ne connaissait que « RÉPUBLIQUE FRANÇAISE » et « CARTE NATIONALE ».
 * Une carte d'identité suisse tombait donc dans « autre ». Les marqueurs sont
 * ceux IMPRIMÉS sur le document (nom du pays dans les langues nationales) —
 * aucun contenu de champ n'est supposé.
 */
const MARQUEURS_SUISSE = [
  'CONFÉDÉRATION SUISSE', 'CONFEDERATION SUISSE', 'SCHWEIZERISCHE EIDGENOSSENSCHAFT',
  'CONFEDERAZIONE SVIZZERA', 'CONFEDERAZIUN SVIZRA', 'SUISSE', 'SCHWEIZ', 'SVIZZERA',
]

function contientMarqueurSuisse(upper) {
  // « SUISSE »/« SCHWEIZ » seuls sont trop courts pour être décisifs : on exige
  // en plus une mention d'identité, de séjour ou de circulation (test ci-dessous).
  return MARQUEURS_SUISSE.some((m) => upper.includes(m))
}

/**
 * Détecte le type de pièce (France ET Suisse).
 */
function detectPieceType(text) {
  if (!text) return null
  const upper = text.toUpperCase()
  const suisse = contientMarqueurSuisse(upper)

  // ── Suisse d'abord : une pièce suisse contient « SUISSE »/« SCHWEIZ » et une
  //    mention de document. L'ordre évite qu'une carte suisse soit lue « cni »
  //    parce qu'elle dit « CARTE D'IDENTITÉ » (c'est exactement le défaut).
  if (suisse && (upper.includes('PERMIS DE CIRCULATION') || upper.includes('FAHRZEUGAUSWEIS')
    || upper.includes('LICENZA DI CIRCOLAZIONE') || upper.includes("CERTIFICAT D'IMMATRICULATION"))) {
    return 'permis_circulation'
  }
  if (upper.includes('PERMIS DE SÉJOUR') || upper.includes('PERMIS DE SEJOUR')
    || upper.includes("AUTORISATION DE SÉJOUR") || upper.includes('AUTORISATION DE SEJOUR')
    || upper.includes('AUFENTHALTSBEWILLIGUNG') || upper.includes('PERMESSO DI SOGGIORNO')) {
    // Le titre de séjour SUISSE est un permis (livret/titre) : il ne doit pas être
    // confondu avec le « titre de séjour » français, déjà géré plus bas.
    return suisse ? 'permis_sejour' : 'titre_sejour'
  }
  if (suisse && (upper.includes("CARTE D'IDENTITÉ") || upper.includes("CARTE D'IDENTITE")
    || upper.includes('IDENTITÄTSKARTE') || upper.includes("CARTE D'IDENTITA")
    || upper.includes('CARTE IDENTITE'))) {
    return 'carte_identite_ch'
  }
  if (upper.includes('CARTE NATIONALE') || upper.includes("CARTE D'IDENTITÉ")
    || upper.includes('RÉPUBLIQUE FRANÇAISE') && upper.includes('IDENTITÉ')) {
    return 'cni'
  }
  if (upper.includes('PASSEPORT') || upper.includes('PASSEPORT SUISSE') || upper.includes('PASSAPORT')) {
    return 'passeport'
  }
  if (upper.includes('PERMIS DE CONDUIRE') || upper.includes('DRIVING LICENCE')
    || upper.includes('FÜHRERAUSWEIS')) {
    return 'permis'
  }
  if (upper.includes('TITRE DE SÉJOUR') || upper.includes('CARTE DE SÉJOUR') || upper.includes('CARTE DE RESIDENT')) {
    return 'titre_sejour'
  }
  if (suisse && upper.includes('IDENTIT')) {
    // Marqueur suisse + mention d'identité dans une langue nationale.
    return 'carte_identite_ch'
  }

  return 'autre'
}

/**
 * Vérifie l'expiration
 */
function checkExpiration(dateExpiration) {
  if (!dateExpiration) return { expired: null, daysUntilExpiry: null }
  
  const exp = new Date(dateExpiration)
  const today = new Date()
  const diffMs = exp - today
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  return {
    expired: diffDays < 0,
    daysUntilExpiry: diffDays,
    expiresIn30Days: diffDays >= 0 && diffDays <= 30,
    expiresIn90Days: diffDays >= 0 && diffDays <= 90
  }
}

/**
 * Valide le format du numéro selon le type.
 *
 * POURQUOI LES TYPES SUISSES N'ONT PAS DE RÈGLE DE FORMAT (défaut P2 CH-028) :
 * la validation appliquait le format FRANÇAIS (CNI : 12 caractères) à toute
 * pièce. Une carte d'identité suisse, dont le numéro ne fait pas 12 caractères,
 * était donc signalée « longueur incorrecte » — un avertissement qui présente
 * une pièce valide comme douteuse. Nous ne connaissons PAS le format exact des
 * numéros suisses et nous n'en inventons donc AUCUN : on se contente de vérifier
 * qu'un numéro est présent et plausible (au moins 5 caractères), et on laisse la
 * lecture du document telle qu'elle a été faite.
 */
function validateNumero(numero, type) {
  const TYPES_SUISSES = ['carte_identite_ch', 'permis_sejour', 'permis_circulation']
  if (!numero) {
    // Un titre de séjour peut être présenté sans numéro lisible : on le
    // SIGNALE (le lecteur le pousse dans les avertissements) sans présenter la
    // pièce comme illisible pour autant.
    return TYPES_SUISSES.includes(type)
      ? { valid: false, warning: 'Numéro non lisible sur la pièce' }
      : { valid: false, error: 'Numéro manquant' }
  }
  
  const clean = numero.replace(/[\s-]/g, '').toUpperCase()

  if (TYPES_SUISSES.includes(type)) {
    // Aucun format suisse n'est imposé : on signale seulement un numéro
    // anormalement court, sans jamais conclure à une pièce invalide.
    if (clean.length < 5) {
      return { valid: false, warning: 'Numéro court pour une pièce suisse' }
    }
    return { valid: true }
  }
  
  switch (type) {
    case 'cni':
      // CNI française: 12 caractères alphanumériques
      if (clean.length !== 12) {
        return { valid: false, error: 'N° CNI: longueur incorrecte (' + clean.length + ', attendu 12)' }
      }
      break
    case 'passeport':
      // Passeport FR: 2 chiffres + 2 lettres + 5 chiffres = 9 caractères
      if (!/^\d{2}[A-Z]{2}\d{5}$/.test(clean)) {
        return { valid: false, warning: 'Format passeport non standard' }
      }
      break
    case 'permis':
      // Permis: format variable selon époque
      if (clean.length < 8) {
        return { valid: false, warning: 'N° permis court' }
      }
      break
  }
  
  return { valid: true }
}

/**
 * Post-traitement et validation des données extraites
 */
const TYPES_PIECE_CONNUS = ['cni', 'passeport', 'permis', 'titre_sejour', 'autre',
  'carte_identite_ch', 'permis_sejour', 'permis_circulation']

function validateAndNormalize(extracted) {
  const warnings = []
  const normalized = { ...extracted }
  
  // Normaliser le type
  if (!normalized.type_piece || !TYPES_PIECE_CONNUS.includes(normalized.type_piece)) {
    normalized.type_piece = detectPieceType(JSON.stringify(extracted)) || 'autre'
    if (normalized.type_piece === 'autre') {
      warnings.push('Type de pièce non reconnu')
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RECLASSEMENT SUISSE (défaut P2 CH-028)
  // Le modèle peut rendre « cni » ou « titre_sejour » pour une pièce suisse
  // (c'était le seul vocabulaire décrit avant ce correctif). Si la lecture
  // contient les marqueurs d'un document suisse, on reclasse vers le type
  // suisse correspondant : la pièce est ainsi classée pour ce qu'elle EST.
  // Aucune donnée n'est modifiée — seul le TYPE est corrigé.
  // ───────────────────────────────────────────────────────────────────────────
  const lu = JSON.stringify(extracted || {}).toUpperCase()
  if (['cni', 'titre_sejour'].includes(normalized.type_piece) && contientMarqueurSuisse(lu)) {
    // Le type lu ne dit parfois que « c'est un document d'identité » : on le
    // RAMÈNE alors vers le type suisse correspondant, sans jamais changer les
    // autres champs.
    const correspondance = { cni: 'carte_identite_ch', titre_sejour: 'permis_sejour' }
    const detecte = detectPieceType(lu)
    const typeSuisse = ['carte_identite_ch', 'permis_sejour', 'permis_circulation'].includes(detecte)
      ? detecte
      : correspondance[normalized.type_piece]
    if (typeSuisse) {
      warnings.push(
        `Pièce suisse reconnue (type lu « ${normalized.type_piece} » reclassé « ${typeSuisse} »)`
      )
      normalized.type_piece = typeSuisse
    }
  }
  
  // Normaliser le nom (majuscules)
  if (normalized.nom) {
    normalized.nom = normalized.nom.toUpperCase().trim()
  } else {
    warnings.push('Nom non détecté')
  }
  
  // Normaliser le prénom
  if (normalized.prenom) {
    normalized.prenom = normalized.prenom.trim()
  } else {
    warnings.push('Prénom non détecté')
  }
  
  // Valider le numéro
  if (normalized.numero) {
    const numVal = validateNumero(normalized.numero, normalized.type_piece)
    if (!numVal.valid) {
      warnings.push(numVal.error || numVal.warning)
    }
  }
  
  // Vérifier l'expiration
  const expCheck = checkExpiration(normalized.date_expiration)
  if (expCheck.expired === true) {
    warnings.push('Document expiré depuis ' + Math.abs(expCheck.daysUntilExpiry) + ' jours')
  } else if (expCheck.expiresIn30Days) {
    warnings.push('Document expire dans moins de 30 jours')
  } else if (expCheck.expiresIn90Days) {
    warnings.push('Document expire dans moins de 90 jours')
  }
  
  // Normaliser le sexe
  if (normalized.sexe) {
    const s = normalized.sexe.toUpperCase().trim()
    if (s === 'MASCULIN' || s === 'M' || s === 'HOMME' || s === 'H') {
      normalized.sexe = 'M'
    } else if (s === 'FEMININ' || s === 'FÉMININ' || s === 'F' || s === 'FEMME') {
      normalized.sexe = 'F'
    }
  }
  
  // Calculer la confiance
  const requiredFields = ['type_piece', 'nom', 'prenom', 'date_naissance']
  const presentRequired = requiredFields.filter(f => normalized[f]).length
  const hasNumero = normalized.numero ? 0.1 : 0
  const hasExpiration = normalized.date_expiration ? 0.1 : 0
  const confidence = Math.round((presentRequired / requiredFields.length) * 0.6 + hasNumero + hasExpiration + (warnings.filter(w => w.includes('non détecté')).length === 0 ? 0.2 : 0.05)) * 1000 / 1000
  
  return {
    fields: normalized,
    confidence: Math.min(0.98, confidence),
    warnings,
    // `isValid` doit être un VRAI booléen : l'expression `a && b && c` renvoyait
    // la DERNIÈRE valeur trouvée (par exemple la chaîne « 1980-04-12 » au lieu de
    // `true`) — même défaut que celui déjà corrigé dans `justifDomicile.js`. Un
    // appelant qui teste `isValid === true`, qui sérialise le champ ou qui
    // l'affiche lisait donc autre chose qu'un verdict.
    isValid: Boolean(normalized.nom && normalized.prenom && normalized.date_naissance)
  }
}

module.exports = {
  SCHEMA: PIECE_IDENTITE_SCHEMA,
  SYSTEM_PROMPT,
  USER_PROMPT,
  detectPieceType,
  checkExpiration,
  validateNumero,
  validateAndNormalize,
  contientMarqueurSuisse,
  TYPES_PIECE_CONNUS,
  documentType: 'piece_identite'
}
