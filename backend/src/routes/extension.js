/**
 * extensionRoutes.js — Routes pour l'Extension Chrome COURTIA
 * POST /analyze → analyser une page web
 * POST /fill    → suggerer/simuler le remplissage d'un formulaire
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const logger = require('../lib/logger');

// POST /analyze — analyser une page web
router.post('/analyze', async (req, res) => {
  try {
    const { url, title, forms, text } = req.body;
    const userId = req.user?.userId || req.user?.id;

    logger.info({ user_id: userId, has_url: Boolean(url), has_title: Boolean(title) }, 'extension page analyze requested');

    // Analyse simple des champs
    const fields = forms?.fields || [];
    const suggestions = fields.map(field => {
      const label = (field.label || field.name || '').toLowerCase();
      let suggestion = '';

      if (label.includes('nom') || label.includes('prenom')) suggestion = '[Nom du client]';
      else if (label.includes('email') || label.includes('mail')) suggestion = '[Email client]';
      else if (label.includes('tel') || label.includes('phone') || label.includes('portable')) suggestion = '[Telephone client]';
      else if (label.includes('adresse') || label.includes('ville') || label.includes('code postal')) suggestion = '[Adresse client]';
      else if (label.includes('date') || label.includes('naissance')) suggestion = '[Date client]';
      else if (label.includes('siret') || label.includes('siren')) suggestion = '[SIRET]';
      else if (label.includes('rib') || label.includes('iban') || label.includes('bic')) suggestion = '[Coordonnees bancaires]';
      else if (label.includes('immat') || label.includes('plaque')) suggestion = '[Immatriculation]';

      return { name: field.name, label: field.label, suggestion };
    }).filter(s => s.suggestion);

    return res.json({
      success: true,
      data: {
        url, title,
        formsCount: forms?.formsCount || 0,
        fieldsCount: forms?.inputsCount || 0,
        suggestions: suggestions.filter(s => s.suggestion),
        summary: `${forms?.inputsCount || 0} champs trouves, ${suggestions.filter(s => s.suggestion).length} suggestions`
      }
    });
  } catch (err) {
    console.error('[POST /api/extension/analyze]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// Champs reconnus dans un formulaire → colonnes réelles du client en base.
// Aucune valeur n'est inventée : si la donnée n'existe pas, le champ est vide
// et listé dans `missing`.
const FIELD_SEMANTICS = [
  // « prenom » est testé AVANT « nom » : « prenom » contient la sous-chaîne
  // « nom », l'ordre inverse classerait le prénom dans le nom de famille.
  { key: 'prenom', matchers: ['prenom', 'firstname', 'first_name'], columns: ['first_name', 'prenom'] },
  { key: 'nom', matchers: ['nom', 'lastname', 'last_name', 'name'], columns: ['last_name', 'nom', 'name'] },
  { key: 'email', matchers: ['email', 'mail', 'courriel'], columns: ['email', 'email_address'] },
  { key: 'telephone', matchers: ['tel', 'phone', 'portable', 'mobile', 'gsm'], columns: ['telephone', 'phone_mobile', 'phone', 'mobile'] },
  { key: 'adresse', matchers: ['adresse', 'address', 'rue', 'voie'], columns: ['adresse', 'address', 'address_line1'] },
  { key: 'ville', matchers: ['ville', 'city', 'commune'], columns: ['ville', 'city'] },
  { key: 'code_postal', matchers: ['code postal', 'codepostal', 'postal', 'postcode', 'zip', 'cp'], columns: ['code_postal', 'postal_code', 'zip'] },
  { key: 'date_naissance', matchers: ['date', 'naissance', 'birth'], columns: ['date_naissance', 'birth_date'] },
  { key: 'siret', matchers: ['siret', 'siren'], columns: ['siret', 'siren', 'company_siret'] },
  { key: 'iban', matchers: ['rib', 'iban', 'bancaire', 'bank'], columns: ['iban', 'bank_iban', 'rib'] },
  { key: 'bic', matchers: ['bic', 'swift'], columns: ['bic', 'swift'] },
  { key: 'immatriculation', matchers: ['immat', 'plaque', 'vin'], columns: ['immatriculation', 'vehicle_plate', 'plate'] },
];

function detectFieldKey(label, name) {
  const haystack = `${String(name || '')} ${String(label || '')}`.toLowerCase();
  for (const semantic of FIELD_SEMANTICS) {
    if (semantic.matchers.some((matcher) => haystack.includes(matcher))) return semantic.key;
  }
  return null;
}

// Valeur réellement exploitable (chaîne non vide), sinon null.
function cleanValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, 300);
}

/**
 * Valeurs fournies par l'appelant (extension) : objet { nomDuChampOuLabel: valeur }.
 */
function buildProvidedValues(values) {
  const map = new Map();
  if (!values || typeof values !== 'object') return map;
  for (const [key, raw] of Object.entries(values)) {
    const value = cleanValue(raw);
    if (value) map.set(String(key).trim().toLowerCase(), value);
  }
  return map;
}

/**
 * Valeurs réelles du client, lues en base pour le courtier connecté.
 * `SELECT *` : on ne référence jamais une colonne qui n'existe pas.
 */
async function loadClientValues(clientId, userId) {
  const empty = { found: false, values: new Map() };
  if (!Number.isFinite(Number(clientId)) || !Number.isFinite(Number(userId))) return empty;
  const result = await pool.query('SELECT * FROM clients WHERE id = $1 AND courtier_id = $2', [clientId, userId]);
  const client = result.rows[0];
  if (!client) return empty;

  const values = new Map();
  for (const semantic of FIELD_SEMANTICS) {
    for (const column of semantic.columns) {
      const value = cleanValue(client[column]);
      if (value) {
        values.set(semantic.key, value);
        break;
      }
    }
  }
  return { found: true, values };
}

// POST /fill — retourner les valeurs RÉELLES pour les champs du formulaire
//
// IA-005 — l'ancienne version renvoyait une identité factice complète
// (« DUPONT », « Jean », IBAN « FR76… ») avec success:true : le courtier croyait
// remplir le dossier de son client avec ses données et remplissait le formulaire
// d'un tiers avec des valeurs inventées. Désormais :
//   - seules sont renvoyées les valeurs fournies par l'appelant (`values`) ou
//     lues en base pour le client du cabinet (`clientId` du courtier connecté) ;
//   - tout champ sans valeur réelle revient vide et est listé dans `missing`.
router.post('/fill', async (req, res) => {
  try {
    const { url, fields, values, clientId } = req.body;
    const userId = req.user?.userId || req.user?.id;

    const provided = buildProvidedValues(values);
    const dbValues = await loadClientValues(clientId, userId);

    const filled = [];
    const missing = [];
    const warnings = [];

    if (clientId && !dbValues.found) {
      warnings.push('client_introuvable: aucune donnée client en base pour ce cabinet');
    }

    for (const field of fields || []) {
      const name = field?.name || field?.label || '';
      const label = (field?.label || field?.name || '').toLowerCase();
      const byName = provided.get(String(field?.name || '').trim().toLowerCase());
      const byLabel = provided.get(label.trim());
      const semanticKey = detectFieldKey(field?.label, field?.name);
      const fromDb = semanticKey ? dbValues.values.get(semanticKey) : null;
      const value = byName || byLabel || fromDb || '';

      const entry = { name: field?.name, selector: `[name="${field?.name}"]`, value };
      if (value) {
        filled.push(entry);
      } else {
        missing.push({ name: field?.name, label: field?.label || null });
      }
    }

    return res.json({
      success: true,
      data: {
        filled: filled.length,
        fields: filled,
        missing,
        ...(warnings.length ? { warnings } : {})
      }
    });
  } catch (err) {
    console.error('[POST /api/extension/fill]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

module.exports = router;
