/**
 * extensionRoutes.js — Routes pour l'Extension Chrome COURTIA
 * POST /analyze → analyser une page web
 * POST /fill    → suggerer/simuler le remplissage d'un formulaire
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /analyze — analyser une page web
router.post('/analyze', async (req, res) => {
  try {
    const { url, title, forms, text } = req.body;
    const userId = req.user?.userId || req.user?.id;

    // Log l'analyse
    console.log(`[Extension] Analyse page: ${title || url}`);

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

// POST /fill — retourner les suggestions de remplissage
router.post('/fill', async (req, res) => {
  try {
    const { url, fields } = req.body;
    const userId = req.user?.userId || req.user?.id;

    // Construire les valeurs suggerees
    const filledFields = (fields || []).map(field => {
      const label = (field.label || field.name || '').toLowerCase();
      let value = '';

      if (label.includes('nom')) value = 'DUPONT';
      else if (label.includes('prenom')) value = 'Jean';
      else if (label.includes('email') || label.includes('mail')) value = 'client@email.fr';
      else if (label.includes('tel') || label.includes('phone')) value = '0612345678';
      else if (label.includes('adresse')) value = '1 Rue de la Paix';
      else if (label.includes('ville')) value = 'Paris';
      else if (label.includes('code postal') || label.includes('cp')) value = '75001';
      else if (label.includes('date')) value = '01/01/1990';
      else if (label.includes('siret')) value = '12345678901234';
      else if (label.includes('rib') || label.includes('iban')) value = 'FR7612345678901234567890123';
      else if (label.includes('bic')) value = 'BNPAFRPPXXX';
      else if (label.includes('immat') || label.includes('plaque')) value = 'AB-123-CD';

      return { name: field.name, selector: `[name="${field.name}"]`, value };
    }).filter(f => f.value);

    return res.json({
      success: true,
      data: {
        filled: filledFields.length,
        fields: filledFields
      }
    });
  } catch (err) {
    console.error('[POST /api/extension/fill]', err.message);
    return res.status(500).json({ error: 'server_error', message: err.message });
  }
});

module.exports = router;
