import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Construction } from 'lucide-react'

const T = {
  bg: '#080808',
  border: 'rgba(255,255,255,0.06)',
  text: '#ffffff',
  textSecondary: '#9CA3AF',
  accent: '#5B4DF5',
  ark: '#8B5CF6',
}

export default function LegacyFeaturePage({ title = 'Feature en migration', description = 'Cette fonctionnalité est temporairement accessible via le dashboard legacy.' }) {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Construction size={28} color={T.ark} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 12 }}>{title}</h2>
        <p style={{ fontSize: 15, color: T.textSecondary, lineHeight: 1.6, marginBottom: 32 }}>{description}</p>
        <button onClick={() => navigate('/dashboard-legacy')} style={{
          background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.border}`, color: T.text, padding: '12px 28px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8
        }}>
          <ArrowLeft size={16} /> Dashboard Legacy
        </button>
      </motion.div>
    </div>
  )
}
