import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Sparkles, Zap, ArrowRight, Shield, BarChart3, FileText, Users, Calendar,
  TrendingUp, Star, Target, Bell, Clock, Check, Brain, Database,
  Search, AlertTriangle, LayoutDashboard, FileCheck2, Send
} from 'lucide-react'
import CourtiaBubbleLogo from '../components/brand/CourtiaBubbleLogo'
import CourtiaMiniLogo from '../components/brand/CourtiaMiniLogo'
import { applySeo } from '../lib/seo'

const T = {
  bg: '#02040c', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)', cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.06)', arkBorder: 'rgba(139,92,246,0.15)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const sectionStyle = { padding: '80px 20px', position: 'relative', zIndex: 1 }
const maxW = { maxWidth: 1200, margin: '0 auto' }
const titleStyle = { fontSize: 32, fontWeight: 800, color: T.text, marginBottom: 12, lineHeight: 1.2 }
const subtitleStyle = { fontSize: 15, color: T.textMuted, marginBottom: 40, maxWidth: 600 }

export default function LandingPublic() {
  useEffect(() => { applySeo({ title: 'COURTIA — CRM IA pour courtiers en assurance', description: 'COURTIA centralise clients, contrats, devis et relances. ARK IA analyse votre portefeuille et priorise vos actions commerciales.', canonicalPath: '/' }) }, [])

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: '100vh' }}>
      <style>{'html{scroll-behavior:smooth}'}</style>

      {/* Ambient orbs */}
      <div style={{ position: 'fixed', width: 600, height: 600, background: 'radial-gradient(circle, rgba(139,92,246,0.06), transparent 70%)', top: -100, left: -100, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', width: 500, height: 500, background: 'radial-gradient(circle, rgba(34,211,238,0.04), transparent 70%)', top: '30%', right: -50, pointerEvents: 'none', zIndex: 0 }} />

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(2,4,12,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid ' + T.cardBorder, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <CourtiaMiniLogo size={24} />
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>COURTIA</span>
        </Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link to="/tarifs" style={{ fontSize: 13, color: T.textSecondary, textDecoration: 'none' }}>Tarifs</Link>
          <Link to="/demo" style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: T.accent, color: '#fff', textDecoration: 'none' }}>Demander une démo</Link>
        </div>
      </nav>

      {/* ─── 1. HERO ─── */}
      <section style={{ padding: '140px 20px 80px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: T.arkBg, color: T.ark, border: '1px solid ' + T.arkBorder, marginBottom: 20, display: 'inline-block' }}><Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} /> IA native pour courtiers en assurance</span>
          <h1 style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.1, margin: '24px 0 16px', maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>COURTIA, le cockpit intelligent des courtiers en assurance.</h1>
          <p style={{ fontSize: 16, color: T.textMuted, maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.6 }}>Centralisez vos clients, contrats, devis et relances. <strong style={{ color: T.text }}>ARK</strong> analyse votre portefeuille et vous indique chaque jour les actions à traiter en priorité.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/demo" style={{ padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: T.accent, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>Demander une démo <ArrowRight size={15} /></Link>
            <Link to="/tarifs" style={{ padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: T.cardBg, color: T.text, textDecoration: 'none', border: '1px solid ' + T.cardBorder }}>Voir les tarifs</Link>
          </div>
        </motion.div>

        {/* Mockup */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
          style={{ marginTop: 60, background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid ' + T.cardBorder, padding: 24, maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} /><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} /><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[T.danger, T.warning, T.success, T.accent, T.ark, T.success].map((c, i) => (
              <div key={i} style={{ background: c + '08', borderRadius: 8, padding: '16px', border: '1px solid ' + c + '15' }}>
                <div style={{ width: '60%', height: 4, background: c + '20', borderRadius: 2, marginBottom: 8 }} />
                <div style={{ width: '40%', height: 8, background: c + '30', borderRadius: 2, marginBottom: 6 }} />
                <div style={{ width: '80%', height: 4, background: c + '15', borderRadius: 2 }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, textAlign: 'center', fontSize: 10, color: T.ark, fontWeight: 600 }}>
            <Sparkles size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Morning Brief ARK — Aujourd'hui 5 actions prioritaires
          </div>
        </motion.div>
      </section>

      {/* ─── 2. PROBLÈME ─── */}
      <section style={sectionStyle}>
        <div style={maxW}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.warning, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Le quotidien du courtier</span>
          <h2 style={titleStyle}>Un cabinet de courtage, ce n'est pas juste une liste de clients.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {[
              { icon: Calendar, text: 'Trop d\'échéances à surveiller sans outil dédié.', color: T.danger },
              { icon: Send, text: 'Trop de devis envoyés sans relance automatique.', color: T.warning },
              { icon: Users, text: 'Trop de clients silencieux qu\'on oublie de contacter.', color: T.danger },
              { icon: FileText, text: 'Trop d\'informations dispersées entre contrats et documents.', color: T.warning },
              { icon: Clock, text: 'Trop peu de temps pour détecter les opportunités commerciales.', color: T.danger },
            ].map((p, i) => (
              <motion.div key={i} whileHover={{ y: -2, borderColor: p.color + '40' }}
                style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: '18px 16px' }}>
                <p.icon size={18} color={p.color} style={{ marginBottom: 10 }} />
                <p style={{ fontSize: 13, color: T.textSecondary, margin: 0, lineHeight: 1.5 }}>{p.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. SOLUTION ─── */}
      <section style={sectionStyle}>
        <div style={maxW}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.success, textTransform: 'uppercase', letterSpacing: '0.1em' }}>La solution</span>
          <h2 style={titleStyle}>COURTIA centralise votre cabinet et priorise vos actions.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
            {[
              { icon: Users, label: 'Clients', desc: 'Fiches augmentées' },
              { icon: Shield, label: 'Contrats', desc: 'Échéances suivies' },
              { icon: FileText, label: 'Devis', desc: 'Transformés' },
              { icon: FileCheck2, label: 'Documents', desc: 'Centralisés' },
              { icon: Target, label: 'Tâches', desc: 'Priorisées ARK' },
              { icon: Send, label: 'Relances', desc: 'Classées par urgence' },
              { icon: TrendingUp, label: 'Opportunités', desc: 'Détectées' },
              { icon: BarChart3, label: 'Rapports', desc: 'Pilotage cabinet' },
            ].map((s, i) => (
              <motion.div key={i} whileHover={{ y: -2 }}
                style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: '18px 14px', textAlign: 'center', cursor: 'default' }}>
                <s.icon size={22} color={T.accent} style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. ARK IA ─── */}
      <section style={{ ...sectionStyle, background: 'rgba(139,92,246,0.02)' }}>
        <div style={maxW}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.ark, textTransform: 'uppercase', letterSpacing: '0.1em' }}><Sparkles size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Intelligence native</span>
          <h2 style={titleStyle}>ARK ne discute pas seulement. ARK vous aide à agir.</h2>
          <p style={subtitleStyle}>ARK analyse votre portefeuille, détecte les risques, remonte les priorités, explique pourquoi et propose une action.</p>
          <div style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid ' + T.arkBorder, borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Sparkles size={16} color={T.ark} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#c4b5fd', marginBottom: 4 }}>ARK recommande</div>
                <div style={{ fontSize: 14, color: T.text }}>
                  Relancer <strong>Martin Conseil</strong> : échéance RC Pro dans 21 jours. Client actif. Potentiel complémentaire Prévoyance TNS détecté.
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {['Analyse du portefeuille en continu', 'Détection des risques et échéances', 'Priorisation des actions commerciales', 'Explication de chaque recommandation'].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.textSecondary }}>
                <Check size={14} color={T.ark} /> {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. MORNING BRIEF ─── */}
      <section style={sectionStyle}>
        <div style={maxW}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Chaque matin</span>
          <h2 style={titleStyle}>Chaque matin, ARK prépare votre journée.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { icon: Target, label: 'Actions prioritaires', value: '5 aujourd\'hui', color: T.danger },
              { icon: Calendar, label: 'Échéances à traiter', value: '2 cette semaine', color: T.warning },
              { icon: Send, label: 'Devis à relancer', value: '3 sans réponse', color: T.accent },
              { icon: TrendingUp, label: 'Opportunités', value: '4 détectées', color: T.success },
              { icon: AlertTriangle, label: 'Risques portefeuille', value: '3 clients', color: T.danger },
            ].map((b, i) => (
              <motion.div key={i} whileHover={{ y: -2 }}
                style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: '18px 16px' }}>
                <b.icon size={18} color={b.color} style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>{b.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{b.value}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. FONCTIONNALITÉS CLÉS ─── */}
      <section style={sectionStyle}>
        <div style={maxW}>
          <h2 style={titleStyle}>Tout ce dont votre cabinet a besoin.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {[
              { icon: Users, title: 'Clients augmentés', desc: 'Fiches enrichies avec historique, contrats, alertes et score de risque calculé par ARK.' },
              { icon: Shield, title: 'Contrats et échéances', desc: 'Suivi automatique des renouvellements. Alertes avant échéance. Aucun oubli.' },
              { icon: FileText, title: 'Devis à transformer', desc: 'Pipeline commercial complet. Relances intelligentes. Taux de transformation mesuré.' },
              { icon: FileCheck2, title: 'Documents centralisés', desc: 'Mandats, FIC, attestations. Tout est classé, accessible et vérifié.' },
              { icon: Send, title: 'Relances intelligentes', desc: 'ARK classe vos relances par urgence. Vous savez qui appeler maintenant.' },
              { icon: TrendingUp, title: 'Opportunités commerciales', desc: 'ARK détecte le potentiel multi-équipement dans votre portefeuille existant.' },
              { icon: BarChart3, title: 'Rapports cabinet', desc: 'Performance commerciale, santé du portefeuille, projections. Décisions éclairées.' },
              { icon: Sparkles, title: 'ARK IA native', desc: 'Pas un chatbot. Un analyste qui travaille dans votre CRM et vous dit quoi faire.' },
            ].map((f, i) => (
              <motion.div key={i} whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.12)' }}
                style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: '20px 18px', cursor: 'default' }}>
                <f.icon size={20} color={T.accent} style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. PREUVE VISUELLE ─── */}
      <section style={{ ...sectionStyle, background: 'rgba(255,255,255,0.005)' }}>
        <div style={maxW}>
          <h2 style={titleStyle}>Un cockpit conçu pour le courtage moderne.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[
              { title: 'Tableau de bord cockpit', desc: 'Vision 360° de votre cabinet. KPIs, alertes, portefeuille en un coup d\'œil.' },
              { title: 'Morning Brief ARK', desc: 'Chaque matin, vos 5 priorités du jour analysées et classées par ARK.' },
              { title: 'Fiche client augmentée', desc: 'Profil complet : contrats, devis, documents, historique et score ARK.' },
              { title: 'Gestion des contrats', desc: 'Tous vos contrats suivis. Échéances, risques, renouvellements.' },
              { title: 'Rapports de pilotage', desc: 'Performance, tendances, opportunités. Pilotage stratégique du cabinet.' },
              { title: 'Relances prioritaires', desc: 'Qui appeler maintenant ? ARK vous le dit avec le contexte et le potentiel.' },
            ].map((p, i) => (
              <div key={i} style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: '24px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ width: 28, height: 4, background: T.accent + '40', borderRadius: 2 }} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.textMuted }} />
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.textMuted }} />
                  </div>
                </div>
                <div style={{ width: '70%', height: 6, background: T.cardBorder, borderRadius: 2, marginBottom: 12 }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 }}>{p.title}</div>
                <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. TARIFS ─── */}
      <section id="tarifs" style={sectionStyle}>
        <div style={maxW}>
          <h2 style={{ ...titleStyle, textAlign: 'center' }}>Des offres conçues pour la réalité du courtage.</h2>
          <p style={{ ...subtitleStyle, textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>Commencez en Starter, passez en Pro pour déployer pleinement ARK et le pilotage avancé.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'stretch' }}>
            {/* Starter */}
            <div style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 14, padding: '28px 24px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 4 }}>Starter</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>Pour courtier indépendant</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: T.text, marginBottom: 4 }}>89 € <span style={{ fontSize: 14, fontWeight: 500, color: T.textMuted }}>HT/mois</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0', fontSize: 13, color: T.textSecondary }}>
                {['Tableau de bord portefeuille', 'Clients, contrats, tâches', 'Rapports essentiels', 'Jusqu\'à 3 collaborateurs'].map((l, i) => (
                  <li key={i} style={{ padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}><Check size={12} color={T.success} />{l}</li>
                ))}
              </ul>
              <Link to="/demo" style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: T.cardBg, color: T.text, textDecoration: 'none', border: '1px solid ' + T.cardBorder }}>Commencer</Link>
            </div>

            {/* Pro — Recommended */}
            <div style={{ background: 'rgba(91,77,245,0.05)', border: '1px solid ' + T.accent + '40', borderRadius: 14, padding: '28px 24px', position: 'relative' }}>
              <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, padding: '4px 14px', borderRadius: 20, background: T.accent, color: '#fff' }}>Recommandé</span>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 4 }}>Pro</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>Pour cabinet en croissance</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: T.text, marginBottom: 4 }}>159 € <span style={{ fontSize: 14, fontWeight: 500, color: T.textMuted }}>HT/mois</span></div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0', fontSize: 13, color: T.textSecondary }}>
                {['Tout Starter', 'Morning Brief ARK complet', 'Recommandations ARK', 'Relances prioritaires', 'Opportunités commerciales', 'Rapports avancés', 'Analyse portefeuille', 'Jusqu\'à 10 collaborateurs'].map((l, i) => (
                  <li key={i} style={{ padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}><Check size={12} color={T.success} />{l}</li>
                ))}
              </ul>
              <Link to="/demo" style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: T.accent, color: '#fff', textDecoration: 'none' }}>Demander une démo</Link>
            </div>

            {/* Cabinet */}
            <div style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 14, padding: '28px 24px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 4 }}>Cabinet</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>Pour équipes et structures</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: T.text, marginBottom: 4 }}>Sur devis</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0', fontSize: 13, color: T.textSecondary }}>
                {['Tout Pro', 'Multi-utilisateurs avancé', 'Accompagnement dédié', 'Import portefeuille', 'Paramétrage avancé', 'Support prioritaire', 'Intégrations futures'].map((l, i) => (
                  <li key={i} style={{ padding: '4px 0', display: 'flex', alignItems: 'center', gap: 8 }}><Check size={12} color={T.success} />{l}</li>
                ))}
              </ul>
              <Link to="/contact" style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: T.cardBg, color: T.text, textDecoration: 'none', border: '1px solid ' + T.cardBorder }}>Nous contacter</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 9. RÉASSURANCE ─── */}
      <section style={{ ...sectionStyle, background: 'rgba(255,255,255,0.005)' }}>
        <div style={maxW}>
          <h2 style={{ ...titleStyle, textAlign: 'center' }}>Pensé pour les courtiers français.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { icon: Check, text: 'Interface 100% en français' },
              { icon: Shield, text: 'Données centralisées et sécurisées' },
              { icon: Users, text: 'Accompagnement à la prise en main' },
              { icon: Sparkles, text: 'Amélioration continue avec vos retours' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: T.textSecondary, padding: '12px 16px', background: T.cardBg, borderRadius: 10, border: '1px solid ' + T.cardBorder }}>
                <r.icon size={16} color={T.accent} /> {r.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 10. CTA FINAL ─── */}
      <section style={{ padding: '100px 20px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Sparkles size={24} color={T.ark} style={{ marginBottom: 16 }} />
          <h2 style={{ ...titleStyle, textAlign: 'center', fontSize: 36 }}>Prêt à piloter votre cabinet avec ARK ?</h2>
          <p style={{ fontSize: 15, color: T.textMuted, marginBottom: 32 }}>COURTIA transforme votre portefeuille client en cockpit intelligent.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/demo" style={{ padding: '14px 32px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: T.accent, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>Demander une démo <ArrowRight size={15} /></Link>
            <Link to="/tarifs" style={{ padding: '14px 32px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: T.cardBg, color: T.text, textDecoration: 'none', border: '1px solid ' + T.cardBorder }}>Découvrir les tarifs</Link>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid ' + T.cardBorder, padding: '24px 20px', textAlign: 'center', fontSize: 12, color: T.textMuted, position: 'relative', zIndex: 1 }}>
        © 2026 COURTIA — Cockpit intelligent pour courtiers en assurance.
      </footer>
    </div>
  )
}
