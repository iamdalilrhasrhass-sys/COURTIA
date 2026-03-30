/**
 * AI Cost Manager - Option 4 Implementation
 * 
 * Gère:
 * - Routing intelligent Haiku/Opus
 * - Logging des coûts
 * - Quotas par courtier
 * - Alertes Telegram
 */

const Anthropic = require('@anthropic-ai/sdk').default;
const telegramService = require('./telegramService');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// ==================== CONFIGURATION ====================

const MODEL_COSTS = {
  'claude-3-5-haiku-20241022': {
    input: 0.80 / 1_000_000,  // $0.80 per 1M input
    output: 4.00 / 1_000_000  // $4.00 per 1M output
  },
  'claude-3-5-opus-20241022': {
    input: 20.00 / 1_000_000,  // $20 per 1M input
    output: 60.00 / 1_000_000  // $60 per 1M output
  }
};

const COMPLEX_KEYWORDS = [
  'analyser',
  'analyse',
  'stratégie',
  'prévoir',
  'prévision',
  'tendance',
  'recommandation',
  'optimiser',
  'complex',
  'détaillé',
  'approfondir',
  'synthèse',
  'rapport'
];

const PRICING_TIERS = {
  'Starter': { haiku_monthly: 50, opus_monthly: 0 },
  'Pro': { haiku_monthly: 200, opus_monthly: 20 },
  'Premium': { haiku_monthly: 999999, opus_monthly: 999999 }
};

// ==================== DETECT COMPLEX QUERY ====================

function isComplexQuery(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  return COMPLEX_KEYWORDS.some(keyword => lowerPrompt.includes(keyword));
}

// ==================== CALCULATE COST ====================

function calculateCost(modelUsed, inputTokens, outputTokens) {
  const costs = MODEL_COSTS[modelUsed];
  if (!costs) return 0;
  
  const inputCost = inputTokens * costs.input;
  const outputCost = outputTokens * costs.output;
  
  return inputCost + outputCost;
}

// ==================== LOG REQUEST ====================

async function logApiRequest(pool, userId, modelUsed, requestType, inputTokens, outputTokens, confidenceScore = 1.0, status = 'success') {
  try {
    const costUsd = calculateCost(modelUsed, inputTokens, outputTokens);
    
    const query = `
      INSERT INTO api_request_logs 
      (user_id, model_used, request_type, tokens_input, tokens_output, cost_usd, confidence_score, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    await pool.query(query, [
      userId,
      modelUsed,
      requestType,
      inputTokens,
      outputTokens,
      costUsd,
      confidenceScore,
      status
    ]);
    
    console.log(`[AI COST] User ${userId}: ${modelUsed} - $${costUsd.toFixed(4)}`);
  } catch (err) {
    console.error('Error logging API request:', err);
  }
}

// ==================== CHECK QUOTA ====================

async function checkAndUpdateQuota(pool, userId, modelType) {
  try {
    // Récupérer user et son tier
    const userResult = await pool.query(
      'SELECT pricing_tier, api_quota_remaining FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) return { allowed: false, reason: 'User not found' };
    
    const user = userResult.rows[0];
    const tier = PRICING_TIERS[user.pricing_tier] || PRICING_TIERS['Starter'];
    
    // Vérifier quota selon le type de modèle
    const quotaKey = modelType === 'opus' ? 'opus_monthly' : 'haiku_monthly';
    const monthlyQuota = tier[quotaKey];
    
    // Compter les requêtes du mois actuel
    const countQuery = `
      SELECT COUNT(*) as count, SUM(CASE WHEN model_used = 'claude-3-5-opus-20241022' THEN 1 ELSE 0 END) as opus_count
      FROM api_request_logs
      WHERE user_id = $1 
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
    `;
    
    const countResult = await pool.query(countQuery, [userId]);
    const usage = countResult.rows[0];
    const opusUsed = parseInt(usage.opus_count) || 0;
    const haikuUsed = parseInt(usage.count) - opusUsed;
    
    if (modelType === 'opus' && opusUsed >= monthlyQuota) {
      // Quota Opus dépassé
      return { allowed: false, reason: 'Opus quota exceeded', opusUsed, monthlyQuota };
    }
    
    if (modelType === 'haiku' && haikuUsed >= monthlyQuota) {
      // Quota Haiku dépassé
      return { allowed: false, reason: 'Haiku quota exceeded', haikuUsed, monthlyQuota };
    }
    
    // Vérifier si 80% du quota atteint
    const percentageUsed = modelType === 'opus' 
      ? (opusUsed / monthlyQuota * 100)
      : (haikuUsed / monthlyQuota * 100);
    
    if (percentageUsed >= 80) {
      await sendQuotaAlert(pool, userId, percentageUsed, modelType, tier);
    }
    
    return { allowed: true, haikuUsed, opusUsed, monthlyQuota };
  } catch (err) {
    console.error('Error checking quota:', err);
    return { allowed: true }; // Fallback: allow if error
  }
}

// ==================== SEND QUOTA ALERT ====================

async function sendQuotaAlert(pool, userId, percentage, modelType, tier) {
  try {
    // Vérifier si alerte déjà envoyée ce mois
    const alertQuery = `
      SELECT id FROM api_quota_alerts
      WHERE user_id = $1 
      AND alert_type = $2
      AND DATE_TRUNC('month', alert_sent_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
    `;
    
    const existingAlert = await pool.query(alertQuery, [userId, `${Math.floor(percentage)}percent`]);
    if (existingAlert.rows.length > 0) return; // Alerte déjà envoyée
    
    // Récupérer user pour obtenir Telegram ID
    const userQuery = 'SELECT telegram_user_id, first_name FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    const user = userResult.rows[0];
    
    if (!user || !user.telegram_user_id) return;
    
    // Envoyer alerte Telegram
    const message = `
⚠️ *Quota API atteint ${Math.floor(percentage)}%*

Courtier: ${user.first_name}
Modèle: ${modelType.toUpperCase()}
Quota mensuel: ${tier[modelType === 'opus' ? 'opus_monthly' : 'haiku_monthly']} requêtes

Upgrader votre plan pour continuer.
    `.trim();
    
    await telegramService.sendMessage(user.telegram_user_id, message);
    
    // Log l'alerte en base
    await pool.query(
      'INSERT INTO api_quota_alerts (user_id, alert_type) VALUES ($1, $2)',
      [userId, `${Math.floor(percentage)}percent`]
    );
    
    console.log(`[ALERT] Quota alert sent to user ${userId}`);
  } catch (err) {
    console.error('Error sending quota alert:', err);
  }
}

// ==================== MAIN: CALL WITH INTELLIGENT ROUTING ====================

async function callAiWithQuotaManagement(
  pool,
  userId,
  prompt,
  requestType = 'general',
  systemPrompt = null,
  fallbackToOpusOnFailure = true
) {
  try {
    // Déterminer si requête est complexe
    const isComplex = isComplexQuery(prompt);
    let model = isComplex ? 'claude-3-5-opus-20241022' : 'claude-3-5-haiku-20241022';
    
    // Vérifier quota
    const quotaCheck = await checkAndUpdateQuota(pool, userId, isComplex ? 'opus' : 'haiku');
    if (!quotaCheck.allowed) {
      return {
        success: false,
        error: `Quota ${model.includes('haiku') ? 'Haiku' : 'Opus'} dépassé. Upgrader votre plan.`,
        statusCode: 429
      };
    }
    
    // Appeler le modèle
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 2048,
      system: systemPrompt || 'Tu es un assistant spécialisé pour courtiers en assurance. Sois concis et professionnel.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    // Logger la requête
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    
    await logApiRequest(
      pool,
      userId,
      model,
      requestType,
      inputTokens,
      outputTokens,
      1.0,
      'success'
    );
    
    return {
      success: true,
      response: response.content[0].type === 'text' ? response.content[0].text : '',
      model: model,
      tokens: { input: inputTokens, output: outputTokens },
      cost: calculateCost(model, inputTokens, outputTokens)
    };
    
  } catch (err) {
    console.error('[AI ERROR]', err.message);
    
    // Si erreur sur Opus, essayer Haiku en fallback
    if (fallbackToOpusOnFailure && model === 'claude-3-5-opus-20241022') {
      console.log('[FALLBACK] Retrying with Haiku...');
      model = 'claude-3-5-haiku-20241022';
      
      try {
        const response = await anthropic.messages.create({
          model: model,
          max_tokens: 2048,
          system: systemPrompt || 'Tu es un assistant spécialisé pour courtiers en assurance. Sois concis et professionnel.',
          messages: [{ role: 'user', content: prompt }]
        });
        
        await logApiRequest(
          pool,
          userId,
          model,
          requestType,
          response.usage.input_tokens,
          response.usage.output_tokens,
          0.7, // Confidence réduite
          'fallback_used'
        );
        
        return {
          success: true,
          response: response.content[0].type === 'text' ? response.content[0].text : '',
          model: model,
          fallbackUsed: true,
          tokens: { input: response.usage.input_tokens, output: response.usage.output_tokens },
          cost: calculateCost(model, response.usage.input_tokens, response.usage.output_tokens)
        };
      } catch (fallbackErr) {
        return { success: false, error: 'Both models failed', statusCode: 500 };
      }
    }
    
    return { success: false, error: err.message, statusCode: 500 };
  }
}

// ==================== EXPORTS ====================

module.exports = {
  callAiWithQuotaManagement,
  checkAndUpdateQuota,
  calculateCost,
  isComplexQuery,
  logApiRequest,
  PRICING_TIERS,
  MODEL_COSTS
};
