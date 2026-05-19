import React, { useState, useEffect } from 'react';
import Vapi from '@vapi-ai/web';
import { Mic, Square, Loader } from 'lucide-react';

const vapi = new Vapi(import.meta.env.VITE_VAPI_PUBLIC_KEY || "");

export default function VapiVoiceButton() {
  const [callStatus, setCallStatus] = useState('inactive'); // inactive, loading, active

  useEffect(() => {
    vapi.on('call-start', () => setCallStatus('active'));
    vapi.on('call-end', () => setCallStatus('inactive'));
    vapi.on('error', (e) => {
      console.error("Vapi error", e);
      setCallStatus('inactive');
    });
    
    return () => {
      vapi.removeAllListeners();
    };
  }, []);

  const toggleCall = async () => {
    if (callStatus === 'active') {
      vapi.stop();
      setCallStatus('inactive');
    } else {
      setCallStatus('loading');
      try {
        await vapi.start({
          name: "ARK",
          model: {
            provider: "openai",
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "Tu es ARK, l'assistant vocal IA de COURTIA. Tu es là pour aider le courtier en assurance à gérer son cabinet, préparer ses rendez-vous, et suivre la conformité. Sois bref, professionnel et très dynamique."
              }
            ]
          },
          voice: {
            provider: "azure",
            voiceId: "fr-FR-DeniseNeural"
          }
        });
      } catch (err) {
        console.error(err);
        setCallStatus('inactive');
      }
    }
  };

  return (
    <button
      onClick={toggleCall}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '14px',
        borderRadius: '12px',
        border: 'none',
        background: callStatus === 'active' ? '#EF4444' : callStatus === 'loading' ? '#F59E0B' : '#8B5CF6',
        color: 'white',
        fontWeight: 600,
        fontSize: '14px',
        cursor: 'pointer',
        marginTop: '20px',
        transition: 'all 0.2s'
      }}
    >
      {callStatus === 'active' ? (
        <>
          <Square size={18} fill="currentColor" /> Raccrocher ARK
        </>
      ) : callStatus === 'loading' ? (
        <>
          <Loader size={18} className="animate-spin" /> Connexion...
        </>
      ) : (
        <>
          <Mic size={18} /> Parler à ARK (Vocal)
        </>
      )}
    </button>
  );
}
