/* ============================================================================
   FonctionIndisponible — l'état honnête d'une fonction annoncée mais non
   installée
   ----------------------------------------------------------------------------
   POURQUOI (défaut P3 mesuré en production le 20/09/2026, QA adverse n° 2) :
   deux routes répondent 501 « non implémenté » (analyse documentaire ARK,
   relevé mensuel de commissions en PDF) alors que des boutons d'écran les
   annonçaient. Un bouton qui produit une erreur technique est un faux
   affichage : ici, on DIT que la fonction n'existe pas, on ne propose aucun
   bouton, et AUCUN compteur (ni « 0 analyse », ni « 0 relevé ») ne vient
   suggérer une mesure qui n'existe pas.

   Composant purement présentatif.
   ========================================================================== */

import { AlertTriangle } from 'lucide-react'

const SURFACES = {
  clair: {
    fond: '#f9fafb',
    bordure: 'rgba(107,114,128,0.25)',
    texte: '#374151',
    texteSecondaire: '#6b7280',
    icone: '#9ca3af',
  },
  sombre: {
    fond: 'rgba(255,255,255,0.03)',
    bordure: 'rgba(255,255,255,0.08)',
    texte: '#9CA3AF',
    texteSecondaire: 'rgba(156,163,175,0.85)',
    icone: '#6B7280',
  },
}

export default function FonctionIndisponible({
  titre,
  children,
  surface = 'sombre',
  compact = false,
  style,
}) {
  const t = SURFACES[surface] || SURFACES.sombre
  return (
    <div
      role="note"
      aria-label={titre}
      style={{
        background: t.fond,
        border: `1px dashed ${t.bordure}`,
        borderRadius: 12,
        padding: compact ? '10px 14px' : '14px 16px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        ...style,
      }}
    >
      <AlertTriangle size={15} color={t.icone} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <strong style={{ fontSize: 12.5, fontWeight: 700, color: t.texte }}>
          {titre} — fonctionnalité non disponible
        </strong>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: t.texteSecondaire }}>{children}</p>
      </div>
    </div>
  )
}
