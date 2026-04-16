/**
 * superAdminGuard.js
 * Middleware qui vérifie que l'utilisateur connecté est un super_admin.
 *
 * Utilisation :
 *   router.get('/route', verifyToken, superAdminGuard, handler)
 *
 * Fonctionne avec les deux formes de JWT en circulation :
 *   - authController → { id, email, role }
 *   - auth.js        → { userId, email }  (role absent = rejet 403)
 *
 * NB : pendant une impersonation, req.user conserve le rôle original
 *   du super_admin (impersonationContext.js ne l'écrase pas).
 */

function superAdminGuard(req, res, next) {
  const role = req.user?.role;

  if (role !== 'super_admin') {
    return res.status(403).json({
      error: 'Accès refusé',
      details: 'Cette route est réservée aux super administrateurs.',
    });
  }

  next();
}

module.exports = superAdminGuard;
