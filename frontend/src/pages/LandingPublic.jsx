import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, ArrowRight, ShieldCheck, Brain, Bell, FileText, Users, Sparkles } from 'lucide-react'
import CourtiaMiniLogo from '../components/brand/CourtiaMiniLogo'
import CourtiaBubbleLogo from '../components/brand/CourtiaBubbleLogo'

const CHIPS = [
  'Pensé courtiers',
  'Portefeuille vivant',
  'Relances intelligentes',
  'ARK intégré',
]

const VALUE_PROPS = [
  { icon: Brain, label: 'ARK IA intégrée', desc: 'Analyse, détecte, priorise. Sans remplacer le courtier.' },
  { icon: Bell, label: 'Relances centralisées', desc: 'Prospects, échéances, silencieux. Aucun oubli.' },
  { icon: FileText, label: 'Contrats et tâches', desc: 'Vue unifiée du portefeuille. Actions concrètes.' },
  { icon: Users, label: 'CRM métier courtage', desc: 'Fiches clients, historique, notes, prochaines actions.' },
]

export default function LandingPublic() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0d1117 0%, #161b22 40%, #0d1117 100%)',
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      color: '#ffffff',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Aurora ambient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute',
          top: '-20%', left: '-10%', right: '-10%', height: '60vh',
          background: 'radial-gradient(circle at 30% 20%, rgba(180,130,255,0.12) 0%, transparent 50%), radial-gradient(circle at 70% 15%, rgba(100,200,255,0.10) 0%, transparent 50%), radial-gradient(circle at 50% 40%, rgba(255,180,220,0.06) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(13,17,23,0.85) 0%, transparent 30%, transparent 70%, rgba(13,17,23,0.95) 100%)',
        }} />
      </div>

      {/* Depth grid floor */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: '50%',
        width: '150vw', height: '50vh',
        transform: 'translateX(-50%) perspective(800px) rotateX(60deg)',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 80%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* HEADER */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(13,17,23,0.70)',
        backdropFilter: 'blur(20px)',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <CourtiaMiniLogo size={30} />
        </Link>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer', padding: 8,
          }}
          aria-label="Menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: 'rgba(13,17,23,0.96)',
          backdropFilter: 'blur(24px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 32,
        }}>
          <Link to="/#features" onClick={() => setMenuOpen(false)} style={menuLinkStyle}>Fonctionnalités</Link>
          <Link to="/#ark" onClick={() => setMenuOpen(false)} style={menuLinkStyle}>ARK IA</Link>
          <Link to="/tarifs" onClick={() => setMenuOpen(false)} style={menuLinkStyle}>Tarifs</Link>
          <Link to="/login" onClick={() => setMenuOpen(false)} style={{ ...menuLinkStyle, color: '#80f0d8' }}>Se connecter</Link>
          <Link
            to="/register"
            onClick={() => setMenuOpen(false)}
            style={{
              padding: '14px 36px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))',
              border: '0.5px solid rgba(255,255,255,0.15)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
              backdropFilter: 'blur(12px)',
            }}
          >
            Essai gratuit 7 jours
          </Link>
        </div>
      )}

      {/* HERO */}
      <section style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        minHeight: '100vh',
        padding: '120px 20px 60px',
        textAlign: 'center',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 18px',
          borderRadius: 999,
          border: '0.5px solid rgba(255,255,255,0.10)',
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(12px)',
          marginBottom: 32,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(207,250,254,0.80)',
        }}>
          <Sparkles size={12} style={{ color: '#80f0d8' }} />
          CRM ASSURANCE CONNECTÉ À ARK
        </div>

        {/* Logo Bubble C */}
        <div style={{ marginBottom: 32 }}>
          <CourtiaBubbleLogo size={260} animated showHalo showFoam />
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(2rem, 6vw, 3.8rem)',
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: '-0.03em',
          maxWidth: 720,
          margin: '0 auto 20px',
          color: '#ffffff',
        }}>
          Le cockpit intelligent des courtiers en assurance.
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(0.95rem, 1.5vw, 1.15rem)',
          lineHeight: 1.65,
          color: 'rgba(255,255,255,0.55)',
          maxWidth: 600,
          margin: '0 auto 36px',
        }}>
          COURTIA centralise vos clients, contrats, tâches et relances. ARK analyse votre portefeuille, détecte les priorités et transforme vos données en actions commerciales concrètes.
        </p>

        {/* Buttons */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 28,
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <Link
            to="/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '15px 32px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #ffffff, #e8e8f0)',
              color: '#0d1117',
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
              boxShadow: '0 4px 24px rgba(180,130,255,0.15)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            Essai gratuit 7 jours
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '15px 32px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 600,
              fontSize: 15,
              textDecoration: 'none',
              backdropFilter: 'blur(12px)',
              transition: 'background 0.2s',
            }}
          >
            Voir le cockpit
          </Link>
        </div>

        {/* Chips */}
        <div style={{
          display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {CHIPS.map(chip => (
            <span key={chip} style={{
              padding: '6px 16px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(8px)',
            }}>
              {chip}
            </span>
          ))}
        </div>
      </section>

      {/* VALUE PROPS */}
      <section id="features" style={{
        position: 'relative', zIndex: 10,
        padding: '80px 20px',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: 48,
        }}>
          <p style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: 999,
            border: '0.5px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(207,250,254,0.65)',
            marginBottom: 16,
          }}>
            POURQUOI COURTIA
          </p>
          <h2 style={{
            fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#ffffff',
          }}>
            Un cockpit, pas un CRM générique.
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {VALUE_PROPS.map(({ icon: Icon, label, desc }) => (
            <div key={label} style={{
              padding: '28px 24px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(12px)',
            }}>
              <Icon size={24} style={{ color: '#80f0d8', marginBottom: 14 }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{label}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.45)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="ark" style={{
        position: 'relative', zIndex: 10,
        padding: '80px 20px 100px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 14px',
          borderRadius: 999,
          border: '0.5px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(207,250,254,0.65)',
          marginBottom: 20,
        }}>
          <Sparkles size={12} style={{ color: '#80f0d8' }} />
          ARK
        </div>
        <h2 style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#fff',
          maxWidth: 500,
          margin: '0 auto 16px',
        }}>
          L'IA qui lit votre portefeuille comme un associé.
        </h2>
        <p style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.48)',
          maxWidth: 480,
          margin: '0 auto 32px',
          lineHeight: 1.6,
        }}>
          ARK détecte les priorités, les silencieux, les échéances. Il prépare. Vous décidez.
        </p>
        <Link
          to="/register"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '15px 36px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #ffffff, #e8e8f0)',
            color: '#0d1117',
            fontWeight: 700,
            fontSize: 15,
            textDecoration: 'none',
          }}
        >
          Essai gratuit 7 jours
          <ArrowRight size={16} />
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{
        position: 'relative', zIndex: 10,
        padding: '40px 20px',
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
        textAlign: 'center',
      }}>
        <CourtiaMiniLogo size={24} style={{ justifyContent: 'center', marginBottom: 12 }} />
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>
          COURTIA — Propulsé par ARK. Cockpit IA des courtiers.
        </p>
      </footer>
    </div>
  )
}

const menuLinkStyle = {
  color: 'rgba(255,255,255,0.7)',
  fontSize: 20,
  fontWeight: 600,
  textDecoration: 'none',
  letterSpacing: '-0.01em',
}
