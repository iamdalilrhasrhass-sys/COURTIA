import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';

const API_BASE = '/api';
const getToken = () => localStorage.getItem('token');

export function ArkVoiceButton({ onResult, onError }) {
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        const form = new FormData();
        form.append('audio', blob, 'voice.webm');
        try {
          const res = await fetch(`${API_BASE}/voice/transcribe`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form });
          const data = await res.json();
          onResult?.(data.text || data.transcript || '');
        } catch (e) { onError?.(e); }
      };
      mediaRef.current.start();
      setRecording(true);
    } catch (e) { onError?.(e); }
  };

  const stop = () => {
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <motion.button
      onClick={recording ? stop : start}
      style={{ width: 36, height: 36, borderRadius: 'var(--aurora-radius-md)', background: recording ? 'rgba(239, 68, 68, 0.15)' : 'var(--aurora-bg-subtle)', border: `1px solid ${recording ? 'rgba(239, 68, 68, 0.3)' : 'var(--aurora-border-subtle)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: recording ? '#ef4444' : 'var(--aurora-text-secondary)', position: 'relative' }}
      whileHover={{ background: recording ? 'rgba(239, 68, 68, 0.25)' : 'var(--aurora-bg-hover)' }}
      whileTap={{ scale: 0.95 }}
      aria-label={recording ? 'Arrêter' : 'Enregistrer'}
    >
      {recording ? <MicOff size={18} /> : <Mic size={18} />}
      {recording && (
        <motion.span
          style={{ position: 'absolute', inset: -4, borderRadius: 'var(--aurora-radius-lg)', border: '2px solid #ef4444' }}
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}

export default ArkVoiceButton;