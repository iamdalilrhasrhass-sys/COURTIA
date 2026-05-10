import React from 'react'
import CourtiaBubbleLogo from './CourtiaBubbleLogo'
import AuroraButton from './AuroraButton'

/**
 * AuroraEmptyState — État vide premium COURTIA
 * 
 * Affiche une mini bulle Aurora, un message et une action optionnelle.
 * Utilisé partout où une liste/page est vide.
 * 
 * Props :
 *   icon        — ReactNode optionnel (remplace la bulle par défaut)
 *   title       — string (obligatoire)
 *   description — string (optionnel)
 *   action      — { label: string, onClick?: fn, href?: string } (optionnel)
 *   compact     — boolean, version réduite pour petits conteneurs
 *   dark        — boolean, mode sombre (par défaut auto-détecté)
 */

export default function AuroraEmptyState({
  icon,
  title,
  description,
  subtitle,
  action,
  compact = false,
  dark = false,
  className = '',
}) {
  const IconComponent = (typeof icon === 'function' || (icon && typeof icon === 'object' && icon.$$typeof && !React.isValidElement(icon)))
    ? icon
    : null
  const descriptionText = description || subtitle

  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-6'} ${className}`}>
      {/* Bulle Aurora ou icône custom */}
      {icon ? (
        <div className="mb-4 text-gray-300/60">
          {IconComponent ? <IconComponent size={compact ? 28 : 34} /> : icon}
        </div>
      ) : (
        <div className="mb-5 opacity-50">
          <CourtiaBubbleLogo
            size={compact ? 48 : 64}
            animated={false}
            showHalo={true}
            showFoam={false}
          />
        </div>
      )}

      {/* Titre */}
      <h3
        className={`font-bold ${compact ? 'text-sm' : 'text-base'} mb-1.5`}
        style={{ color: dark ? 'rgba(255,255,255,0.7)' : '#374151' }}
      >
        {title}
      </h3>

      {/* Description */}
      {descriptionText && (
        <p
          className={`${compact ? 'text-xs' : 'text-sm'} max-w-sm leading-relaxed`}
          style={{ color: dark ? 'rgba(255,255,255,0.3)' : '#9CA3AF' }}
        >
          {descriptionText}
        </p>
      )}

      {/* Action */}
      {action && (
        <div className="mt-5">
          {action.href ? (
            <AuroraButton href={action.href} variant={action.variant || 'primary'} size="sm">
              {action.label}
            </AuroraButton>
          ) : (
            <AuroraButton onClick={action.onClick} variant={action.variant || 'primary'} size="sm">
              {action.label}
            </AuroraButton>
          )}
        </div>
      )}
    </div>
  )
}
