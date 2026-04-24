import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

const Message = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div className={`max-w-[75%] p-3 rounded-2xl ${isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-200 text-slate-900 rounded-bl-none'}`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
      </div>
      <p className="text-xs text-slate-400 px-1">{fmtTime(message.timestamp)}</p>
    </motion.div>
  );
};

export default function ARKChatTab({ clientId, client }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    async function fetchHistory() {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/api/ark/history/${clientId}`);
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Could not load chat history. It might not exist yet.", err);
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, [clientId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content) => {
    if (!content.trim() || isLoading) return;
    const userMessage = { role: 'user', content: content.trim(), timestamp: new Date().toISOString() };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const { data } = await api.post('/api/ark/chat', {
        message: content.trim(),
        clientData: client,
        conversationHistory: currentMessages,
      });
      
      const arkReply = {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, arkReply]);

    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur ARK: impossible de répondre.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleQuickAction = (text) => {
    handleSendMessage(text);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/50 backdrop-blur-lg border border-slate-100 rounded-2xl shadow-sm h-[70vh] flex flex-col">
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">Chargement de l'historique...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p>Aucun message. Posez votre première question à ARK...</p>
            <button
                onClick={() => handleQuickAction("Analyser le profil de ce client et donne-moi 3 points clés.")}
                className="mt-4 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 mx-auto"
            >
                <Sparkles size={14} /> Analyser le profil de ce client
            </button>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
            {messages.map((msg, i) => <Message key={i} message={msg} />)}
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200/80">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="relative">
          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(inputValue); } }}
            placeholder="Posez une question à ARK..."
            rows={1}
            disabled={isLoading}
            className="w-full pl-4 pr-12 py-3 bg-slate-100 border-0.5 border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400 outline-none resize-none transition-colors disabled:bg-slate-200"
            style={{ minHeight: '52px' }}
          />
          <button type="submit" disabled={isLoading || !inputValue.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Send size={16} />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
