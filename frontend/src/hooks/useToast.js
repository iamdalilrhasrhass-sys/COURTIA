import { useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success', duration = 3000) => {
    setToast({ message, type, id: Date.now() })
    setTimeout(() => setToast(null), duration)
  }

  const closeToast = () => setToast(null)

  return { toast, showToast, closeToast }
}
