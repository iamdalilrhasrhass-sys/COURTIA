import React, { useState, useEffect } from 'react';
import Vapi from '@vapi-ai/web';
import { Phone, Mic, Square } from 'lucide-react';

const vapi = new Vapi(import.meta.env.VITE_VAPI_PUBLIC_KEY || "dummy-key-for-now");

export default function VapiWidget() {
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
        // Here we'd ideally pass the Assistant ID from environment or config
        await vapi.start(import.meta.env.VITE_VAPI_ASSISTANT_ID || "dummy-assistant-id");
      } catch (err) {
        console.error(err);
        setCallStatus('inactive');
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={toggleCall}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 ${
          callStatus === 'active' 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : callStatus === 'loading'
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-white text-gray-900 border border-[#2a2a2a] hover:bg-gray-100 hover:scale-105'
        }`}
      >
        {callStatus === 'active' ? (
          <Square className="w-6 h-6 text-white" fill="currentColor" />
        ) : callStatus === 'loading' ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Mic className="w-6 h-6 text-gray-900" />
        )}
      </button>
    </div>
  );
}
