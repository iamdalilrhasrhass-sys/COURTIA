/**
 * OnboardingGamified — LOT 20
 * Tutorial interactif pour nouveaux courtiers avec progression et badges
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Award, Sparkles, Users, Zap, FileText, Shield, UserPlus, ArrowRight } from 'lucide-react';
import Confetti from 'react-confetti';

const STEPS = [
  {
    key: 'create_client',
    icon: Users,
    title: 'Créez votre premier client',
    description: 'Ajoutez une fiche client pour commencer à utiliser COURTIA',
    badge: { name: 'Courtier Connecté', emoji: '🤝' },
    action: { label: 'Ajouter un client', route: '/clients/new' },
    color: '#6366f1',
  },
  {
    key: 'analyze_portfolio',
    icon: Zap,
    title: 'Analysez votre portefeuille avec ARK',
    description: 'Lancez une analyse ARK pour découvrir les insights de votre portefeuille',
    badge: { name: 'Analyste ARK', emoji: '📊' },
    action: { label: 'Ouvrir ARK', route: '/v2/ark-watch' },
    color: '#22d3ee',
  },
  {
    key: 'generate_document',
    icon: FileText,
    title: 'Générez votre premier document',
    description: 'Utilisez ARK Compose pour créer un document DDA, IPID ou Devoir de Conseil',
    badge: { name: 'Maître des Docs', emoji: '📄' },
    action: { label: 'Ouvrir Compose', route: '/v2/compose' },
    color: '#10b981',
  },
  {
    key: 'activate_ark_watch',
    icon: Shield,
    title: 'Activez ARK Watch',
    description: 'Configurez la surveillance proactive de votre portefeuille',
    badge: { name: 'Sentinelle', emoji: '🛡️' },
    action: { label: 'Configurer Watch', route: '/v2/ark-watch' },
    color: '#f59e0b',
  },
  {
    key: 'invite_colleague',
    icon: UserPlus,
    title: 'Invitez un collègue',
    description: 'Partagez COURTIA avec un membre de votre équipe',
    badge: { name: 'Ambassadeur', emoji: '🌟' },
    action: { label: 'Inviter', route: '/equipe' },
    color: '#f43f5e',
  },
];

function BadgeCard({ badge, earned, animate }) {
  return (
    <motion.div
      initial={animate ? { scale: 0, rotate: -180 } : {}}
      animate={earned ? { scale: 1, rotate: 0 } : { scale: 0.9, opacity: 0.4 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      style={{
        width: 80,
        height: 80,
        borderRadius: 20,
        background: earned
          ? 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))'
          : 'rgba(255,255,255,0.05)',
        border: earned ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {earned && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(99,102,241,0.3) 0%, transparent 70%)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}
      <span style={{ fontSize: 32 }}>{badge.emoji}</span>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center', padding: '0 4px' }}>
        {badge.name}
      </span>
      {earned && (
        <div style={{
          position: 'absolute',
          top: -2,
          right: -2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Check size={12} color="white" />
        </div>
      )}
    </motion.div>
  );
}

export default function OnboardingGamified() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [newBadge, setNewBadge] = useState(null);

  const fetchProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/onboarding/gamified/progress', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      }
    } catch (err) {
      console.error('Erreur chargement progression:', err);
    } finally {
      setLoading(false);
    }
  };

  const autoCheck = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/onboarding/gamified/auto-check', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.newBadgesEarned?.length > 0) {
          setNewBadge(data.newBadgesEarned[0]);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
          fetchProgress();
        }
      }
    } catch (err) {
      console.error('Erreur auto-check:', err);
    }
  };

  useEffect(() => {
    fetchProgress();
    autoCheck();
  }, []);

  const handleStepAction = (step) => {
    navigate(step.action.route);
  };

  const completedSteps = progress?.steps?.filter(s => s.completed).length || 0;
  const totalSteps = STEPS.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles size={48} color="#6366f1" />
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      padding: 'var(--aurora-space-6)',
      background: 'linear-gradient(180deg, #050510 0%, #0a0a1a 50%, #050510 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

      {/* Aurora Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '150%',
        height: '50%',
        background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', marginBottom: 'var(--aurora-space-8)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <Award size={40} color="#6366f1" />
            <h1 style={{ fontSize: 32, fontWeight: 700, color: 'white', margin: 0 }}>
              Bienvenue sur COURTIA
            </h1>
          </div>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            Complétez ces étapes pour maîtriser ARK et débloquer vos badges
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ marginBottom: 'var(--aurora-space-6)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Progression</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#6366f1' }}>{progressPercent}%</span>
          </div>
          <div style={{
            height: 8,
            borderRadius: 4,
            background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)',
                borderRadius: 4,
              }}
            />
          </div>
        </motion.div>

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
            marginBottom: 'var(--aurora-space-8)',
            flexWrap: 'wrap',
          }}
        >
          {STEPS.map((step, idx) => {
            const stepProgress = progress?.steps?.find(s => s.key === step.key);
            return (
              <BadgeCard
                key={step.key}
                badge={step.badge}
                earned={stepProgress?.badgeEarned || false}
                animate={newBadge?.key === step.badge.key}
              />
            );
          })}
        </motion.div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {STEPS.map((step, idx) => {
            const stepProgress = progress?.steps?.find(s => s.key === step.key);
            const isCompleted = stepProgress?.completed || false;
            const Icon = step.icon;

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                style={{
                  background: isCompleted
                    ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))'
                    : 'rgba(255,255,255,0.03)',
                  border: isCompleted ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: isCompleted ? '#10b981' : `${step.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {isCompleted ? (
                    <Check size={24} color="white" />
                  ) : (
                    <Icon size={24} color={step.color} />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'white', marginBottom: 4 }}>
                    {idx + 1}. {step.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    {step.description}
                  </div>
                </div>

                {isCompleted ? (
                  <div style={{
                    padding: '8px 16px',
                    background: 'rgba(16,185,129,0.2)',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <Check size={14} /> Complété
                  </div>
                ) : (
                  <button
                    onClick={() => handleStepAction(step)}
                    style={{
                      padding: '10px 20px',
                      background: step.color,
                      border: 'none',
                      borderRadius: 10,
                      color: 'white',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 8px 20px ${step.color}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {step.action.label}
                    <ArrowRight size={14} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Skip Button */}
        {!progress?.summary?.allCompleted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            style={{ textAlign: 'center', marginTop: 'var(--aurora-space-8)' }}
          >
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '10px 24px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 10,
                color: 'rgba(255,255,255,0.5)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Passer pour l'instant
            </button>
          </motion.div>
        )}

        {/* All Completed */}
        {progress?.summary?.allCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              textAlign: 'center',
              marginTop: 'var(--aurora-space-8)',
              padding: 32,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
              borderRadius: 20,
              border: '1px solid rgba(99,102,241,0.3)',
            }}
          >
            <Sparkles size={48} color="#6366f1" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'white', margin: '0 0 8px' }}>
              🎉 Félicitations !
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>
              Vous avez complété l'onboarding et débloqué tous vos badges !
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                borderRadius: 12,
                color: 'white',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Accéder au tableau de bord
            </button>
          </motion.div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}