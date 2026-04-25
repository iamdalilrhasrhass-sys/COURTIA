/**
 * Admin Dashboard - API Costs & Quotas
 * Affiche:
 * - Overview des coûts (mois en cours)
 * - Top courtiers par coût
 * - Graphique tendance requêtes/jour
 * - Export CSV
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { AlertCircle, Download, TrendingUp } from 'lucide-react';

const AdminCostsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('cost'); // cost, requests, quota

  useEffect(() => {
    fetchCostData();
  }, []);

  const fetchCostData = async () => {
    try {
      const response = await fetch('/api/admin/costs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const result = await response.json();
      setData(result);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching costs:', err);
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    window.location.href = '/api/admin/costs/export?format=csv';
  };

  if (loading) {
    return <div className="text-center py-10">Chargement...</div>;
  }

  if (!data) {
    return <div className="text-center py-10">Erreur lors du chargement</div>;
  }

  const stats = data.globalStats;
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord Coûts API</h1>
          <p className="text-gray-500 mt-1">Période: {data.period}</p>
        </div>
        <Button onClick={exportCsv} className="flex items-center gap-2">
          <Download size={18} />
          Exporter CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Courtiers actifs</div>
            <div className="text-3xl font-bold mt-2">{stats.total_users}</div>
            <p className="text-xs text-gray-400 mt-1">Ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Requêtes totales</div>
            <div className="text-3xl font-bold mt-2">{stats.total_requests}</div>
            <p className="text-xs text-gray-400 mt-1">Haiku: {stats.haiku_requests} | Opus: {stats.opus_requests}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Coût total</div>
            <div className="text-3xl font-bold mt-2">${parseFloat(stats.total_cost_usd).toFixed(2)}</div>
            <p className="text-xs text-gray-400 mt-1">USD ce mois</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Coût moyen/requête</div>
            <div className="text-3xl font-bold mt-2">${parseFloat(stats.avg_cost_per_request).toFixed(4)}</div>
            <p className="text-xs text-gray-400 mt-1">H: ${parseFloat(stats.avg_haiku_cost).toFixed(4)} | O: ${parseFloat(stats.avg_opus_cost).toFixed(4)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Requêtes par jour</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.requestsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="haiku_count" stroke="#3b82f6" name="Haiku" />
                <Line type="monotone" dataKey="opus_count" stroke="#ef4444" name="Opus" />
                <Line type="monotone" dataKey="daily_cost" stroke="#10b981" name="Coût ($)" yAxisId="right" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Request Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Requêtes par type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.requestsByType}
                  dataKey="count"
                  nameKey="request_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {data.requestsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Courtiers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={20} />
            Top 10 Courtiers par Coût
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-semibold">Courtier</TableCell>
                  <TableCell className="font-semibold">Email</TableCell>
                  <TableCell className="font-semibold">Tier</TableCell>
                  <TableCell className="font-semibold text-right">Requêtes</TableCell>
                  <TableCell className="font-semibold text-right">Haiku</TableCell>
                  <TableCell className="font-semibold text-right">Opus</TableCell>
                  <TableCell className="font-semibold text-right">Coût</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topUsers.map((user) => (
                  <TableRow key={user.id} className="border-b hover:bg-gray-50">
                    <TableCell>{user.first_name} {user.last_name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{user.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.pricing_tier === 'Premium' ? 'bg-purple-100 text-purple-800' :
                        user.pricing_tier === 'Pro' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.pricing_tier}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{user.request_count}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-blue-600">{user.haiku_count}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-red-600">{user.opus_count}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${parseFloat(user.total_cost_usd).toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Request Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Détail par type de requête</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-semibold">Type</TableCell>
                  <TableCell className="font-semibold text-right">Nombre</TableCell>
                  <TableCell className="font-semibold text-right">Coût total</TableCell>
                  <TableCell className="font-semibold text-right">Coût moyen</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.requestsByType.map((type) => (
                  <TableRow key={type.request_type} className="border-b">
                    <TableCell className="font-medium">{type.request_type || 'Général'}</TableCell>
                    <TableCell className="text-right">{type.count}</TableCell>
                    <TableCell className="text-right">${parseFloat(type.total_cost).toFixed(4)}</TableCell>
                    <TableCell className="text-right text-gray-600">${parseFloat(type.avg_cost).toFixed(4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCostsDashboard;
