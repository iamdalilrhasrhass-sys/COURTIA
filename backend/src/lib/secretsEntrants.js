/**
 * secretsEntrants.js — LA SEULE FAÇON DE VÉRIFIER UN SECRET DE POINT D'ENTRÉE.
 *
 * POURQUOI CE MODULE (défauts P2/P3 mesurés en production le 20/09/2026)
 * Trois points d'entrée publics acceptaient n'importe quel appelant :
 *   * POST /api/messaging/webhook/inbound      → 200 ET message enregistré,
 *                                                 sans aucune authentification ;
 *   * GET  /api/whatsapp/webhook               → renvoyait le challenge avec un
 *                                                 jeton de vérification ÉCRIT EN
 *                                                 DUR ('courtia_whatsapp_verify'),
 *                                                 donc public dans le dépôt ;
 *   * POST /api/webhooks/incoming              → 200 ET trois lignes réellement
 *                                                 insérées sans secret.
 * Et un quatrième n'était même pas atteignable : la route du webhook de
 * téléphonie était masquée par un `verifyToken` monté plus tôt (401 constant),
 * tandis que le secret transmis à Vapi avait une valeur par défaut en dur
 * ('courtia-default-secret').
 *
 * LA RÈGLE, ÉCRITE UNE SEULE FOIS — et appliquée à l'identique par les quatre
 * routes : un secret NON CONFIGURÉ n'autorise RIEN. La route répond 503
 * « secret_non_configure » (le service n'est pas prêt, ce n'est pas la faute de
 * l'appelant) et n'écrit pas une ligne. Un secret configuré mais absent ou faux
 * sur la requête répond 401/403. Il n'existe AUCUNE valeur par défaut : un
 * secret par défaut est un secret public, donc pas un secret.
 *
 * POURQUOI pas de « protection optionnelle » : le défaut mesuré venait
 * exactement de là — `if (secret && secret !== attendu) refuser` laissait passer
 * tout le monde quand la variable d'environnement manquait, c'est-à-dire dans
 * la configuration par défaut.
 *
 * COMPARAISON : `timingSafeEqual` sur des tampons de même longueur. Comparer
 * deux secrets avec `===` laisse fuir, par le temps de réponse, le nombre de
 * caractères corrects du préfixe.
 */

const crypto = require('crypto');

/**
 * Noms de variables d'environnement acceptés par point d'entrée, dans l'ordre de
 * priorité. Plusieurs noms pour la même valeur quand le produit en a déjà
 * utilisé deux (WhatsApp) : la configuration existante continue de fonctionner.
 */
const SECRETS = Object.freeze({
  /** Webhook de téléphonie (Vapi → ARK Voice). */
  voix: Object.freeze(['VAPI_WEBHOOK_SECRET']),
  /** Webhook entrant de messagerie (e-mails/SMS fournisseurs). */
  messagerie: Object.freeze(['MESSAGING_INBOUND_SECRET', 'WEBHOOK_INBOUND_SECRET']),
  /** Webhook générique Make/Zapier (/api/webhooks/incoming). */
  webhookEntrant: Object.freeze(['WEBHOOK_INCOMING_SECRET']),
  /** Jeton de vérification de l'abonnement Meta (GET /api/whatsapp/webhook). */
  whatsappVerification: Object.freeze(['WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'WHATSAPP_VERIFY_TOKEN']),
  /** Secret d'application Meta (signature x-hub-signature-256). */
  whatsappSignature: Object.freeze(['WHATSAPP_APP_SECRET']),
});

/** Valeurs refusées même si elles sont configurées : ce sont des gabarits publics. */
const VALEURS_INTERDITES = Object.freeze([
  'courtia-default-secret',
  'courtia_whatsapp_verify',
  'changeme',
  'change-me',
  'secret',
  'test',
]);

/**
 * Lit un secret réellement configuré.
 * @param {string[]} noms variables d'environnement candidates
 * @returns {string|null} la valeur, ou `null` si elle est absente/vide/gabarit
 */
function lireSecret(noms) {
  for (const nom of noms) {
    const valeur = String(process.env[nom] || '').trim();
    if (!valeur) continue;
    if (VALEURS_INTERDITES.includes(valeur.toLowerCase())) continue;
    return valeur;
  }
  return null;
}

/** Le secret est-il configuré ? (aucune valeur n'est exposée) */
function secretConfigure(noms) {
  return lireSecret(noms) !== null;
}

/**
 * Réponse unique quand le secret n'est pas configuré : 503 explicite.
 * POURQUOI 503 et pas 401 : ce n'est pas l'appelant qui a échoué, c'est le
 * service qui n'est pas prêt. Le message le dit pour que l'exploitant sache
 * quoi configurer, sans jamais nommer la valeur.
 */
function repondreSecretAbsent(res, code, message) {
  return res.status(503).json({
    error: 'secret_non_configure',
    code,
    message: message || `Ce point d'entrée est fermé : le secret « ${code} » n'est pas configuré sur ce serveur.`,
  });
}

/** Comparaison à durée constante (les tampons de longueurs différentes échouent). */
function egalConstant(a, b) {
  const ta = Buffer.from(String(a), 'utf8');
  const tb = Buffer.from(String(b), 'utf8');
  if (ta.length !== tb.length) return false;
  return crypto.timingSafeEqual(ta, tb);
}

/**
 * Vérifie un secret transmis tel quel dans un en-tête (pas de HMAC).
 * @returns {{configure: boolean, valide: boolean}}
 */
function verifierSecretSimple({ secret, fourni }) {
  if (!secret) return { configure: false, valide: false };
  return { configure: true, valide: egalConstant(fourni || '', secret) };
}

/** Signature HMAC-SHA256 au format Meta/Stripe : « sha256=<hexadécimal> ». */
function signerHmac(secret, corps) {
  const tampon = Buffer.isBuffer(corps) ? corps : Buffer.from(String(corps || ''), 'utf8');
  return `sha256=${crypto.createHmac('sha256', String(secret)).update(tampon).digest('hex')}`;
}

/**
 * Vérifie une signature HMAC-SHA256.
 *
 * POURQUOI `rawBody` OBLIGATOIRE : la signature porte sur les OCTETS reçus.
 * `JSON.stringify(req.body)` réordonne/normalise (espaces, ordre des clés,
 * échappement des accents) : il produit une signature valide pour un corps
 * RÉÉCRIT, ce qui permet à un attaquant qui ne connaît pas le secret de faire
 * accepter sa propre mise en forme. La mesure de production a montré
 * exactement ce code (`JSON.stringify(body)`) dans whatsappMetaService.
 *
 * @param {{rawBody: Buffer|string, enteteSignature: string, secret: string}} params
 * @returns {{configure: boolean, valide: boolean, raison?: string}}
 */
function verifierSignatureHmac({ rawBody, enteteSignature, secret }) {
  if (!secret) return { configure: false, valide: false, raison: 'secret_absent' };
  if (!rawBody || (Buffer.isBuffer(rawBody) && rawBody.length === 0)) {
    return { configure: true, valide: false, raison: 'corps_brut_absent' };
  }
  const recue = String(enteteSignature || '').trim();
  if (!recue) return { configure: true, valide: false, raison: 'signature_absente' };
  const attendue = signerHmac(secret, rawBody);
  return { configure: true, valide: egalConstant(recue, attendue), raison: 'signature' };
}

module.exports = {
  SECRETS,
  VALEURS_INTERDITES,
  lireSecret,
  secretConfigure,
  repondreSecretAbsent,
  egalConstant,
  signerHmac,
  verifierSecretSimple,
  verifierSignatureHmac,
};
