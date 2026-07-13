export const PIPELINE_LABELS = Object.freeze({
  non_attribue: 'Non attribué',
  a_contacter: 'À contacter',
  appel_en_cours: 'Appel en cours',
  appel_tente: 'Appel tenté',
  injoignable: 'Injoignable',
  a_rappeler: 'À rappeler',
  contact_etabli: 'Contact établi',
  contact_qualifie: 'Contact qualifié',
  interesse: 'Intéressé',
  rdv_a_programmer: 'Rendez-vous à programmer',
  rdv_programme: 'Rendez-vous programmé',
  demo_programmee: 'Démonstration programmée',
  demo_realisee: 'Démonstration réalisée',
  proposition_a_envoyer: 'Proposition à envoyer',
  proposition_envoyee: 'Proposition envoyée',
  negociation: 'Négociation',
  signe: 'Signé',
  client_actif: 'Client actif',
  refuse: 'Refusé',
  pas_interesse: 'Pas intéressé',
  non_pertinent: 'Non pertinent',
  ne_plus_contacter: 'Ne plus contacter',
  cabinet_ferme: 'Cabinet fermé',
})

export const SIZE_LABELS = Object.freeze({
  independant_micro: 'Indépendant / micro-cabinet',
  tres_petit: 'Très petit cabinet',
  petit: 'Petit cabinet',
  intermediaire: 'Cabinet intermédiaire',
  grand: 'Grand cabinet',
  groupe_national: 'Groupe national',
})

export const INTEREST_LABELS = Object.freeze({
  faible: 'Faible',
  moyen: 'Moyen',
  fort: 'Fort',
  tres_fort: 'Très fort',
})

export const OUTCOME_LABELS = Object.freeze({
  oui: 'Oui — appel abouti',
  non: 'Non',
  pas_de_reponse: 'Pas de réponse',
  mauvais_numero: 'Mauvais numéro',
  a_rappeler: 'À rappeler',
  refus: 'Refus',
  contact_indisponible: 'Contact indisponible',
  deja_equipe: 'Déjà équipé',
  pas_interesse: 'Pas intéressé',
  numero_invalide: 'Numéro invalide',
  autre: 'Autre',
})

export const NEXT_STEP_LABELS = Object.freeze({
  envoyer_presentation: 'Envoyer une présentation',
  envoyer_email: 'Envoyer un e-mail',
  rappeler: 'Rappeler',
  organiser_demo: 'Organiser une démonstration',
  envoyer_proposition: 'Envoyer une proposition',
  attendre_reponse: 'Attendre une réponse',
  classer_non_pertinent: 'Classer comme non pertinent',
})

export const STATUS_COLORS = Object.freeze({
  non_attribue: 'slate',
  a_contacter: 'blue',
  appel_en_cours: 'cyan',
  appel_tente: 'amber',
  injoignable: 'orange',
  a_rappeler: 'amber',
  contact_etabli: 'violet',
  contact_qualifie: 'violet',
  interesse: 'pink',
  rdv_a_programmer: 'cyan',
  rdv_programme: 'cyan',
  demo_programmee: 'purple',
  demo_realisee: 'purple',
  proposition_a_envoyer: 'indigo',
  proposition_envoyee: 'indigo',
  negociation: 'fuchsia',
  signe: 'green',
  client_actif: 'green',
  refuse: 'red',
  pas_interesse: 'red',
  non_pertinent: 'slate',
  ne_plus_contacter: 'red',
  cabinet_ferme: 'slate',
})

export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value))
}
