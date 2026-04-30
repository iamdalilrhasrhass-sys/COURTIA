import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Bot, User, Trash2, Target, FileText, BarChart2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

// Formatage markdown amélioré (gras, italique, listes, blocs de code simples)
const formatContent = (text) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const key = `line-${i}`;
    let content = line;
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    if (content.trim().startsWith('- ')) {
      return <div key={key} className="flex items-start gap-2 my-1 ml-2"><span className="text-blue-500 mt-1">•</span><span dangerouslySetInnerHTML={{ __html: content.substring(2) }} /></div>;
    }
    return <p key={key} className={line.trim() === '' ? 'h-2' : ''} dangerouslySetInnerHTML={{ __html: content }} />;
  });
};

const Message = ({ message, clientName }) => {
  const isUser = message.role === 'user';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 250, damping: 25 }}
      className={`flex gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-md ${
        isUser
          ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
          : 'bg-gradient-to-br from-slate-800 to-slate-600 text-white'
      }`}>
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-lg'
            : 'bg-white/80 backdrop-blur-md border border-slate-200/80 text-slate-800 rounded-bl-lg'
        }`}>
          {formatContent(message.content)}
        </div>
        <p className="text-[10px] text-slate-400 px-1">{isUser ? 'Vous' : 'ARK'} à {fmtTime(message.timestamp)}</p>
      </div>
    </motion.div>
  );
};

const TypingIndicator = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-3.5">
    <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-slate-800 to-slate-600 text-white flex items-center justify-center shadow-md"><Bot size={15} /></div>
    <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl rounded-bl-lg px-4 py-3 shadow-sm self-start">
      <div className="flex gap-1.5 items-center">
        {[0, 1, 2].map(i => <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }} />)}
      </div>
    </div>
  </motion.div>
);

const QuickActionButton = ({ icon: Icon, label, prompt, onClick }) => (
    <button
        onClick={() => onClick(prompt)}
        className="flex flex-col items-center justify-center text-center gap-2 p-3 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md"
    >
        <Icon className="w-5 h-5 text-blue-600" />
        <span>{label}</span>
    </button>
);

export default function ARKChatTab({ clientId, client }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const clientName = `${client.prenom} ${client.nom}`;

  const QUICK_ACTIONS = [
    { icon: Target, label: 'Analyser le profil', prompt: 'Analyse le profil complet et donne-moi les 3 points clés (risques, opportunités).' },
    { icon: FileText, label: 'Email de suivi', prompt: `Rédige un email de suivi court et amical pour prendre des nouvelles de ${clientName}.` },
    { icon: BarChart2, label: 'Synthèse du besoin', prompt: 'Synthétise en 5 points le besoin d\'assurance probable pour ce client, basé sur son profil.' },
    { icon: Zap, label: 'Action immédiate', prompt: `Quelle est LA SEULE action la plus impactante que je devrais faire pour ${clientName} aujourd'hui ?` },
  ];

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/api/ark/history/${clientId}`);
      setMessages(data.messages || []);
    } catch (err) {
      console.error("ARK history error:", err.message);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => { adjustTextareaHeight(); }, [inputValue]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isSending]);

  const handleSendMessage = async (content) => {
    const msg = (content || inputValue).trim();
    if (!msg || isSending) return;
    
    const userMessage = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    const optimisticMessages = [...messages, userMessage];
    setMessages(optimisticMessages);
    setInputValue('');
    setIsSending(true);

    try {
      const { data } = await api.post('/ark/chat', {
        message: msg,
        clientData: client,
        conversationHistory: optimisticMessages,
      });
      const arkReply = { role: 'assistant', content: data.reply, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, arkReply]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur ARK, impossible de répondre.");
      setMessages(messages); // Revert on error
    } finally {
      setIsSending(false);
    }
  };
  
  const handleClearHistory = async () => {
    if (messages.length === 0 || !window.confirm('Voulez-vous vraiment effacer cet historique ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/api/ark/history/${clientId}`);
      setMessages([]);
      toast.success('Historique effacé.');
    } catch {
      toast.error('Erreur lors de la suppression.');
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50/70 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-sm h-[75vh] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/60 bg-white/30 shrink-0">
          <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-md flex items-center justify-center text-white"><Sparkles size={12}/></div>
              <h3 className="text-base font-bold text-slate-800">Assistant ARK</h3>
          </div>
          <button onClick={handleClearHistory} disabled={messages.length === 0} className="p-2 text-slate-400 rounded-md hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="Effacer l'historique">
              <Trash2 size={16} />
          </button>
      </div>

      {/* Zone messages */}
      <div className="flex-1 px-5 py-5 space-y-4 overflow-y-auto">
        {isLoading
          ? <div className="flex justify-center items-center h-full"><div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"/></div>
          : <>
              <AnimatePresence>
                {messages.map((msg, i) => <Message key={i} message={msg} clientName={clientName} />)}
              </AnimatePresence>
              {isSending && <TypingIndicator />}
              {messages.length === 0 && !isSending && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-8">
                  <div className="inline-block p-4 bg-white/70 border border-slate-200/60 rounded-full shadow-sm">
                    <Bot size={28} className="text-slate-800" />
                  </div>
                  <h4 className="mt-4 font-bold text-slate-800">Prêt à analyser le profil</h4>
                  <p className="text-sm text-slate-500 mt-1">Posez une question ou utilisez une des suggestions ci-dessous.</p>
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
                    {QUICK_ACTIONS.map(action => <QuickActionButton key={action.label} {...action} onClick={handleSendMessage} />)}
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </>
        }
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-slate-200/60 bg-gradient-to-b from-white/40 to-white/80">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} 
          className="relative"
        >
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                handleSendMessage(inputValue); 
              } 
            }}
            placeholder={`Demandez quelque chose à ARK sur ${clientName}...`}
            rows={1}
            disabled={isSending}
            className="w-full pl-4 pr-14 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 outline-none resize-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
            style={{ minHeight: '52px', maxHeight: '160px' }}
          />
          <button 
            type="submit" 
            disabled={isSending || !inputValue.trim()} 
            className="absolute right-2.5 bottom-2.5 w-9 h-9 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl hover:shadow-md hover:shadow-blue-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Send size={15} />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 mt-2 px-1">
          ARK utilise Claude Haiku. Entrée pour envoyer · Shift+Entrée pour nouvelle ligne.
        </p>
      </div>
    </motion.div>
  );
}
