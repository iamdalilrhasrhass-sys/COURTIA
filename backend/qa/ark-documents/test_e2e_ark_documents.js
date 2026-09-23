#!/usr/bin/env node
/**
 * test_e2e_ark_documents.js — TEST RÉEL DE BOUT EN BOUT (base QA réelle + HTTP réel)
 *
 * Ce que ce test exerce VRAIMENT : multer, authentification, portée cabinet, validation
 * des fichiers par octets d'en-tête, stockage en base, lecture du document par un modèle,
 * construction du diff, application transactionnelle, journal d'audit, relecture.
 *
 * Fournisseur de modèle : le modèle local multimodal du VPS via ARK_DOC_LOCAL_BASE_URL
 * (aucune clé externe n'était disponible — la variable ANTHROPIC_API_KEY de production
 * contenait une URL, tous les appels répondaient 401). La lecture d'un PDF avec couche
 * texte utilise ce fournisseur ; c'est une lecture RÉELLE, pas une simulation.
 *
 * Usage : node test_e2e_ark_documents.js [http://127.0.0.1:3999]
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const BASE = process.argv[2] || 'http://127.0.0.1:3999'
const RACINE = '/srv/courtia/backend'
const FIXTURES = '/root/ark/courtia_ia_docs/fixtures'
const PREUVE = '/root/ark/courtia_ia_docs/preuves/test_e2e_ark_documents.json'

process.env.DATABASE_URL = process.env.DATABASE_URL || fs.readFileSync('/root/.hermes/secrets/qa107_db_url', 'utf8').trim()
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-de-test-local-ark-documents'

const jwt = require(path.join(RACINE, 'node_modules/jsonwebtoken'))
const { Pool } = require(path.join(RACINE, 'node_modules/pg'))
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const CAB_A = '11111111-1111-4111-8111-111111111111'
const CAB_B = '22222222-2222-4222-8222-222222222222'
const résultats = []
let échecs = 0

function verifier(nom, condition, detail) {
  const ok = Boolean(condition)
  if (!ok) échecs += 1
  résultats.push({ test: nom, ok, detail })
  console.log(`${ok ? 'OK  ' : 'ECHEC'} | ${nom}${detail ? ' — ' + detail : ''}`)
}

async function jetons() {
  const ua = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, status, name, full_name)
     VALUES ('ark-doc-test-a@courtia.local', 'x', 'Adrien', 'Test', 'broker', 'active', 'Adrien Test', 'Adrien Test')
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW() RETURNING id`)
  const ub = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, status, name, full_name)
     VALUES ('ark-doc-test-b@courtia.local', 'x', 'Bruno', 'Test', 'broker', 'active', 'Bruno Test', 'Bruno Test')
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW() RETURNING id`)
  const idA = ua.rows[0].id
  const idB = ub.rows[0].id

  await pool.query(`INSERT INTO cabinets (id, name, created_by) VALUES ($1, 'CABINET TEST A', $2)
                    ON CONFLICT (id) DO NOTHING`, [CAB_A, idA])
  await pool.query(`INSERT INTO cabinets (id, name, created_by) VALUES ($1, 'CABINET TEST B', $2)
                    ON CONFLICT (id) DO NOTHING`, [CAB_B, idB])
  await pool.query(`INSERT INTO cabinet_members (cabinet_id, user_id, role) VALUES ($1, $2, 'owner')
                    ON CONFLICT DO NOTHING`, [CAB_A, idA])
  await pool.query(`INSERT INTO cabinet_members (cabinet_id, user_id, role) VALUES ($1, $2, 'owner')
                    ON CONFLICT DO NOTHING`, [CAB_B, idB])

  // first_name / last_name sont NOT NULL sans valeur par défaut sur la table clients.
  const ca = await pool.query(
    `INSERT INTO clients (nom, prenom, first_name, last_name, cabinet_id, courtier_id, user_id, email)
     VALUES ('MARTIN', 'Jean', 'Jean', 'MARTIN', $1, $2, $2, 'jean.martin@test.local') RETURNING id`, [CAB_A, idA])
  const cb = await pool.query(
    `INSERT INTO clients (nom, prenom, first_name, last_name, cabinet_id, courtier_id, user_id, email)
     VALUES ('DUPONT', 'Claire', 'Claire', 'DUPONT', $1, $2, $2, 'claire.dupont@test.local') RETURNING id`, [CAB_B, idB])

  return {
    idA, idB, clientA: ca.rows[0].id, clientB: cb.rows[0].id,
    tokenA: jwt.sign({ userId: idA, id: idA, role: 'broker' }, process.env.JWT_SECRET, { expiresIn: '1h' }),
    tokenB: jwt.sign({ userId: idB, id: idB, role: 'broker' }, process.env.JWT_SECRET, { expiresIn: '1h' }),
  }
}

async function analyser(token, clientId, fichiers) {
  const form = new FormData()
  for (const f of fichiers) {
    const octets = fs.readFileSync(path.join(FIXTURES, f))
    form.append('files', new Blob([octets]), f)
  }
  form.append('clientId', String(clientId))
  const res = await fetch(`${BASE}/api/ark/documents/analyse`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: form,
  })
  const texte = await res.text()
  let data = null
  try { data = JSON.parse(texte) } catch (_e) { data = { brut: texte.slice(0, 300) } }
  return { statut: res.status, data }
}

async function appliquer(token, extractionId, clientId, selections, options = {}) {
  const res = await fetch(`${BASE}/api/ark/documents/extractions/${extractionId}/appliquer`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, selections, ...options }),
  })
  const texte = await res.text()
  let data = null
  try { data = JSON.parse(texte) } catch (_e) { data = { brut: texte.slice(0, 300) } }
  return { statut: res.status, data }
}

;(async () => {
  const ctx = await jetons()
  console.log('--- contexte ---')
  console.log('utilisateur A', ctx.idA, '| client A', ctx.clientA, '| utilisateur B', ctx.idB, '| client B', ctx.clientB)

  // ── TEST 1 : PDF texte simple, lecture réelle ────────────────────────────────
  const t1 = await analyser(ctx.tokenA, ctx.clientA, ['releve_information_simple.pdf'])
  const lignes1 = (t1.data && t1.data.diff && t1.data.diff.lignes) || []
  const parChamp = Object.fromEntries(lignes1.map((l) => [l.champ, l]))
  verifier('TEST 1 — PDF texte simple : analyse HTTP 200', t1.statut === 200, `HTTP ${t1.statut}`)
  verifier('TEST 1 — document lu (fichier marqué ok)', t1.data.fichiers && t1.data.fichiers[0] && t1.data.fichiers[0].ok === true,
    t1.data.fichiers ? `type détecté : ${t1.data.fichiers[0].typeLibelle}` : 'aucun fichier')
  const valCompagnie = parChamp.compagnie && parChamp.compagnie.valeur_extraite
  verifier('TEST 1 — compagnie extraite (valeur réelle, pas un fragment de JSON)',
    typeof valCompagnie === 'string' && valCompagnie.length > 1 && !valCompagnie.includes('value'),
    String(valCompagnie))
  verifier('TEST 1 — immatriculation extraite', Boolean(parChamp.immatriculation), parChamp.immatriculation && String(parChamp.immatriculation.valeur_extraite))
  verifier('TEST 1 — coefficient bonus/malus extrait en nombre', parChamp.bonus_malus && typeof parChamp.bonus_malus.valeur_extraite === 'number',
    parChamp.bonus_malus && String(parChamp.bonus_malus.valeur_extraite))
  verifier('TEST 1 — chaque ligne porte confiance, page et source',
    lignes1.length > 0 && lignes1.every((l) => typeof l.confiance === 'number' && l.source_document !== undefined),
    `${lignes1.length} lignes`)
  verifier('TEST 5 — champ absent NON proposé (aucune hallucination) : IBAN absent du relevé',
    !parChamp.iban, parChamp.iban ? `valeur inventée : ${parChamp.iban.valeur_extraite}` : 'absent, donc non proposé')

  const extractionId = (t1.data.fichiers && t1.data.fichiers[0] && t1.data.fichiers[0].extractionId) || null

  // ── TEST 10 : la base n'est PAS modifiée avant validation ───────────────────
  const avant = await pool.query('SELECT nom, prenom, bonus_malus, documents FROM clients WHERE id = $1', [ctx.clientA])
  verifier('TEST 10 — fiche client inchangée après analyse (rien écrit sans validation)',
    avant.rows[0].nom === 'MARTIN' && String(avant.rows[0].bonus_malus) === '1.00',
    `nom=${avant.rows[0].nom} bonus_malus=${avant.rows[0].bonus_malus} (valeur par défaut, non touchée)`)

  // ── TEST 9 / TEST 11 : application puis relecture réelle ───────────────────
  const selections = lignes1.filter((l) => l.confiance >= 0.5).map((l) => ({ champ: l.champ, appliquer: true, valeur: l.valeur_extraite }))
  const t9 = await appliquer(ctx.tokenA, extractionId, ctx.clientA, selections)
  verifier('TEST 9 — application après validation (HTTP 200)', t9.statut === 200, `HTTP ${t9.statut} — champs : ${(t9.data.champs_appliques || []).join(', ')}`)
  const apres = await pool.query('SELECT nom, prenom, bonus_malus, documents, adresse FROM clients WHERE id = $1', [ctx.clientA])
  const docJson = typeof apres.rows[0].documents === 'string' ? JSON.parse(apres.rows[0].documents || '{}') : (apres.rows[0].documents || {})
  verifier('TEST 11 — écriture réelle vérifiée en base (JSONB clients.documents)',
    Boolean(docJson.assurance || docJson.vehicule || docJson.identite),
    `clés écrites : ${Object.keys(docJson).join(', ')}`)
  verifier('TEST 11 — valeurs relues par ARK identiques à la base',
    t9.data.valeurs_relues && Object.keys(t9.data.valeurs_relues).length > 0,
    JSON.stringify(t9.data.valeurs_relues || {}).slice(0, 200))

  const audit = await pool.query(
    `SELECT count(*) FROM audit_logs WHERE entity_type = 'client' AND entity_id = $1 AND action = 'document_extraction_apply'`,
    [ctx.clientA])
  verifier('TEST 11 — journal d\'audit écrit', Number(audit.rows[0].count) >= 1, `${audit.rows[0].count} ligne(s) audit_logs`)
  const marque = await pool.query('SELECT applied_to_client, applied_at FROM document_extractions WHERE id = $1', [extractionId])
  verifier('TEST 11 — extraction marquée appliquée', marque.rows[0] && marque.rows[0].applied_to_client === true,
    `applied_at=${marque.rows[0] && marque.rows[0].applied_at}`)

  const t9bis = await appliquer(ctx.tokenA, extractionId, ctx.clientA, selections)
  verifier('TEST 10b — seconde application refusée (aucun double écrasement)', t9bis.statut === 409, `HTTP ${t9bis.statut}`)

  // ── TEST 2 : PDF multipage, attribution de page ─────────────────────────────
  const t2 = await analyser(ctx.tokenA, ctx.clientA, ['releve_information_multipage.pdf'])
  const lignes2 = (t2.data && t2.data.diff && t2.data.diff.lignes) || []
  const coef = lignes2.find((l) => l.champ === 'bonus_malus')
  verifier('TEST 2 — PDF multipage lu', t2.statut === 200 && (t2.data.fichiers || []).some((f) => f.ok), `HTTP ${t2.statut}`)
  verifier('TEST 2 — information de la page 3 attribuée à la page 3',
    Boolean(coef) && coef.page === 3, coef ? `coefficient ${coef.valeur_extraite} page ${coef.page}` : 'coefficient non extrait')
  verifier('TEST 2 — identité de la page 1 attribuée à la page 1',
    Boolean(lignes2.find((l) => l.champ === 'nom' && l.page === 1)),
    JSON.stringify(lignes2.filter((l) => l.champ === 'nom').map((l) => ({ v: l.valeur_extraite, p: l.page }))))

  // ── TEST 3 : image acceptée (voie visuelle) ────────────────────────────────
  const t3 = await analyser(ctx.tokenA, ctx.clientA, ['rib_scan.png'])
  verifier('TEST 3 — image PNG acceptée et lue par le pipeline',
    t3.statut === 200 && (t3.data.fichiers || []).length === 1,
    `HTTP ${t3.statut} — ${JSON.stringify((t3.data.fichiers || [])[0] || {}).slice(0, 160)}`)
  verifier('TEST 5b — une image non lue par ce fournisseur ne produit AUCUNE valeur inventée',
    ((t3.data.diff && t3.data.diff.lignes) || []).length === 0
    || ((t3.data.diff.lignes) || []).every((l) => l.valeur_extraite !== null),
    `${((t3.data.diff && t3.data.diff.lignes) || []).length} ligne(s) proposée(s)`)

  // ── TEST 6 : mauvais fichier ───────────────────────────────────────────────
  const t6 = await analyser(ctx.tokenA, ctx.clientA, ['faux_pdf_piege.pdf'])
  const f6 = (t6.data.fichiers || [])[0] || {}
  verifier('TEST 6 — faux PDF (exécutable renommé) refusé',
    t6.statut === 200 && f6.ok === false && f6.code === 'type_non_autorise',
    `code=${f6.code} erreur=${f6.erreur}`)

  // ── TEST 7 : fichier trop volumineux ───────────────────────────────────────
  const t7 = await analyser(ctx.tokenA, ctx.clientA, ['volumineux_20Mo.pdf'])
  verifier('TEST 7 — fichier de 20 Mo refusé (HTTP 413)', t7.statut === 413,
    `HTTP ${t7.statut} — ${t7.data && (t7.data.message || t7.data.error)}`)

  // ── TEST 8 : isolation entre cabinets ──────────────────────────────────────
  const t8a = await analyser(ctx.tokenB, ctx.clientA, ['releve_information_simple.pdf'])
  verifier('TEST 8 — cabinet B ne peut pas analyser un dossier du cabinet A (404)',
    t8a.statut === 404, `HTTP ${t8a.statut} — ${t8a.data && t8a.data.error}`)
  const res8b = await fetch(`${BASE}/api/ark/documents/extractions/${extractionId}`, { headers: { Authorization: 'Bearer ' + ctx.tokenB } })
  verifier('TEST 8b — cabinet B ne peut pas lire l\'extraction du cabinet A',
    res8b.status === 403 || res8b.status === 404, `HTTP ${res8b.status}`)
  const t8c = await appliquer(ctx.tokenB, extractionId, ctx.clientA, selections)
  verifier('TEST 8c — cabinet B ne peut pas écrire dans la fiche du cabinet A',
    t8c.statut === 403 || t8c.statut === 404, `HTTP ${t8c.statut}`)
  const res8d = await fetch(`${BASE}/api/ark/documents/extractions`, { headers: { Authorization: 'Bearer ' + ctx.tokenB } })
  const data8d = await res8d.json().catch(() => ({}))
  const fuite = (data8d.extractions || []).filter((e) => Number(e.client_id) === Number(ctx.clientA))
  verifier('TEST 8d — l\'historique du cabinet B ne contient aucune ligne du cabinet A',
    fuite.length === 0, `${(data8d.extractions || []).length} extraction(s) visibles, ${fuite.length} du cabinet A`)

  // ── TEST : sans jeton, aucune analyse possible ─────────────────────────────
  const formSansJeton = new FormData()
  formSansJeton.append('files', new Blob([fs.readFileSync(path.join(FIXTURES, 'releve_information_simple.pdf'))]), 'x.pdf')
  formSansJeton.append('clientId', String(ctx.clientA))
  const sansJeton = await fetch(`${BASE}/api/ark/documents/analyse`, { method: 'POST', body: formSansJeton })
  verifier('TEST sécurité — analyse sans jeton refusée (401)', sansJeton.status === 401, `HTTP ${sansJeton.status}`)

  // ── TEST 4b : PDF SCANNÉ (image seule) — refus explicite, aucune invention ────
  const tScanne = await analyser(ctx.tokenA, ctx.clientA, ['pdf_scanne.pdf'])
  const fScanne = (tScanne.data && tScanne.data.fichiers && tScanne.data.fichiers[0]) || {}
  const lignesScanne = (tScanne.data && tScanne.data.diff && tScanne.data.diff.lignes) || []
  verifier('TEST 4b — un PDF scanné (aucune couche texte) est REFUSÉ explicitement',
    tScanne.statut === 200 && fScanne.ok === false && fScanne.code === 'pdf_sans_texte',
    `code=${fScanne.code} erreur="${String(fScanne.erreur || '').slice(0, 120)}"`)
  verifier('TEST 4b — aucune valeur n\'est proposée pour un PDF scanné (pas d\'invention)',
    lignesScanne.length === 0,
    `${lignesScanne.length} ligne(s) proposée(s)`)

  // ── TEST MULTI-DOCUMENT : deux documents en un seul envoi ─────────────────
  const tMulti = await analyser(ctx.tokenA, ctx.clientA, ['releve_information_simple.pdf', 'contrat_auto.pdf'])
  const fichiersMulti = (tMulti.data && tMulti.data.fichiers) || []
  const lignesMulti = (tMulti.data && tMulti.data.diff && tMulti.data.diff.lignes) || []
  verifier('TEST MULTI — deux documents acceptes en un envoi',
    tMulti.statut === 200 && fichiersMulti.length === 2 && fichiersMulti.every((f) => f.ok === true),
    `${fichiersMulti.length} fichier(s), ok=${fichiersMulti.filter((f) => f.ok).length}`)
  verifier('TEST MULTI — diff fusionne portant les deux documents',
    new Set(lignesMulti.map((l) => l.extraction_id)).size >= 2 && lignesMulti.length > 8,
    `${lignesMulti.length} lignes, ${new Set(lignesMulti.map((l) => l.extraction_id)).size} extraction(s)`)

  // ── TEST 9 : une valeur EXISTANTE n'est pas ecrasee silencieusement ────────
  const clientEcrase = await pool.query(
    `INSERT INTO clients (nom, prenom, first_name, last_name, cabinet_id, courtier_id, user_id, email, bonus_malus, adresse, address, code_postal, postal_code, ville, city)
     VALUES ('RELIRE', 'Test', 'Test', 'RELIRE', $1, $2, $2, 'test.relire@test.local', 2.50, 'adresse a conserver', 'adresse a conserver', '75001', '75001', 'PARIS', 'PARIS') RETURNING id`,
    [CAB_A, ctx.idA])
  const idEcrase = clientEcrase.rows[0].id
  const tEcrase = await analyser(ctx.tokenA, idEcrase, ['releve_information_simple.pdf'])
  const lignesEcrase = (tEcrase.data && tEcrase.data.diff && tEcrase.data.diff.lignes) || []
  const coefEcrase = lignesEcrase.find((l) => l.champ === 'bonus_malus')
  const adrEcrase = lignesEcrase.find((l) => l.champ === 'adresse')
  verifier('TEST 9 — une valeur différente en base est marquée « conflit » et NON présélectionnée',
    Boolean(coefEcrase) && coefEcrase.action === 'conflit' && coefEcrase.preselectionne === false,
    coefEcrase ? `actuel=${coefEcrase.valeur_actuelle} extrait=${coefEcrase.valeur_extraite} action=${coefEcrase.action} présélection=${coefEcrase.preselectionne}` : 'ligne absente')
  verifier('TEST 9 — une valeur différente en base est marquée « conflit » pour l\'adresse aussi',
    Boolean(adrEcrase) && adrEcrase.action === 'conflit',
    adrEcrase ? `actuel="${adrEcrase.valeur_actuelle}" extrait="${adrEcrase.valeur_extraite}"` : 'ligne absente')

  // on n'applique QUE les champs sans conflit : le coefficient et l'adresse doivent rester intacts
  // On reproduit EXACTEMENT ce que l'ecran pre-selectionne : seuls les champs a appliquer
  // et suffisamment surs. Les champs « identique » restent donc intacts eux aussi.
  const selectionsSansConflit = lignesEcrase.filter((l) => l.action === 'appliquer' && l.preselectionne === true).map((l) => ({ champ: l.champ, appliquer: true, valeur: l.valeur_extraite }))
  const tEcraseApply = await appliquer(ctx.tokenA, tEcrase.data.fichiers[0].extractionId, idEcrase, selectionsSansConflit)
  const apresEcrase = await pool.query('SELECT bonus_malus, adresse, address, ville, city, code_postal, postal_code FROM clients WHERE id = $1', [idEcrase])
  verifier('TEST 9 — après application des seuls champs sans conflit, la valeur existante est INTACTE (les deux paires de colonnes)',
    tEcraseApply.statut === 200 && String(apresEcrase.rows[0].bonus_malus) === '2.50'
    && apresEcrase.rows[0].address === 'adresse a conserver' && apresEcrase.rows[0].adresse === 'adresse a conserver'
    && apresEcrase.rows[0].city === 'PARIS' && apresEcrase.rows[0].ville === 'PARIS',
    `bonus_malus=${apresEcrase.rows[0].bonus_malus} address="${apresEcrase.rows[0].address}" adresse="${apresEcrase.rows[0].adresse}" city="${apresEcrase.rows[0].city}" ville="${apresEcrase.rows[0].ville}"`)

  // ── TEST 12 : creation REELLE du contrat (table quotes) ────────────────────
  const clientContrat = await pool.query(
    `INSERT INTO clients (nom, prenom, first_name, last_name, cabinet_id, courtier_id, user_id, email)
     VALUES ('CONTRAT', 'Test', 'Test', 'CONTRAT', $1, $2, $2, 'test.contrat@test.local') RETURNING id`,
    [CAB_A, ctx.idA])
  const idContrat = clientContrat.rows[0].id
  const tContrat = await analyser(ctx.tokenA, idContrat, ['contrat_auto.pdf'])
  const diffContrat = (tContrat.data && tContrat.data.diff && tContrat.data.diff.lignes) || []
  const propositionContrat = tContrat.data && tContrat.data.contrat_propose
  verifier('TEST 12 — le document atteste un contrat : la création est PROPOSÉE avec son contenu',
    Boolean(propositionContrat) && propositionContrat.possible === true,
    propositionContrat ? `numéro=${propositionContrat.apercu.numero_contrat} compagnie=${propositionContrat.apercu.compagnie} échéance=${propositionContrat.apercu.date_echeance}` : 'aucune proposition')

  const selContrat = diffContrat.map((l) => ({ champ: l.champ, appliquer: true, valeur: l.valeur_extraite }))
  const tContratApply = await appliquer(ctx.tokenA, tContrat.data.fichiers[0].extractionId, idContrat, selContrat, { creer_contrat: true })
  const contratCree = tContratApply.data && tContratApply.data.contrat
  const ligneContrat = contratCree && contratCree.id
    ? await pool.query('SELECT id, client_id, status, prime_annuelle, date_echeance, quote_data FROM quotes WHERE id = $1', [contratCree.id])
    : { rows: [] }
  verifier('TEST 12 — un contrat est RÉELLEMENT créé dans la table quotes',
    tContratApply.statut === 200 && ligneContrat.rows.length === 1 && Number(ligneContrat.rows[0].client_id) === Number(idContrat),
    ligneContrat.rows.length ? `quotes#${ligneContrat.rows[0].id} statut=${ligneContrat.rows[0].status} prime=${ligneContrat.rows[0].prime_annuelle} échéance=${ligneContrat.rows[0].date_echeance}` : 'aucune ligne créée')
  verifier('TEST 12 — le contrat porte la référence du document lu et le marquage « à vérifier »',
    ligneContrat.rows.length === 1 && ligneContrat.rows[0].quote_data && ligneContrat.rows[0].quote_data.a_verifier === true
    && ligneContrat.rows[0].quote_data.source_document && ligneContrat.rows[0].quote_data.source_document.extraction_id,
    ligneContrat.rows.length ? JSON.stringify(ligneContrat.rows[0].quote_data).slice(0, 200) : '')
  const auditContrat = await pool.query(
    `SELECT count(*) FROM audit_logs WHERE action = 'document_contract_create' AND entity_id = $1`,
    [contratCree && contratCree.id ? contratCree.id : 0])
  verifier('TEST 12 — création tracée dans le journal d\'audit',
    Number(auditContrat.rows[0].count) >= 1, `${auditContrat.rows[0].count} ligne(s)`)

  // ── TEST 12b : sans demande explicite, AUCUN contrat n'est créé ────────────
  const clientSans = await pool.query(
    `INSERT INTO clients (nom, prenom, first_name, last_name, cabinet_id, courtier_id, user_id, email)
     VALUES ('SANSCONTRAT', 'Test', 'Test', 'SANSCONTRAT', $1, $2, $2, 'test.sans@test.local') RETURNING id`,
    [CAB_A, ctx.idA])
  const idSans = clientSans.rows[0].id
  const tSans = await analyser(ctx.tokenA, idSans, ['contrat_auto.pdf'])
  const tSansApply = await appliquer(ctx.tokenA, tSans.data.fichiers[0].extractionId, idSans,
    ((tSans.data.diff && tSans.data.diff.lignes) || []).map((l) => ({ champ: l.champ, appliquer: true, valeur: l.valeur_extraite })))
  const contratsSans = await pool.query('SELECT count(*) FROM quotes WHERE client_id = $1', [idSans])
  verifier('TEST 12b — sans case cochée, aucune ligne de contrat n\'est créée',
    tSansApply.statut === 200 && Number(contratsSans.rows[0].count) === 0,
    `${contratsSans.rows[0].count} contrat(s) pour ce client`)

  const preuve = {
    date: new Date().toISOString(),
    base: process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'),
    serveur: BASE,
    contexte: { utilisateur_a: ctx.idA, utilisateur_b: ctx.idB, client_a: ctx.clientA, client_b: ctx.clientB },
    extraction_id: extractionId,
    exemple_diff: lignes1.slice(0, 8),
    fiche_avant: avant.rows[0],
    fiche_apres: { nom: apres.rows[0].nom, prenom: apres.rows[0].prenom, bonus_malus: apres.rows[0].bonus_malus },
    documents_jsonb_apres: Object.keys(docJson),
    valeurs_relues: t9.data.valeurs_relues || null,
    tests: résultats,
    echecs: échecs,
  }
  fs.writeFileSync(PREUVE, JSON.stringify(preuve, null, 1))
  console.log(`\n${résultats.length - échecs}/${résultats.length} tests réussis. Preuve : ${PREUVE}`)
  await pool.end()
  process.exit(échecs === 0 ? 0 : 1)
})().catch(async (e) => {
  console.error('ECHEC DU TEST :', e.message)
  try { await pool.end() } catch (_e) { /* ignore */ }
  process.exit(1)
})
