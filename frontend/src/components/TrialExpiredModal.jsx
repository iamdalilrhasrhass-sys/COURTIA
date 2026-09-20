import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api'
import { lignesTarifs, paiementDisponible } from '../lib/essaiUi'

/**
 * Fin d'essai (J+7) — expérience de conversion.
 *
 * Déclenchement : le STATUT SERVEUR (`/api/billing/status` → trial_state
 * 'TRIAL_EXPIRED'), jamais une date calculée par le navigateur ni un
 * localStorage. Les prix viennent de `/api/billing/plans` : aucun tarif n'est
 * écrit en dur ici.
 *
 * Honnêteté : si le paiement en ligne n'est pas configuré (le serveur le dit),
 * on l'annonce au lieu d'ouvrir un faux checkout. On n'affiche jamais
 * « abonnement actif » sans confirmation du fournisseur.
 */
export default function TrialExpiredModal({ paywall, onClose, onVoirTarifs }) {
  const navigate = useNavigate()
  const [plans, setPlans] = useState(null)

  useEffect(() => {
    if (!paywall) return
    let annule = false
    api.get('/billing/plans')
      .then((r) => { if (!annule) setPlans(r.data || null) })
      .catch(() => { if (!annule) setPlans(null) })
    return () => { annule = true }
  }, [paywall])

  if (!paywall) return null

  const tarifs = lignesTarifs(plans)
  const enLigne = paiementDisponible(plans)

  return (
    <AnimatePresence>
      {paywall && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(5,5,16,0.78)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="w-full max-w-lg"
            style={{
              background: 'linear-gradient(180deg, #12122b 0%, #0b0b1c 100%)',
              border: '1px solid rgba(139,92,246,0.35)',
              borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Fin de l'essai COURTIA"
          >
            <div style={{ padding: '22px 24px 8px' }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>⏳</div>
              <h2 style={{ color: '#fff', fontSize: 19, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.3 }}>
                {paywall.titre}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                {paywall.message}
              </p>
              {paywall.finEssai && (
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11.5, marginTop: 8 }}>
                  Fin de l'essai : {new Date(paywall.finEssai).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>

            {tarifs.length > 0 && (
              <div style={{ padding: '14px 24px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tarifs.map((t) => (
                  <div key={t.code} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 10, padding: '10px 12px',
                  }}>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{t.nom}</span>
                    <span style={{ color: '#c4b5fd', fontSize: 12.5, fontWeight: 600 }}>{t.prix}</span>
                  </div>
                ))}
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10.5, margin: '2px 0 0' }}>
                  Prix hors taxes. TVA applicable au taux en vigueur.
                </p>
              </div>
            )}

            {!enLigne && (
              <div style={{ margin: '14px 24px 0', padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)' }}>
                <p style={{ color: '#FCD34D', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                  Le paiement en ligne est en cours de configuration. Pour activer votre abonnement dès maintenant,
                  écrivez-nous : nous vous répondons et activons votre cabinet.
                </p>
              </div>
            )}

            <div style={{ padding: '18px 24px 22px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => { onVoirTarifs?.(); navigate('/billing?plan=pro') }}
                style={{
                  flex: '1 1 190px', padding: '11px 16px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #5B4DF5, #8B5CF6)', color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {paywall.ctaPrincipal}
              </button>
              <a
                href="mailto:contact@courtiark.fr?subject=Activation%20de%20mon%20abonnement%20COURTIA"
                style={{
                  flex: '1 1 150px', padding: '11px 16px', borderRadius: 10, textAlign: 'center',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                }}
              >
                {paywall.ctaSecondaire}
              </a>
              <button
                onClick={onClose}
                style={{
                  flex: '0 0 auto', padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.6)', fontSize: 12.5,
                }}
              >
                Consulter mes données
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
