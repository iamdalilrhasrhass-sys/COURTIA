const express = require('express');
const router = express.Router();
const claimsService = require('../services/claimsService');

// GET /api/claims — Liste des sinistres
router.get('/', async (req, res) => {
  try {
    const { client_id, status, limit } = req.query;
    const claims = await claimsService.listClaims({
      courtierId: req.user.id,
      clientId: client_id,
      status,
      limit: Number(limit) || 100
    });
    res.json(claims);
  } catch (err) {
    console.error('GET /api/claims error:', err.message);
    res.status(500).json({ error: 'claims_fetch_failed', message: err.message });
  }
});

// POST /api/claims — Creer un sinistre
router.post('/', async (req, res) => {
  try {
    const { client_id, contract_id, type, description, amount, insurer_ref } = req.body;
    const claim = await claimsService.createClaim({
      courtierId: req.user.id,
      clientId: client_id,
      contractId: contract_id,
      type,
      description,
      amount,
      insurerRef: insurer_ref
    });
    res.status(201).json(claim);
  } catch (err) {
    console.error('POST /api/claims error:', err.message);
    res.status(400).json({ error: 'claim_creation_failed', message: err.message });
  }
});

// GET /api/claims/:id — Detail d un sinistre
router.get('/:id', async (req, res) => {
  try {
    const claim = await claimsService.getClaimById(req.params.id, req.user.id);
    if (!claim) return res.status(404).json({ error: 'claim_not_found' });
    res.json(claim);
  } catch (err) {
    console.error('GET /api/claims/:id error:', err.message);
    res.status(500).json({ error: 'claim_fetch_failed', message: err.message });
  }
});

// PATCH /api/claims/:id — Mettre a jour un sinistre
router.patch('/:id', async (req, res) => {
  try {
    const { status, description, amount, insurer_ref, closed_at } = req.body;
    const updated = await claimsService.updateClaim(req.params.id, req.user.id, {
      status, description, amount, insurer_ref, closed_at
    });
    if (!updated) return res.status(404).json({ error: 'claim_not_found' });
    res.json(updated);
  } catch (err) {
    console.error('PATCH /api/claims/:id error:', err.message);
    res.status(400).json({ error: 'claim_update_failed', message: err.message });
  }
});

// POST /api/claims/:id/ark-summary — Generer resume ARK
router.post('/:id/ark-summary', async (req, res) => {
  try {
    const summary = await claimsService.generateArkSummary(req.params.id, req.user.id);
    if (!summary) return res.status(404).json({ error: 'claim_not_found' });
    res.json({ summary });
  } catch (err) {
    console.error('POST /api/claims/:id/ark-summary error:', err.message);
    res.status(500).json({ error: 'ark_summary_failed', message: err.message });
  }
});

module.exports = router;
