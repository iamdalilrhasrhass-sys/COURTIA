import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
 const navigate = useNavigate();

 useEffect(() => {
 const observer = new IntersectionObserver(
 (entries) => entries.forEach(e => {
 if (e.isIntersecting) e.target.classList.add('visible');
 }),
 { threshold: 0.1 }
 );
 document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
 return () => observer.disconnect();
 }, []);

 return (
 <div style={{fontFamily:'Arial,sans-serif',background:'#fff',color:'#0a0a0a'}}>
 <style>{`
 *{box-sizing:border-box;margin:0;padding:0;}
 @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
 @keyframes fadeIn{from{opacity:0}to{opacity:1}}
 @keyframes floatUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
 @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
 @keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
 @keyframes badgePulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.3)}50%{box-shadow:0 0 0 6px rgba(34,197,94,0)}}
 .h1-l1{animation:slideUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both}
 .h1-l2{animation:slideUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s both}
 .h1-l3{animation:slideUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s both}
 .hero-badge{animation:fadeIn 0.6s ease 0s both;animation-name:badgePulse,fadeIn}
 .hero-sub{animation:fadeIn 0.8s ease 0.7s both}
 .hero-btns{animation:fadeIn 0.8s ease 0.9s both}
 .hero-proof{animation:fadeIn 0.8s ease 1.1s both}
 .mockup-wrap{animation:floatUp 1s cubic-bezier(0.16,1,0.3,1) 0.3s both;transition:transform 0.6s ease}
 .mockup-wrap:hover{transform:perspective(1000px) rotateY(0deg) rotateX(0deg) translateY(-4px)}
 .dot1{animation:dotBounce 1.2s ease 0s infinite}
 .dot2{animation:dotBounce 1.2s ease 0.2s infinite}
 .dot3{animation:dotBounce 1.2s ease 0.4s infinite}
 .badge-dot-live{animation:pulse 2s ease infinite}
 .plan-card{transition:transform 0.3s ease,box-shadow 0.3s ease}
 .plan-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,0.08)}
 .reveal{opacity:0;transform:translateY(20px);transition:opacity 0.7s ease,transform 0.7s ease}
 .reveal.visible{opacity:1;transform:translateY(0)}
 .reveal-d1{transition-delay:0.1s}
 .reveal-d2{transition-delay:0.2s}
 .reveal-d3{transition-delay:0.3s}
 .reveal-d4{transition-delay:0.4s}
 .reveal-d5{transition-delay:0.5s}
 .reveal-d6{transition-delay:0.6s}
 .nav-link:hover{color:#0a0a0a;transition:color 0.2s}
 .btn-ghost:hover{background:#f5f5f5;transition:background 0.2s}
 .btn-main:hover{background:#222;transition:background 0.2s}
 .cta-bar-fill{animation:none}
 .cta-bar-fill.visible{animation:barFill 1.5s cubic-bezier(0.16,1,0.3,1) 0.3s both}
 @keyframes barFill{from{width:0}to{width:62%}}
 `}</style>

 {/* NAV */}
 <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 56px',background:'#fff',borderBottom:'0.5px solid #f0f0f0'}}>
 <div style={{fontSize:12,fontWeight:900,letterSpacing:5,color:'#0a0a0a'}}>COURTIA</div>
 <div style={{display:'flex',gap:36}}>
 {['Fonctionnalités','ARK IA','Tarifs'].map(l => (
 <span key={l} className="nav-link" style={{fontSize:12,color:'#999',cursor:'pointer',letterSpacing:0.3}}>{l}</span>
 ))}
 </div>
 <div style={{display:'flex',alignItems:'center',gap:16}}>
 <span style={{fontSize:12,color:'#666',cursor:'pointer'}} onClick={() => navigate('/login')}>Connexion</span>
 <div onClick={() => navigate('/register')} style={{background:'#0a0a0a',color:'#fff',padding:'9px 20px',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer',letterSpacing:0.5}}>Rejoindre →</div>
 </div>
 </nav>

 {/* HERO */}
 <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:640,borderBottom:'0.5px solid #f0f0f0'}}>
 <div style={{padding:'72px 56px',display:'flex',flexDirection:'column',justifyContent:'center',borderRight:'0.5px solid #f0f0f0'}}>
 <div className="hero-badge" style={{display:'inline-flex',alignItems:'center',gap:7,border:'0.5px solid #e0e0e0',borderRadius:20,padding:'5px 14px',fontSize:10,color:'#555',letterSpacing:0.5,width:'fit-content',marginBottom:36}}>
 <div className="badge-dot-live" style={{width:6,height:6,borderRadius:'50%',background:'#22c55e'}}></div>
 Offre Fondateur — 31 places restantes
 </div>
 <div className="h1-l1" style={{fontSize:52,fontWeight:900,lineHeight:1.04,letterSpacing:-2,color:'#0a0a0a'}}>Le CRM qui</div>
 <div className="h1-l2" style={{fontSize:52,fontWeight:900,lineHeight:1.04,letterSpacing:-2,color:'#0a0a0a'}}>travaille avec</div>
 <div className="h1-l3" style={{fontSize:52,fontWeight:900,lineHeight:1.04,letterSpacing:-2,color:'#2563eb',marginBottom:28}}>votre intelligence.</div>
 <p className="hero-sub" style={{fontSize:15,color:'#777',lineHeight:1.75,marginBottom:40,maxWidth:380}}>ARK détecte vos opportunités, rédige vos relances et analyse votre portefeuille. En temps réel. Pendant que vous conseillez.</p>
 <div className="hero-btns" style={{display:'flex',gap:10,marginBottom:56}}>
 <div onClick={() => navigate('/register')} style={{background:'#0a0a0a',color:'#fff',padding:'14px 28px',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}} className="btn-main">Rejoindre — 69€/mois →</div>
 <div style={{background:'#fff',color:'#0a0a0a',padding:'14px 28px',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',border:'0.5px solid #ddd'}} className="btn-ghost">Voir la démo</div>
 </div>
 <div className="hero-proof" style={{display:'flex',gap:32,paddingTop:32,borderTop:'0.5px solid #f0f0f0'}}>
 {[['32 000','courtiers ORIAS en France'],['ARK','IA native — aucun concurrent'],['69€','tarif fondateur garanti à vie']].map(([n,l]) => (
 <div key={n} style={{textAlign:'center'}}>
 <div style={{fontSize:22,fontWeight:900,color:'#0a0a0a',letterSpacing:-0.5}}>{n}</div>
 <div style={{fontSize:11,color:'#aaa',marginTop:2}}>{l}</div>
 </div>
 ))}
 </div>
 </div>

 <div style={{background:'#fafafa',display:'flex',alignItems:'center',justifyContent:'center',padding:40}}>
 <div className="mockup-wrap" style={{width:'100%',background:'#fff',borderRadius:14,border:'0.5px solid #e0e0e0',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.08),0 4px 16px rgba(0,0,0,0.04)',transform:'perspective(1000px) rotateY(-2deg) rotateX(1deg)'}}>
 <div style={{background:'#f2f2f2',padding:'9px 14px',display:'flex',alignItems:'center',gap:6,borderBottom:'0.5px solid #e8e8e8'}}>
 {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{width:9,height:9,borderRadius:'50%',background:c}}></div>)}
 <div style={{flex:1,background:'#fff',borderRadius:4,padding:'3px 10px',fontSize:9,color:'#bbb',textAlign:'center',margin:'0 10px',border:'0.5px solid #ebebeb'}}>courtia.app</div>
 </div>
 <div style={{display:'grid',gridTemplateColumns:'130px 1fr'}}>
 <div style={{background:'#080808',display:'flex',flexDirection:'column',minHeight:320}}>
 <div style={{padding:'14px 14px 0'}}>
 <div style={{fontSize:9,fontWeight:900,letterSpacing:3,color:'#fff',marginBottom:18,paddingBottom:14,borderBottom:'0.5px solid rgba(255,255,255,0.06)'}}>COURTIA</div>
 {[['Dashboard',true],['Clients',false],['Contrats',false],['Pipeline',false],['Calendrier',false]].map(([label,active]) => (
 <div key={label} style={{padding:'8px 10px',borderRadius:5,fontSize:9,display:'flex',alignItems:'center',gap:7,color:active?'#fff':'rgba(255,255,255,0.3)',background:active?'rgba(255,255,255,0.08)':'transparent'}}>
 {active && <div style={{width:3,height:12,background:'#2563eb',borderRadius:1,marginLeft:-4}}></div>}
 {label}
 </div>
 ))}
 </div>
 <div style={{margin:'auto 10px 12px',background:'rgba(37,99,235,0.1)',border:'0.5px solid rgba(37,99,235,0.2)',borderRadius:7,padding:'9px 10px'}}>
 <div style={{fontSize:9,fontWeight:900,color:'#60a5fa',letterSpacing:1.5,marginBottom:3}}>
 <span style={{display:'inline-block',width:5,height:5,borderRadius:'50%',background:'#22c55e',marginRight:5,verticalAlign:'middle'}}></span>
 ARK
 </div>
 <div style={{fontSize:8,color:'rgba(255,255,255,0.25)'}}>En ligne · 24h/24</div>
 </div>
 </div>
 <div style={{background:'#fafafa',padding:14}}>
 <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
 <div style={{fontSize:11,fontWeight:700,color:'#0a0a0a'}}>Bonjour Dalil</div>
 <div style={{fontSize:8,color:'#bbb'}}>Mis à jour il y a 2 min</div>
 </div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,marginBottom:10}}>
 {[['CLIENTS','247','+12 ce mois','#22c55e'],['CONTRATS','189','+5 sem.','#22c55e'],['COMMISSIONS','8.4K€','+18%','#22c55e'],['ÉCHÉANCES','14','3 urgentes','#ef4444']].map(([l,v,d,dc]) => (
 <div key={l} style={{background:'#fff',borderRadius:6,padding:8,border:'0.5px solid #efefef'}}>
 <div style={{fontSize:7,color:'#bbb',letterSpacing:0.5,fontWeight:700,marginBottom:3}}>{l}</div>
 <div style={{fontSize:14,fontWeight:900,color:'#0a0a0a',lineHeight:1}}>{v}</div>
 <div style={{fontSize:7,color:dc,marginTop:2}}>{d}</div>
 </div>
 ))}
 </div>
 <div style={{display:'grid',gridTemplateColumns:'1fr 88px',gap:8}}>
 <div style={{background:'#fff',borderRadius:6,border:'0.5px solid #efefef',overflow:'hidden'}}>
 <div style={{padding:'6px 8px',borderBottom:'0.5px solid #f5f5f5',display:'flex',justifyContent:'space-between',fontSize:8,fontWeight:700,color:'#0a0a0a'}}>Clients récents <span style={{color:'#2563eb',fontWeight:400}}>Voir tout →</span>
 </div>
 {[['MR','Martin Renaud','#dbeafe','#1d4ed8','Actif','#d1fae5','#065f46'],['SB','Sophie Blanc','#d1fae5','#065f46','Actif','#d1fae5','#065f46'],['KA','Karim Amara','#ede9fe','#5b21b6','Prospect','#fef3c7','#92400e']].map(([av,name,ab,ac,st,sb,sc]) => (
 <div key={av} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 8px',borderBottom:'0.5px solid #fafafa'}}>
 <div style={{width:18,height:18,borderRadius:'50%',background:ab,color:ac,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:700,flexShrink:0}}>{av}</div>
 <span style={{fontSize:8,fontWeight:500,flex:1,color:'#111'}}>{name}</span>
 <span style={{fontSize:7,padding:'2px 5px',borderRadius:5,fontWeight:700,background:sb,color:sc}}>{st}</span>
 </div>
 ))}
 </div>
 <div style={{background:'#080808',borderRadius:6,display:'flex',flexDirection:'column',overflow:'hidden'}}>
 <div style={{padding:'6px 8px',borderBottom:'0.5px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',gap:4}}>
 <div style={{width:4,height:4,borderRadius:'50%',background:'#22c55e'}}></div>
 <span style={{fontSize:8,fontWeight:900,color:'#60a5fa',letterSpacing:1}}>ARK</span>
 </div>
 <div style={{padding:6,display:'flex',flexDirection:'column',gap:4,flex:1}}>
 <div style={{fontSize:7,lineHeight:1.4,padding:'4px 6px',borderRadius:3,background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.65)'}}>3 contrats à relancer.</div>
 <div style={{fontSize:7,lineHeight:1.4,padding:'4px 6px',borderRadius:3,background:'rgba(37,99,235,0.2)',color:'rgba(255,255,255,0.8)',textAlign:'right'}}>Email Renaud</div>
 <div style={{fontSize:7,lineHeight:1.4,padding:'4px 6px',borderRadius:3,background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.65)'}}>Prêt. Envoyer ?</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* SECTION ARK */}
 <div style={{background:'#080808',padding:'96px 56px'}}>
 <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'center',maxWidth:1100,margin:'0 auto'}}>
 <div>
 <div className="reveal" style={{fontSize:10,fontWeight:700,letterSpacing:3,color:'rgba(255,255,255,0.3)',marginBottom:20}}>ARK — INTELLIGENCE NATIVE</div>
 <div className="reveal reveal-d1" style={{fontSize:44,fontWeight:900,lineHeight:1.06,letterSpacing:-1.5,color:'#fff',marginBottom:20}}>Pas un chatbot.<br/>Un <span style={{color:'#60a5fa'}}>copilote</span><br/>qui agit.</div>
 <p className="reveal reveal-d2" style={{fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:1.8,marginBottom:40}}>ARK lit votre portefeuille, détecte les signaux faibles et vous propose les bonnes actions au bon moment. Il ne vous assiste pas. Il travaille avec vous.</p>
 <div style={{display:'flex',flexDirection:'column',gap:16}}>
 {[
 ['Détection d\'opportunités','Renouvellements, cross-sell, résiliations — détectés avant vous.','reveal reveal-d3'],
 ['Rédaction intelligente','Emails, relances, propositions — générés et personnalisés en 1 clic.','reveal reveal-d4'],
 ['Conformité automatique','DDA, RGPD, ORIAS — ARK connaît les règles et les applique.','reveal reveal-d5'],
 ].map(([t,d,cls]) => (
 <div key={t} className={cls} style={{display:'flex',gap:14,alignItems:'flex-start'}}>
 <div style={{width:32,height:32,borderRadius:7,background:'rgba(37,99,235,0.12)',border:'0.5px solid rgba(37,99,235,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
 <div style={{width:8,height:8,borderRadius:'50%',background:'#60a5fa'}}></div>
 </div>
 <div>
 <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:3}}>{t}</div>
 <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',lineHeight:1.5}}>{d}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 <div className="reveal reveal-d2">
 <div style={{background:'#0f0f0f',borderRadius:14,border:'0.5px solid rgba(255,255,255,0.06)',overflow:'hidden'}}>
 <div style={{padding:'14px 18px',borderBottom:'0.5px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',gap:10}}>
 <div style={{width:28,height:28,borderRadius:7,background:'rgba(37,99,235,0.15)',border:'0.5px solid rgba(37,99,235,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
 <div style={{width:8,height:8,borderRadius:'50%',background:'#60a5fa'}}></div>
 </div>
 <span style={{fontSize:12,fontWeight:700,color:'#fff',letterSpacing:1}}>ARK</span>
 <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:5}}>
 <div style={{width:6,height:6,borderRadius:'50%',background:'#22c55e'}}></div>
 <span style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>En ligne</span>
 </div>
 </div>
 <div style={{padding:16,display:'flex',flexDirection:'column',gap:10}}>
 <div>
 <div style={{fontSize:9,letterSpacing:1,color:'rgba(255,255,255,0.2)',fontWeight:700,marginBottom:3}}>ARK</div>
 <div style={{padding:'10px 13px',borderRadius:'4px 10px 10px 10px',fontSize:12,lineHeight:1.6,background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.75)',border:'0.5px solid rgba(255,255,255,0.05)'}}>Bonjour Dalil. Martin Renaud — contrat auto, échéance dans 14 jours. Risque de résiliation élevé. Je recommande un contact cette semaine.</div>
 </div>
 <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end'}}><div style={{fontSize:9,letterSpacing:1,color:'rgba(255,255,255,0.2)',fontWeight:700,marginBottom:3}}>Vous</div>
 <div style={{padding:'10px 13px',borderRadius:'10px 4px 10px 10px',fontSize:12,lineHeight:1.6,background:'rgba(37,99,235,0.15)',color:'rgba(255,255,255,0.8)',border:'0.5px solid rgba(37,99,235,0.2)'}}>Rédige un email de relance personnalisé</div>
 </div>
 <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0'}}>
 <div style={{display:'flex',gap:4}}>
 {[0,1,2].map(i => <div key={i} className={`dot${i+1}`} style={{width:5,height:5,borderRadius:'50%',background:'rgba(37,99,235,0.5)'}}></div>)}
 </div>
 <span style={{fontSize:10,color:'rgba(255,255,255,0.2)',letterSpacing:0.5}}>ARK rédige...</span>
 </div>
 <div>
 <div style={{fontSize:9,letterSpacing:1,color:'rgba(255,255,255,0.2)',fontWeight:700,marginBottom:3}}>ARK</div>
 <div style={{padding:'10px 13px',borderRadius:'4px 10px 10px 10px',fontSize:12,lineHeight:1.6,background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.75)',border:'0.5px solid rgba(255,255,255,0.05)'}}>Email prêt. Objet : "Votre contrat auto arrive à terme — offre exclusive". J'ai intégré son historique. Voulez-vous que je l'envoie ?</div>
 </div>
 </div>
 <div style={{padding:'12px 16px',borderTop:'0.5px solid rgba(255,255,255,0.05)',display:'flex',gap:8}}>
 <div style={{flex:1,background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:7,padding:'8px 12px',fontSize:11,color:'rgba(255,255,255,0.3)',fontFamily:'Arial'}}>Demandez à ARK...</div>
 <div style={{background:'#2563eb',borderRadius:7,padding:'8px 14px',fontSize:11,color:'#fff',cursor:'pointer',fontWeight:700}}>Envoyer</div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* PRICING */}
 <div style={{padding:'96px 56px',background:'#fff'}}>
 <div style={{textAlign:'center',marginBottom:56}}>
 <div style={{fontSize:10,fontWeight:700,letterSpacing:3,color:'#bbb',marginBottom:16}}>TARIFICATION</div>
 <div style={{fontSize:44,fontWeight:900,letterSpacing:-1.5,color:'#0a0a0a',marginBottom:10}}>Transparent. Sans surprise.</div>
 <div style={{fontSize:14,color:'#999',marginBottom:16}}>Garanti à vie pour les 50 premiers fondateurs.</div>
 <span style={{display:'inline-flex',alignItems:'center',gap:8,background:'#fff8f0',border:'0.5px solid #fed7aa',borderRadius:20,padding:'6px 16px',fontSize:11,color:'#c2410c',fontWeight:700}}>
 31 / 50 places prises — il reste 19 places
 </span>
 </div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,maxWidth:900,margin:'0 auto'}}>
 {[
 {name:'START',price:'39€',old:'59€',sub:'Pour débuter',feats:['100 clients','ARK basique','Dashboard KPIs','Support email'],featured:false},
 {name:'PRO',price:'69€',old:'99€',sub:'Pour la plupart',feats:['500 clients','ARK complet','Rapports avancés','Support prioritaire'],featured:true},
 {name:'ELITE',price:'129€',old:'179€',sub:'Illimité',feats:['Clients illimités','ARK vocal','API publique','Account Manager'],featured:false},
 ].map(p => (
 <div key={p.name} className="plan-card" style={{borderRadius:14,padding:28,border:p.featured?'1.5px solid #0a0a0a':'0.5px solid #ebebeb',background:p.featured?'#0a0a0a':'#fff',display:'flex',flexDirection:'column'}}>
 {p.featured && <div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,background:'#fff',color:'#0a0a0a',padding:'4px 10px',borderRadius:10,width:'fit-content',marginBottom:14}}>MEILLEUR CHOIX</div>}
 <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:p.featured?'rgba(255,255,255,0.4)':'#aaa',marginBottom:8}}>{p.name}</div>
 <div style={{fontSize:48,fontWeight:900,color:p.featured?'#fff':'#0a0a0a',letterSpacing:-2,lineHeight:1}}>{p.price}</div>
 <div style={{fontSize:13,color:'#ccc',textDecoration:'line-through',marginTop:4,marginBottom:20}}>{p.old}/mois</div>
 <div style={{height:'0.5px',background:p.featured?'rgba(255,255,255,0.08)':'#f0f0f0',marginBottom:20}}></div>
 <div style={{display:'flex',flexDirection:'column',gap:10,flex:1,marginBottom:24}}>
 {p.feats.map(f => (
 <div key={f} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:p.featured?'rgba(255,255,255,0.6)':'#555'}}>
 <div style={{width:14,height:14,borderRadius:'50%',background:p.featured?'rgba(255,255,255,0.1)':'#f0f0f0',flexShrink:0}}></div>
 {f}
 </div>
 ))}
 </div>
 <button onClick={() => navigate('/register')} style={{width:'100%',padding:13,borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',border:p.featured?'none':'0.5px solid #e0e0e0',background:p.featured?'#2563eb':'#fff',color:p.featured?'#fff':'#0a0a0a',fontFamily:'Arial'}}>
 {p.featured?'Rejoindre maintenant':'Commencer'}
 </button>
 </div>
 ))}
 </div>
 </div>

 {/* CTA FINAL */}
 <div style={{padding:'96px 56px',background:'#0a0a0a',textAlign:'center'}}>
 <div className="reveal" style={{fontSize:52,fontWeight:900,letterSpacing:-2,color:'#fff',lineHeight:1.06,marginBottom:16}}>Rejoignez les<br/><span style={{color:'#60a5fa'}}>19 derniers</span> fondateurs.</div>
 <div className="reveal reveal-d1" style={{fontSize:15,color:'rgba(255,255,255,0.4)',marginBottom:40}}>Après les 50 premiers, les tarifs normaux s'appliquent. Sans exception.</div>
 <div className="reveal reveal-d2" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,marginBottom:32}}>
 <div style={{width:240,height:3,background:'rgba(255,255,255,0.08)',borderRadius:2,overflow:'hidden'}}>
 <div className="cta-bar-fill reveal" style={{width:'62%',height:'100%',background:'#2563eb',borderRadius:2}}></div>
 </div>
 <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',letterSpacing:0.5}}>31 places prises sur 50</div>
 </div>
 <div className="reveal reveal-d3" onClick={() => navigate('/register')} style={{display:'inline-block',background:'#fff',color:'#0a0a0a',padding:'16px 40px',borderRadius:10,fontSize:15,fontWeight:900,cursor:'pointer',letterSpacing:0.3}}>Je rejoins COURTIA — 69€/mois →</div>
 </div>

 {/* FOOTER */}
 <div style={{padding:'32px 56px',borderTop:'0.5px solid #f0f0f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
 <div style={{fontSize:11,fontWeight:900,letterSpacing:4,color:'#bbb'}}>COURTIA</div>
 <div style={{display:'flex',gap:24}}>
 {['Mentions légales','Confidentialité','Contact'].map(l => <span key={l} style={{fontSize:11,color:'#ccc',cursor:'pointer'}}>{l}</span>)}
 </div>
 <div style={{fontSize:11,color:'#ddd'}}>© 2026 COURTIA · Made by RHASRHASS Dalil ⊗ ARK</div>
 </div>
 </div>
 </div>
 );
}
