import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = {
    success: 'bg-green-500/20 border-green-500/50',
    error: 'bg-red-500/20 border-red-500/50',
    info: 'bg-blue-500/20 border-blue-500/50'
  }[type]

  const textColor = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-blue-400'
  }[type]

  return (
    <div className={`fixed top-4 right-4 max-w-sm ${bgColor} border ${textColor} px-4 py-3 rounded-lg flex items-center justify-between gap-4 z-50 animate-pulse`}>
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="hover:opacity-80">
        <X size={18} />
      </button>
    </div>
  )
}
