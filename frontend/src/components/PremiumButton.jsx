import React from 'react'

const VARIANT_STYLES = {
  primary: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30',
  secondary: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30',
  outline: 'border-2 border-purple-600 text-purple-600 bg-transparent hover:bg-purple-50',
  ghost: 'text-gray-700 bg-transparent hover:bg-gray-100',
  danger: 'bg-red-500 text-white shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30',
}

const SIZE_STYLES = {
  sm: 'px-4 py-1.5 text-sm rounded-lg',
  md: 'px-6 py-2.5 text-base rounded-xl',
  lg: 'px-8 py-3.5 text-lg rounded-xl',
}

/**
 * PremiumButton — Bouton premium avec variants et animation
 * Props: { variant, size, children, icon, className, disabled, onClick, fullWidth, loading }
 */
export default function PremiumButton({
  variant = 'primary',
  size = 'md',
  children,
  icon: Icon,
  className = '',
  disabled = false,
  onClick,
  fullWidth = false,
  loading = false,
  type = 'button',
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold
        transition-all duration-200 ease-out
        active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${fullWidth ? 'w-full' : ''}
        ${VARIANT_STYLES[variant] || VARIANT_STYLES.primary}
        ${SIZE_STYLES[size] || SIZE_STYLES.md}
        ${className}
      `}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      ) : null}
      {children}
    </button>
  )
}
