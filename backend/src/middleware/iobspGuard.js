/**
 * iobspGuard.js — Middleware de contrôle d'accès au module CAPITIA.
 *
 * Vérifie 3 conditions cumulatives (dans l'ordre) :
 *   1. Plan >= Pro   → 402 { error: 'plan_too_low', current_plan, required_plan }
 *   2. IOBSP validé  → 402 { error: 'iobsp_not_validated', state, iobsp_status }
 *   3. Add-on payé   → 402 { error: 'capitia_addon_inactive', requires_subscription, price }
 *
 * Codes 402 distincts pour que le frontend affiche le paywall adapté :
 *   plan_too_low          → PaywallModal "Upgrade Pro"
 *   iobsp_not_validated   → IobspStatusModal (pending / rejected / not_submitted)
 *   capitia_addon_inactive → CapitiaAddonModal "Activer CAPITIA pour 49€/mois"
 *
 * Super admin : bypass immédiat, tous les contrôles sautés.
 *
 * Usage :
 *   router.get('/simulateur', iobspGuard, handler)
 */

const { checkCapitiaAccess } = require('../services/iobspService');

async function iobspGuard(req, res, next) {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    const access = await checkCapitiaAccess(userId);

    if (access.allowed) {
      // Attacher le contexte CAPITIA pour usage éventuel dans le handler
      req.capitia = { active: true, bypass: access.bypass || null };
      return next();
    }

    // Mapper reason → message lisible
    const MESSAGES = {
      plan_too_low:          'Le module CAPITIA est disponible à partir du plan Pro.',
      iobsp_not_validated:   'Votre attestation IOBSP doit être validée pour accéder à CAPITIA.',
      capitia_addon_inactive:'Activez le module CAPITIA pour accéder à cette fonctionnalité.',
    };

    return res.status(402).json({
      error:   access.reason,
      message: MESSAGES[access.reason] || 'Accès au module CAPITIA non autorisé.',
      ...access.details,
    });

  } catch (err) {
    console.error('[iobspGuard] Erreur:', err.message);
    // Fail open en cas d'erreur technique (éviter de bloquer un vrai abonné)
    next();
  }
}

module.exports = iobspGuard;
