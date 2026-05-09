const axios = require('axios');
const logger = require('../lib/logger');

function sanitizePhone(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/[\s.\-()]/g, '');
  cleaned = cleaned.replace(/^\+33\(0\)/, '+33');
  if (cleaned.startsWith('00')) cleaned = `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('0') && !cleaned.startsWith('+')) cleaned = `+33${cleaned.slice(1)}`;
  if (/^33[1-9]/.test(cleaned)) cleaned = `+${cleaned}`;
  if (!cleaned.startsWith('+')) cleaned = `+${cleaned}`;
  return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
}

function getSmsStatus() {
  const provider = String(process.env.SMS_PROVIDER || '').trim().toLowerCase();

  if (provider === 'twilio') {
    const missing = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM'].filter((key) => !process.env[key]);
    return {
      configured: missing.length === 0,
      status: missing.length === 0 ? 'configured' : 'configuration_required',
      provider: 'twilio',
      missing,
    };
  }

  if (provider === 'generic') {
    const missing = ['SMS_GATEWAY_URL', 'SMS_GATEWAY_TOKEN'].filter((key) => !process.env[key]);
    return {
      configured: missing.length === 0,
      status: missing.length === 0 ? 'configured' : 'configuration_required',
      provider: 'generic',
      missing,
    };
  }

  return {
    configured: false,
    status: 'configuration_required',
    provider: 'none',
    missing: ['SMS_PROVIDER', 'TWILIO_ACCOUNT_SID or SMS_GATEWAY_URL'],
  };
}

async function sendViaGeneric({ phone, message }) {
  const response = await axios.post(
    process.env.SMS_GATEWAY_URL,
    { to: phone, message },
    {
      headers: {
        Authorization: `Bearer ${process.env.SMS_GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );
  return { success: true, provider: 'generic', id: response.data?.id || response.data?.messageId || null };
}

async function sendViaTwilio({ phone, message }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const body = new URLSearchParams({
    To: phone,
    From: process.env.TWILIO_FROM,
    Body: message,
  });
  const response = await axios.post(url, body, {
    auth: {
      username: sid,
      password: process.env.TWILIO_AUTH_TOKEN,
    },
    timeout: 15000,
  });
  return { success: true, provider: 'twilio', id: response.data?.sid || null };
}

async function sendSMS({ to, message }) {
  const phone = sanitizePhone(to);
  if (!phone) {
    return { success: false, error: 'invalid_phone', provider: getSmsStatus().provider };
  }

  const text = String(message || '').trim();
  if (!text) {
    return { success: false, error: 'empty_message', provider: getSmsStatus().provider };
  }

  const status = getSmsStatus();
  if (!status.configured) {
    logger.warn({ payload: { provider: status.provider, missing: status.missing } }, 'SMS configuration required - send skipped');
    return {
      success: false,
      skipped: true,
      error: 'configuration_required',
      provider: status.provider,
      missing: status.missing,
      message: 'Configuration SMS requise.',
    };
  }

  try {
    if (status.provider === 'generic') return await sendViaGeneric({ phone, message: text });
    if (status.provider === 'twilio') return await sendViaTwilio({ phone, message: text });
    return { success: false, skipped: true, error: 'configuration_required', provider: status.provider };
  } catch (err) {
    logger.error({ err, payload: { provider: status.provider } }, 'SMS send failed');
    return { success: false, error: 'send_failed', provider: status.provider };
  }
}

async function sendBulkSMS(recipients = []) {
  const results = [];
  let sent = 0;
  let failed = 0;

  for (const item of recipients) {
    const result = await sendSMS({ to: item.to, message: item.message });
    results.push({ to: sanitizePhone(item.to), ...result });
    if (result.success) sent += 1;
    else failed += 1;
  }

  return { sent, failed, total: recipients.length, results };
}

async function checkQuota() {
  const status = getSmsStatus();
  return {
    success: status.configured,
    configured: status.configured,
    provider: status.provider,
    status: status.status,
    missing: status.missing,
  };
}

module.exports = {
  getSmsStatus,
  sendSMS,
  sendBulkSMS,
  checkQuota,
  sanitizePhone,
};
