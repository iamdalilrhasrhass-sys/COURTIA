import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://courtia.onrender.com/api/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setClients(data);
    } catch (err) {
      toast.error('Erreur chargement clients');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = 
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || c.statut === statusFilter;
    const matchesRisk = riskFilter === 'all'
      || (riskFilter === 'Faible' && c.score_risque <= 30)
      || (riskFilter === 'Modéré' && c.score_risque > 30 && c.score_risque <= 60)
      || (riskFilter === 'Élevé' && c.score_risque > 60);
    return matchesSearch && matchesStatus && matchesRisk;
  });

  const handleViewClient = (clientId) => {
    navigate(`/client/${clientId}`);
  };

  const handleEditClient = (clientId) => {
    navigate(`/clients/${clientId}/edit`);
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Confirmer la suppression?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://courtia.onrender.com/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Client supprimé');
      fetchClients();
    } catch (err) {
      toast.error('Erreur suppression');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">👥 Clients</h1>
          <p className="text-slate-400 mt-1">Gérez votre portefeuille client</p>
        </div>
        <button 
          onClick={() => navigate('/clients/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Plus size={18} /> Nouveau client
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <input 
          type="text"
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
        />
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
        >
          <option value="all">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="prospect">Prospect</option>
          <option value="perdu">Perdu</option>
        </select>
      </div>

      {/* Risk Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#6b7280', alignSelf: 'center' }}>Risque :</span>
        {['all', 'Faible', 'Modéré', 'Élevé'].map(niveau => (
          <button
            key={niveau}
            onClick={() => setRiskFilter(niveau)}
            style={{
              padding: '6px 12px',
              background: riskFilter === niveau ? '#0a0a0a' : 'white',
              color: riskFilter === niveau ? 'white' : '#374151',
              border: '1px solid #e5e7eb', borderRadius: 6,
              cursor: 'pointer', fontSize: 12,
              fontWeight: riskFilter === niveau ? 600 : 400
            }}
          >{niveau === 'all' ? 'Tous' : niveau}</button>
        ))}
      </div>

      {/* Clients Table */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 rounded-lg">
          <p className="text-slate-400">Aucun client trouvé</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-800/30 rounded-lg">
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Nom</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Téléphone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Statut</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Score Risque</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-white">{client.nom} {client.prenom}</td>
                  <td className="px-6 py-4 text-slate-400">{client.email}</td>
                  <td className="px-6 py-4 text-slate-400">{client.telephone || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      client.statut === 'actif' ? 'bg-green-500/20 text-green-300' :
                      client.statut === 'prospect' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {client.statut}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      background: client.score_risque <= 30 ? '#dcfce7'
                        : client.score_risque <= 60 ? '#fef9c3'
                        : client.score_risque <= 80 ? '#ffedd5'
                        : '#fee2e2',
                      color: client.score_risque <= 30 ? '#16a34a'
                        : client.score_risque <= 60 ? '#ca8a04'
                        : client.score_risque <= 80 ? '#ea580c'
                        : '#dc2626',
                      borderRadius: 12, fontSize: 12, fontWeight: 700
                    }}>
                      {client.score_risque}/100
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button 
                      onClick={() => handleViewClient(client.id)}
                      className="p-2 hover:bg-blue-500/20 rounded transition-colors text-blue-400"
                      title="Voir"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => handleEditClient(client.id)}
                      className="p-2 hover:bg-cyan-500/20 rounded transition-colors text-cyan-400"
                      title="Éditer"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteClient(client.id)}
                      className="p-2 hover:bg-red-500/20 rounded transition-colors text-red-400"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination info */}
      <div className="mt-4 text-sm text-slate-400">
        Affichage {filteredClients.length} / {clients.length} clients
      </div>
    </div>
  );
}
