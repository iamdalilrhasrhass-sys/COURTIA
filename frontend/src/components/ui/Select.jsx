import React from 'react'

export default function Select({ className = '', children, ...props }) {
  return (
    <select className={`courtia-input courtia-select ${className}`.trim()} {...props}>
      {children}
    </select>
  )
}
