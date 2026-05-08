import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Connexion perdue',
  message = "Impossible de récupérer les données pour le moment. Réessayez dans un instant.",
  onRetry,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center py-10 px-4"
    >
      <div className="relative max-w-md w-full text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/15 to-orange-500/10 blur-2xl opacity-60 -z-10" />
        <div className="bg-white/5 backdrop-blur-md border border-rose-500/20 rounded-2xl p-8">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/15 border border-rose-400/20 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-rose-300" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-white/60 leading-relaxed mb-6">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 text-sm font-medium text-white/80 hover:text-white transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
