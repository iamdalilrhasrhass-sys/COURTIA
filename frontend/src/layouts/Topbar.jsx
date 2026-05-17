import { Search, Bell, Settings, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ title = 'Morning Brief' }) {
  const navigate = useNavigate()
  return (
    <header style={{
      height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', background: '#080808', borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'sticky', top: 0, zIndex: 50
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>{title}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={iconBtnStyle}><Search size={18} color="#9CA3AF" /></button>
        <button style={iconBtnStyle}><Bell size={18} color="#9CA3AF" /></button>
        <button style={{ ...iconBtnStyle, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }} onClick={() => navigate('/parametres')}>
          <Settings size={18} color="#9CA3AF" />
          <ChevronDown size={14} color="#6B7280" />
        </button>
      </div>
    </header>
  )
}

const iconBtnStyle = {
  width: 36, height: 36, borderRadius: 8, border: 'none', background: 'transparent',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
