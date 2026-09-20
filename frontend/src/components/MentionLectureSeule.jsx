/* ============================================================================
   MentionLectureSeule — l'écran dit ce que le rôle permet, avec les mots de
   l'API
   ----------------------------------------------------------------------------
   POURQUOI (défaut P3 mesuré en production le 20/09/2026, QA adverse n° 2) :
   un rôle en lecture seule (« assistant ») voyait tous les formulaires
   d'écriture, et son refus s'affichait en CODE MACHINE (`lecture_seule`).
   L'écran porte désormais la phrase rédigée par l'API, construite par
   `lib/roleSession.js` (même libellé que `porteeCabinet.refuserEcriture`), et
   AUCUNE action d'écriture n'est présentée.

   Composant purement présentatif : aucun appel réseau, aucun droit deviné.
   `action` = ce que le rôle ne peut pas faire ici (« créer un client »…).
   ========================================================================== */

import { Lock } from 'lucide-react'
import { messageLectureSeule } from '../lib/roleSession'

const SURFACES = {
  clair: {
    fond: '#fffbeb',
    bordure: 'rgba(245,158,11,0.35)',
    texte: '#92400e',
    texteSecondaire: 'rgba(146,64,14,0.85)',
    icone: '#d97706',
  },
  sombre: {
    fond: 'rgba(245,158,11,0.08)',
    bordure: 'rgba(245,158,11,0.28)',
    texte: '#FCD34D',
    texteSecondaire: 'rgba(252,211,77,0.82)',
    icone: '#F59E0B',
  },
}

export default function MentionLectureSeule({
  role,
  action = 'modifier les données du cabinet',
  title = 'Accès en lecture seule',
  children,
  surface = 'clair',
  style,
}) {
  const t = SURFACES[surface] || SURFACES.clair
  return (
    <div
      role="note"
      aria-label={title}
      style={{
        background: t.fond,
        border: `1px solid ${t.bordure}`,
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        ...style,
      }}
    >
      <Lock size={16} color={t.icone} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <strong style={{ fontSize: 13, fontWeight: 700, color: t.texte }}>{title}</strong>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: t.texteSecondaire }}>
          {messageLectureSeule(role, action)}
        </p>
        {children && (
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: t.texteSecondaire }}>{children}</p>
        )}
      </div>
    </div>
  )
}
