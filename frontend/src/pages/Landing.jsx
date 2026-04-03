import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff', color: '#0a0a0a' }}>
      {/* NAVIGATION */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: 'rgba(255, 255, 255, 0.97)', borderBottom: '0.5px solid #e5e7eb', zIndex: 100, backdropFilter: 'blur(10px)', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '3px', fontFamily: 'Arial, sans-serif' }}>COURTIA</div>
          <div style={{ display: 'flex', gap: '14px' }}>
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#0a0a0a', cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: 'Arial, sans-serif' }}>Connexion</button>
            <button onClick={() => navigate('/register')} style={{ padding: '10px 24px', backgroundColor: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>Rejoindre</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '95vh', paddingTop: '120px', paddingBottom: '100px', backgroundColor: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontFamily: 'Arial, sans-serif', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', right: '5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-200px', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 40px', width: '100%', position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '52px', fontWeight: '900', lineHeight: '1.15', marginBottom: '28px', margin: 0, fontFamily: 'Arial, sans-serif', letterSpacing: '-0.8px' }}>
            Le premier CRM où l'IA<br/>travaille vraiment avec le courtier
          </h1>

          <p style={{ fontSize: '19px', color: '#475569', lineHeight: '1.85', maxWidth: '720px', marginBottom: '50px', fontFamily: 'Arial, sans-serif', fontWeight: '400' }}>
            ARK analyse vos données, détecte les opportunités et vous propose les bonnes actions. Vous gardez la main. Vous allez plus vite.
          </p>

          <div style={{ display: 'flex', gap: '18px', marginBottom: '120px', fontFamily: 'Arial, sans-serif' }}>
            <button onClick={() => navigate('/register')} style={{ padding: '16px 48px', backgroundColor: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '9px', fontFamily: 'Arial, sans-serif', boxShadow: '0 12px 32px rgba(10, 10, 10, 0.18)', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.target.style.boxShadow = '0 18px 48px rgba(10, 10, 10, 0.25)'; e.target.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.target.style.boxShadow = '0 12px 32px rgba(10, 10, 10, 0.18)'; e.target.style.transform = 'translateY(0)'; }}>
              Rejoindre maintenant
              <ArrowRight size={17} />
            </button>
            <button style={{ padding: '16px 48px', backgroundColor: '#ffffff', color: '#0a0a0a', border: '1.5px solid #d1d5db', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Arial, sans-serif', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.target.style.borderColor = '#0a0a0a'; e.target.style.backgroundColor = '#f8f9fa'; e.target.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.backgroundColor = '#ffffff'; e.target.style.transform = 'translateY(0)'; }}>
              Voir la démo
            </button>
          </div>

          {/* MOCKUP HERO - PREMIUM */}
          <div style={{ background: 'linear-gradient(135deg, #fafbfc 0%, #ffffff 50%, #f8f9fa 100%)', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 50px 100px rgba(0, 0, 0, 0.12), 0 0 40px rgba(37, 99, 235, 0.1), inset 0 1px 0 rgba(255,255,255,0.6)', fontFamily: 'Arial, sans-serif', overflow: 'hidden' }}>
            {/* Browser Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '7px' }}>
                {['#ff5f57', '#ffbd2e', '#28c940'].map(color => (
                  <div key={color} style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '50%', boxShadow: `0 1px 3px ${color}40` }} />
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', flex: 1, textAlign: 'center', fontWeight: '500' }}>courtia.app</div>
            </div>

            {/* Main Content */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '16px' }}>
              {/* SIDEBAR */}
              <div style={{ backgroundColor: '#0f172a', borderRadius: '10px', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}>
                {[
                  { label: 'Dashboard', icon: '📊', active: true },
                  { label: 'Clients', icon: '👥', active: false },
                  { label: 'Pipeline', icon: '🎯', active: false },
                  { label: 'ARK IA', icon: '⚡', active: false }
                ].map((item, i) => (
                  <div key={item.label} style={{ fontSize: '10px', padding: '10px 11px', backgroundColor: item.active ? '#2563eb' : 'rgba(255,255,255,0.04)', color: item.active ? '#ffffff' : '#94a3b8', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', border: item.active ? '1px solid rgba(37,99,235,0.4)' : '1px solid transparent' }}>
                    <span>{item.icon}</span> {item.label}
                  </div>
                ))}
              </div>

              {/* MAIN AREA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* TOPBAR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>Tableau de bord</div>
                  <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '500' }}>Mis à jour il y a 2m</div>
                </div>

                {/* KPI CARDS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {[
                    { label: 'Clients', value: '2,847', trend: '+12%', color: '#3b82f6' },
                    { label: 'Contrats', value: '1,204', trend: '+8%', color: '#8b5cf6' },
                    { label: 'Opps', value: '342', trend: '+24%', color: '#ec4899' },
                    { label: 'Revenus', value: '€248K', trend: '+18%', color: '#10b981' }
                  ].map((kpi, i) => (
                    <div key={i} style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                      <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>{kpi.label}</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#0a0a0a', marginBottom: '3px' }}>{kpi.value}</div>
                      <div style={{ fontSize: '8px', color: kpi.color, fontWeight: '600' }}>{kpi.trend}</div>
                    </div>
                  ))}
                </div>

                {/* CLIENT TABLE SNIPPET */}
                <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '10px', fontSize: '9px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.7fr', gap: '8px', marginBottom: '6px', color: '#94a3b8', fontWeight: '600', paddingBottom: '6px', borderBottom: '1px solid #e5e7eb' }}>
                    <div>Client</div>
                    <div>Statut</div>
                    <div>Valeur</div>
                  </div>
                  {[
                    { name: 'ABC Corp', status: 'Actif', value: '€18K' },
                    { name: 'XYZ Inc', status: 'En révision', value: '€12K' }
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.7fr', gap: '8px', color: '#475569', paddingBottom: '6px', borderBottom: i === 0 ? '1px solid #e5e7eb' : 'none' }}>
                      <div style={{ fontWeight: '500' }}>{row.name}</div>
                      <div style={{ padding: '3px 8px', backgroundColor: row.status === 'Actif' ? '#dcfce7' : '#fef3c7', borderRadius: '4px', color: row.status === 'Actif' ? '#166534' : '#b45309', fontSize: '8px', fontWeight: '600', width: 'fit-content' }}>{row.status}</div>
                      <div style={{ fontWeight: '600' }}>{row.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLÈMES */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 40px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '80px' }}>
          <p style={{ fontSize: '12px', color: '#999999', letterSpacing: '2px', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>LES RÉALITÉS DU COURTIER</p>
          <h2 style={{ fontSize: '40px', fontWeight: 'bold', margin: 0, marginBottom: '60px', fontFamily: 'Arial, sans-serif' }}>Ce que les autres outils ne résolvent pas</h2>

          {/* BLOC 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: '60px', alignItems: 'center', marginBottom: '60px', backgroundColor: '#f5f5f5', padding: '48px 80px', marginLeft: '-40px', marginRight: '-40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {['📧 Email', '📅 Outlook', '📄 PDF', '📝 Notes', '📌 Post-it'].map(item => (
                <div key={item} style={{ padding: '20px 12px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', fontWeight: '500', textAlign: 'center' }}>
                  {item}
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', margin: 0, fontFamily: 'Arial, sans-serif' }}>Vos données vivent partout</h3>
              <p style={{ fontSize: '16px', color: '#64748b', lineHeight: '1.7', margin: 0, fontFamily: 'Arial, sans-serif' }}>Client ABC chez vous. Historique en email. RDV en Outlook. Besoins notés sur post-it. Vous jonguez entre les outils.</p>
            </div>
          </div>

          {/* BLOC 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '60px', alignItems: 'center', marginBottom: '60px', backgroundColor: '#ffffff', padding: '48px 80px', marginLeft: '-40px', marginRight: '-40px' }}>
            <div>
              <h3 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', margin: 0, fontFamily: 'Arial, sans-serif' }}>Vous voyez les données. Pas les patterns.</h3>
              <p style={{ fontSize: '16px', color: '#64748b', lineHeight: '1.7', margin: 0, fontFamily: 'Arial, sans-serif' }}>ABC a renouvelé son auto en 2024. Vous avez déjà tous les signaux. Mais aucun outil ne les relie pour vous au bon moment.</p>
            </div>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#999999', marginBottom: '12px' }}>FICHE CLIENT</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>ABC Corp</div>
              <div style={{ fontSize: '12px', color: '#666666', lineHeight: '1.8' }}>
                Auto: 2022 → 2024 ✓<br/>
                Renouvellement: 14 déc 2024<br/>
                Secteur: Transport<br/>
                <span style={{ fontStyle: 'italic', color: '#999999' }}>=Besoin complémentaire? →</span>
              </div>
            </div>
          </div>

          {/* BLOC 3 */}
          <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', gap: '60px', alignItems: 'center', backgroundColor: '#f5f5f5', padding: '48px 80px', marginLeft: '-40px', marginRight: '-40px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignContent: 'flex-start', minHeight: '140px' }}>
              {['Appel ABC', 'Email XYZ', 'Contrat OK', 'Alerte', 'Rappel 1', 'Devis 2', 'RDV 3', 'Signature', 'Suivi', 'Doc'].map((task, i) => (
                <div key={i} style={{ padding: '6px 12px', backgroundColor: '#f0f0f0', border: '0.5px solid #d1d5db', borderRadius: '5px', fontSize: '10px', fontWeight: '500', opacity: 0.7 + (i % 3) * 0.1 }}>
                  {task}
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', margin: 0, fontFamily: 'Arial, sans-serif' }}>Votre cerveau n'a pas la place pour plus.</h3>
              <p style={{ fontSize: '16px', color: '#64748b', lineHeight: '1.7', margin: 0, fontFamily: 'Arial, sans-serif' }}>Appels. Emails. Contrats. Alertes. Clients qui rappellent. Zéro espace mental pour la stratégie commerciale.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ARK - FORTE PRÉSENCE */}
      <section style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', padding: '100px 40px', fontFamily: 'Arial, sans-serif', position: 'relative', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ marginBottom: '100px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#475569', letterSpacing: '2.5px', marginBottom: '16px', fontWeight: '700', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>⚡ ARK EN ACTION</p>
            <h2 style={{ fontSize: '44px', fontWeight: '900', margin: 0, fontFamily: 'Arial, sans-serif', letterSpacing: '-0.5px', color: '#0a0a0a', marginBottom: '12px' }}>Comment ça marche vraiment</h2>
            <p style={{ fontSize: '16px', color: '#64748b', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}>De la détection d'opportunité à la fermeture en quelques clics. ARK pense. Vous décidez.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '38% 62%', gap: '80px', alignItems: 'start' }}>
            {/* TIMELINE */}
            <div style={{ fontFamily: 'Arial, sans-serif', paddingRight: '20px' }}>
              {[
                { num: 1, icon: '📥', title: 'La fiche arrive', desc: 'ABC Corp demande devis auto', color: '#3b82f6' },
                { num: 2, icon: '🔍', title: 'ARK analyse', desc: 'Historique + données réel-time', color: '#8b5cf6' },
                { num: 3, icon: '💡', title: 'Opportunité détectée', desc: 'Renouvellement proche + besoin identifié', color: '#ec4899' },
                { num: 4, icon: '✉️', title: 'Action prête', desc: 'Email suggestion + timing optimal', color: '#f59e0b' },
                { num: 5, icon: '✓', title: 'Vous agissez', desc: 'Fermeture gagnée. Vous avez décidé.', color: '#10b981' }
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '18px', marginBottom: '36px', paddingBottom: '36px', borderBottom: i < 4 ? '2px solid #e5e7eb' : 'none', fontFamily: 'Arial, sans-serif', position: 'relative' }}>
                  <div style={{ fontSize: '28px', minWidth: '40px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', backgroundColor: `${step.color}15`, borderRadius: '10px' }}>{step.icon}</div>
                  <div style={{ flex: 1, fontFamily: 'Arial, sans-serif' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '6px', fontFamily: 'Arial, sans-serif', color: '#0a0a0a' }}>{step.title}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontFamily: 'Arial, sans-serif', lineHeight: '1.5' }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* SCREENSHOTS - PREMIUM */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', fontFamily: 'Arial, sans-serif' }}>
              {[
                {
                  title: 'Fiche client',
                  color: '#3b82f6',
                  content: (
                    <div style={{ fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
                      <div style={{ fontWeight: '700', marginBottom: '10px', fontFamily: 'Arial, sans-serif', color: '#0a0a0a', fontSize: '13px' }}>ABC Corp</div>
                      <div style={{ color: '#64748b', lineHeight: '1.8', fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span>Type</span><span style={{ fontWeight: '600', color: '#0a0a0a' }}>Entreprise</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span>Secteur</span><span style={{ fontWeight: '600', color: '#0a0a0a' }}>Transport</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span>Auto</span><span style={{ fontWeight: '600', color: '#0a0a0a' }}>2024</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>RDV</span><span style={{ fontWeight: '600', color: '#0a0a0a' }}>14 oct</span></div>
                      </div>
                    </div>
                  )
                },
                {
                  title: 'Détection ARK',
                  color: '#ec4899',
                  content: (
                    <div style={{ fontSize: '12px', fontFamily: 'Arial, sans-serif', backgroundColor: '#ec489915', padding: '12px', borderRadius: '8px', border: '1px solid #ec489930' }}>
                      <div style={{ fontWeight: '700', marginBottom: '8px', color: '#ec4899', fontFamily: 'Arial, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>💡 Opportunité détectée</div>
                      <div style={{ color: '#475569', lineHeight: '1.7', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: '500' }}>
                        Renouvellement auto<br/>
                        <strong>45 jours</strong><br/>
                        + Complémentaire?
                      </div>
                    </div>
                  )
                },
                {
                  title: 'Email suggéré',
                  color: '#f59e0b',
                  content: (
                    <div style={{ fontSize: '11px', fontFamily: 'Arial, sans-serif' }}>
                      <div style={{ fontWeight: '700', marginBottom: '8px', fontFamily: 'Arial, sans-serif', color: '#0a0a0a' }}>✉️ Par ARK</div>
                      <div style={{ color: '#64748b', lineHeight: '1.6', fontFamily: 'Arial, sans-serif' }}>
                        <strong style={{ color: '#0a0a0a' }}>Objet:</strong> Renouvellement auto - Renforcer couverture<br/>
                        <span style={{ fontStyle: 'italic', fontSize: '10px' }}>"Bonjour, votre contrat arrive à terme..."</span>
                      </div>
                    </div>
                  )
                },
                {
                  title: 'Résultat',
                  color: '#10b981',
                  content: (
                    <div style={{ fontSize: '12px', fontFamily: 'Arial, sans-serif', backgroundColor: '#10b98115', padding: '12px', borderRadius: '8px', border: '1px solid #10b98130' }}>
                      <div style={{ fontWeight: '700', marginBottom: '10px', fontFamily: 'Arial, sans-serif', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>✓ Fermeture gagnée</div>
                      <div style={{ color: '#475569', lineHeight: '1.7', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontWeight: '500' }}>
                        Valeur: <strong style={{ color: '#0a0a0a' }}>€1,200-2K</strong><br/>
                        Temps: <strong style={{ color: '#0a0a0a' }}>30-45 min</strong>
                      </div>
                    </div>
                  )
                }
              ].map((ss, i) => (
                <div key={i} style={{ padding: '20px', backgroundColor: '#ffffff', border: `1.5px solid ${ss.color}30`, borderRadius: '12px', fontFamily: 'Arial, sans-serif', boxShadow: `0 4px 12px ${ss.color}08`, transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.target.style.borderColor = `${ss.color}50`; e.target.style.boxShadow = `0 8px 20px ${ss.color}15`; e.target.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.target.style.borderColor = `${ss.color}30`; e.target.style.boxShadow = `0 4px 12px ${ss.color}08`; e.target.style.transform = 'translateY(0)'; }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: ss.color, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1.2px', fontFamily: 'Arial, sans-serif' }}>
                    {ss.title}
                  </div>
                  {ss.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 40px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '60px' }}>
            <p style={{ fontSize: '12px', color: '#999999', letterSpacing: '2px', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>COURTIA COMPLET</p>
            <h2 style={{ fontSize: '40px', fontWeight: 'bold', margin: 0, fontFamily: 'Arial, sans-serif' }}>Au-delà du CRM. Un vrai système.</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px' }}>
            {[
              { title: 'Clients', desc: 'Centralisé. Structuré. Actionnable.' },
              { title: 'Pipeline', desc: 'Kanban visual. Toujours à jour.' },
              { title: 'Contrats', desc: 'Échéances. Alertes. Conformité.' },
              { title: 'Calendrier', desc: 'RDV + briefs auto + Google Sync' },
              { title: 'Rapports', desc: 'CERFA + DDA + conformité auto' },
              { title: 'ARK IA', desc: 'Native. Toujours avec vous.' }
            ].map((mod, i) => (
              <div key={i} style={{ padding: '32px 24px', backgroundColor: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '10px', fontFamily: 'Arial, sans-serif' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', margin: 0, fontFamily: 'Arial, sans-serif' }}>{mod.title}</h3>
                <p style={{ fontSize: '13px', color: '#666666', margin: 0, lineHeight: '1.6', fontFamily: 'Arial, sans-serif' }}>{mod.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TARIFS */}
      <section style={{ backgroundColor: '#f5f5f5', padding: '80px 40px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ marginBottom: '60px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#999999', letterSpacing: '2px', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>TARIFICATION</p>
            <h2 style={{ fontSize: '40px', fontWeight: 'bold', margin: 0, fontFamily: 'Arial, sans-serif' }}>Transparente. Sans surprise. Garantie à vie.</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { name: 'START', price: '39', desc: 'Pour débuter' },
              { name: 'PRO', price: '69', desc: 'Pour la plupart', featured: true },
              { name: 'ELITE', price: '129', desc: 'Illimité' }
            ].map((tier, i) => (
              <div key={i} style={{ padding: '40px 32px', border: tier.featured ? '2px solid #0a0a0a' : '0.5px solid #d1d5db', borderRadius: '10px', backgroundColor: tier.featured ? '#0a0a0a' : '#ffffff', color: tier.featured ? '#ffffff' : '#0a0a0a', textAlign: 'center', position: 'relative', fontFamily: 'Arial, sans-serif' }}>
                {tier.featured && (
                  <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#2563eb', color: '#ffffff', padding: '4px 14px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}>
                    MEILLEUR CHOIX
                  </div>
                )}
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', margin: tier.featured ? '8px 0 16px 0' : 0, fontFamily: 'Arial, sans-serif' }}>{tier.name}</h3>
                <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'Arial, sans-serif' }}>{tier.price}€</div>
                <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '24px', fontFamily: 'Arial, sans-serif' }}>/mois</div>
                <p style={{ fontSize: '12px', marginBottom: '24px', margin: 0, fontFamily: 'Arial, sans-serif' }}>{tier.desc}</p>
                <button onClick={() => navigate('/register')} style={{ width: '100%', padding: '12px 16px', backgroundColor: tier.featured ? '#2563eb' : '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>
                  Commencer
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 'bold', marginBottom: '32px', fontFamily: 'Arial, sans-serif' }}>
          Prêt à transformer votre courtage?
        </h2>
        <button onClick={() => navigate('/register')} style={{ padding: '14px 48px', backgroundColor: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'Arial, sans-serif' }}>
          Rejoindre COURTIA
          <ArrowRight size={16} />
        </button>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '60px 40px', backgroundColor: '#f5f5f5', borderTop: '0.5px solid #e5e7eb', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '24px', letterSpacing: '2px', fontFamily: 'Arial, sans-serif' }}>COURTIA</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '24px', fontSize: '12px', color: '#666666', fontFamily: 'Arial, sans-serif' }}>
          <a href="#" style={{ textDecoration: 'none', color: 'inherit', fontFamily: 'Arial, sans-serif' }}>Mentions légales</a>
          <a href="#" style={{ textDecoration: 'none', color: 'inherit', fontFamily: 'Arial, sans-serif' }}>Confidentialité</a>
          <a href="#" style={{ textDecoration: 'none', color: 'inherit', fontFamily: 'Arial, sans-serif' }}>Contact</a>
        </div>
        <p style={{ fontSize: '11px', color: '#999999', margin: 0, fontFamily: 'Arial, sans-serif' }}>© 2026 COURTIA • Made by RHASRHASS Dalil ⊗ ARK</p>
      </footer>
    </div>
  )
}
