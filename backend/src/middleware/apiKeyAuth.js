/**
 * API Key Authentication Middleware — LOT 23
 * Authentification des requêtes via clé API publique
 */

const apiKeyService = require('../services/apiKeyService');
const logger = require('../lib/logger');

/**
 * Middleware d'authentification par clé API
 * Vérifie header: Authorization: Bearer sk-ark-XXXX
 */
function apiKeyAuth(requiredScopes = []) {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      // Extraire la clé du header Authorization
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Missing or invalid Authorization header. Use: Bearer sk-ark-XXXX'
        });
      }
      
      const apiKey = authHeader.replace('Bearer ', '').trim();
      
      // Valider la clé
      const validation = await apiKeyService.validateApiKey(apiKey);
      
      if (!validation.valid) {
        return res.status(401).json({
          error: 'invalid_api_key',
          message: validation.error === 'invalid_format' 
            ? 'Invalid API key format' 
            : 'API key not found, expired, or revoked'
        });
      }
      
      // Vérifier les scopes requis
      if (requiredScopes.length > 0) {
        const keyScopes = validation.apiKey.scopes || [];
        const hasAllScopes = requiredScopes.every(scope => keyScopes.includes(scope));
        
        if (!hasAllScopes) {
          return res.status(403).json({
            error: 'insufficient_scope',
            message: `This endpoint requires scopes: ${requiredScopes.join(', ')}`,
            your_scopes: keyScopes
          });
        }
      }
      
      // Vérifier le rate limit
      const rateLimit = await apiKeyService.checkRateLimit(validation.apiKey.id);
      
      // Ajouter les headers rate limit
      res.setHeader('X-RateLimit-Limit', rateLimit.limit);
      res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimit.resetAt.toISOString());
      
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: 'rate_limit_exceeded',
          message: `Rate limit exceeded. ${rateLimit.limit} requests per hour allowed.`,
          reset_at: rateLimit.resetAt.toISOString()
        });
      }
      
      // Attacher user et apiKey à la requête
      req.user = validation.user;
      req.apiKey = validation.apiKey;
      
      // Logger l'usage après la réponse
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        apiKeyService.logUsage(validation.apiKey.id, {
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: res.statusCode,
          responseTimeMs: responseTime,
          ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
          userAgent: req.headers['user-agent']
        }).catch(err => logger.error('Failed to log API usage:', err));
      });
      
      next();
    } catch (error) {
      logger.error('API Key Auth Error:', error);
      return res.status(500).json({
        error: 'internal_error',
        message: 'An error occurred during authentication'
      });
    }
  };
}

/**
 * Middleware pour vérifier un scope spécifique
 */
function requireScope(scope) {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'API key authentication required'
      });
    }
    
    const keyScopes = req.apiKey.scopes || [];
    if (!keyScopes.includes(scope)) {
      return res.status(403).json({
        error: 'insufficient_scope',
        message: `This endpoint requires scope: ${scope}`,
        your_scopes: keyScopes
      });
    }
    
    next();
  };
}

module.exports = {
  apiKeyAuth,
  requireScope
};
