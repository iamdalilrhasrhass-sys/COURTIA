import React from 'react'

const variantClass = {
  primary: 'courtia-button courtia-button--primary',
  secondary: 'courtia-button courtia-button--secondary',
  ghost: 'courtia-button courtia-button--ghost',
  danger: 'courtia-button courtia-button--danger',
}

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button className={`${variantClass[variant] || variantClass.primary} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
