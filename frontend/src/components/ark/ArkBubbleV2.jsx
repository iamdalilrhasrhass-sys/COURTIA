import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Maximize2, Minimize2 } from 'lucide-react';
import { ArkVoiceButton } from './ArkVoiceButton';
import { ArkSuggestionsChips } from './ArkSuggestionsChips';

const API_BASE = '/api';
const getToken = () => localStorage.getItem('token');

export function ArkBubbleV2() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    try {
      const res = await fetch(`${API_BASE}/ark/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMsg]);
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          assistantMsg.content += chunk;
          setMessages(prev => [...prev.slice(0, -1), { ...assistantMsg }]);
        }
      } else {
        const data = await res.json();
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: data.response || data.message || 'OK' }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erreur de connexion' }]);
    }
    setStreaming(false);
  };

  const handleVoiceResult = (text) => { setInput(text); sendMessage(text); };
  const handleSuggestion = (text) => sendMessage(text);

  const bubbleSize = expanded ? { width: 480, height: 600 } : { width: 380, height: 500 };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        style={{ position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%', background: 'var(--aurora-gradient)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--aurora-shadow-lg)', zIndex: 999 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={{ boxShadow: ['0 0 0 0 rgba(139, 92, 246, 0)', '0 0 0 12px rgba(139, 92, 246, 0.15)', '0 0 0 0 rgba(139, 92, 246, 0)'] }}
        transition={{ duration: 2, repeat: Infinity }}
        aria-label="Ouvrir ARK"
      >
        <Sparkles size={24} color="white" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ position: 'fixed', bottom: 96, right: 24, ...bubbleSize, background: 'var(--aurora-bg-elevated)', border: '1px solid var(--aurora-border-subtle)', borderRadius: 'var(--aurora-radius-xl)', boxShadow: 'var(--aurora-shadow-2xl)', display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--aurora-space-3) var(--aurora-space-4)', borderBottom: '1px solid var(--aurora-border-subtle)', background: 'var(--aurora-gradient)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aurora-space-2)' }}>
                <Sparkles size={20} color="white" />
                <span style={{ fontWeight: 600, color: 'white' }}>ARK Assistant</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <motion.button onClick={() => setExpanded(!expanded)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 'var(--aurora-radius-sm)', padding: 6, cursor: 'pointer', color: 'white' }} whileHover={{ background: 'rgba(255,255,255,0.3)' }}>
                  {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </motion.button>
                <motion.button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 'var(--aurora-radius-sm)', padding: 6, cursor: 'pointer', color: 'white' }} whileHover={{ background: 'rgba(255,255,255,0.3)' }}>
                  <X size={16} />
                </motion.button>
              </div>
            </div>

            <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: 'var(--aurora-space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--aurora-space-3)' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--aurora-space-6)', color: 'var(--aurora-text-secondary)' }}>
                  <Sparkles size={32} style={{ marginBottom: 'var(--aurora-space-2)', opacity: 0.5 }} />
                  <div>Comment puis-je vous aider ?</div>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: 'var(--aurora-space-3)', borderRadius: 'var(--aurora-radius-lg)', background: msg.role === 'user' ? 'var(--aurora-gradient)' : 'var(--aurora-bg-subtle)', color: msg.role === 'user' ? 'white' : 'var(--aurora-text-primary)', fontSize: 'var(--aurora-font-sm)', lineHeight: 1.5 }}>
                  {msg.content}
                  {streaming && i === messages.length - 1 && msg.role === 'assistant' && <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>▊</motion.span>}
                </motion.div>
              ))}
            </div>

            {messages.length === 0 && <ArkSuggestionsChips onSelect={handleSuggestion} />}

            <div style={{ padding: 'var(--aurora-space-3)', borderTop: '1px solid var(--aurora-border-subtle)' }}>
              <div style={{ display: 'flex', gap: 'var(--aurora-space-2)', alignItems: 'center' }}>
                <ArkVoiceButton onResult={handleVoiceResult} />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                  placeholder="Écrivez votre message..."
                  style={{ flex: 1, padding: 'var(--aurora-space-2) var(--aurora-space-3)', background: 'var(--aurora-bg-input)', border: '1px solid var(--aurora-border-subtle)', borderRadius: 'var(--aurora-radius-md)', color: 'var(--aurora-text-primary)', fontSize: 'var(--aurora-font-sm)', outline: 'none' }}
                />
                <motion.button onClick={() => sendMessage(input)} disabled={!input.trim() || streaming} style={{ width: 36, height: 36, borderRadius: 'var(--aurora-radius-md)', background: input.trim() ? 'var(--aurora-gradient)' : 'var(--aurora-bg-subtle)', border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: input.trim() ? 'white' : 'var(--aurora-text-muted)' }} whileHover={input.trim() ? { scale: 1.05 } : {}} whileTap={input.trim() ? { scale: 0.95 } : {}}>
                  <Send size={18} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ArkBubbleV2;