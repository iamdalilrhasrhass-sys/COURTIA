/**
 * accessTemplates.js — e-mail « Votre espace COURTIA est prêt. »
 *
 * RÈGLE MÉTIER (décision du 20/09/2026) : un cabinet mis en essai reçoit ses
 * identifiants directement (identifiant = e-mail, mot de passe initial = nom du
 * cabinet). Cet e-mail les lui présente et pointe vers la connexion.
 *
 * CONTRAINTES TENUES ICI
 *  - identité visuelle PREMIUM COURTIA : Aurora Dark bleu-noir/violet, CTA
 *    violet→magenta, le VRAI logo officiel (https://courtiark.fr/icon-192.png,
 *    l'icône servie par le produit lui-même), signature « L'équipe COURTIA » ;
 *  - le bouton pointe RÉELLEMENT vers https://courtiark.fr/login (aucune URL de
 *    suivi, aucun redirecteur) ;
 *  - HTML d'e-mail « vieille école » : tables, styles EN LIGNE, aucune police
 *    distante, aucune image autre que le logo servi par COURTIA — les clients de
 *    messagerie n'exécutent pas de CSS externe ni de JavaScript ;
 *  - version texte systématique (certains cabinets lisent en texte seul).
 */

const LOGIN_URL = 'https://courtiark.fr/login';
const LOGO_URL = 'https://courtiark.fr/icon-192.png';

// Palette officielle COURTIA (Aurora Dark) — reprise de l'interface.
const COULEURS = {
  fond: '#04050f',
  carte: '#0a0b1a',
  carteHaute: '#111228',
  bordure: '#2a2350',
  violet: '#7c3aed',
  magenta: '#d946ef',
  cyan: '#22d3ee',
  texte: '#eef2ff',
  texteDoux: '#a5a7c4',
};

function echapper(valeur) {
  return String(valeur == null ? '' : valeur)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Date ET heure de fin, à l'heure de Paris.
 *
 * POURQUOI LE FUSEAU EST ÉCRIT DANS LE GABARIT : un essai qui se termine à
 * « 02/10/2026 17:00 Europe/Paris » est un instant absolu. L'écrire sans heure
 * (« jusqu'au 2 octobre 2026 ») fait perdre au cabinet la moitié de
 * l'information, et le rendre dans le fuseau du poste de l'expéditeur produit
 * une heure fausse pour un lecteur situé ailleurs. On fige donc la règle :
 * heure de Paris, explicitement annoncée.
 */
function dateHeureLisible(valeur) {
  if (!valeur) return '';
  const d = new Date(valeur);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
  });
  const heure = d.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris',
  });
  return `${date} à ${heure}`;
}

/**
 * Construit l'e-mail d'accès.
 * @param {object} p
 * @param {string} p.email          identifiant de connexion
 * @param {string} p.motDePasse     mot de passe initial (temporaire)
 * @param {string} [p.cabinet]      nom du cabinet
 * @param {string} [p.contact]      prénom du destinataire
 * @param {number} [p.joursEssai]   durée de l'essai (7 par défaut)
 * @param {string} [p.finEssai]     date de fin d'essai (ISO)
 * @returns {{subject: string, html: string, text: string}}
 */
function buildAccessTemplate({
  email,
  motDePasse,
  cabinet,
  contact,
  joursEssai = 7,
  finEssai = null,
} = {}) {
  const emailSur = echapper(email);
  const motDePasseSur = echapper(motDePasse);
  const cabinetSur = echapper(cabinet || '');
  const contactSur = echapper((contact || '').trim() || 'Bonjour');
  const jours = Number(joursEssai) > 0 ? Math.trunc(Number(joursEssai)) : 7;
  const finPrecise = dateHeureLisible(finEssai);
  // Phrase d'essai : quand la fin est connue à l'instant près, c'est ELLE qui
  // fait foi (« jusqu'au vendredi 2 octobre 2026 à 17:00 »), et aucun nombre de
  // jours n'est annoncé — un compte à rebours arrondi dirait tantôt 7, tantôt 8.
  const phraseEssai = finPrecise
    ? `Votre essai gratuit COURTIA est en cours jusqu'au ${echapper(finPrecise)} (heure de Paris).`
    : `Votre essai gratuit COURTIA de ${jours} jours est en cours.`;
  const phraseEssaiTexte = phraseEssai;

  const subject = 'COURTIA — Votre espace est prêt';

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${echapper(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COULEURS.fond};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Votre espace COURTIA est prêt : vos identifiants et le lien de connexion.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COULEURS.fond};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${COULEURS.carte};border:1px solid ${COULEURS.bordure};border-radius:18px;overflow:hidden;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

          <!-- Bandeau Aurora : dégradé violet → magenta → cyan -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background:linear-gradient(90deg,${COULEURS.violet} 0%,${COULEURS.magenta} 52%,${COULEURS.cyan} 100%);">&nbsp;</td>
          </tr>

          <!-- En-tête : vrai logo COURTIA + signature de marque -->
          <tr>
            <td style="padding:30px 34px 10px 34px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:14px;" valign="middle">
                    <img src="${LOGO_URL}" width="52" height="52" alt="COURTIA" style="display:block;width:52px;height:52px;border-radius:14px;border:0;outline:none;text-decoration:none;">
                  </td>
                  <td valign="middle">
                    <div style="font-size:20px;font-weight:700;letter-spacing:2.4px;color:${COULEURS.texte};">COURTIA</div>
                    <div style="font-size:11px;letter-spacing:0.6px;color:${COULEURS.texteDoux};margin-top:2px;">Le cockpit IA des courtiers d'assurance</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Titre -->
          <tr>
            <td style="padding:18px 34px 0 34px;">
              <h1 style="margin:0;font-size:24px;line-height:32px;font-weight:700;color:${COULEURS.texte};">Votre espace COURTIA est prêt.</h1>
              <p style="margin:12px 0 0 0;font-size:14px;line-height:22px;color:${COULEURS.texteDoux};">
                ${contactSur}${cabinetSur ? ` — ${cabinetSur}` : ''}, votre accès est actif : vous pouvez vous connecter dès maintenant avec les identifiants ci-dessous.
              </p>
            </td>
          </tr>

          <!-- Identifiants -->
          <tr>
            <td style="padding:22px 34px 0 34px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COULEURS.carteHaute};border:1px solid ${COULEURS.bordure};border-radius:14px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <div style="font-size:11px;letter-spacing:1.4px;color:${COULEURS.texteDoux};">IDENTIFIANT</div>
                    <div style="margin-top:6px;font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:700;color:${COULEURS.texte};word-break:break-all;">${emailSur}</div>

                    <div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>

                    <div style="font-size:11px;letter-spacing:1.4px;color:${COULEURS.texteDoux};">MOT DE PASSE TEMPORAIRE</div>
                    <div style="margin-top:6px;font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:700;color:${COULEURS.texte};word-break:break-all;">${motDePasseSur}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA : le bouton pointe réellement vers la connexion COURTIA -->
          <tr>
            <td align="center" style="padding:26px 34px 6px 34px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${COULEURS.violet}" style="border-radius:12px;background:linear-gradient(90deg,${COULEURS.violet} 0%,${COULEURS.magenta} 100%);">
                    <a href="${LOGIN_URL}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:1.1px;color:#ffffff;text-decoration:none;border-radius:12px;">ACCÉDER À COURTIA</a>
                  </td>
                </tr>
              </table>
              <div style="margin-top:14px;font-size:12px;line-height:20px;color:${COULEURS.texteDoux};">
                Connexion : <a href="${LOGIN_URL}" style="color:${COULEURS.cyan};text-decoration:none;">${LOGIN_URL}</a>
              </div>
            </td>
          </tr>

          <!-- Sécurité -->
          <tr>
            <td style="padding:22px 34px 0 34px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(124,58,237,0.10);border:1px solid ${COULEURS.bordure};border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;font-size:13px;line-height:21px;color:${COULEURS.texte};">
                    Vous pourrez modifier votre mot de passe à tout moment depuis <strong>Paramètres &gt; Sécurité</strong> dans votre espace COURTIA.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Essai -->
          <tr>
            <td style="padding:20px 34px 0 34px;">
              <p style="margin:0;font-size:13px;line-height:21px;color:${COULEURS.texteDoux};">
                ${phraseEssai}
                Aucun paiement n'est demandé pendant l'essai ; vos données restent conservées à son issue.
              </p>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding:26px 34px 30px 34px;">
              <div style="height:1px;line-height:1px;font-size:0;background:${COULEURS.bordure};">&nbsp;</div>
              <div style="margin-top:18px;font-size:14px;color:${COULEURS.texte};">L'équipe COURTIA</div>
              <div style="margin-top:6px;font-size:12px;line-height:19px;color:${COULEURS.texteDoux};">
                Répondre à cet e-mail : arkcourtia@gmail.com<br>
                © 2026 COURTIA
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    'Votre espace COURTIA est prêt.',
    '',
    cabinetSur ? `Cabinet : ${cabinetSur}` : null,
    '',
    "IDENTIFIANT",
    String(email || ''),
    '',
    'MOT DE PASSE TEMPORAIRE',
    String(motDePasse || ''),
    '',
    'CONNEXION',
    LOGIN_URL,
    '',
    'Vous pourrez modifier votre mot de passe à tout moment depuis Paramètres > Sécurité dans votre espace COURTIA.',
    '',
    phraseEssaiTexte,
    '',
    "L'équipe COURTIA",
    'arkcourtia@gmail.com',
  ].filter((l) => l !== null).join('\n');

  return { subject, html, text };
}

module.exports = { buildAccessTemplate, LOGIN_URL, LOGO_URL, COULEURS };
