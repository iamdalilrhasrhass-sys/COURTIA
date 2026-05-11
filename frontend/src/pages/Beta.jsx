import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Sparkles, Send, CheckCircle, ArrowRight, User, Building2, FileText, BarChart3 } from 'lucide-react'
import api from '../api'

export default function Beta() {
  const [form, setForm] = useState({ email: '', cabinet_name: '', orias: '', portfolio_size: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email) { setError('Email requis'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/beta/register', { ...form, source: 'beta_page' })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l inscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 40%, #0a0a14 100%)', color: 'white', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'white' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>C</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 20 }}>COURTIA</span>
        </Link>
        <Link to="/" style={{ color: '#CBD5E1', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Retour au site</Link>
      </nav>

      {/* Hero */}
      <section style={{ padding: '80px 20px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 24, background: 'rgba(139,92,246,0.15)', marginBottom: 24, fontSize: 14, fontWeight: 600, color: '#A78BFA' }}>
            <Sparkles size={16} />
            BETA PRIVEE
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-2px', marginBottom: 20, background: 'linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Rejoignez les premiers courtiers a tester COURTIA
          </h1>
          <p style={{ fontSize: 18, color: '#94A3B8', lineHeight: 1.6, marginBottom: 48 }}>
            Acces exclusif a la plateforme complete + ARK IA. Places limitees. Inscrivez-vous maintenant pour reserver votre place.
          </p>
        </motion.div>

        {/* Form */}
        {success ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, padding: 40, textAlign: 'center' }}>
            <CheckCircle size={48} color="#10B981" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Inscription reussie!</h2>
            <p style={{ color: '#94A3B8' }}>Vous recevrez un email de confirmation. Nous vous contacterons des qu une place se libere.</p>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 24, color: '#A78BFA', textDecoration: 'none', fontWeight: 500 }}>
              Retour a l accueil <ArrowRight size={16} />
            </Link>
          </motion.div>
        ) : (
          <motion.form onSubmit={handleSubmit} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 40, textAlign: 'left' }}>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 12, marginBottom: 20, color: '#EF4444', fontSize: 14 }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#94A3B8' }}>
                  <User size={14} /> Email professionnel *
                </label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="vous@cabinet.fr" required style={{ width: '100%', padding: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#94A3B8' }}>
                  <Building2 size={14} /> Nom du cabinet
                </label>
                <input type="text" value={form.cabinet_name} onChange={e => setForm({ ...form, cabinet_name: e.target.value })} placeholder="Mon Cabinet Courtage" style={{ width: '100%', padding: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: 14 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#94A3B8' }}>
                  <FileText size={14} /> Numero ORIAS
                </label>
                <input type="text" value={form.orias} onChange={e => setForm({ ...form, orias: e.target.value })} placeholder="12 345 678" style={{ width: '100%', padding: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#94A3B8' }}>
                  <BarChart3 size={14} /> Taille portefeuille
                </label>
                <select value={form.portfolio_size} onChange={e => setForm({ ...form, portfolio_size: e.target.value })} style={{ width: '100%', padding: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: 14 }}>
                  <option value="">Selectionnez</option>
                  <option value="small">Moins de 200 clients</option>
                  <option value="medium">200 - 1000 clients</option>
                  <option value="large">Plus de 1000 clients</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)', color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Inscription...' : <><Send size={18} /> Rejoindre la beta</>}
            </button>
          </motion.form>
        )}

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 60 }}>
          {[
            { icon: '🎯', title: 'Acces prioritaire', desc: 'Testez COURTIA avant tout le monde' },
            { icon: '🤖', title: 'ARK IA inclus', desc: 'Tous les modules ARK actives' },
            { icon: '💬', title: 'Support VIP', desc: 'Ligne directe avec l equipe' },
          ].map((f, i) => (
            <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 + i * 0.1 }} style={{ padding: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#94A3B8' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
