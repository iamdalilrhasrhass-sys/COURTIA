import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { MainLayout } from '../layouts/MainLayout';
import { TrendingUp, Users, FileText, AlertCircle } from 'lucide-react';

export function DashboardPage() {
  const { user, token } = useAuthStore();
  const [stats, setStats] = useState({
    totalClients: 0,
    totalPolicies: 0,
    pendingTasks: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/stats/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchStats();
    }
  }, [token]);

  const StatCard = ({ icon: Icon, title, value, trend }) => (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className="bg-blue-100 p-3 rounded-lg">
          <Icon className="text-blue-600" size={32} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenue, {user?.name || 'Utilisateur'}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Voici un aperçu de votre activité
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Users}
            title="Total Clients"
            value={stats.totalClients}
          />
          <StatCard
            icon={FileText}
            title="Contrats"
            value={stats.totalPolicies}
          />
          <StatCard
            icon={AlertCircle}
            title="Tâches Pendantes"
            value={stats.pendingTasks}
          />
          <StatCard
            icon={TrendingUp}
            title="Revenu (€)"
            value={stats.revenue.toLocaleString('fr-FR')}
          />
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Nouveau client ajouté</p>
                  <p className="text-sm text-gray-600">Il y a 2 heures</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  Nouveau
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Contrat signé</p>
                  <p className="text-sm text-gray-600">Il y a 5 heures</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  Signé
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">Paiement reçu</p>
                  <p className="text-sm text-gray-600">Il y a 1 jour</p>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  Paiement
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
