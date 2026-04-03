import { useState, useRef, useEffect } from 'react';

export default function ARKDemo() {
 const [messages, setMessages] = useState([{ role: 'assistant', content: 'Bonjour. Je suis ARK, l\'assistant IA natif de COURTIA. Posez-moi une question sur la gestion de votre portefeuille d\'assurance.' }]);
 const [input, setInput] = useState('');
 const [loading, setLoading] = useState(false);
 const [thinking, setThinking] = useState(false);
 const messagesEndRef = useRef(null);

 useEffect(() => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [messages]);

 const sendToARK = async (prompt) => {
 if (!prompt.trim()) return;

 setMessages(prev => [...prev, { role: 'user', content: prompt }]);
 setInput('');
 setThinking(true);

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
 system: `Tu es ARK, l'IA native de COURTIA, un CRM pour courtiers d'assurance français.
Tu es en démo sur la landing page de COURTIA.
Réponds en français, de façon concise et professionnelle (max 3 lignes).
Montre ta valeur métier pour un courtier d'assurance.`,
 messages: messages.map(m => ({ role: m.role, content: m.content })).concat([{ role: 'user', content: prompt }]),
 stream: true
 })
 });

 if (!response.ok) {
 setThinking(false);
 setMessages(prev => [...prev, { role: 'assistant', content: 'Erreur API. Réessayez.' }]);
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
 } catch (e) {
 // skip
 }
 }
 }
 }
 } catch (err) {
 console.error('Erreur:', err);
 setThinking(false);
 }
 };

 const suggestions = [
 'Analyse un client qui risque de résilier',
 'Rédige un email de relance',
 'Quelles opportunités cross-sell ?'
 ];

 return (
 <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
 {/* Messages */}
 <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px' }}>
 {messages.map((msg, i) => (
 <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
 <div style={{ padding: '10px 13px', borderRadius: msg.role === 'user' ? '10px 4px 10px 10px' : '4px 10px 10px 10px', fontSize: '12px', lineHeight: '1.6', background: msg.role === 'user' ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.04)', color: msg.role === 'user' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.75)', border: msg.role === 'user' ? '0.5px solid rgba(37,99,235,0.2)' : '0.5px solid rgba(255,255,255,0.05)', maxWidth: '85%' }}>
 {msg.content}
 </div>
 </div>
 ))}
 {thinking && (
 <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
 <div style={{ display: 'flex', gap: '3px' }}>
 {[0, 1, 2].map(i => (
 <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(37,99,235,0.5)', animation: `dotBounce 1.2s ease ${i * 0.2}s infinite` }}></div>
 ))}
 </div>
 ARK réfléchit...
 </div>
 )}
 <div ref={messagesEndRef} />
 </div>

 {/* Suggestions */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
 {suggestions.map(sug => (
 <button key={sug} onClick={() => sendToARK(sug)} disabled={thinking} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.color = 'rgba(255,255,255,0.8)'; }} onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.04)'; e.target.style.color = 'rgba(255,255,255,0.5)'; }}>
 💭 {sug}
 </button>
 ))}
 </div>

 {/* Input */}
 <div style={{ display: 'flex', gap: '8px' }}>
 <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendToARK(input)} placeholder="Posez à ARK..." style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', color: '#fff', fontFamily: 'Arial' }} />
 <button onClick={() => sendToARK(input)} disabled={!input.trim() || thinking} style={{ background: '#2563eb', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700' }}>→</button>
 </div>

 <style>{`
 @keyframes dotBounce {
 0%, 80%, 100% { transform: translateY(0); }
 40% { transform: translateY(-5px); }
 }
 `}</style>
 </div>
 );
}
