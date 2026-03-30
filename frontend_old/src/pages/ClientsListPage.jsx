import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useClientStore } from '../store/clientStore';
import { MainLayout } from '../layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

export function ClientsListPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const {
    clients,
    pagination,
    filters,
    fetchClients,
    deleteClient,
    setSearch,
    isLoading,
  } = useClientStore();

  const [searchInput, setSearchInput] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (token) {
      fetchClients(token, pagination.page, pagination.limit, filters.search);
    }
  }, [token, pagination.page]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    setSearch(value);
    if (token) {
      fetchClients(token, 1, pagination.limit, value);
    }
  };

  const handleDelete = async (clientId) => {
    try {
      await deleteClient(token, clientId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const handlePageChange = (newPage) => {
    if (token) {
      fetchClients(token, newPage, pagination.limit, filters.search);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600 mt-1">
              {pagination.total} client{pagination.total !== 1 ? 's' : ''} total
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/clients/new')}
            className="flex items-center gap-2 w-fit"
          >
            <Plus size={20} />
            Nouveau client
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent>
            <Input
              type="text"
              placeholder="Rechercher par nom, email, téléphone..."
              value={searchInput}
              onChange={handleSearch}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des clients</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-600">Chargement...</div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <p>Aucun client trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Nom
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Téléphone
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Ville
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {clients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {client.firstName} {client.lastName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {client.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {client.phone}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {client.city}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => navigate(`/clients/${client.id}`)}
                              className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                              title="Voir"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => navigate(`/clients/${client.id}/edit`)}
                              className="p-2 hover:bg-yellow-100 text-yellow-600 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(client.id)}
                              className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              Précédent
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === pagination.page ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
              className="flex items-center gap-1"
            >
              Suivant
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="max-w-sm w-full">
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Confirmer la suppression
              </h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1"
                >
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}
