function cleanString(value) {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

function normalizePhone(value) {
  const phone = cleanString(value);
  if (!phone) return null;
  return phone.replace(/[^0-9+]/g, '');
}

function parseDecimal(value) {
  if (value === undefined || value === null || value === '') return null;
  const asNumber = Number(String(value).replace(',', '.'));
  return Number.isFinite(asNumber) ? asNumber : null;
}

function parseDateISO(value) {
  const v = cleanString(value);
  if (!v) return null;
  const date = new Date(v);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function validateClient(mapped = {}) {
  const prenom = cleanString(mapped.prenom);
  const nom = cleanString(mapped.nom);
  const email = cleanString(mapped.email)?.toLowerCase() || null;
  const telephone = normalizePhone(mapped.telephone);

  const errors = [];
  if (!prenom && !nom && !email && !telephone) {
    errors.push('Aucun identifiant client exploitable (nom/prénom/email/téléphone).');
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: {
      prenom,
      nom,
      email,
      telephone,
      adresse: cleanString(mapped.adresse),
      code_postal: cleanString(mapped.code_postal),
      ville: cleanString(mapped.ville),
      type_client: cleanString(mapped.type_client),
      statut: cleanString(mapped.statut),
      notes: cleanString(mapped.notes),
      societe: cleanString(mapped.societe),
      siret: cleanString(mapped.siret),
    },
  };
}

function validateContract(mapped = {}) {
  const numero = cleanString(mapped.numero_contrat);
  const type_contrat = cleanString(mapped.type_contrat);
  const compagnie = cleanString(mapped.compagnie);
  const prime_annuelle = parseDecimal(mapped.prime_annuelle);
  const date_effet = parseDateISO(mapped.date_effet);
  const date_echeance = parseDateISO(mapped.date_echeance);
  const statut = cleanString(mapped.statut_contrat) || 'actif';

  const hasMaterial = !!(numero || type_contrat || compagnie || prime_annuelle || date_effet || date_echeance);

  return {
    valid: hasMaterial,
    normalized: {
      numero,
      type_contrat,
      compagnie,
      prime_annuelle,
      date_effet,
      date_echeance,
      statut,
    },
  };
}

function validateTask(mapped = {}) {
  const titre = cleanString(mapped.tache);
  const echeance = parseDateISO(mapped.date_rappel);
  const hasMaterial = !!(titre || echeance);

  return {
    valid: hasMaterial,
    normalized: {
      titre: titre || 'Relance portefeuille importé',
      echeance,
    },
  };
}

module.exports = {
  cleanString,
  normalizePhone,
  parseDecimal,
  parseDateISO,
  validateClient,
  validateContract,
  validateTask,
};
