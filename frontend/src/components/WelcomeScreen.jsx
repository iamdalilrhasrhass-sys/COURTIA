import { motion } from 'framer-motion';
import { UserPlus, Sparkles, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

export default function WelcomeScreen({ onLoadDemo }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="max-w-2xl w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
        <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">Bienvenue dans COURTIA</h1>
        <p className="text-white/70 text-center mb-8">Commençons par ajouter votre premier client.</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate('/clients/nouveau')} className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 p-4 rounded-2xl text-white font-semibold">Ajouter mon premier client</button>
          {isDemoMode && <button onClick={onLoadDemo} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white/80">Charger le jeu de démo (10 clients)</button>}
        </div>
      </div>
    </div>
  );
}
