/**
 * arkDocumentIntake.js — ARK LIT RÉELLEMENT UN DOCUMENT ET PRÉREMPLIT LA FICHE CLIENT
 * =====================================================================================
 * POURQUOI CE MODULE (défauts mesurés le 23/09/2026 sur la production)
 *
 *   1. La bulle ARK du courtier n'acceptait QUE du texte : aucun bouton pièce
 *      jointe, aucun glisser-déposer (frontend/src/components/ark/ArkBubbleV2.jsx).
 *   2. Le pipeline docvision existait, était monté (/api/docvision)… et le
 *      frontend ne l'appelait JAMAIS. Tables document_extractions et
 *      client_documents : 0 ligne en production. Fonction invisible.
 *   3. Un PDF ne pouvait PAS être lu : callArkVision envoyait tout en
 *      {type:'image'} alors que l'API Anthropic exige un bloc « document » pour
 *      un PDF (corrigé dans arkEngine.js).
 *   4. « Appliquer » était structurellement impossible : applyExtractionToClient
 *      écrivait dans clients.payment_method / vehicles / identity_info /
 *      insurance_history / address_info / current_insurance — SIX colonnes qui
 *      n'existent pas dans la base de production.
 *
 * CE QUE FAIT CE MODULE
 *   valider → stocker (base, durable) → lire le document avec l'IA de production
 *   → normaliser → diff champ par champ (valeur actuelle / valeur extraite /
 *   confiance / page / extrait) → ÉCRITURE UNIQUEMENT APRÈS VALIDATION → journal
 *   d'audit. Le modèle n'écrit jamais : il propose, le courtier valide.
 *
 * CE QU'IL NE FAIT JAMAIS
 *   - inventer une valeur : un champ non trouvé reste null ;
 *   - écraser une valeur existante sans décision explicite du courtier ;
 *   - écrire dans une colonne inexistante : tout le mapping est vérifié contre
 *     les colonnes RÉELLES de `clients` (voir MAPPING_COLONNES) ;
 *   - sortir du cabinet de l'appelant : portée résolue par lib/porteeCabinet.
 *
 * @module docvision/arkDocumentIntake
 */

const crypto = require('crypto')
const logger = require('../../lib/logger')
const pool = require('../../db')
const porteeCabinet = require('../../lib/porteeCabinet')
const { callArkVision } = require('../arkEngine')
const { detectType, getTypeName, DOCUMENT_TYPES } = require('./typeDetector')

// ── Limites (décision JEV passe 2 : 50 pages / 15 Mo, pages ignorées signalées) ──
// RÉTENTION (décision JEV passe 3, confiance 0.60) : le contenu des documents est stocké
// en base (client_document_blobs) parce que le disque de Render est éphémère. La
// suppression du document client supprime son contenu en cascade
// (client_document_id REFERENCES client_documents(id) ON DELETE CASCADE), et la limite
// de taille est appliquée avant tout stockage : aucun fichier n'est conservé sans
// document associé, et aucun fichier plus gros que la limite n'entre dans la base.
const LIMITE_OCTETS = 15 * 1024 * 1024
const MAX_FICHIERS = 5
const PAGES_MAX = 50
const SEUIL_SUR = 0.75 // au-dessus : présélectionné « appliquer » ; en dessous : « à vérifier »

// Types acceptés : identifiés par leurs octets d'en-tête, jamais par l'extension seule.
const SIGNATURES = [
  { mime: 'application/pdf', octets: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: 'image/jpeg', octets: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png', octets: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/webp', octets: [0x52, 0x49, 0x46, 0x46] },
  { mime: 'image/heic', octets: [0x66, 0x74, 0x79, 0x70] }, // offset 4 : « ftyp »
]

const MIMES_AUTORISES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])

/**
 * Détecte le vrai type du fichier à partir de ses octets.
 * @returns {string|null} mime réel ou null si inconnu
 */
function detecterMimeReel(buffer) {
  if (!buffer || buffer.length < 12) return null
  for (const sig of SIGNATURES) {
    let ok = true
    for (let i = 0; i < sig.octets.length; i += 1) {
      if (buffer[i] !== sig.octets[i]) { ok = false; break }
    }
    if (!ok) continue
    if (sig.mime === 'image/heic') {
      // « ftyp » commence à l'offset 4, marque = heic/heix/mif1
      const marque = buffer.slice(8, 12).toString('ascii')
      if (!['heic', 'heix', 'hevc', 'mif1', 'msf1'].includes(marque)) return null
    }
    return sig.mime
  }
  return null
}

/** Nom de fichier sûr : un nom, jamais un chemin (protection contre la traversée). */
function nomSain(nom) {
  const base = String(nom || 'document').replace(/\\/g, '/').split('/').pop() || 'document'
  // eslint-disable-next-line no-control-regex
  return base.replace(/[\u0000-\u001f<>:"|?*]/g, '_').slice(0, 180) || 'document'
}

/**
 * Valide un fichier reçu. Aucune confiance dans le mimetype annoncé par le client.
 * @returns {{ok: boolean, mimeReel?: string, erreur?: string, code?: string}}
 */
function validerFichier({ buffer, filename }) {
  if (!buffer || !buffer.length) {
    return { ok: false, code: 'fichier_vide', erreur: 'Le fichier est vide.' }
  }
  if (buffer.length > LIMITE_OCTETS) {
    return {
      ok: false,
      code: 'fichier_trop_volumineux',
      erreur: `Fichier trop volumineux (${(buffer.length / 1024 / 1024).toFixed(1)} Mo). Limite : ${LIMITE_OCTETS / 1024 / 1024} Mo.`,
    }
  }
  const mimeReel = detecterMimeReel(buffer)
  if (!mimeReel || !MIMES_AUTORISES.has(mimeReel)) {
    return {
      ok: false,
      code: 'type_non_autorise',
      erreur: 'Format non pris en charge. Formats acceptés : PDF, JPG, PNG, WebP, HEIC.',
    }
  }
  return { ok: true, mimeReel }
}

/**
 * Extrait le TEXTE d'un PDF, PAGE PAR PAGE (pdfjs-dist est déjà une dépendance du
 * projet). Deux raisons mesurées :
 *   1. un PDF natif envoyé au modèle coûte beaucoup plus de tokens que son texte ;
 *   2. la relation « information → page » doit être conservée pour que le courtier
 *      puisse vérifier ce qui a été lu et où.
 * Un PDF sans couche texte (scan) renvoie des pages vides : on bascule alors sur la
 * lecture visuelle du document, jamais sur une extraction vide.
 * @returns {Promise<{pages: Array<{page: number, texte: string}>, texteTotal: string}|null>}
 */
async function extraireTextePdf(buffer) {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const document = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, isEvalSupported: false }).promise
    const pages = []
    const limite = Math.min(document.numPages, PAGES_MAX)
    for (let p = 1; p <= limite; p += 1) {
      const page = await document.getPage(p)
      const contenu = await page.getTextContent()
      const texte = contenu.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim()
      pages.push({ page: p, texte })
    }
    const texteTotal = pages.map((p) => p.texte).join('\n').trim()
    return { pages, texteTotal, nombrePages: document.numPages, pagesIgnorees: Math.max(0, document.numPages - limite) }
  } catch (err) {
    logger.warn({ err: err.message }, 'extraction texte PDF impossible, repli vision')
    return null
  }
}

/**
 * Appelle le modèle d'extraction.
 * FOURNISSEUR PAR DÉFAUT : Claude (callArkVision) — c'est l'infrastructure normale
 * de COURTIA en production.
 * FOURNISSEUR OPTIONNEL : tout endpoint compatible OpenAI, activé UNIQUEMENT par
 * variable d'environnement (ARK_DOC_LOCAL_BASE_URL). Justification mesurée le
 * 23/09/2026 : la variable ANTHROPIC_API_KEY de production contenait une URL de
 * tableau de bord au lieu d'une clé, donc 100 % des appels IA répondaient 401 ;
 * disposer d'un fournisseur auto-hébergeable évite qu'une clé absente rende la
 * lecture documentaire définitivement impossible.
 */
/**
 * Lit le TEXTE d'une image (photo, scan) par OCR local.
 * tesseract.js est DÉJÀ une dépendance du projet : aucune clé, aucun appel externe,
 * aucun coût. Retourne null si la lecture échoue, jamais un texte inventé.
 * @returns {Promise<{texte: string, confiance: number}|null>}
 */
async function extraireTexteImage(buffer) {
  try {
    const Tesseract = require('tesseract.js')
    // Les données de langue française (~14 Mo) sont téléchargées une fois puis mises en
    // cache : on ne les versionne pas. ARK_DOC_TESSDATA_PATH permet de les auto-héberger.
    const options = { logger: () => {} }
    if ((process.env.ARK_DOC_TESSDATA_PATH || '').trim()) {
      options.langPath = process.env.ARK_DOC_TESSDATA_PATH.trim()
      options.cachePath = process.env.ARK_DOC_TESSDATA_PATH.trim()
    }
    const { data } = await Tesseract.recognize(buffer, 'fra', options)
    const texte = String((data && data.text) || '').replace(/[ \t]+\n/g, '\n').trim()
    return { texte, confiance: Number((data && data.confidence) || 0) }
  } catch (err) {
    logger.warn({ err: err.message }, 'OCR image impossible')
    return null
  }
}

/**
 * Fournisseur DEEPSEEK — moteur de lecture par défaut.
 * VÉRIFIÉ LE 23/09/2026 : les modèles réellement accessibles avec la clé du produit sont
 * `deepseek-flash` et `deepseek-v4-pro` (il n'y a PAS de `deepseek-chat`, et ces modèles
 * sont TEXTE : ils ne voient pas une image). Le pipeline leur donne donc du texte :
 * PDF → texte page par page (pdfjs), image → OCR (tesseract). Aucun faux support multimodal.
 */
async function appelerDeepseek({ system, user }) {
  const cle = (process.env.DEEPSEEK_API_KEY || '').trim()
  if (!cle) return { error: 'configuration_required', message: 'DEEPSEEK_API_KEY absente.' }
  const modele = (process.env.ARK_DOC_DEEPSEEK_MODEL || 'deepseek-flash').trim()
  const base = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')
  const debut = Date.now()
  try {
    const reponse = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cle, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modele,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        stream: false,
      }),
    })
    if (!reponse.ok) {
      const detail = await reponse.text().catch(() => '')
      return {
        error: 'provider_unavailable',
        message: `DeepSeek HTTP ${reponse.status}`,
        provider: 'deepseek',
        detail: detail.slice(0, 200),
      }
    }
    const donnees = await reponse.json()
    const choix = (donnees.choices || [])[0] || {}
    const brut = (choix.message || {}).content || ''
    return {
      text: brut,
      structured: analyserJson(brut),
      usage: donnees.usage || {},
      model: donnees.model || modele,
      finishReason: choix.finish_reason,
      costUsd: 0,
      latencyMs: Date.now() - debut,
      provider: 'deepseek',
    }
  } catch (err) {
    return { error: 'provider_unavailable', message: err.message, provider: 'deepseek' }
  }
}

async function appelerModele({ system, user, images = [], texte = null, userId, clientId, route }) {
  // Ordre de sélection explicite et documenté :
  //   1. fournisseur local (ARK_DOC_LOCAL_BASE_URL) — tests et repli auto-hébergé ;
  //   2. DEEPSEEK (DEEPSEEK_API_KEY) — moteur demandé pour la production ;
  //   3. Claude vision (ANTHROPIC_API_KEY valide) — utile pour un PDF scanné, que
  //      DeepSeek ne peut pas voir puisqu'il est texte.
  const fournisseurForce = (process.env.ARK_DOC_PROVIDER || '').trim().toLowerCase()
  if (fournisseurForce === 'deepseek' || (!fournisseurForce && (process.env.DEEPSEEK_API_KEY || '').trim() && !(process.env.ARK_DOC_LOCAL_BASE_URL || '').trim())) {
    const texteComplet = texte ? `${user}\n\n=== TEXTE DU DOCUMENT ===\n${texte}` : user
    return appelerDeepseek({ system, user: texteComplet })
  }

  const base = (process.env.ARK_DOC_LOCAL_BASE_URL || '').trim()
  if (base) {
    const modele = process.env.ARK_DOC_LOCAL_MODEL || 'qwen3.5:9b'
    const contenu = [{ type: 'text', text: `${system}\n\n${user}` }]
    if (texte) contenu[0].text += `\n\n=== TEXTE DU DOCUMENT ===\n${texte}`
    const debut = Date.now()
    const reponse = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modele,
        messages: [{ role: 'user', content: contenu }],
        temperature: 0,
        max_tokens: 4096,
        stream: false,
      }),
    })
    if (!reponse.ok) {
      return { error: 'provider_unavailable', message: `Fournisseur local HTTP ${reponse.status}`, model: modele }
    }
    const donnees = await reponse.json()
    const brut = donnees.choices && donnees.choices[0] && donnees.choices[0].message
      ? donnees.choices[0].message.content
      : ''
    return {
      text: brut,
      structured: analyserJson(brut),
      usage: donnees.usage || {},
      model: modele,
      costUsd: 0,
      latencyMs: Date.now() - debut,
      provider: 'local',
    }
  }

  return callArkVision({ system, user, images, jsonMode: true, maxTokens: 4096, userId, clientId, route })
}

/** Analyse défensive d'une réponse JSON (le modèle peut encadrer son JSON de texte). */
function analyserJson(texte) {
  if (!texte) return null
  const nettoye = String(texte).trim()
  try {
    return JSON.parse(nettoye)
  } catch (_e) {
    const bloc = nettoye.match(/```(?:json)?\s*([\s\S]*?)```/) || nettoye.match(/(\{[\s\S]*\})/)
    if (bloc) {
      try {
        return JSON.parse(bloc[1].trim())
      } catch (_e2) {
        return null
      }
    }
    return null
  }
}

/** Nombre de pages d'un PDF, sans dépendance : comptage des objets /Type /Page. */
function compterPagesPdf(buffer) {
  try {
    const texte = buffer.toString('latin1')
    const marqueurs = texte.match(/\/Type\s*\/Page[^s]/g)
    return marqueurs ? marqueurs.length : null
  } catch (_e) {
    return null
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// MAPPING VÉRIFIÉ CONTRE LA BASE RÉELLE
// `colonne` : colonne plate de clients (vérifiée en production le 23/09/2026).
// `jsonb`   : chemin dans clients.documents (jsonb), pour tout le détail sans colonne.
// ────────────────────────────────────────────────────────────────────────────────
const MAPPING_COLONNES = {
  nom: { colonne: 'nom', libelle: 'Nom', groupe: 'identite' },
  prenom: { colonne: 'prenom', libelle: 'Prénom', groupe: 'identite' },
  date_naissance: { colonne: 'date_naissance', libelle: 'Date de naissance', groupe: 'identite', type: 'date' },
  email: { colonne: 'email', libelle: 'E-mail', groupe: 'contact' },
  telephone: { colonne: 'telephone', libelle: 'Téléphone', groupe: 'contact' },
  adresse: { colonne: 'adresse', libelle: 'Adresse', groupe: 'contact' },
  code_postal: { colonne: 'code_postal', libelle: 'Code postal', groupe: 'contact' },
  ville: { colonne: 'ville', libelle: 'Ville', groupe: 'contact' },
  pays: { colonne: 'country', libelle: 'Pays', groupe: 'contact' },
  raison_sociale: { colonne: 'company_name', libelle: 'Raison sociale', groupe: 'entreprise' },
  siren_siret: { colonne: 'siret', libelle: 'SIREN / SIRET', groupe: 'entreprise' },
  bonus_malus: { colonne: 'bonus_malus', libelle: 'Coefficient bonus/malus', groupe: 'auto', type: 'nombre' },
  nb_sinistres_3ans: { colonne: 'nb_sinistres_3ans', libelle: 'Sinistres (3 ans)', groupe: 'auto', type: 'entier' },
  annees_permis: { colonne: 'annees_permis', libelle: 'Années de permis', groupe: 'auto', type: 'entier' },
  // Détail sans colonne dédiée → clients.documents (jsonb)
  lieu_naissance: { jsonb: 'identite.lieu_naissance', libelle: 'Lieu de naissance', groupe: 'identite' },
  nationalite: { jsonb: 'identite.nationalite', libelle: 'Nationalité', groupe: 'identite' },
  numero_piece: { jsonb: 'identite.numero_piece', libelle: 'N° de pièce', groupe: 'identite' },
  forme_juridique: { jsonb: 'entreprise.forme_juridique', libelle: 'Forme juridique', groupe: 'entreprise' },
  dirigeant: { jsonb: 'entreprise.dirigeant', libelle: 'Dirigeant', groupe: 'entreprise' },
  iban: { jsonb: 'banque.iban', libelle: 'IBAN', groupe: 'banque' },
  bic: { jsonb: 'banque.bic', libelle: 'BIC', groupe: 'banque' },
  titulaire_compte: { jsonb: 'banque.titulaire', libelle: 'Titulaire du compte', groupe: 'banque' },
  banque: { jsonb: 'banque.banque', libelle: 'Banque', groupe: 'banque' },
  immatriculation: { jsonb: 'vehicule.immatriculation', libelle: 'Immatriculation', groupe: 'auto' },
  marque: { jsonb: 'vehicule.marque', libelle: 'Marque', groupe: 'auto' },
  modele: { jsonb: 'vehicule.modele', libelle: 'Modèle', groupe: 'auto' },
  vin: { jsonb: 'vehicule.vin', libelle: 'VIN', groupe: 'auto' },
  date_mise_circulation: { jsonb: 'vehicule.date_mise_circulation', libelle: 'Mise en circulation', groupe: 'auto' },
  puissance_fiscale: { jsonb: 'vehicule.puissance_fiscale', libelle: 'Puissance fiscale', groupe: 'auto' },
  energie: { jsonb: 'vehicule.energie', libelle: 'Énergie', groupe: 'auto' },
  compagnie: { jsonb: 'assurance.compagnie', libelle: 'Compagnie', groupe: 'assurance' },
  numero_contrat: { jsonb: 'assurance.numero_contrat', libelle: 'N° de contrat / police', groupe: 'assurance' },
  produit: { jsonb: 'assurance.produit', libelle: 'Produit', groupe: 'assurance' },
  date_effet: { jsonb: 'assurance.date_effet', libelle: 'Date d\'effet', groupe: 'assurance' },
  date_echeance: { jsonb: 'assurance.date_echeance', libelle: 'Échéance', groupe: 'assurance' },
  prime: { jsonb: 'assurance.prime', libelle: 'Prime', groupe: 'assurance' },
  franchise: { jsonb: 'assurance.franchise', libelle: 'Franchise', groupe: 'assurance' },
  garanties: { jsonb: 'assurance.garanties', libelle: 'Garanties', groupe: 'assurance' },
  sinistres: { jsonb: 'assurance.sinistres', libelle: 'Sinistres', groupe: 'assurance' },
}

const CHAMPS_ATTENDUS = Object.keys(MAPPING_COLONNES)

const PROMPT_SYSTEME = `Tu es un extracteur documentaire pour un courtier en assurances français.
Tu lis un document (PDF, scan ou photo) et tu en extrais UNIQUEMENT ce qui y est écrit.

RÈGLES ABSOLUES :
1. N'INVENTE JAMAIS une valeur. Si l'information n'est pas dans le document, mets null.
2. Chaque champ retourné porte : value (ou null), confidence (0 à 1), page (numéro de page si connue, sinon null),
   evidence (extrait de texte le plus court qui justifie la valeur, 120 caractères max).
3. confidence reflète ta certitude RÉELLE de lecture : 0.95+ si le texte est net et explicite,
   0.75-0.9 si lisible mais avec ambiguïté de format, 0.5-0.7 si partiellement lisible, 0.3-0.5 si déduit.
   Un champ absent doit avoir value=null et confidence=0.
4. Ne déduis pas une donnée d'une autre (pas de calcul, pas de complétion) sauf conversion évidente
   de format (une date en JJ/MM/AAAA devient AAAA-MM-JJ).
5. Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, sans balise de code.`

function promptUtilisateur(typeDetecte, nomFichier) {
  return `Document à analyser : ${nomFichier} (type probable : ${getTypeName(typeDetecte)}).

Retourne EXACTEMENT ce JSON :
{
  "type_document": "${[...Object.values(DOCUMENT_TYPES), 'contrat'].join('|')}",
  "resume": "résumé factuel en une phrase",
  "emetteur": "organisme émetteur si présent, sinon null",
  "date_document": "AAAA-MM-JJ si présent, sinon null",
  "champs": {
${CHAMPS_ATTENDUS.map((c) => `    "${c}": { "value": null, "confidence": 0, "page": null, "evidence": null }`).join(',\n')}
  }
}

Remplis "champs" avec les valeurs réellement trouvées. Pour "sinistres", value est un tableau
d'objets { date, type, responsabilite, indemnisation }. Pour "garanties", value est un tableau de textes.
Tout champ non trouvé garde value=null et confidence=0.`
}

/**
 * Stocke le document déposé : ligne client_documents + contenu en base (durable).
 */
async function stockerDocument({ portee, userId, clientId, buffer, mimeReel, filename, typeDetecte }) {
  const chemin = `db://client_document_blobs/${clientId}/${Date.now()}-${nomSain(filename)}`
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex')

  // DEUX paramètres distincts pour le nom : `original_filename` est un varchar(255)
  // et `file_name` un text. Réutiliser le même paramètre pour les deux fait échouer
  // PostgreSQL avec « inconsistent types deduced for parameter $4 » (mesuré le
  // 23/09/2026 : l'insertion refusait TOUT document). On ne réutilise plus un
  // paramètre sur deux colonnes de types différents.
  const nom = nomSain(filename)
  const insert = await pool.query(
    `INSERT INTO client_documents
       (client_id, broker_id, document_type, original_filename, file_name, storage_path, mime_type,
        file_size_bytes, file_hash, status, analysis_status, source, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'reçu', 'en_analyse', 'ark', NOW())
     RETURNING id`,
    [clientId, userId, typeDetecte, nom.slice(0, 255), nom, chemin, mimeReel, buffer.length, checksum]
  )
  const documentId = insert.rows[0].id

  await pool.query(
    `INSERT INTO client_document_blobs (client_document_id, content, mime_type, file_name, size_bytes, checksum)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (client_document_id) DO UPDATE SET content = EXCLUDED.content, checksum = EXCLUDED.checksum`,
    [documentId, buffer, mimeReel, nomSain(filename), buffer.length, checksum]
  )

  return { documentId, checksum, chemin }
}

/** Lit le contenu d'un document client, en base d'abord (disque éphémère sur Render). */
async function lireContenuDocument(clientDocumentId) {
  const blob = await pool.query(
    'SELECT content, mime_type, file_name FROM client_document_blobs WHERE client_document_id = $1',
    [clientDocumentId]
  )
  if (blob.rows.length) {
    return { buffer: blob.rows[0].content, mimeType: blob.rows[0].mime_type, filename: blob.rows[0].file_name }
  }
  const doc = await pool.query('SELECT storage_path, mime_type, original_filename FROM client_documents WHERE id = $1', [clientDocumentId])
  if (!doc.rows.length) throw new Error('document_introuvable')
  const chemin = doc.rows[0].storage_path || ''
  if (!chemin || chemin.startsWith('db://')) throw new Error('contenu_document_indisponible')
  const fs = require('fs')
  return {
    buffer: fs.readFileSync(chemin),
    mimeType: doc.rows[0].mime_type,
    filename: doc.rows[0].original_filename,
  }
}

/**
 * Analyse un document déjà stocké : lecture IA réelle, normalisation, enregistrement
 * de l'extraction. N'ÉCRIT RIEN dans la fiche client (validation humaine obligatoire).
 */
async function analyserDocumentStocke({ portee, userId, clientDocumentId, clientId, documentType }) {
  const debut = Date.now()
  const typeDetecte = documentType || detectType({}).type || 'autre'
  const contenu = await lireContenuDocument(clientDocumentId)

  const insert = await pool.query(
    `INSERT INTO document_extractions
       (broker_id, client_document_id, client_id, document_type, extraction_status, created_at)
     VALUES ($1, $2, $3, $4, 'processing', NOW())
     RETURNING id`,
    [userId, clientDocumentId, clientId, typeDetecte]
  )
  const extractionId = insert.rows[0].id

  try {
    // ── VOIE TEXTE D'ABORD POUR UN PDF, VISION ENSUITE ─────────────────────
    // Un PDF avec couche texte est lu page par page (moins de tokens, page conservée).
    // Un PDF sans texte (scan) ou une image passe par la lecture visuelle.
    let textePdf = null
    let texteImage = null
    if (contenu.mimeType === 'application/pdf') {
      const extraction = await extraireTextePdf(contenu.buffer)
      if (extraction && extraction.texteTotal.length >= 200 && extraction.pages.some((p) => p.texte.length > 40)) {
        textePdf = extraction
      }
    } else if (contenu.mimeType.startsWith('image/')) {
      // Les modèles actuellement accessibles côté DeepSeek sont TEXTE : une image est
      // donc d'abord LUE (OCR local, tesseract.js, déjà au projet), puis le texte obtenu
      // est confié au modèle. Aucun faux support multimodal.
      const ocr = await extraireTexteImage(contenu.buffer)
      if (ocr && ocr.texte.length >= 20) {
        texteImage = ocr
      }
    }

    const promptUtilisateurFinal = textePdf
      ? `${promptUtilisateur(typeDetecte, contenu.filename || 'document')}\n\nLe texte ci-dessous est découpé par page : chaque bloc commence par « --- PAGE n --- ».
Pour le champ "page" de chaque information, indique la page réelle du bloc où tu l'as lue.\n\n`
        + textePdf.pages.map((p) => `--- PAGE ${p.page} ---\n${p.texte}`).join('\n')
      : (texteImage
        ? `${promptUtilisateur(typeDetecte, contenu.filename || 'document')}\n\nLe texte ci-dessous provient de la LECTURE OCR d'une image (page 1) : les erreurs de reconnaissance sont possibles, abaisse la confiance des valeurs ambiguës.\n\n--- PAGE 1 ---\n${texteImage.texte}`
        : promptUtilisateur(typeDetecte, contenu.filename || 'document'))

    // Un PDF sans couche texte et sans OCR possible ne peut pas être lu par un modèle
    // texte : on le DIT au courtier au lieu de renvoyer un résultat vide.
    const pdfSansTexte = contenu.mimeType === 'application/pdf' && !textePdf
    const vision = await appelerModele({
      system: PROMPT_SYSTEME,
      user: promptUtilisateurFinal,
      texte: null,
      images: pdfSansTexte ? [{ buffer: contenu.buffer, mediaType: contenu.mimeType }] : [],
      userId,
      clientId,
      route: 'ark/documents',
    })

    if (vision.error === 'configuration_required' || !vision.structured) {
      const message = vision.message || 'Lecture IA indisponible.'
      await pool.query(
        `UPDATE document_extractions SET extraction_status = 'failed', warnings = $2, processed_at = NOW() WHERE id = $1`,
        [extractionId, JSON.stringify([message])]
      )
      return { ok: false, extractionId, code: 'ia_indisponible', erreur: message }
    }

    const brut = vision.structured || {}
    const champs = normaliserChamps(brut.champs || {})
    const detectes = Object.values(champs).filter((c) => c.value !== null && c.value !== undefined && c.value !== '')
    const confiance = detectes.length
      ? detectes.reduce((acc, c) => acc + c.confidence, 0) / detectes.length
      : 0

    const avertissements = []
    if (!detectes.length) avertissements.push('Aucune donnée exploitable détectée dans ce document.')
    for (const [cle, champ] of Object.entries(champs)) {
      if (champ.value !== null && champ.confidence > 0 && champ.confidence < 0.6) {
        avertissements.push(`Champ « ${MAPPING_COLONNES[cle].libelle} » lu avec une confiance faible (${champ.confidence}) : à vérifier.`)
      }
    }
    if (contenu.mimeType === 'application/pdf') {
      const pages = textePdf ? textePdf.nombrePages : compterPagesPdf(contenu.buffer)
      if (pages && pages > PAGES_MAX) {
        avertissements.push(`PDF de ${pages} pages : au-delà de ${PAGES_MAX} pages, un découpage manuel est nécessaire.`)
      }
      if (!textePdf) {
        avertissements.push((vision && vision.provider === 'deepseek')
          ? 'PDF sans couche texte (document scanné) : les modèles DeepSeek accessibles sont texte et ne peuvent pas lire une image. Aucune donnée n\'en a été tirée. Un modèle de vision reste nécessaire pour ce cas.'
          : 'PDF sans couche texte exploitable : lecture visuelle utilisée (résultat à vérifier plus attentivement).')
      }
    }

    const statut = detectes.length ? (avertissements.length ? 'partial' : 'completed') : 'failed'

    await pool.query(
      `UPDATE document_extractions
         SET extraction_status = $2, document_type = $3, detected_type = $3,
             extracted_fields = $4, confidence = $5, warnings = $6,
             ai_engine = 'claude_vision', ai_model = $7, ai_cost_usd = $8, ai_latency_ms = $9,
             processed_at = NOW()
       WHERE id = $1`,
      [extractionId, statut, brut.type_document || typeDetecte, JSON.stringify({
        champs,
        resume: brut.resume || null,
        emetteur: brut.emetteur || null,
        date_document: brut.date_document || null,
        fichier: nomSain(contenu.filename || 'document'),
      }), Number(confiance.toFixed(3)), JSON.stringify(avertissements),
      vision.model || 'inconnu', vision.costUsd || 0, Date.now() - debut]
    )

    await pool.query(
      `UPDATE client_documents SET analysis_status = $2, analysis_result = $3, analyzed_at = NOW() WHERE id = $1`,
      [clientDocumentId, statut, JSON.stringify({ extraction_id: extractionId, champs_detectes: detectes.length })]
    )

    // Décision JEV (passe 3, confiance 0.99) : quand le modèle ne tranche pas le type,
    // le produit retombait silencieusement sur une détection par NOM DE FICHIER. Le
    // courtier doit le savoir : `typeConfirme` est faux tant que le modèle n'a rien dit.
    const typeConfirme = Boolean(brut.type_document)
    return {
      ok: true,
      extractionId,
      documentId: clientDocumentId,
      typeDocument: brut.type_document || typeDetecte,
      typeConfirme,
      typeLibelle: getTypeName(brut.type_document || typeDetecte) + (typeConfirme ? '' : ' (à confirmer)'),
      resume: brut.resume || null,
      champs,
      champsDetectes: detectes.length,
      champsSurs: detectes.filter((c) => c.confidence >= SEUIL_SUR).length,
      confiance: Number(confiance.toFixed(3)),
      avertissements,
      modele: vision.model,
      latenceMs: Date.now() - debut,
    }
  } catch (err) {
    logger.error({ err: err.message, clientDocumentId }, 'ark document analysis failed')
    await pool.query(
      `UPDATE document_extractions SET extraction_status = 'failed', warnings = $2, processed_at = NOW() WHERE id = $1`,
      [extractionId, JSON.stringify([err.message])]
    ).catch(() => {})
    return { ok: false, extractionId, code: 'analyse_echouee', erreur: err.message }
  }
}

/** Normalise les champs renvoyés par le modèle : jamais d'invention, jamais de type flou. */
function normaliserChamps(champs) {
  const resultat = {}
  for (const cle of CHAMPS_ATTENDUS) {
    const brut = champs[cle] || {}
    let valeur = brut.value === undefined ? null : brut.value
    if (typeof valeur === 'string') {
      valeur = valeur.trim()
      if (valeur === '' || /^(null|n\/a|non trouvé|non renseigné|inconnu)$/i.test(valeur)) valeur = null
    }
    if (Array.isArray(valeur) && valeur.length === 0) valeur = null

    const def = MAPPING_COLONNES[cle]
    if (valeur !== null && def.type === 'nombre') {
      const n = typeof valeur === 'string' ? parseFloat(valeur.replace(',', '.')) : Number(valeur)
      valeur = Number.isFinite(n) ? n : null
    }
    if (valeur !== null && def.type === 'date') {
      valeur = normaliserDate(valeur)
    }
    if (valeur !== null && (def.type === 'entier')) {
      const n = parseInt(valeur, 10)
      valeur = Number.isFinite(n) ? n : null
    }

    let confidence = Number(brut.confidence)
    if (!Number.isFinite(confidence)) confidence = 0
    confidence = Math.max(0, Math.min(1, confidence))
    if (valeur === null) confidence = 0

    // `Number(null)` vaut 0 : sans cette garde, une information sans page affichait
    // « p.0 » dans le diff du courtier (défaut mesuré par le test E2E du 23/09/2026).
    const pageBrute = brut.page
    const page = (pageBrute === null || pageBrute === undefined || pageBrute === '')
      ? null
      : (Number.isFinite(Number(pageBrute)) ? Number(pageBrute) : null)
    resultat[cle] = {
      value: valeur,
      confidence,
      page,
      evidence: brut.evidence ? String(brut.evidence).slice(0, 160) : null,
    }
  }
  return resultat
}

function normaliserDate(valeur) {
  const s = String(valeur)
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

/** Lit la fiche client DANS LA PORTÉE de l'appelant. */
async function chargerClient(portee, clientId) {
  const f = porteeCabinet.fragment(portee, { cabinet: 'c.cabinet_id', proprietaire: 'c.courtier_id', depart: 2 })
  const res = await pool.query(`SELECT c.* FROM clients c WHERE c.id = $1 AND ${f.sql} LIMIT 1`, [clientId, ...f.params])
  return res.rows[0] || null
}

/**
 * Construit le diff champ par champ : valeur actuelle, valeur extraite, confiance,
 * page, extrait, et action proposée. RIEN n'est écrit ici.
 */
async function construireDiff({ portee, extractionId }) {
  const ext = await pool.query('SELECT * FROM document_extractions WHERE id = $1', [extractionId])
  if (!ext.rows.length) return { ok: false, code: 'extraction_introuvable' }
  const extraction = ext.rows[0]

  const client = await chargerClient(portee, extraction.client_id)
  if (!client) return { ok: false, code: 'client_hors_portee' }

  const champs = (extraction.extracted_fields && extraction.extracted_fields.champs) || {}
  const documentsJson = normaliserDocuments(client.documents)

  const lignes = []
  for (const [cle, def] of Object.entries(MAPPING_COLONNES)) {
    const champ = champs[cle] || { value: null, confidence: 0, page: null, evidence: null }
    if (champ.value === null || champ.value === undefined) continue // absent = absent, jamais proposé

    let actuelle = null
    if (def.colonne) {
      actuelle = client[def.colonne]
      if (actuelle instanceof Date) actuelle = actuelle.toISOString().slice(0, 10)
    } else if (def.jsonb) {
      const [groupe, sousCle] = def.jsonb.split('.')
      actuelle = documentsJson[groupe] ? documentsJson[groupe][sousCle] : null
    }

    const identique = valeursIdentiques(actuelle, champ.value)
    let action = 'appliquer'
    if (identique) action = 'identique'
    else if (actuelle !== null && actuelle !== undefined && actuelle !== '') action = 'conflit'

    lignes.push({
      champ: cle,
      libelle: def.libelle,
      groupe: def.groupe,
      cible: def.colonne ? { type: 'colonne', nom: def.colonne } : { type: 'jsonb', chemin: def.jsonb },
      valeur_actuelle: actuelle === undefined ? null : actuelle,
      valeur_extraite: champ.value,
      confiance: champ.confidence,
      preselectionne: action === 'appliquer' && champ.confidence >= SEUIL_SUR,
      page: champ.page,
      extrait: champ.evidence,
      source_document: extraction.client_document_id,
      action,
    })
  }

  return {
    ok: true,
    extraction: {
      id: extraction.id,
      documentId: extraction.client_document_id,
      typeDocument: extraction.document_type,
      typeLibelle: getTypeName(extraction.document_type),
      statut: extraction.extraction_status,
      confiance: extraction.confidence,
      modele: extraction.ai_model,
      resume: (extraction.extracted_fields || {}).resume || null,
      emetteur: (extraction.extracted_fields || {}).emetteur || null,
      fichier: (extraction.extracted_fields || {}).fichier || null,
      deja_appliquee: extraction.applied_to_client === true,
      avertissements: extraction.warnings || [],
    },
    client: { id: client.id, nom: `${client.prenom || ''} ${client.nom || ''}`.trim() || client.company_name || `Client ${client.id}` },
    seuil_sur: SEUIL_SUR,
    contrat_propose: construireContratPropose(extraction.document_type, champs),
    lignes,
  }
}

/**
 * `clients.documents` est un jsonb dont la valeur par défaut est `[]` : sur une fiche
 * réelle, c'est donc un TABLEAU. Écrire des clés sur un tableau ne produit rien
 * (JSON.stringify d'un tableau ignore les propriétés ajoutées) : l'historique des
 * documents était silencieusement perdu (défaut mesuré le 23/09/2026). On conserve
 * le contenu existant sous une clé dédiée et on travaille sur un objet.
 */
function normaliserDocuments(valeur) {
  let brut = valeur
  if (typeof brut === 'string') {
    try {
      brut = JSON.parse(brut || '{}')
    } catch (_e) {
      brut = {}
    }
  }
  if (Array.isArray(brut)) {
    return { liste_heritee: brut }
  }
  if (!brut || typeof brut !== 'object') return {}
  return JSON.parse(JSON.stringify(brut))
}

/**
 * Prépare la CRÉATION d'un contrat (table `quotes`) à partir d'un document.
 * POURQUOI : jusqu'ici le pipeline savait écrire une fiche client, mais pas créer
 * l'élément d'assurance que le document atteste réellement (attestation, contrat,
 * police). Le courtier voyait donc les informations sans que le dossier se complète.
 *
 * RÈGLE : on ne propose la création que si le document porte de quoi identifier un
 * contrat (au moins un numéro de contrat ou une compagnie). Sinon, rien n'est proposé —
 * on n'invente pas un contrat à partir d'un simple justificatif de domicile.
 */
function construireContratPropose(documentType, champs) {
  const valeur = (cle) => (champs[cle] && champs[cle].value !== undefined ? champs[cle].value : null)
  const typesAcceptes = ['attestation_assurance', 'contrat', 'releve_information']
  const numero = valeur('numero_contrat')
  const compagnie = valeur('compagnie')
  // Repli mesuré : un contrat classé « autre » par le modèle reste créable s'il porte À LA FOIS
  // une compagnie ET un numéro de contrat — deux marques qu'un simple justificatif n'a pas.
  const contratEvident = documentType === 'autre' && Boolean(numero) && Boolean(compagnie)
  const possible = (typesAcceptes.includes(documentType) && Boolean(numero || compagnie)) || contratEvident

  return {
    possible,
    type_document: documentType,
    apercu: {
      compagnie,
      numero_contrat: numero,
      produit: valeur('produit'),
      date_effet: valeur('date_effet'),
      date_echeance: valeur('date_echeance'),
      prime: valeur('prime'),
      franchise: valeur('franchise'),
      garanties: valeur('garanties'),
    },
    raison: possible
      ? 'Ce document atteste un contrat : COURTIA peut créer le contrat correspondant.'
      : (typesAcceptes.includes(documentType)
        ? 'Aucun numéro de contrat ni compagnie exploitable : aucun contrat ne sera créé.'
        : 'Type de document ne servant pas à créer un contrat.'),
  }
}

/**
 * Crée RÉELLEMENT une ligne de contrat (`quotes`) à partir d'une extraction validée.
 * Convention reprise de src/routes/contrats.js (mêmes colonnes), statut du produit,
 * et marquage `a_verifier` dans quote_data : le contrat vient d'un document lu par un
 * modèle, il doit rester identifiable comme tel.
 */
async function creerContratDepuisExtraction({ portee, extractionId, clientId, userId, ip, userAgent }) {
  const ext = await pool.query('SELECT * FROM document_extractions WHERE id = $1', [extractionId])
  if (!ext.rows.length) return { ok: false, code: 'extraction_introuvable' }
  const extraction = ext.rows[0]

  const client = await chargerClient(portee, Number(clientId))
  if (!client || Number(client.id) !== Number(extraction.client_id)) {
    return { ok: false, code: 'client_hors_portee' }
  }
  if (extraction.applied_to_client !== true) {
    return { ok: false, code: 'non_appliquee', erreur: "L'extraction doit d'abord être appliquée à la fiche client." }
  }

  const champs = (extraction.extracted_fields && extraction.extracted_fields.champs) || {}
  const proposition = construireContratPropose(extraction.document_type, champs)
  if (!proposition.possible) {
    return { ok: false, code: 'contrat_non_identifiable', erreur: proposition.raison }
  }

  const valeur = (cle) => (champs[cle] && champs[cle].value !== undefined ? champs[cle].value : null)
  const primeBrute = valeur('prime')
  const prime = typeof primeBrute === 'number' ? primeBrute : (primeBrute ? Number(String(primeBrute).replace(',', '.')) : null)
  const echeance = /^\d{4}-\d{2}-\d{2}$/.test(String(valeur('date_echeance') || '')) ? valeur('date_echeance') : null

  const quoteData = {
    type_contrat: valeur('produit') || extraction.document_type,
    compagnie: valeur('compagnie'),
    numero_contrat: valeur('numero_contrat'),
    date_effet: valeur('date_effet'),
    date_echeance: valeur('date_echeance'),
    prime_annuelle: Number.isFinite(prime) ? prime : null,
    franchise: valeur('franchise'),
    garanties: valeur('garanties'),
    a_verifier: true,
    source_document: {
      extraction_id: extractionId,
      document_id: extraction.client_document_id,
      fichier: (extraction.extracted_fields || {}).fichier || null,
      modele: extraction.ai_model || null,
      lu_le: new Date().toISOString(),
    },
  }

  const clientApi = await pool.connect()
  try {
    await clientApi.query('BEGIN')
    const insertion = await clientApi.query(
      `INSERT INTO quotes (client_id, quote_data, status, prime_annuelle, date_echeance, broker_id, created_at)
       VALUES ($1, $2, 'actif', $3, $4, $5, NOW()) RETURNING id`,
      [client.id, JSON.stringify(quoteData), Number.isFinite(prime) ? prime : null, echeance, userId]
    )
    const contratId = insertion.rows[0].id
    await clientApi.query(
      `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, changes, new_values,
                               resource_type, resource_id, ip_address, user_agent)
       VALUES ($1, 'contract', $2, 'document_contract_create', $3, $4, 'document_extraction', $5, $6, $7)`,
      [userId, contratId, JSON.stringify({ extraction_id: extractionId, champs: Object.keys(quoteData) }),
       JSON.stringify(quoteData), extractionId, ip || null, userAgent || null]
    )
    await clientApi.query('COMMIT')
    return { ok: true, contratId, quoteData }
  } catch (err) {
    await clientApi.query('ROLLBACK').catch(() => {})
    logger.error({ err: err.message, extractionId }, 'creation de contrat impossible')
    return { ok: false, code: 'ecriture_impossible', erreur: err.message }
  } finally {
    clientApi.release()
  }
}

function valeursIdentiques(a, b) {
  if (a === null || a === undefined || a === '') return false
  const normal = (v) => String(v).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,]$/, '')
  return normal(a) === normal(b)
}

/**
 * Applique au client les champs explicitement retenus par le courtier.
 * Transactionnel, journalisé, sans écrasement implicite.
 * @param {Object} params
 * @param {Array} params.selections - [{ champ, appliquer: boolean, valeur }]
 */
async function appliquerDiff({ portee, porteeEcriture, extractionId, clientId, selections, userId, ip, userAgent }) {
  const diff = await construireDiff({ portee, extractionId })
  if (!diff.ok) return diff
  if (diff.extraction.deja_appliquee) {
    return { ok: false, code: 'deja_appliquee', erreur: 'Cette extraction a déjà été appliquée à la fiche client.' }
  }
  if (Number(diff.client.id) !== Number(clientId)) {
    return { ok: false, code: 'client_different', erreur: 'Cette extraction ne correspond pas au client transmis.' }
  }

  const retenues = (selections || []).filter((s) => s && s.appliquer === true && MAPPING_COLONNES[s.champ])
  if (!retenues.length) {
    return { ok: false, code: 'aucune_selection', erreur: 'Aucun champ sélectionné.' }
  }

  const client = await chargerClient(portee, clientId)
  if (!client) return { ok: false, code: 'client_hors_portee' }
  const documentsJson = normaliserDocuments(client.documents)

  const colonnes = {}
  const jsonb = JSON.parse(JSON.stringify(documentsJson))
  const appliquees = []
  const anciennes = {}

  for (const sel of retenues) {
    const def = MAPPING_COLONNES[sel.champ]
    const champ = diff.lignes.find((l) => l.champ === sel.champ)
    const valeur = sel.valeur !== undefined && sel.valeur !== null ? sel.valeur : (champ ? champ.valeur_extraite : null)
    if (valeur === null || valeur === undefined) continue

    if (def.colonne) {
      // Ne jamais écraser une valeur existante sans décision explicite : la sélection EST cette décision.
      anciennes[def.colonne] = client[def.colonne] === undefined ? null : client[def.colonne]
      colonnes[def.colonne] = valeur
    } else {
      const [groupe, sousCle] = def.jsonb.split('.')
      jsonb[groupe] = jsonb[groupe] || {}
      anciennes[def.jsonb] = jsonb[groupe][sousCle] === undefined ? null : jsonb[groupe][sousCle]
      jsonb[groupe][sousCle] = valeur
    }
    appliquees.push(sel.champ)
  }

  if (!appliquees.length) {
    return { ok: false, code: 'aucune_valeur', erreur: 'Aucune valeur exploitable dans la sélection.' }
  }

  // Traçabilité du document lui-même dans la fiche (sans écraser les autres analyses).
  jsonb.analyses_documentaires = jsonb.analyses_documentaires || []
  jsonb.analyses_documentaires.push({
    extraction_id: extractionId,
    document_id: diff.extraction.documentId,
    type: diff.extraction.typeDocument,
    fichier: diff.extraction.fichier || null,
    modele: diff.extraction.modele || null,
    applique_le: new Date().toISOString(),
    champs: appliquees,
  })

  const clientApi = await pool.connect()
  try {
    await clientApi.query('BEGIN')

    const cles = Object.keys(colonnes)
    const valeurs = Object.values(colonnes)
    const setClauses = cles.map((k, i) => `${k} = $${i + 2}`)
    await clientApi.query(
      `UPDATE clients SET ${setClauses.join(', ')}, documents = $${cles.length + 2}, updated_at = NOW()
       WHERE id = $1`,
      [clientId, ...valeurs, JSON.stringify(jsonb)]
    )

    await clientApi.query(
      `UPDATE document_extractions SET applied_to_client = true, applied_at = NOW() WHERE id = $1`,
      [extractionId]
    )

    // Journal d'audit : qui, quoi, quand, sur quel dossier, d'où.
    await clientApi.query(
      `INSERT INTO audit_logs (user_id, entity_type, entity_id, action, changes, old_values, new_values,
                               resource_type, resource_id, ip_address, user_agent)
       VALUES ($1, 'client', $2, 'document_extraction_apply', $3, $4, $5, 'document_extraction', $6, $7, $8)`,
      [userId, clientId, JSON.stringify({ extraction_id: extractionId, champs: appliquees }),
       JSON.stringify(anciennes), JSON.stringify(colonnes), extractionId, ip || null, userAgent || null]
    )

    await clientApi.query('COMMIT')
  } catch (err) {
    await clientApi.query('ROLLBACK').catch(() => {})
    logger.error({ err: err.message, extractionId }, 'ark document apply failed')
    return { ok: false, code: 'ecriture_impossible', erreur: err.message }
  } finally {
    clientApi.release()
  }

  return {
    ok: true,
    extractionId,
    clientId,
    champsAppliques: appliquees,
    colonnesEcrites: Object.keys(colonnes),
    detailJsonb: Object.keys(jsonb),
  }
}

module.exports = {
  LIMITE_OCTETS,
  MAX_FICHIERS,
  PAGES_MAX,
  SEUIL_SUR,
  MAPPING_COLONNES,
  CHAMPS_ATTENDUS,
  validerFichier,
  detecterMimeReel,
  nomSain,
  compterPagesPdf,
  stockerDocument,
  lireContenuDocument,
  analyserDocumentStocke,
  extraireTextePdf,
  extraireTexteImage,
  appelerDeepseek,
  appelerModele,
  analyserJson,
  construireDiff,
  construireContratPropose,
  creerContratDepuisExtraction,
  appliquerDiff,
  normaliserChamps,
  chargerClient,
}
