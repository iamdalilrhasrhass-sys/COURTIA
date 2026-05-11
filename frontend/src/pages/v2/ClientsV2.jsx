import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Upload, Search, MoreHorizontal, Phone, Mail, Eye, Edit, Trash2 } from 'lucide-react';
import {
  AuroraPageHeader,
  AuroraCard,
  AuroraInput,
  AuroraBadge,
  AuroraAvatar,
  AuroraPagination,
  AuroraSkeleton,
  AuroraEmptyState,
  AuroraButton,
  AuroraTooltip,
  useToast,
} from '../../components/aurora';

const mockClients = [
  { id: 1, name: 'Marie Dupont', phone: '06 12 34 56 78', email: 'marie.dupont@email.com', products: ['Auto', 'MRH'], lastContact: '2026-05-08', status: 'active', score: 85 },
  { id: 2, name: 'Jean Martin', phone: '06 98 76 54 32', email: 'jean.martin@email.com', products: ['Santé'], lastContact: '2026-04-15', status: 'inactive', score: 42 },
  { id: 3, name: 'Sophie Bernard', phone: '06 55 44 33 22', email: 'sophie.b@email.com', products: ['Auto', 'Santé', 'Vie'], lastContact: '2026-05-10', status: 'active', score: 92 },
  { id: 4, name: 'Pierre Durand', phone: '06 11 22 33 44', email: 'p.durand@email.com', products: ['MRH'], lastContact: '2026-03-20', status: 'pending', score: 65 },
  { id: 5, name: 'Claire Moreau', phone: '06 77 88 99 00', email: 'claire.moreau@email.com', products: ['Auto', 'MRH', 'Santé'], lastContact: '2026-05-09', status: 'active', score: 78 },
];

const statusConfig = {
  active: { label: 'Actif', variant: 'emerald' },
  inactive: { label: 'Inactif', variant: 'neutral' },
  pending: { label: 'En attente', variant: 'amber' },
};

const getScoreVariant = (score) => {
  if (score >= 80) return 'emerald';
  if (score >= 60) return 'cyan';
  if (score >= 40) return 'amber';
  return 'rose';
};

const styles = {
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: 'var(--aurora-space-3) var(--aurora-space-4)',
    textAlign: 'left',
    fontSize: 'var(--aurora-text-xs)',
    fontWeight: 600,
    color: 'var(--aurora-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--aurora-border-soft)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: 'var(--aurora-space-3) var(--aurora-space-4)',
    borderBottom: '1px solid var(--aurora-border-soft)',
    fontSize: 'var(--aurora-text-sm)',
    color: 'var(--aurora-text-primary)',
  },
  actionBtn: {
    padding: 'var(--aurora-space-2)',
    border: 'none',
    background: 'transparent',
    color: 'var(--aurora-text-muted)',
    cursor: 'pointer',
    borderRadius: 'var(--aurora-radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export function ClientsV2() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showToast } = useToast();
  const perPage = 10;

  const fetchClients = useCallback(async (controller) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(search)}&page=${page}&limit=${perPage}`, {
        headers,
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('Erreur API');

      const data = await res.json();
      setClients(data.clients || data.data || mockClients);
      setTotalPages(data.totalPages || Math.ceil((data.total || mockClients.length) / perPage));
    } catch (err) {
      if (err.name !== 'AbortError') {
        setClients(mockClients.filter(c => c.name.toLowerCase().includes(search.toLowerCase())));
        setTotalPages(1);
      }
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const controller = new AbortController();
    fetchClients(controller);
    return () => controller.abort();
  }, [fetchClients]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleAction = (action, client) => {
    showToast(`${action} - ${client.name}`, 'info');
  };

  return (
    <div style={{ padding: 'var(--aurora-space-6)', maxWidth: 1400, margin: '0 auto' }}>
      <AuroraPageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length > 1 ? 's' : ''} trouvé${clients.length > 1 ? 's' : ''}`}
        actions={
          <>
            <AuroraButton variant="ghost" icon={Upload}>Importer</AuroraButton>
            <AuroraButton variant="primary" icon={Plus}>Nouveau client</AuroraButton>
          </>
        }
      />

      <div style={{ marginBottom: 'var(--aurora-space-4)' }}>
        <AuroraInput
          icon={Search}
          placeholder="Rechercher un client..."
          value={search}
          onChange={handleSearch}
          style={{ maxWidth: 400 }}
        />
      </div>

      <AuroraCard style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 'var(--aurora-space-4)' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--aurora-space-3)', marginBottom: 'var(--aurora-space-3)' }}>
                <AuroraSkeleton width={40} height={40} circle />
                <div style={{ flex: 1 }}>
                  <AuroraSkeleton height={16} width="30%" style={{ marginBottom: 8 }} />
                  <AuroraSkeleton height={12} width="50%" />
                </div>
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <AuroraEmptyState
            title="Aucun client trouvé"
            description="Aucun client ne correspond à votre recherche. Essayez avec d'autres termes ou créez un nouveau client."
            action={<AuroraButton variant="primary" icon={Plus}>Ajouter un client</AuroraButton>}
          />
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Client</th>
                  <th style={styles.th}>Téléphone</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Produits</th>
                  <th style={styles.th}>Dernier contact</th>
                  <th style={styles.th}>Statut</th>
                  <th style={styles.th}>Score</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <motion.tr
                    key={client.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ backgroundColor: 'var(--aurora-bg-surface-hover)' }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aurora-space-3)' }}>
                        <AuroraAvatar name={client.name} size="sm" status={client.status === 'active' ? 'online' : 'offline'} />
                        <span style={{ fontWeight: 500 }}>{client.name}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aurora-space-2)' }}>
                        <Phone size={14} style={{ color: 'var(--aurora-text-muted)' }} />
                        {client.phone}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aurora-space-2)' }}>
                        <Mail size={14} style={{ color: 'var(--aurora-text-muted)' }} />
                        {client.email}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 'var(--aurora-space-1)', flexWrap: 'wrap' }}>
                        {client.products.map((p) => (
                          <AuroraBadge key={p} variant="neutral" size="sm">{p}</AuroraBadge>
                        ))}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {new Date(client.lastContact).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={styles.td}>
                      <AuroraBadge variant={statusConfig[client.status].variant} size="sm">
                        {statusConfig[client.status].label}
                      </AuroraBadge>
                    </td>
                    <td style={styles.td}>
                      <AuroraBadge variant={getScoreVariant(client.score)} size="sm">
                        {client.score}
                      </AuroraBadge>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 'var(--aurora-space-1)' }}>
                        <AuroraTooltip content="Voir">
                          <motion.button
                            style={styles.actionBtn}
                            whileHover={{ backgroundColor: 'var(--aurora-bg-surface-hover)', color: 'var(--aurora-violet)' }}
                            onClick={() => handleAction('Voir', client)}
                          >
                            <Eye size={16} />
                          </motion.button>
                        </AuroraTooltip>
                        <AuroraTooltip content="Modifier">
                          <motion.button
                            style={styles.actionBtn}
                            whileHover={{ backgroundColor: 'var(--aurora-bg-surface-hover)', color: 'var(--aurora-cyan)' }}
                            onClick={() => handleAction('Modifier', client)}
                          >
                            <Edit size={16} />
                          </motion.button>
                        </AuroraTooltip>
                        <AuroraTooltip content="Supprimer">
                          <motion.button
                            style={styles.actionBtn}
                            whileHover={{ backgroundColor: 'var(--aurora-bg-surface-hover)', color: 'var(--aurora-rose)' }}
                            onClick={() => handleAction('Supprimer', client)}
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        </AuroraTooltip>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AuroraCard>

      {!loading && clients.length > 0 && (
        <div style={{ marginTop: 'var(--aurora-space-4)' }}>
          <AuroraPagination page={page} total={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}

export default ClientsV2;
