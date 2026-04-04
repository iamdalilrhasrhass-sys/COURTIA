import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { formatNomClient } from '../utils/format';

const API_URL = 'https://courtia.onrender.com';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contrats, setContrats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const messagesEndRef = useRef(null);

  // Load client from API using URL param
  useEffect(() => {
    const loadClient = async () => {
      if (!id || !token) {
        setError('ID ou token manquant');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/clients/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          throw new Error(`Client non trouvé (${res.status})`);
        }
        
        const data = await res.json();
        setClient(data);
        setError(null);
      } catch (err) {
        console.error('Erreur chargement client:', err);
        setError(err.message);
        setClient(null);
      } finally {
        setLoading(false);
      }
    };

    loadClient();
  }, [id, token]);

  // Load contrats du client
  useEffect(() => {
    if (!id || !token) return;
    const fetchContrats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/contracts?client_id=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setContrats(Array.isArray(data) ? data : data.contracts || []);
      } catch (err) {
        console.error('Erreur chargement contrats:', err);
        setContrats([]);
      }
    };
    fetchContrats();
  }, [id, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveEdit = async () => {
    if (!editFormData || !id || !token) return;
    try {
      const res = await fetch(`${API_URL}/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        const updated = await res.json();
        setClient(updated);
        setEditMode(false);
        const toast = require('react-hot-toast').default;
        toast.success('Client mis à jour ✓');
      }
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    }
  };

  const sendToARK = async (prompt) => {
    if (!prompt.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setInput('');
    setThinking(true);

    const clientName = client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client' : 'Client';
    const systemPrompt = `Tu es ARK, l'IA native de COURTIA, un CRM pour courtiers d'assurance français.
Client: ${clientName}
Email: ${client?.email || 'N/A'}
Statut: ${client?.status || 'Prospect'}

Réponds en français, concis et professionnel.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.REACT_APP_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 512,
          system: systemPrompt,
          messages: [...messages, { role: 'user', content: prompt }],
          stream: true
        })
      });

      if (!response.ok) {
        setThinking(false);
        setMessages(prev => [...prev, { role: 'assistant', content: 'Erreur API.' }]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      setThinking(false);

      let done = false;
      while (!done) {
        const { done: streamDone, value } = await reader.read();
        done = streamDone;
        if (!value) continue;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                fullResponse += data.delta.text;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return [...prev.slice(0, -1), { role: 'assistant', content: fullResponse }];
                  }
                  return [...prev, { role: 'assistant', content: fullResponse }];
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error('Erreur:', err);
      setThinking(false);
    }
  };

  const quickActions = [
    { label: 'Analyse ce client', prompt: 'Analyse rapidement ce client et propose les meilleures actions.' },
    { label: 'Rédige un email', prompt: 'Rédige un email de relance professionnel.' },
    { label: 'Détecte les risques', prompt: 'Quels sont les risques pour ce client ?' },
    { label: 'Opportunités cross-sell', prompt: 'Quelles opportunités cross-sell pour ce client ?' }
  ];

  if (loading) {
    return (
      <div style={{padding:'32px',fontFamily:'Arial,sans-serif',background:'#fff'}}>
        <button onClick={() => navigate('/dashboard')} style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 16px',background:'#0a0a0a',color:'#fff',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',fontWeight:600,marginBottom:'20px'}}>
          <ArrowLeft size={16} />
          Retour
        </button>
        <p style={{color:'#999',fontSize:'14px'}}>Chargement du client...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{padding:'32px',fontFamily:'Arial,sans-serif',background:'#fff'}}>
        <button onClick={() => navigate('/dashboard')} style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 16px',background:'#0a0a0a',color:'#fff',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',fontWeight:600,marginBottom:'20px'}}>
          <ArrowLeft size={16} />
          Retour
        </button>
        <div style={{padding:'16px',background:'#fee2e2',border:'0.5px solid #fca5a5',borderRadius:'8px',color:'#dc2626',fontSize:'13px'}}>
          ❌ Erreur: {error}
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{padding:'32px',fontFamily:'Arial,sans-serif',background:'#fff'}}>
        <button onClick={() => navigate('/dashboard')} style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 16px',background:'#0a0a0a',color:'#fff',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',fontWeight:600,marginBottom:'20px'}}>
          <ArrowLeft size={16} />
          Retour
        </button>
        <p style={{color:'#999',fontSize:'14px'}}>Client non trouvé</p>
      </div>
    );
  }

  const displayTitle = formatNomClient(client);

  return (
    <div style={{padding:'32px',fontFamily:'Arial,sans-serif',background:'#fff',minHeight:'100vh'}}>
      <button onClick={() => navigate('/dashboard')} style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 16px',background:'#0a0a0a',color:'#fff',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'13px',fontWeight:600,marginBottom:'24px'}}>
        <ArrowLeft size={16} />
        Retour
      </button>

      {editMode && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',padding:'32px',borderRadius:'12px',width:'90%',maxWidth:'500px'}}>
            <h2 style={{fontSize:'20px',fontWeight:700,marginBottom:'20px'}}>Modifier le client</h2>
            <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              <input type='text' placeholder='Prénom' value={editFormData?.first_name || ''} onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})} style={{padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px'}} />
              <input type='text' placeholder='Nom' value={editFormData?.last_name || ''} onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})} style={{padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px'}} />
              <input type='email' placeholder='Email' value={editFormData?.email || ''} onChange={(e) => setEditFormData({...editFormData, email: e.target.value})} style={{padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px'}} />
              <select value={editFormData?.status || ''} onChange={(e) => setEditFormData({...editFormData, status: e.target.value})} style={{padding:'8px 12px',border:'0.5px solid #ddd',borderRadius:'6px'}}>
                <option value='prospect'>Prospect</option>
                <option value='actif'>Actif</option>
                <option value='perdu'>Perdu</option>
              </select>
              <div style={{display:'flex',gap:'12px'}}>
                <button onClick={handleSaveEdit} style={{flex:1,padding:'10px',background:'#0a0a0a',color:'#fff',border:'none',borderRadius:'6px',fontWeight:600,cursor:'pointer'}}>Sauvegarder</button>
                <button onClick={() => {setEditMode(false);setEditFormData(null);}} style={{flex:1,padding:'10px',background:'#f0f0f0',color:'#0a0a0a',border:'none',borderRadius:'6px',fontWeight:600,cursor:'pointer'}}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 400px',gap:'40px'}}>
        {/* Client Info */}
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
            <h1 style={{fontSize:'32px',fontWeight:900,color:'#0a0a0a'}}>{displayTitle}</h1>
            <button onClick={() => {setEditFormData(client);setEditMode(true);}} style={{padding:'8px 16px',background:'#0a0a0a',color:'#fff',border:'none',borderRadius:'6px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>Modifier</button>
          </div>
          <div style={{background:'#fff',padding:'20px',border:'0.5px solid #f0f0f0',borderRadius:'10px',marginBottom:'20px'}}>
            <div style={{marginBottom:'10px'}}><strong>Email:</strong> {client.email || 'N/A'}</div>
            <div style={{marginBottom:'10px'}}><strong>Téléphone:</strong> {client.phone || 'N/A'}</div>
            <div style={{marginBottom:'10px'}}><strong>Statut:</strong> {client.status || 'Prospect'}</div>
            <div><strong>Societe:</strong> {client.company_name || 'N/A'}</div>
          </div>

          <h3 style={{fontSize:'18px',fontWeight:700,color:'#0a0a0a',marginBottom:'12px'}}>Contrats</h3>
          {contrats.length === 0 ? (
            <div style={{background:'#f9fafb',padding:'20px',borderRadius:'8px',textAlign:'center',color:'#999'}}>
              <p style={{fontSize:'13px'}}>Aucun contrat associé</p>
            </div>
          ) : (
            <div style={{background:'#fff',border:'0.5px solid #f0f0f0',borderRadius:'8px',overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'#f9fafb',borderBottom:'0.5px solid #f0f0f0'}}>
                    <th style={{padding:'12px',textAlign:'left',fontSize:'12px',fontWeight:600,color:'#666'}}>Type</th>
                    <th style={{padding:'12px',textAlign:'left',fontSize:'12px',fontWeight:600,color:'#666'}}>Compagnie</th>
                    <th style={{padding:'12px',textAlign:'left',fontSize:'12px',fontWeight:600,color:'#666'}}>Prime</th>
                    <th style={{padding:'12px',textAlign:'left',fontSize:'12px',fontWeight:600,color:'#666'}}>Échéance</th>
                    <th style={{padding:'12px',textAlign:'left',fontSize:'12px',fontWeight:600,color:'#666'}}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {contrats.map((contrat, idx) => (
                    <tr key={contrat.id} style={{borderTop:'0.5px solid #f0f0f0',background:idx%2===0?'#fff':'#fafafa'}}>
                      <td style={{padding:'12px',fontSize:'13px'}}>{contrat.type_contrat}</td>
                      <td style={{padding:'12px',fontSize:'13px'}}>{contrat.compagnie}</td>
                      <td style={{padding:'12px',fontSize:'13px',fontWeight:600}}>{contrat.prime_annuelle}€</td>
                      <td style={{padding:'12px',fontSize:'13px'}}>{contrat.date_echeance ? new Date(contrat.date_echeance).toLocaleDateString('fr-FR') : 'N/A'}</td>
                      <td style={{padding:'12px'}}>
                        <span style={{padding:'3px 8px',borderRadius:'4px',background:contrat.statut==='actif'?'#d1fae5':'#fee2e2',color:contrat.statut==='actif'?'#065f46':'#dc2626',fontSize:'11px',fontWeight:600}}>
                          {contrat.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ARK Widget - Dark #080808 */}
        <div style={{background:'#080808',borderRadius:'14px',border:'0.5px solid rgba(255,255,255,0.06)',overflow:'hidden',display:'flex',flexDirection:'column',height:'600px'}}>
          {/* Header */}
          <div style={{padding:'16px 18px',borderBottom:'0.5px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'28px',height:'28px',borderRadius:'7px',background:'rgba(37,99,235,0.15)',border:'0.5px solid rgba(37,99,235,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#60a5fa'}}></div>
            </div>
            <span style={{fontSize:'12px',fontWeight:700,color:'#fff',letterSpacing:'1px'}}>ARK</span>
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'5px'}}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#22c55e',animation:'pulse 2s ease infinite'}}></div>
              <span style={{fontSize:'10px',color:'rgba(255,255,255,0.3)'}}>En ligne</span>
            </div>
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'12px'}}>
            {messages.length === 0 && (
              <div style={{textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:'12px',marginTop:'40px'}}>
                Parlez à ARK
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start'}}>
                <div style={{padding:'10px 13px',borderRadius:msg.role==='user'?'10px 4px 10px 10px':'4px 10px 10px 10px',fontSize:'12px',lineHeight:'1.6',background:msg.role==='user'?'rgba(37,99,235,0.15)':'rgba(255,255,255,0.04)',color:msg.role==='user'?'rgba(255,255,255,0.8)':'rgba(255,255,255,0.75)',border:msg.role==='user'?'0.5px solid rgba(37,99,235,0.2)':'0.5px solid rgba(255,255,255,0.05)',maxWidth:'70%'}}>
                  {msg.content}
                </div>
              </div>
            ))}
            {thinking && (
              <div style={{display:'flex',alignItems:'center',gap:'6px',color:'rgba(255,255,255,0.3)',fontSize:'11px'}}>
                <div style={{display:'flex',gap:'3px'}}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{width:'4px',height:'4px',borderRadius:'50%',background:'rgba(37,99,235,0.5)',animation:`dotBounce 1.2s ease ${i*0.2}s infinite`}}></div>
                  ))}
                </div>
                ARK réfléchit...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div style={{padding:'12px 16px',borderTop:'0.5px solid rgba(255,255,255,0.05)',display:'flex',gap:'6px',flexWrap:'wrap'}}>
            {quickActions.map(action => (
              <button key={action.label} onClick={() => sendToARK(action.prompt)} disabled={thinking} style={{flex:'1 1 auto',minWidth:'90px',padding:'6px 10px',background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'6px',color:'rgba(255,255,255,0.5)',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'Arial'}}>
                {action.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{padding:'12px 16px',borderTop:'0.5px solid rgba(255,255,255,0.05)',display:'flex',gap:'8px'}}>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key==='Enter' && sendToARK(input)} placeholder="Demandez à ARK..." style={{flex:1,background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'6px',padding:'8px 12px',fontSize:'11px',color:'#fff',fontFamily:'Arial'}} />
            <button onClick={() => sendToARK(input)} disabled={!input.trim() || thinking} style={{background:'#2563eb',borderRadius:'6px',padding:'8px 12px',fontSize:'11px',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontFamily:'Arial'}}>→</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes dotBounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }
      `}</style>
    </div>
  );
}
