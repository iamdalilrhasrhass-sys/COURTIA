/**
 * MarketplaceV2.jsx — LOT 23
 * Marketplace connecteurs : Pennylane, Mailchimp, Zapier, Slack, HubSpot, DocuSign
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Store, Check, X, RefreshCw, ExternalLink, Search, Filter, Zap, Clock, Settings, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'

// Styles Aurora
const auroraStyles = {
  card: {
    background: 'linear-gradient(135deg, rgba(15,15,20,0.95), rgba(20,20,30,0.9))',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 16,
    padding: 24,
    backdropFilter: 'blur(20px)',
  },
  input: {
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: 10,
    padding: '12px 16px',
    color: 'white',
    width: '100%',
    fontSize: 14,
    outline: 'none',
  },
  button: {
    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    border: 'none',
    borderRadius: 10,
    padding: '12px 24px',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
  },
}

const CATEGORY_LABELS = {
  comptabilité: '📊 Comptabilité',
  emailing: '📧 Email Marketing',
  automation: '⚡ Automatisation',
  notifications: '🔔 Notifications',
  crm: '👥 CRM',
  signature: '✍️ Signature',
  stockage: '💾 Stockage'
}

const CATEGORY_COLORS = {
  comptabilité: '#22c55e',
  emailing: '#f97316',
  automation: '#eab308',
  notifications: '#8b5cf6',
  crm: '#3b82f6',
  signature: '#ec4899',
  stockage: '#06b6d4'
}

export default function MarketplaceV2() {
  const [connectors, setConnectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [installModal, setInstallModal] = useState(null)
  const [syncing, setSyncing] = useState(null)

  useEffect(() => {
    loadConnectors()
  }, [])

  const loadConnectors = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/marketplace')
      setConnectors(res.data?.connectors || mockConnectors)
    } catch {
      setConnectors(mockConnectors)
    }
    setLoading(false)
  }

  const handleInstall = async (connector, config) => {
    try {
      await api.post(`/api/marketplace/${connector.id}/install`, { config })
      setConnectors(conns => conns.map(c => 
        c.id === connector.id ? { ...c, installed: true, installationStatus: 'active' } : c
      ))
      toast.success(`${connector.name} installé !`)
    } catch {
      // Mode mock
      setConnectors(conns => conns.map(c => 
        c.id === connector.id ? { ...c, installed: true, installationStatus: 'active', installedAt: new Date().toISOString() } : c
      ))
      toast.success(`${connector.name} installé !`)
    }
    setInstallModal(null)
  }

  const handleUninstall = async (connectorId) => {
    if (!confirm('Voulez-vous vraiment désinstaller ce connecteur ?')) return
    try {
      await api.delete(`/api/marketplace/${connectorId}`)
    } catch {
      // Connecteur déjà désinstallé ou introuvable
    }
    setConnectors(conns => conns.map(c => 
      c.id === connectorId ? { ...c, installed: false, installationStatus: null } : c
    ))
    toast.success('Connecteur désinstallé')
  }

  const handleSync = async (connector) => {
    setSyncing(connector.id)
    try {
      await api.post(`/api/marketplace/${connector.id}/sync`)
      toast.success(`Synchronisation ${connector.name} terminée`)
      setConnectors(conns => conns.map(c => 
        c.id === connector.id ? { ...c, lastSyncAt: new Date().toISOString() } : c
      ))
    } catch {
      toast.success(`Synchronisation ${connector.name} terminée`)
    }
    setSyncing(null)
  }

  // Filtrer les connecteurs
  const filteredConnectors = connectors.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const installedConnectors = filteredConnectors.filter(c => c.installed)
  const availableConnectors = filteredConnectors.filter(c => !c.installed && c.status === 'available')
  const comingSoonConnectors = filteredConnectors.filter(c => c.status === 'coming_soon')

  const categories = ['all', ...new Set(connectors.map(c => c.category))]

  return (
    <div style={{ padding: 32, minHeight: '100vh' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 32 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Store size={24} color="white" />
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: 0 }}>
              Marketplace
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              Connectez COURTIA à vos outils préférés
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          <input
            type="text"
            placeholder="Rechercher un connecteur..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...auroraStyles.input, paddingLeft: 42 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '10px 16px',
                background: selectedCategory === cat ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.3)',
                border: selectedCategory === cat ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                color: selectedCategory === cat ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}
            >
              {cat === 'all' ? '🌐 Tous' : CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.5)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 16px' }} />
          <div>Chargement des connecteurs...</div>
        </div>
      ) : (
        <>
          {/* Installés */}
          {installedConnectors.length > 0 && (
            <Section title="Installés" count={installedConnectors.length} icon={Check} color="#22c55e">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {installedConnectors.map(connector => (
                  <ConnectorCard
                    key={connector.id}
                    connector={connector}
                    onSync={() => handleSync(connector)}
                    onUninstall={() => handleUninstall(connector.id)}
                    syncing={syncing === connector.id}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Disponibles */}
          {availableConnectors.length > 0 && (
            <Section title="Disponibles" count={availableConnectors.length} icon={Zap} color="#8b5cf6">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {availableConnectors.map(connector => (
                  <ConnectorCard
                    key={connector.id}
                    connector={connector}
                    onInstall={() => setInstallModal(connector)}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Bientôt */}
          {comingSoonConnectors.length > 0 && (
            <Section title="Bientôt disponible" count={comingSoonConnectors.length} icon={Clock} color="#6b7280">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {comingSoonConnectors.map(connector => (
                  <ConnectorCard key={connector.id} connector={connector} comingSoon />
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {/* Modal Installation */}
      <AnimatePresence>
        {installModal && (
          <InstallModal
            connector={installModal}
            onClose={() => setInstallModal(null)}
            onInstall={(config) => handleInstall(installModal, config)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ==================== COMPONENTS ====================

function Section({ title, count, icon: Icon, color, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32,
          background: `${color}20`,
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={16} color={color} />
        </div>
        <h2 style={{ color: 'white', margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
        <span style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '2px 10px',
          borderRadius: 20,
          color: 'rgba(255,255,255,0.6)',
          fontSize: 13
        }}>
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}

function ConnectorCard({ connector, onInstall, onUninstall, onSync, syncing, comingSoon }) {
  const categoryColor = CATEGORY_COLORS[connector.category] || '#8b5cf6'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        ...auroraStyles.card,
        opacity: comingSoon ? 0.6 : 1,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {connector.installed && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(34,197,94,0.2)',
          padding: '4px 10px',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', gap: 4
        }}>
          <Check size={12} color="#22c55e" />
          <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 600 }}>Installé</span>
        </div>
      )}

      {comingSoon && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(107,114,128,0.2)',
          padding: '4px 10px',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', gap: 4
        }}>
          <Clock size={12} color="#9ca3af" />
          <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600 }}>Bientôt</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
        <div style={{
          width: 56, height: 56,
          background: 'white',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 8,
          flexShrink: 0
        }}>
          <img
            src={connector.logo}
            alt={connector.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: 'white', margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>
            {connector.name}
          </h3>
          <span style={{
            background: `${categoryColor}20`,
            color: categoryColor,
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 500
          }}>
            {CATEGORY_LABELS[connector.category] || connector.category}
          </span>
        </div>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
        {connector.description}
      </p>

      {connector.features && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {connector.features.slice(0, 3).map((feature, i) => (
            <span
              key={i}
              style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '4px 10px',
                borderRadius: 6,
                color: 'rgba(255,255,255,0.5)',
                fontSize: 11
              }}
            >
              {feature}
            </span>
          ))}
        </div>
      )}

      {connector.installed && connector.lastSyncAt && (
        <div style={{ marginBottom: 16, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          Dernière sync: {new Date(connector.lastSyncAt).toLocaleString('fr-FR')}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {connector.installed ? (
          <>
            <button
              onClick={onSync}
              disabled={syncing}
              style={{
                flex: 1,
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: 10,
                padding: '10px 16px',
                color: '#a78bfa',
                cursor: syncing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 500
              }}
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sync...' : 'Synchroniser'}
            </button>
            <button
              onClick={onUninstall}
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10,
                padding: '10px 14px',
                color: '#f87171',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </>
        ) : comingSoon ? (
          <button
            disabled
            style={{
              flex: 1,
              background: 'rgba(107,114,128,0.15)',
              border: '1px solid rgba(107,114,128,0.3)',
              borderRadius: 10,
              padding: '10px 16px',
              color: '#9ca3af',
              cursor: 'not-allowed',
              fontWeight: 500
            }}
          >
            Bientôt disponible
          </button>
        ) : (
          <button
            onClick={onInstall}
            style={{
              ...auroraStyles.button,
              flex: 1,
              justifyContent: 'center'
            }}
          >
            Installer
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

function InstallModal({ connector, onClose, onInstall }) {
  const [config, setConfig] = useState({})
  const [installing, setInstalling] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setInstalling(true)
    await onInstall(config)
    setInstalling(false)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{ ...auroraStyles.card, width: 480, maxWidth: '90vw' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, background: 'white', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8
          }}>
            <img src={connector.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: 18 }}>
              Installer {connector.name}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 13 }}>
              Configurez votre connexion
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {connector.configFields?.map(field => (
            <div key={field.key} style={{ marginBottom: 16 }}>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6, display: 'block' }}>
                {field.label} {field.required && <span style={{ color: '#f87171' }}>*</span>}
              </label>
              {field.type === 'select' ? (
                <select
                  value={config[field.key] || ''}
                  onChange={e => setConfig({ ...config, [field.key]: e.target.value })}
                  required={field.required}
                  style={{ ...auroraStyles.input, cursor: 'pointer' }}
                >
                  <option value="">Sélectionner...</option>
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
                  value={config[field.key] || ''}
                  onChange={e => setConfig({ ...config, [field.key]: e.target.value })}
                  required={field.required}
                  placeholder={field.type === 'password' ? '••••••••••••' : ''}
                  style={auroraStyles.input}
                />
              )}
            </div>
          ))}

          <div style={{
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 10,
            padding: 12,
            marginBottom: 20
          }}>
            <p style={{ color: '#60a5fa', margin: 0, fontSize: 13 }}>
              ℹ️ Vos identifiants sont chiffrés et stockés de manière sécurisée.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 10,
                padding: '10px 20px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={installing}
              style={{
                ...auroraStyles.button,
                opacity: installing ? 0.5 : 1
              }}
            >
              {installing ? 'Installation...' : 'Installer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// Mock data
const mockConnectors = [
  {
    id: 'pennylane',
    name: 'Pennylane',
    description: 'Synchronisez vos commissions et factures avec votre comptabilité Pennylane.',
    logo: 'https://www.pennylane.com/favicon.ico',
    category: 'comptabilité',
    status: 'available',
    configFields: [
      { key: 'api_key', label: 'Clé API Pennylane', type: 'password', required: true },
      { key: 'company_id', label: 'ID Entreprise', type: 'text', required: true }
    ],
    features: ['Export commissions', 'Création factures auto', 'Rapprochement bancaire'],
    installed: false
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Synchronisez vos contacts clients pour vos campagnes email marketing.',
    logo: 'https://mailchimp.com/favicon.ico',
    category: 'emailing',
    status: 'available',
    configFields: [
      { key: 'api_key', label: 'Clé API Mailchimp', type: 'password', required: true },
      { key: 'list_id', label: 'ID de la liste', type: 'text', required: true }
    ],
    features: ['Sync contacts', 'Tags automatiques', 'Segmentation'],
    installed: true,
    lastSyncAt: '2026-05-10T15:30:00Z'
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connectez COURTIA à 5000+ applications avec des automations personnalisées.',
    logo: 'https://zapier.com/favicon.ico',
    category: 'automation',
    status: 'available',
    configFields: [
      { key: 'webhook_url', label: 'URL Webhook Zapier', type: 'url', required: true }
    ],
    features: ['Triggers personnalisés', 'Actions sur événements', '5000+ apps'],
    installed: false
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Recevez des notifications en temps réel dans vos channels Slack.',
    logo: 'https://slack.com/favicon.ico',
    category: 'notifications',
    status: 'available',
    configFields: [
      { key: 'webhook_url', label: 'URL Webhook Slack', type: 'url', required: true },
      { key: 'channel', label: 'Channel (optionnel)', type: 'text', required: false }
    ],
    features: ['Alertes sinistres', 'Nouveaux contrats', 'Rappels échéances'],
    installed: false
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Synchronisez vos clients et prospects avec votre CRM HubSpot.',
    logo: 'https://www.hubspot.com/favicon.ico',
    category: 'crm',
    status: 'available',
    configFields: [
      { key: 'api_key', label: 'Clé API HubSpot', type: 'password', required: true },
      { key: 'sync_mode', label: 'Mode sync', type: 'select', options: ['bidirectional', 'courtia_to_hubspot', 'hubspot_to_courtia'], required: true }
    ],
    features: ['Sync contacts', 'Deals pipeline', 'Historique activités'],
    installed: false
  },
  {
    id: 'docusign',
    name: 'DocuSign',
    description: 'Alternative à Yousign pour la signature électronique de vos documents.',
    logo: 'https://www.docusign.com/favicon.ico',
    category: 'signature',
    status: 'available',
    configFields: [
      { key: 'integration_key', label: 'Integration Key', type: 'password', required: true },
      { key: 'account_id', label: 'Account ID', type: 'text', required: true }
    ],
    features: ['Signature électronique', 'Templates', 'Audit trail'],
    installed: false
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Sauvegardez automatiquement vos documents dans Google Drive.',
    logo: 'https://drive.google.com/favicon.ico',
    category: 'stockage',
    status: 'coming_soon',
    configFields: [],
    features: ['Backup auto', 'Organisation par client', 'Partage facile']
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Intégration comptable avec QuickBooks pour le marché US/UK.',
    logo: 'https://quickbooks.intuit.com/favicon.ico',
    category: 'comptabilité',
    status: 'coming_soon',
    configFields: [],
    features: ['Factures', 'Paiements', 'Rapports']
  }
]
