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
      <section style={{ minHeight: '90vh', paddingTop: '100px', paddingBottom: '80px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ position: 'absolute', top: '20%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px', width: '100%', position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', lineHeight: '1.2', marginBottom: '24px', margin: 0, fontFamily: 'Arial, sans-serif' }}>
            Le premier CRM où l'IA<br/>travaille vraiment avec le courtier
          </h1>

          <p style={{ fontSize: '18px', color: '#64748b', lineHeight: '1.8', maxWidth: '680px', marginBottom: '40px', fontFamily: 'Arial, sans-serif' }}>
            ARK analyse vos données, détecte les opportunités et vous propose les bonnes actions. Vous gardez la main. Vous allez plus vite.
          </p>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '100px', fontFamily: 'Arial, sans-serif' }}>
            <button onClick={() => navigate('/register')} style={{ padding: '14px 40px', backgroundColor: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Arial, sans-serif' }}>
              Rejoindre maintenant
              <ArrowRight size={16} />
            </button>
            <button style={{ padding: '14px 40px', backgroundColor: '#ffffff', color: '#0a0a0a', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>
              Voir la démo
            </button>
          </div>

          {/* MOCKUP HERO */}
          <div style={{ background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)', border: '0.5px solid #e5e7eb', borderRadius: '12px', padding: '20px', boxShadow: '0 40px 80px rgba(0, 0, 0, 0.1), 0 0 30px rgba(37, 99, 235, 0.08)', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '0.5px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['#ff5f57', '#ffbd2e', '#28c940'].map(color => (
                  <div key={color} style={{ width: '10px', height: '10px', backgroundColor: color, borderRadius: '50%' }} />
                ))}
              </div>
              <div style={{ fontSize: '10px', color: '#999999', flex: 1, textAlign: 'center' }}>courtia.app</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ backgroundColor: '#0a0a0a', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {['Dashboard', 'Clients', 'Pipeline', 'ARK'].map((item, i) => (
                  <div key={item} style={{ fontSize: '10px', padding: '8px 12px', backgroundColor: i === 0 ? '#2563eb' : 'rgba(255,255,255,0.08)', color: i === 0 ? '#ffffff' : '#999999', borderRadius: '5px' }}>
                    {item}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Clients', value: '2,847' },
                  { label: 'Contrats', value: '1,204' },
                  { label: 'Opps', value: '342' },
                  { label: 'Semaine', value: '94' }
                ].map((kpi, i) => (
                  <div key={i} style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '6px', border: '0.5px solid #e5e7eb', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#999999', marginBottom: '3px' }}>{kpi.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0a0a0a' }}>{kpi.value}</div>
                  </div>
                ))}
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

      {/* ARK - SIMPLE ET ROBUSTE */}
      <section style={{ backgroundColor: '#f5f5f5', padding: '80px 40px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ marginBottom: '80px' }}>
            <p style={{ fontSize: '12px', color: '#999999', letterSpacing: '2px', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>ARK EN ACTION</p>
            <h2 style={{ fontSize: '40px', fontWeight: 'bold', margin: 0, fontFamily: 'Arial, sans-serif' }}>Comment ça marche vraiment</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '60px', alignItems: 'start' }}>
            {/* TIMELINE */}
            <div style={{ fontFamily: 'Arial, sans-serif' }}>
              {[
                { num: 1, icon: '📥', title: 'La fiche arrive', desc: 'ABC Corp demande devis auto' },
                { num: 2, icon: '🔍', title: 'ARK analyse', desc: 'Historique + données réel-time' },
                { num: 3, icon: '💡', title: 'Opportunité détectée', desc: 'Renouvellement proche + besoin identifié' },
                { num: 4, icon: '✉️', title: 'Action prête', desc: 'Email suggestion + timing optimal' },
                { num: 5, icon: '✓', title: 'Vous agissez', desc: 'Fermeture gagnée. Vous avez décidé.' }
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '32px', paddingBottom: '32px', borderBottom: i < 4 ? '1px solid #e5e7eb' : 'none', fontFamily: 'Arial, sans-serif' }}>
                  <div style={{ fontSize: '24px', minWidth: '30px' }}>{step.icon}</div>
                  <div style={{ flex: 1, fontFamily: 'Arial, sans-serif' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px', fontFamily: 'Arial, sans-serif' }}>{step.title}</div>
                    <div style={{ fontSize: '13px', color: '#666666', fontFamily: 'Arial, sans-serif' }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* SCREENSHOTS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontFamily: 'Arial, sans-serif' }}>
              {[
                {
                  title: 'Fiche client',
                  content: (
                    <div style={{ fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontFamily: 'Arial, sans-serif' }}>ABC Corp</div>
                      <div style={{ color: '#666666', lineHeight: '1.6', fontFamily: 'Arial, sans-serif' }}>
                        Type: Entreprise<br/>
                        Secteur: Transport<br/>
                        Contrat auto: 2024<br/>
                        Dernier RDV: 14 oct
                      </div>
                    </div>
                  )
                },
                {
                  title: 'Détection ARK',
                  content: (
                    <div style={{ fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#2563eb', fontFamily: 'Arial, sans-serif' }}>💡 Opportunité détectée</div>
                      <div style={{ color: '#666666', lineHeight: '1.6', fontFamily: 'Arial, sans-serif' }}>
                        Renouvellement auto proche<br/>
                        + Opportunité:<br/>
                        Complémentaire?
                      </div>
                    </div>
                  )
                },
                {
                  title: 'Email suggéré',
                  content: (
                    <div style={{ fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontFamily: 'Arial, sans-serif' }}>✉️ Par ARK</div>
                      <div style={{ color: '#666666', lineHeight: '1.6', fontFamily: 'Arial, sans-serif', fontStyle: 'italic' }}>
                        Objet: Renouvellement auto<br/>
                        "Bonjour, je vous relance car votre contrat arrive à terme..."
                      </div>
                    </div>
                  )
                },
                {
                  title: 'Résultat',
                  content: (
                    <div style={{ fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontFamily: 'Arial, sans-serif' }}>✓ Fermeture gagnée</div>
                      <div style={{ color: '#666666', lineHeight: '1.6', fontFamily: 'Arial, sans-serif' }}>
                        Valeur potentielle: €1,200-2K<br/>
                        Temps gagné: 30-45 min<br/>
                        ARK propose. Vous agissez.
                      </div>
                    </div>
                  )
                }
              ].map((ss, i) => (
                <div key={i} style={{ padding: '24px', backgroundColor: '#ffffff', border: '0.5px solid #d1d5db', borderRadius: '10px', fontFamily: 'Arial, sans-serif' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#999999', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Arial, sans-serif' }}>
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
