const fs = require('fs');
const path = require('path');

/**
 * Garde-fou : les envois COMMERCIAUX doivent passer par sendCommercialEmail.
 *
 * Mesuré le 19/09/2026 : le garde-fou « pas d'envoi sans adresse de réponse »
 * (sendCommercialEmail) n'avait AUCUN appelant en production — six chemins
 * d'envoi réels appelaient sendEmail directement et contournaient le contrôle.
 * Ce test lit la source pour qu'une régression soit impossible à introduire
 * sans casser la CI.
 *
 * Un envoi commercial = un message qu'un prospect ou un client peut vouloir
 * lire ET auquel il doit pouvoir répondre : prospection, relances, devis,
 * messagerie client.
 */

const RACINE = path.join(__dirname, '..');
const APPELS_COMMERCIAUX = [
  'services/reachSequenceWorker.js',
  'workers/reachWorker.js',
  'jobs/relanceScheduler.js',
  'services/devisRelanceService.js',
  'services/messagingService.js',
  'routes/relances.js',
];

describe('envois e-mail commerciaux', () => {
  for (const fichier of APPELS_COMMERCIAUX) {
    it(`${fichier} passe par sendCommercialEmail`, () => {
      const source = fs.readFileSync(path.join(RACINE, fichier), 'utf8');
      expect(source).toMatch(/sendCommercialEmail/);
      // Aucun appel direct à sendEmail( dans ces fichiers : le garde-fou serait
      // contourné.
      expect(source).not.toMatch(/(?<![A-Za-z])sendEmail\(/);
    });
  }

  it('la route d’envoi de devis ne marque pas « envoyé » sans envoi réel', () => {
    const source = fs.readFileSync(path.join(RACINE, 'routes/devis.js'), 'utf8');
    expect(source).toMatch(/sendCommercialEmail/);
    // Le statut ne doit être écrit qu'après un envoi confirmé.
    expect(source).toMatch(/email_not_sent/);
    expect(source).not.toMatch(/await sendEmail\(\{ to: email, subject, html \}\)/);
  });

  it('sendBillingEmail laisse sendEmail poser le reply_to par défaut', () => {
    const source = fs.readFileSync(path.join(RACINE, 'services/emailService.js'), 'utf8');
    // sendEmail applique getReplyTo() quand aucun replyTo n'est fourni.
    expect(source).toMatch(/replyTo !== undefined \? String\(replyTo\)\.trim\(\) : getReplyTo\(\)/);
    expect(source).toMatch(/sendBillingEmail/);
  });
});
