function buildBillingTemplate(kind, vars = {}) {
  const firstName = vars.firstName || 'Bonjour';
  const planName = vars.planName || 'COURTIA';
  const trialDays = vars.trialDays ?? 0;
  const trialEndDate = vars.trialEndDate || '';

  const map = {
    trial_activated_j0: {
      subject: trialDays > 0 ? `COURTIA — Essai ${planName} activé` : `COURTIA — Abonnement ${planName} activé`,
      html: `
        <p>${firstName},</p>
        <p>${trialDays > 0 ? `Votre essai ${planName} est activé.` : `Votre abonnement ${planName} est activé.`}</p>
        <p>0 € aujourd'hui.${trialDays > 0 ? ` Essai de ${trialDays} jours. Annulation en ligne possible avant la fin d'essai.` : ' Sans engagement, annulation en ligne à tout moment.'}</p>
      `,
      text: `${firstName}, ${trialDays > 0 ? `votre essai ${planName} est activé` : `votre abonnement ${planName} est activé`}. 0 € aujourd'hui.${trialDays > 0 ? ` Essai ${trialDays} jours. Annulation en ligne.` : ' Sans engagement.'}`,
    },
    trial_reminder_j5: {
      subject: `COURTIA — Rappel fin d’essai`,
      html: `
        <p>${firstName},</p>
        <p>Votre essai ${planName} arrive bientôt à échéance.</p>
        <p>Fin estimée: ${trialEndDate || 'prochainement'}.</p>
      `,
      text: `${firstName}, rappel fin d’essai ${planName}. Fin estimée: ${trialEndDate || 'prochainement'}.`,
    },
    subscription_started_j7: {
      subject: `COURTIA — Abonnement ${planName} démarré`,
      html: `
        <p>${firstName},</p>
        <p>Votre abonnement ${planName} est actif.</p>
      `,
      text: `${firstName}, votre abonnement ${planName} est actif.`,
    },
    trial_canceled: {
      subject: `COURTIA — Essai annulé`,
      html: `<p>${firstName}, votre essai a bien été annulé.</p>`,
      text: `${firstName}, votre essai a bien été annulé.`,
    },
    payment_failed: {
      subject: `COURTIA — Paiement à mettre à jour`,
      html: `<p>${firstName}, un paiement n’a pas pu être traité. Merci de mettre à jour votre moyen de paiement.</p>`,
      text: `${firstName}, un paiement n’a pas pu être traité. Merci de mettre à jour votre moyen de paiement.`,
    },
    invoice_paid: {
      subject: `COURTIA — Facture réglée`,
      html: `<p>${firstName}, votre facture a bien été réglée.</p>`,
      text: `${firstName}, votre facture a bien été réglée.`,
    },
    premium_contact_received: {
      subject: `COURTIA — Demande Premium reçue`,
      html: `<p>${firstName}, nous avons bien reçu votre demande Premium.</p>`,
      text: `${firstName}, nous avons bien reçu votre demande Premium.`,
    },
    legal_acceptance_recorded: {
      subject: `COURTIA — Consentements enregistrés`,
      html: `<p>${firstName}, vos consentements contractuels ont été enregistrés.</p>`,
      text: `${firstName}, vos consentements contractuels ont été enregistrés.`,
    },
  };

  return map[kind] || {
    subject: 'COURTIA',
    html: '<p>Notification COURTIA.</p>',
    text: 'Notification COURTIA.',
  };
}

module.exports = { buildBillingTemplate };
