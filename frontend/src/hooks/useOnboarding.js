/**
 * useOnboarding — LOT 20
 * Hook pour gérer l'état de l'onboarding gamifié
 */

import { useState, useEffect, useCallback } from 'react';

export default function useOnboarding() {
  const [progress, setProgress] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Charger la progression
  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding/gamified/progress', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
        setError(null);
      } else {
        throw new Error('Erreur chargement progression');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les badges
  const fetchBadges = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/gamified/badges', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setBadges(data.badges || []);
      }
    } catch (err) {
      console.error('Erreur chargement badges:', err);
    }
  }, []);

  // Marquer une étape comme complète
  const completeStep = useCallback(async (step) => {
    try {
      const res = await fetch(`/api/onboarding/gamified/step/${step}/complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        // Refresh la progression
        fetchProgress();
        fetchBadges();
        return data;
      } else {
        throw new Error('Erreur completion étape');
      }
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [fetchProgress, fetchBadges]);

  // Auto-check des conditions (vérifie si des badges peuvent être débloqués)
  const autoCheck = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/gamified/auto-check', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.newBadgesEarned?.length > 0) {
          // Refresh
          fetchProgress();
          fetchBadges();
        }
        return data;
      }
    } catch (err) {
      console.error('Erreur auto-check:', err);
    }
    return null;
  }, [fetchProgress, fetchBadges]);

  // Vérifier si l'utilisateur doit voir l'onboarding
  const shouldShowOnboarding = useCallback(() => {
    if (!progress) return false;
    return !progress.summary?.allCompleted && progress.summary?.completedSteps < 2;
  }, [progress]);

  // Vérifier si une étape spécifique est complétée
  const isStepCompleted = useCallback((stepKey) => {
    if (!progress?.steps) return false;
    const step = progress.steps.find(s => s.key === stepKey);
    return step?.completed || false;
  }, [progress]);

  // Vérifier si un badge spécifique est débloqué
  const hasBadge = useCallback((badgeKey) => {
    return badges.some(b => b.key === badgeKey && b.earned);
  }, [badges]);

  // Nombre de badges débloqués
  const earnedBadgesCount = useCallback(() => {
    return badges.filter(b => b.earned).length;
  }, [badges]);

  // Pourcentage de progression
  const progressPercent = useCallback(() => {
    return progress?.summary?.progressPercent || 0;
  }, [progress]);

  // Charger au montage
  useEffect(() => {
    fetchProgress();
    fetchBadges();
  }, [fetchProgress, fetchBadges]);

  return {
    // État
    progress,
    badges,
    loading,
    error,

    // Actions
    fetchProgress,
    fetchBadges,
    completeStep,
    autoCheck,

    // Helpers
    shouldShowOnboarding,
    isStepCompleted,
    hasBadge,
    earnedBadgesCount,
    progressPercent,

    // Raccourcis
    isCompleted: progress?.summary?.allCompleted || false,
    totalSteps: progress?.summary?.totalSteps || 5,
    completedSteps: progress?.summary?.completedSteps || 0,
    totalBadges: progress?.summary?.totalBadges || 5,
    earnedBadges: progress?.summary?.badgesEarned || 0,
  };
}