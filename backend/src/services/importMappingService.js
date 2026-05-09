const FIELD_SYNONYMS = {
  prenom: ['prenom', 'prénom', 'firstname', 'first_name', 'given_name'],
  nom: ['nom', 'lastname', 'last_name', 'surname', 'family_name'],
  email: ['email', 'e-mail', 'mail', 'courriel', 'adresse_email'],
  telephone: ['telephone', 'téléphone', 'phone', 'mobile', 'portable', 'gsm', 'tel'],
  adresse: ['adresse', 'address', 'adresse_postale', 'rue', 'voie'],
  code_postal: ['code_postal', 'code postal', 'postal', 'zip', 'cp'],
  ville: ['ville', 'city', 'commune'],
  type_client: ['type_client', 'type client', 'segment', 'categorie_client'],
  statut: ['statut', 'statut client', 'status client', 'client_status'],
  notes: ['notes', 'note', 'commentaire', 'commentaires', 'observations'],
  societe: ['societe', 'société', 'entreprise', 'company', 'cabinet'],
  siret: ['siret', 'siren_siret', 'numero_siret'],
  type_contrat: ['type_contrat', 'type contrat', 'contrat', 'produit', 'garantie'],
  compagnie: ['compagnie', 'assureur', 'insurance_company'],
  numero_contrat: ['numero_contrat', 'num_contrat', 'numero contrat', 'contract_number', 'police'],
  prime_annuelle: ['prime_annuelle', 'prime annuelle', 'cotisation_annuelle', 'annual_premium'],
  date_effet: ['date_effet', 'date effet', 'effective_date', 'date_debut'],
  date_echeance: ['date_echeance', 'date échéance', 'date echeance', 'renewal_date', 'date_fin'],
  statut_contrat: ['statut_contrat', 'statut contrat', 'contract_status', 'status'],
  tache: ['tache', 'tâche', 'task', 'todo', 'action'],
  date_rappel: ['date_rappel', 'date rappel', 'rappel', 'due_date', 'echeance_tache'],
};

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function suggestMapping(headers = []) {
  const normalizedHeaders = headers.map((h) => ({
    raw: h,
    normalized: normalizeHeader(h),
  }));

  const mapping = {};
  for (const [field, variants] of Object.entries(FIELD_SYNONYMS)) {
    const normalizedVariants = variants.map(normalizeHeader);
    const exactHit = normalizedHeaders.find((h) => normalizedVariants.includes(h.normalized));
    const hit = exactHit || normalizedHeaders.find((h) =>
      normalizedVariants.some((variant) => {
        if (!variant || variant.length < 3) return false;
        return h.normalized.split('_').includes(variant) || h.normalized.startsWith(`${variant}_`) || h.normalized.endsWith(`_${variant}`);
      })
    );
    if (hit) mapping[field] = hit.raw;
  }
  return mapping;
}

function resolveHeaderIndex(headers = [], headerName) {
  return headers.findIndex((h) => String(h) === String(headerName));
}

function mapRowFromMapping({ headers = [], row = [], mapping = {} }) {
  const output = {};
  for (const [field, headerName] of Object.entries(mapping || {})) {
    const idx = resolveHeaderIndex(headers, headerName);
    if (idx >= 0) {
      output[field] = row[idx];
    }
  }
  return output;
}

module.exports = {
  FIELD_SYNONYMS,
  normalizeHeader,
  suggestMapping,
  mapRowFromMapping,
};
