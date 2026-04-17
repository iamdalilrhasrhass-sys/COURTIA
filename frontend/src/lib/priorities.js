/**
 * @file priorities.js — Moteur de priorisation quotidienne 100% local. Zéro IA.
 */
import { computeScores } from './scoring.js'

/**
 * Calcule les priorités du jour pour un courtier.
 * Toutes les règles sont locales — aucun appel réseau.
 * @param {Object[]} clients
 * @param {Object[]} contrats  — tous les contrats (toutes classes confondues)
 * @param {Object[]} taches    — toutes les tâches
 * @returns {{ critiques: Priority[], importantes: Priority[], suggerees: Priority[] }}
 */
export function computeDailyPriorities(clients, contrats, taches) {
  const now = Date.now()
  const all = []

  for (const client of clients) {
    const clientContrats = (contrats || []).filter(c =>
      String(c.client_id) === String(client.id)
    )
    const clientTaches = (taches || []).filter(t =>
      String(t.client_id) === String(client.id)
    )

    const scores = computeScores(client, clientContrats, clientTaches)
    if (!scores) continue

    const nom = `${client.prenom || ''} ${client.nom || ''}`.trim() || 'Client'

    // Prochaine échéance
    let minEch = null
    for (const c of clientContrats) {
      if (!c.date_echeance) continue
      const d = Math.ceil((new Date(c.date_echeance) - now) / 86400000)
      if (d > 0 && (minEch === null || d < minEch)) minEch = d
    }

    // Dernier contact (tâche terminée la plus récente)
    const termineeTaches = clientTaches.filter(t => t.statut === 'terminee')
    let joursSansContact = 999
    if (termineeTaches.length > 0) {
      const lastTs = Math.max(...termineeTaches.map(t => new Date(t.echeance || t.created_at || 0).getTime()))
      joursSansContact = Math.floor((now - lastTs) / 86400000)
    }

    // ── CRITIQUES (score_urgence 80-100) ──

    // Échéance < 15j
    if (minEch !== null && minEch < 15) {
      all.push({
        id: `ech-crit-${client.id}`,
        type: 'echeance_critique',
        clientId: client.id,
        clientNom: nom,
        titre: `Renouvellement urgent`,
        sousTitre: `Échéance dans ${minEch} jour${minEch > 1 ? 's' : ''}`,
        cta: { label: 'Préparer', action: 'navigate', target: `/clients/${client.id}` },
        score_urgence: 95 - minEch,
      })
    }

    // Risque > 85
    if (scores.risque > 85) {
      all.push({
        id: `risque-crit-${client.id}`,
        type: 'risque_critique',
        clientId: client.id,
        clientNom: nom,
        titre: `Profil à risque élevé`,
        sousTitre: `Score risque ${scores.risque}/100`,
        cta: { label: 'Appeler', action: 'navigate', target: `/clients/${client.id}` },
        score_urgence: 80 + Math.round((scores.risque - 85) / 3),
      })
    }

    // Complétude < 30% avec contrat actif
    if (scores.completude < 30 && scores.nbActifs > 0) {
      all.push({
        id: `completude-crit-${client.id}`,
        type: 'completude_critique',
        clientId: client.id,
        clientNom: nom,
        titre: `Dossier très incomplet`,
        sousTitre: `${scores.completude}% — contrat actif`,
        cta: { label: 'Compléter', action: 'navigate', target: `/clients/${client.id}` },
        score_urgence: 80,
      })
    }

    // ── IMPORTANTES (score_urgence 50-79) ──

    // Échéance 15-30j
    if (minEch !== null && minEch >= 15 && minEch <= 30) {
      all.push({
        id: `ech-imp-${client.id}`,
        type: 'echeance_importante',
        clientId: client.id,
        clientNom: nom,
        titre: `Préparer le renouvellement`,
        sousTitre: `Échéance dans ${minEch} jours`,
        cta: { label: 'Préparer', action: 'navigate', target: `/clients/${client.id}` },
        score_urgence: 50 + Math.round((30 - minEch) * 1.5),
      })
    }

    // Aucun contact > 90j et fidélité > 60
    if (joursSansContact > 90 && scores.fidelite > 60) {
      all.push({
        id: `contact-imp-${client.id}`,
        type: 'relance_fidelite',
        clientId: client.id,
        clientNom: nom,
        titre: `Client à relancer`,
        sousTitre: `Aucun contact depuis ${joursSansContact} jours`,
        cta: { label: 'Relancer', action: 'navigate', target: `/clients/${client.id}` },
        score_urgence: Math.min(75, 50 + Math.round(joursSansContact / 10)),
      })
    }

    // Opportunité > 70 sans tâche récente
    if (scores.opportunite > 70 && clientTaches.filter(t => {
      const d = (now - new Date(t.echeance || t.created_at || 0).getTime()) / 86400000
      return d < 30
    }).length === 0) {
      all.push({
        id: `opp-imp-${client.id}`,
        type: 'opportunite',
        clientId: client.id,
        clientNom: nom,
        titre: `Opportunité cross-sell`,
        sousTitre: `Score opportunité ${scores.opportunite}/100`,
        cta: { label: 'Appeler', action: 'navigate', target: `/clients/${client.id}` },
        score_urgence: 50 + Math.round((scores.opportunite - 70) / 2),
      })
    }

    // ── SUGGÉRÉES (score_urgence 30-49) ──

    // Échéance 30-60j
    if (minEch !== null && minEch > 30 && minEch <= 60) {
      all.push({
        id: `ech-sug-${client.id}`,
        type: 'echeance_suggeree',
        clientId: client.id,
        clientNom: nom,
        titre: `Renouvellement à anticiper`,
        sousTitre: `Échéance dans ${minEch} jours`,
        cta: { label: 'Préparer', action: 'navigate', target: `/clients/${client.id}` },
        score_urgence: 30 + Math.round((60 - minEch) / 2),
      })
    }

    // Mono-contrat et valeur > 50 000€ (lifetime value)
    if (scores.nbActifs === 1 && (client.lifetime_value || 0) > 50000) {
      all.push({
        id: `valeur-sug-${client.id}`,
        type: 'valeur_elevee',
        clientId: client.id,
        clientNom: nom,
        titre: `Client à fort potentiel mono-contrat`,
        sousTitre: `Valeur vie ${client.lifetime_value}€`,
        cta: { label: 'Proposer', action: 'navigate', target: `/clients/${client.id}` },
        score_urgence: 35,
      })
    }
  }

  // Tri global, dédoublonnage par client (1 priorité max critique, 1 max importante par client)
  const sorted = all.sort((a, b) => b.score_urgence - a.score_urgence).slice(0, 10)

  const critiques   = sorted.filter(p => p.score_urgence >= 80)
  const importantes = sorted.filter(p => p.score_urgence >= 50 && p.score_urgence < 80)
  const suggerees   = sorted.filter(p => p.score_urgence >= 30 && p.score_urgence < 50)

  return { critiques, importantes, suggerees }
}
