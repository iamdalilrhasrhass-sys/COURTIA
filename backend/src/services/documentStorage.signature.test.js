/**
 * SEC-012 — signedUrl() signait avec un secret de repli prévisible
 * ('dev-secret') quand JWT_SECRET était absent : n'importe qui pouvait forger un
 * lien de téléchargement de document. Le helper central refuse en production.
 */

const documentStorage = require('./documentStorage');

describe('documentStorage.signedUrl — aucun secret de repli prévisible', () => {
  const envInitial = { ...process.env };

  afterEach(() => {
    process.env = { ...envInitial };
  });

  it('refuse de signer en production sans JWT_SECRET', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    expect(() => documentStorage.signedUrl('clients/1/rib.pdf')).toThrow(/JWT secret missing/);
  });

  it('n\'utilise pas le repli historique \'dev-secret\' hors production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;

    const url = documentStorage.signedUrl('clients/1/rib.pdf');
    const token = new URL(url, 'http://localhost').searchParams.get('token');

    const crypto = require('crypto');
    const path = 'clients/1/rib.pdf';
    // Le token contient l'horodatage : on rejoue la signature avec l'ancien repli
    // et on vérifie qu'elle ne correspond PAS.
    const expires = Number(new URL(url, 'http://localhost').searchParams.get('expires'));
    const secondes = Math.floor(expires / 1000);
    const signatureAncienne = crypto
      .createHmac('sha256', 'dev-secret')
      .update(`${path}:${secondes}`)
      .digest('hex')
      .slice(0, 32);

    expect(token).toHaveLength(32);
    expect(token).not.toBe(signatureAncienne);
  });
});
