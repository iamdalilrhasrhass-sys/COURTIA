import { useEffect, useRef } from 'react'

/**
 * ScrollCamera3D — Effet caméra 3D premium au scroll
 * Parallaxe, tilt, profondeur de champ simulée
 * Utilise RAF lerp pour une fluidité parfaite
 */
export default function ScrollCamera3D({ children }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Éléments avec profondeur
    const depthEls = container.querySelectorAll('[data-depth]')
    if (!depthEls.length) return

    let currentScroll = window.scrollY
    let targetScroll = window.scrollY
    let lastScrollY = window.scrollY
    let scrollVelocity = 0
    let mouseX = 0
    let mouseY = 0
    let animId

    // Pré-calculer les positions
    const origins = new Map()

    function recalcOrigins() {
      const vh = window.innerHeight
      depthEls.forEach(el => {
        const rect = el.getBoundingClientRect()
        origins.set(el, window.scrollY + rect.top + rect.height / 2)
      })
    }

    recalcOrigins()
    window.addEventListener('resize', recalcOrigins, { passive: true })

    function frame() {
      targetScroll = window.scrollY
      scrollVelocity = Math.abs(targetScroll - lastScrollY) * 0.04
      scrollVelocity = Math.min(scrollVelocity, 3)
      currentScroll += (targetScroll - currentScroll) * 0.08
      lastScrollY = targetScroll

      const vh = window.innerHeight
      const viewportCenter = currentScroll + vh / 2

      depthEls.forEach((el, index) => {
        const origin = origins.get(el)
        if (!origin) return

        const dist = (viewportCenter - origin) / vh
        if (Math.abs(dist) > 2) return

        const rawDepth = parseFloat(el.getAttribute('data-depth')) || 1
        const depth = rawDepth * (1 + scrollVelocity * 0.08)
        const abs = 1 - Math.min(Math.abs(dist), 1)
        const power = Math.max(0, abs)

        // Y déplacement
        const y = dist * -14 * depth

        // Tilt X/Y selon souris et scroll
        const rotX = dist * 1.2 + mouseY * -1.8 * power
        const rotY = mouseX * 2.0 * power

        // Scale subtil (zoom in quand au centre)
        const scale = 0.99 + power * 0.016

        // Opacité
        const opacity = 0.4 + power * 0.6

        // Appliquer
        if (el.classList.contains('sc-depth-orb')) {
          el.style.setProperty('--sc-x', `${Math.sin(dist * 2.2 + index) * 20 * depth}px`)
          el.style.setProperty('--sc-y', `${y * 1.8}px`)
          el.style.setProperty('--sc-opacity', opacity.toFixed(3))
        } else if (el.classList.contains('sc-depth-card')) {
          el.style.setProperty('--sc-scale', scale.toFixed(4))
          el.style.setProperty('--sc-rot-x', `${rotX.toFixed(1)}deg`)
          el.style.setProperty('--sc-rot-y', `${rotY.toFixed(1)}deg`)
          el.style.setProperty('--sc-y', `${y}px`)
        } else if (el.classList.contains('sc-depth-badge')) {
          el.style.setProperty('--sc-y', `${y * 0.5}px`)
          el.style.setProperty('--sc-opacity', opacity.toFixed(3))
        } else {
          el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`
        }
      })

      // Vitesse décroît
      scrollVelocity *= 0.92

      animId = requestAnimationFrame(frame)
    }

    const onMouse = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }

    window.addEventListener('mousemove', onMouse, { passive: true })
    animId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('resize', recalcOrigins)
    }
  }, [])

  return (
    <div ref={containerRef} className="scroll-camera-3d">
      {children}
      <style>{`
        .scroll-camera-3d {
          perspective: 1200px;
          transform-style: preserve-3d;
        }
        [data-depth] {
          will-change: transform, opacity;
          transition: opacity 0.3s ease;
        }
      `}</style>
    </div>
  )
}
