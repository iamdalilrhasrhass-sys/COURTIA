import { useEffect, useState } from 'react'
import { useMotionValue, animate } from 'framer-motion'
import { fmtMontant, fmtNombre } from '../../lib/monnaie'

// Devise centrale du cabinet : CHF en Suisse, EUR sinon (lib/monnaie).
const fmtCurrency = v => fmtMontant(v, { maximumFractionDigits: 0 })

const fmtNumber = v => fmtNombre(Math.round(v))

const fmtPercent = v => `${v.toFixed(1)}%`

/**
 * Anime un nombre de 0 à la valeur cible.
 * Props: { value, duration, format, prefix, suffix }
 * format: 'currency' | 'percent' | 'number' (default)
 */
export default function AnimatedNumber({ value, duration = 1.2, format = 'number', prefix = '', suffix = '' }) {
  const numVal = parseFloat(value)
  const mv = useMotionValue(0)
  const [display, setDisplay] = useState(() => {
    if (isNaN(numVal)) return `${prefix}—${suffix}`
    if (format === 'currency') return `${prefix}${fmtCurrency(0)}${suffix}`
    if (format === 'percent') return `${prefix}${fmtPercent(0)}${suffix}`
    return `${prefix}${fmtNumber(0)}${suffix}`
  })

  useEffect(() => {
    if (isNaN(numVal)) {
      setDisplay(`${prefix}—${suffix}`)
      return
    }

    const transform = v => {
      const formatted =
        format === 'currency' ? fmtCurrency(v) :
        format === 'percent' ? fmtPercent(v) :
        fmtNumber(v)
      return `${prefix}${formatted}${suffix}`
    }

    const unsub = mv.on('change', v => setDisplay(transform(v)))
    const ctrl = animate(mv, numVal, { duration, ease: [0.22, 1, 0.36, 1] })
    return () => { ctrl.stop(); unsub() }
  }, [numVal, format, duration, prefix, suffix]) // eslint-disable-line react-hooks/exhaustive-deps

  return <span>{display}</span>
}
