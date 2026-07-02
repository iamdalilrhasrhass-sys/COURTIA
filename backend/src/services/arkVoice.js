// ============================================================
// /srv/courtia/backend/src/services/arkVoice.js
// KILLER FEATURE #6 — ARK Voice (Vapi.ai)
// Appels téléphoniques sortants pilotés IA :
// - Morning brief vocal au courtier
// - ARK appelle directement le client pour qualifier/relancer
// ============================================================

const axios = require('axios');
const pool = require('../db');
// arkBrief est optionnel (module jamais versionné) — dégradation propre si absent
let arkBrief = null;
try { arkBrief = require('./arkBrief'); } catch (_) { arkBrief = null; }

const VAPI_BASE = 'https://api.vapi.ai';
const VAPI_KEY = process.env.VAPI_API_KEY;
const VAPI_PHONE_ID = process.env.VAPI_PHONE_NUMBER_ID;
const PUBLIC_WEBHOOK_URL = process.env.PUBLIC_API_URL || 'https://api.courtiark.fr';

const vapi = axios.create({
  baseURL: VAPI_BASE,
  headers: { 'Authorization': `Bearer ${VAPI_KEY}`, 'Content-Type': 'application/json' }
});

// Assistant ARK pour brief matinal au courtier
function buildMorningBriefAssistant(briefPayload, courtier) {
  return {
    name: 'ARK Morning Brief',
    firstMessage: `Bonjour ${courtier.first_name || 'Dalil'}, c'est ARK. ${briefPayload.headline}`,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      systemPrompt: `Tu es ARK, l'assistant IA d'un courtier en assurance. Tu appelles le courtier le matin pour lui briefer sa journée.

CONTEXTE DU JOUR :
${briefPayload.summary}

ACTIONS RECOMMANDÉES :
${(briefPayload.actions || []).map((a, i) => `${i + 1}. [${a.priority === 1 ? 'CRITIQUE' : a.priority === 2 ? 'HAUTE' : 'NORMALE'}] ${a.action} — ${a.client_name} (${a.expected_value}€ potentiel, ${a.estimated_minutes}min)\n   Raison : ${a.reason}`).join('\n')}

POTENTIEL DU JOUR : ${briefPayload.revenue_potential}€

RÈGLES DE CONVERSATION :
- Tutoie le courtier, ton chaleureux et direct
- Présente les 3 actions les plus prioritaires d'abord
- Si le courtier dit "OK relance X" ou "appelle Y", propose de le faire toi-même
- Si le courtier veut plus de détails, donne-les
- Si le courtier dit "go" sur une action, dis "C'est noté, je m'en occupe"
- Ne dépasse pas 3 minutes — respecte son temps
- Ne lis pas une liste robotique, parle naturellement
- Si tu ne sais pas, dis-le honnêtement`,
      temperature: 0.5,
      maxTokens: 200
    },
    voice: { provider: '11labs', voiceId: 'EXAVITQu4vr4xnSDxMaL' },
    transcriber: { provider: 'deepgram', model: 'nova-2', language: 'fr' },
    endCallFunctionEnabled: true,
    serverUrl: `${PUBLIC_WEBHOOK_URL}/api/voice/webhook`,
    serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || 'courtia-default-secret'
  };
}

// Assistant ARK pour appeler un client
function buildClientCallAssistant(client, context, callType) {
  const objectives = {
    qualification: 'Qualifier le besoin du client : type assurance recherchée, situation actuelle, urgence',
    relance: 'Relancer sur le devis envoyé, comprendre les freins, proposer un RDV',
    rdv: 'Fixer un rendez-vous téléphonique ou physique avec le courtier',
    document: 'Demander un document manquant (carte grise, RIB, KBIS, relevé info, etc.)'
  };

  return {
    name: `ARK Client Call - ${callType}`,
    firstMessage: `Bonjour, je suis ARK, l'assistant de votre courtier ${context.courtier_name}. Je vous appelle au sujet de votre dossier assurance. Vous avez 2 minutes ?`,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      systemPrompt: `Tu es ARK, assistant IA d'un courtier en assurance français. Tu appelles un client réel pour son compte.

CLIENT : ${client.nom} ${client.prenom || ''}
TYPE : ${client.type}
PROFESSION : ${client.profession || 'n/a'}

CONTEXTE :
${context.opportunity ? `Devis envoyé : ${context.opportunity.produit} à ${context.opportunity.valeur_estimee}€` : ''}
${context.last_interaction ? `Dernière interaction : ${context.last_interaction}` : ''}
${context.missing_docs ? `Documents manquants : ${context.missing_docs.join(', ')}` : ''}

OBJECTIF DE L'APPEL : ${objectives[callType] || 'Prendre contact'}

RÈGLES STRICTES :
- Tu es poli, professionnel, jamais agressif
- Vouvoie le client TOUJOURS
- Si le client demande à parler à un humain, dis-lui que tu vas transférer le message au courtier qui le rappellera dans la journée
- Si le client refuse, raccroche poliment après remerciement
- Tu n'inventes JAMAIS de tarif, de garantie, ou de promesse — uniquement ce qui est dans le contexte
- Si le client veut un devis modifié, dis "Je transmets votre demande à votre courtier qui reviendra vers vous sous 24h"
- À la fin : récapitule ce qui a été convenu, demande confirmation
- Respecte le RGPD : si le client dit qu'il ne veut plus être contacté, valide et raccroche
- Appel max 4 minutes`,
      temperature: 0.4,
      maxTokens: 250
    },
    voice: { provider: '11labs', voiceId: 'EXAVITQu4vr4xnSDxMaL' },
    transcriber: { provider: 'deepgram', model: 'nova-2', language: 'fr' },
    endCallFunctionEnabled: true,
    serverUrl: `${PUBLIC_WEBHOOK_URL}/api/voice/webhook`,
    serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || 'courtia-default-secret'
  };
}

async function placeMorningBriefCall(userId) {
  const settings = await pool.query(`SELECT * FROM user_voice_settings WHERE user_id=$1`, [userId]);
  if (!settings.rows[0] || !settings.rows[0].morning_call_enabled) {
    return { success: false, reason: 'morning_call_disabled' };
  }
  const userPhone = settings.rows[0].phone_number;
  if (!userPhone) return { success: false, reason: 'no_phone_number' };

  // Vérifier budget quotidien
  const todayCost = await pool.query(`
    SELECT COALESCE(SUM(cost_eur), 0) total FROM voice_calls
    WHERE user_id=$1 AND DATE(created_at)=CURRENT_DATE
  `, [userId]);
  if (parseFloat(todayCost.rows[0].total) >= parseFloat(settings.rows[0].daily_budget_eur)) {
    return { success: false, reason: 'daily_budget_exceeded' };
  }

  const userResult = await pool.query(`SELECT id, first_name, last_name FROM users WHERE id=$1`, [userId]);
  if (!arkBrief) return { success: false, reason: 'brief_module_unavailable' };
  const brief = await arkBrief.generateMorningBrief(userId, pool);
  const assistant = buildMorningBriefAssistant(brief, userResult.rows[0]);

  const callResult = await vapi.post('/call/phone', {
    phoneNumberId: VAPI_PHONE_ID,
    customer: { number: userPhone },
    assistant
  });

  const insert = await pool.query(`
    INSERT INTO voice_calls (user_id, vapi_call_id, call_type, direction, status, phone_number)
    VALUES ($1, $2, 'morning_brief', 'outbound', 'queued', $3) RETURNING *
  `, [userId, callResult.data.id, userPhone]);

  return { success: true, call: insert.rows[0] };
}

async function placeClientCall(userId, clientId, callType, extraContext = {}) {
  const client = await pool.query(`SELECT * FROM clients WHERE id=$1 AND courtier_id=$2`, [clientId, userId]);
  if (!client.rows[0]) throw new Error('Client introuvable');
  if (!client.rows[0].phone) throw new Error('Pas de téléphone client');

  const courtier = await pool.query(`SELECT first_name, last_name FROM users WHERE id=$1`, [userId]);

  const opp = await pool.query(`
    SELECT product_current, estimated_revenue, status FROM opportunites
    WHERE client_id=$1 AND broker_id=$2 AND status NOT IN ('signe','perdu')
    ORDER BY estimated_revenue DESC LIMIT 1
  `, [clientId, userId]);

  const missing = await pool.query(`
    SELECT STRING_AGG(document_type, ',') docs FROM client_documents
    WHERE client_id=$1 AND status='manquant'
  `, [clientId]);

  const context = {
    courtier_name: `${courtier.rows[0]?.first_name || ''} ${courtier.rows[0]?.last_name || ''}`.trim() || 'votre courtier',
    opportunity: opp.rows[0] || null,
    missing_docs: missing.rows[0]?.docs ? missing.rows[0].docs.split(',') : [],
    ...extraContext
  };

  const assistant = buildClientCallAssistant(client.rows[0], context, callType);

  const callResult = await vapi.post('/call/phone', {
    phoneNumberId: VAPI_PHONE_ID,
    customer: { number: client.rows[0].phone, name: `${client.rows[0].last_name} ${client.rows[0].first_name || ''}` },
    assistant
  });

  const insert = await pool.query(`
    INSERT INTO voice_calls (user_id, client_id, vapi_call_id, call_type, direction, status, phone_number)
    VALUES ($1, $2, $3, $4, 'outbound', 'queued', $5) RETURNING *
  `, [userId, clientId, callResult.data.id, callType, client.rows[0].phone]);

  return insert.rows[0];
}

async function handleWebhook(payload) {
  const { message } = payload;
  if (!message?.call?.id) return;

  const vapiCallId = message.call.id;

  if (message.type === 'status-update') {
    await pool.query(`UPDATE voice_calls SET status=$1 WHERE vapi_call_id=$2`, [message.status, vapiCallId]);
  }

  if (message.type === 'end-of-call-report') {
    const transcript = message.transcript || '';
    const summary = message.summary || '';
    const duration = message.durationSeconds || 0;
    const cost = (duration / 60) * 0.09;

    // Extraction intent par IA
    let intent = null;
    let nextActions = null;
    if (transcript) {
      try {
        const OpenAI = require('openai');
        const ds = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: process.env.DEEPSEEK_API_KEY });
        const c = await ds.chat.completions.create({
          model: 'deepseek-chat',
          response_format: { type: 'json_object' },
          messages: [{
            role: 'user',
            content: `Analyse cette conversation d'appel client courtage assurance. Extrais en JSON :
{
  "intent_principal": "qualification|relance_devis|prise_rdv|demande_document|refus|autre",
  "client_engage": true|false,
  "outcome": "rdv_fixe|info_recoltee|documents_demandes|refus|a_rappeler|aucun",
  "rdv_date": "ISO ou null",
  "documents_demandes": ["liste"],
  "objections": ["liste"],
  "tone_client": "positif|neutre|hesitant|negatif",
  "next_actions": [{"action": "string", "deadline_jours": number, "priority": 1-5}]
}

CONVERSATION :
${transcript.slice(0, 6000)}`
          }]
        });
        const parsed = JSON.parse(c.choices[0].message.content);
        intent = parsed;
        nextActions = parsed.next_actions;
      } catch (e) {
        console.error('[voice/intent-extract]', e.message);
      }
    }

    await pool.query(`
      UPDATE voice_calls SET status='completed', transcript=$1, ai_summary=$2,
        duration_seconds=$3, cost_eur=$4, intent_extracted=$5, next_actions=$6,
        recording_url=$7, ended_at=NOW()
      WHERE vapi_call_id=$8
    `, [transcript, summary, duration, cost, intent, JSON.stringify(nextActions), message.recordingUrl, vapiCallId]);

    // Auto-création des prochaines actions sur fiche client
    if (nextActions && Array.isArray(nextActions)) {
      const call = await pool.query(`SELECT user_id, client_id FROM voice_calls WHERE vapi_call_id=$1`, [vapiCallId]);
      if (call.rows[0]?.client_id) {
        for (const action of nextActions.slice(0, 3)) {
          await pool.query(`
            INSERT INTO taches (user_id, client_id, titre, description, priority, due_date, source, created_at)
            VALUES ($1, $2, $3, 'Suggéré par ARK Voice', $4, NOW() + ($5 || ' days')::INTERVAL, 'ark_voice', NOW())
            ON CONFLICT DO NOTHING
          `, [call.rows[0].user_id, call.rows[0].client_id, action.action, action.priority || 3, action.deadline_jours || 1]).catch(() => {});
        }
      }
    }
  }
}

async function getCallHistory(userId, pool, { limit = 20 } = {}) {
  const r = await pool.query(`
    SELECT vc.*, c.last_name||' '||COALESCE(c.first_name,'') client_name
    FROM voice_calls vc
    LEFT JOIN clients c ON c.id=vc.client_id
    WHERE vc.user_id=$1 ORDER BY vc.created_at DESC LIMIT $2
  `, [userId, limit]);
  return r.rows;
}

async function updateVoiceSettings(userId, settings) {
  await pool.query(`
    INSERT INTO user_voice_settings (user_id, morning_call_enabled, morning_call_time, phone_number, daily_budget_eur, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      morning_call_enabled=$2, morning_call_time=$3, phone_number=$4, daily_budget_eur=$5, updated_at=NOW()
  `, [userId, settings.morning_call_enabled, settings.morning_call_time || '07:30:00', settings.phone_number, settings.daily_budget_eur || 5.00]);
}

async function getVoiceSettings(userId) {
  const r = await pool.query(`SELECT * FROM user_voice_settings WHERE user_id=$1`, [userId]);
  return r.rows[0] || { morning_call_enabled: false, morning_call_time: '07:30:00', daily_budget_eur: 5 };
}

module.exports = {
  placeMorningBriefCall, placeClientCall, handleWebhook,
  getCallHistory, updateVoiceSettings, getVoiceSettings
};
