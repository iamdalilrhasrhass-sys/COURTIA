import React from 'react'
import AuroraBadge from '../../components/AuroraBadge'

/**
 * AuroraPageHeader — En-tête de page cohérent COURTIA
 * 
 * Structure commune pour toutes les pages dashboard/admin.
 * 
 * Props :
 *   title       — string (obligatoire)
 *   subtitle    — string (optionnel)
 *   badge       — string (optionnel, affiche un AuroraBadge)
 *   actions     — ReactNode (boutons, filtres en haut à droite)
 *   dark        — boolean (default: false pour dashboard, true pour admin/landing)
 */

export default function AuroraPageHeader({
  title,
  subtitle,
  badge,
  actions,
  dark = false,
  className = '',
}) {
  return (
    <div className={`mb-6 md:mb-8 ${className}`}>
      {/* Badge optionnel */}
      {badge && (
        <div className="mb-3">
          <AuroraBadge>{badge}</AuroraBadge>
        </div>
      )}

      {/* Ligne titre + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1
            className="text-2xl md:text-3xl font-black tracking-tight"
            style={{ color: dark ? '#ffffff' : '#111827' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="mt-1.5 text-sm max-w-xl"
              style={{ color: dark ? 'rgba(255,255,255,0.35)' : '#6B7280' }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Ligne lumineuse sous le titre */}
      <div className="mt-4">
        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg, ${dark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.12)'}, ${dark ? 'rgba(34,211,238,0.1)' : 'rgba(34,211,238,0.06)'}, transparent)`,
            filter: 'blur(0.5px)',
          }}
        />
      </div>
    </div>
  )
}
