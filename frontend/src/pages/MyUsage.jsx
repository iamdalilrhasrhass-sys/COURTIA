/**
 * My Usage - Page personnelle courtier
 * Affiche:
 * - Quota Haiku/Opus restant
 * - Historique requêtes ce mois
 * - Option upgrade
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Zap, Upgrade } from 'lucide-react';
import PricingModal from '@/components/PricingModal';

const MyUsage = () => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/ark/my-usage', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      setUsage(result);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching usage:', err);
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-10">Chargement...</div>;
  if (!usage) return <div className="text-center py-10">Erreur</div>;

  const haikuPercent = usage.haiku.percentUsed;
  const opusPercent = usage.opus.percentUsed;

  const getTierColor = (tier) => {
    const colors = { 'Starter': 'gray', 'Pro': 'blue', 'Premium': 'purple' };
    return colors[tier] || 'gray';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mon utilisation API</h1>
          <p className="text-gray-500 mt-1">Mois: {usage.month}</p>
        </div>
      </div>

      {/* Current Tier Card */}
      <Card className={`bg-${getTierColor(usage.tier)}-50 border-${getTierColor(usage.tier)}-200`}>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600">Plan actuel</p>
              <h2 className="text-3xl font-bold mt-2">{usage.tier}</h2>
              <p className="text-sm text-gray-500 mt-2">€{usage.monthlyPrice}/mois</p>
            </div>
            <Button onClick={() => setShowUpgrade(true)} className="ml-auto">
              Upgrader
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quotas */}
      <div className="grid grid-cols-2 gap-4">
        {/* Haiku Quota */}
        <Card className={haikuPercent >= 80 ? 'border-red-300 bg-red-50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              Haiku (rapides)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{usage.haiku.used} / {usage.haiku.quota}</span>
                <span className={`text-sm font-semibold ${haikuPercent >= 95 ? 'text-red-600' : haikuPercent >= 80 ? 'text-orange-600' : 'text-green-600'}`}>
                  {haikuPercent}%
                </span>
              </div>
              <Progress 
                value={haikuPercent} 
                className={`h-3 ${haikuPercent >= 95 ? 'bg-red-100' : haikuPercent >= 80 ? 'bg-orange-100' : ''}`}
              />
              <p className="text-xs text-gray-500">
                {usage.haiku.remaining} requêtes restantes
              </p>
              {haikuPercent >= 80 && (
                <div className="flex items-center gap-2 text-orange-600 mt-3 p-2 bg-orange-100 rounded">
                  <AlertCircle size={16} />
                  <span className="text-xs">Vous approchez du quota</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Opus Quota */}
        <Card className={opusPercent >= 80 && usage.opus.quota > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              Opus (avancées)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">{usage.opus.used} / {usage.opus.quota}</span>
                <span className={`text-sm font-semibold ${opusPercent >= 95 ? 'text-red-600' : opusPercent >= 80 && usage.opus.quota > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {opusPercent}%
                </span>
              </div>
              {usage.opus.quota > 0 ? (
                <>
                  <Progress 
                    value={opusPercent}
                    className={`h-3 ${opusPercent >= 95 ? 'bg-red-100' : opusPercent >= 80 ? 'bg-orange-100' : ''}`}
                  />
                  <p className="text-xs text-gray-500">
                    {usage.opus.remaining} requêtes restantes
                  </p>
                  {opusPercent >= 80 && (
                    <div className="flex items-center gap-2 text-orange-600 mt-3 p-2 bg-orange-100 rounded">
                      <AlertCircle size={16} />
                      <span className="text-xs">Opus quota approaching</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 bg-gray-100 rounded text-gray-600 text-xs">
                  Non inclus dans votre plan
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiques ce mois</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Requêtes totales</p>
              <p className="text-2xl font-bold mt-2">{usage.totalRequests}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Coût estimé</p>
              <p className="text-2xl font-bold mt-2 text-green-600">${usage.totalCostThisMonth.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Coût par requête</p>
              <p className="text-2xl font-bold mt-2">${(usage.totalCostThisMonth / Math.max(usage.totalRequests, 1)).toFixed(4)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Dernières requêtes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {usage.recentRequests.map((req, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded text-sm">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    req.model_used.includes('haiku') ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {req.model_used.includes('haiku') ? 'Haiku' : 'Opus'}
                  </span>
                  <span className="text-gray-600">{req.request_type}</span>
                </div>
                <span className="font-semibold">${req.cost_usd}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      {showUpgrade && <PricingModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
};

export default MyUsage;
