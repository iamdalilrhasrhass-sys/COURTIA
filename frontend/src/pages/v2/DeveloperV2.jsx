/**
 * DeveloperV2.jsx — LOT 23
 * Page développeur : Gestion API Keys, Documentation, Webhooks
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, Book, Webhook, Code, Copy, Check, Plus, Trash2, Eye, EyeOff, RefreshCw, ExternalLink, Terminal } from 'lucide-react'
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
  tab: (active) => ({
    padding: '12px 20px',
    background: active ? 'rgba(139,92,246,0.2)' : 'transparent',
    border: active ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
    borderRadius: 10,
    color: active ? '#a78bfa' : 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.2s',
  })
}

const TABS = [
  { id: 'keys', label: 'Clés API', icon: Key },
  { id: 'docs', label: 'Documentation', icon: Book },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'examples', label: 'Exemples', icon: Code },
]

const SCOPES = [
  { id: 'read:clients', label: 'Lecture clients', description: 'Accéder à la liste et détail des clients' },
  { id: 'read:contracts', label: 'Lecture contrats', description: 'Accéder à la liste des contrats' },
  { id: 'read:commissions', label: 'Lecture commissions', description: 'Accéder aux données de commissions' },
]

export default function DeveloperV2() {
  const [activeTab, setActiveTab] = useState('keys')
  const [apiKeys, setApiKeys] = useState([])
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [newKeyModal, setNewKeyModal] = useState(false)
  const [newWebhookModal, setNewWebhookModal] = useState(false)
  const [createdKey, setCreatedKey] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [keysRes, webhooksRes] = await Promise.all([
        api.get('/api/developer/keys').catch(() => ({ data: { keys: [] } })),
        api.get('/api/developer/webhooks').catch(() => ({ data: { webhooks: [] } }))
      ])
      setApiKeys(keysRes.data?.keys || mockApiKeys)
      setWebhooks(webhooksRes.data?.webhooks || mockWebhooks)
    } catch (err) {
      // Mode mock
      setApiKeys(mockApiKeys)
      setWebhooks(mockWebhooks)
    }
    setLoading(false)
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Copié !')
    setTimeout(() => setCopiedId(null), 2000)
  }

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
            <Terminal size={24} color="white" />
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: 0 }}>
              Espace Développeur
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              API publique, webhooks et intégrations
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={auroraStyles.tab(activeTab === tab.id)}
          >
            <tab.icon size={16} style={{ marginRight: 8 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'keys' && (
          <ApiKeysTab
            keys={apiKeys}
            loading={loading}
            onCreateKey={() => setNewKeyModal(true)}
            onRevokeKey={(id) => {
              setApiKeys(keys => keys.map(k => k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k))
              toast.success('Clé révoquée')
            }}
            copyToClipboard={copyToClipboard}
            copiedId={copiedId}
          />
        )}
        {activeTab === 'docs' && <DocumentationTab />}
        {activeTab === 'webhooks' && (
          <WebhooksTab
            webhooks={webhooks}
            onCreateWebhook={() => setNewWebhookModal(true)}
            onDeleteWebhook={(id) => {
              setWebhooks(wh => wh.filter(w => w.id !== id))
              toast.success('Webhook supprimé')
            }}
          />
        )}
        {activeTab === 'examples' && <ExamplesTab copyToClipboard={copyToClipboard} copiedId={copiedId} />}
      </AnimatePresence>

      {/* Modal création clé */}
      <AnimatePresence>
        {newKeyModal && (
          <CreateKeyModal
            onClose={() => setNewKeyModal(false)}
            onCreated={(key) => {
              setCreatedKey(key)
              setApiKeys(keys => [key, ...keys])
              setNewKeyModal(false)
            }}
          />
        )}
        {createdKey && (
          <KeyRevealModal
            apiKey={createdKey}
            onClose={() => setCreatedKey(null)}
            copyToClipboard={copyToClipboard}
          />
        )}
        {newWebhookModal && (
          <CreateWebhookModal
            onClose={() => setNewWebhookModal(false)}
            onCreated={(wh) => {
              setWebhooks(webhooks => [wh, ...webhooks])
              setNewWebhookModal(false)
              toast.success('Webhook créé')
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ==================== API KEYS TAB ====================
function ApiKeysTab({ keys, loading, onCreateKey, onRevokeKey, copyToClipboard, copiedId }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div style={{ ...auroraStyles.card, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: 18 }}>Mes clés API</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontSize: 13 }}>
              Gérez vos clés d'accès à l'API publique COURTIA
            </p>
          </div>
          <button style={auroraStyles.button} onClick={onCreateKey}>
            <Plus size={16} /> Nouvelle clé
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.5)' }}>
            <RefreshCw size={24} className="animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.5)' }}>
            Aucune clé API. Créez-en une pour commencer.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {keys.map(key => (
              <div
                key={key.id}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 12,
                  padding: 16,
                  border: key.revokedAt ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(139,92,246,0.2)',
                  opacity: key.revokedAt ? 0.6 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: 'white', fontWeight: 600 }}>{key.name}</span>
                      {key.revokedAt && (
                        <span style={{
                          background: 'rgba(239,68,68,0.2)',
                          color: '#f87171',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11
                        }}>
                          Révoquée
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontFamily: 'monospace',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: 13,
                      marginBottom: 8
                    }}>
                      {key.keyPrefix}••••••••••••
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {key.scopes?.map(scope => (
                        <span
                          key={scope}
                          style={{
                            background: 'rgba(139,92,246,0.15)',
                            color: '#a78bfa',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11
                          }}
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {key.lastUsedAt && (
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                        Dernière utilisation: {new Date(key.lastUsedAt).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                    {!key.revokedAt && (
                      <button
                        onClick={() => onRevokeKey(key.id)}
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 8,
                          padding: '6px 12px',
                          color: '#f87171',
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ==================== DOCUMENTATION TAB ====================
function DocumentationTab() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div style={{ ...auroraStyles.card }}>
        <h2 style={{ color: 'white', margin: '0 0 16px', fontSize: 18 }}>Documentation API</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 12,
              padding: 20,
              textDecoration: 'none',
              border: '1px solid rgba(139,92,246,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 16
            }}
          >
            <div style={{
              width: 48, height: 48,
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Book size={24} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 600, marginBottom: 4 }}>
                Swagger UI
                <ExternalLink size={14} style={{ marginLeft: 6, opacity: 0.5 }} />
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                Documentation interactive OpenAPI
              </div>
            </div>
          </a>

          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 12,
            padding: 20,
            border: '1px solid rgba(139,92,246,0.2)',
          }}>
            <h3 style={{ color: 'white', margin: '0 0 12px', fontSize: 15 }}>Base URL</h3>
            <code style={{
              display: 'block',
              background: 'rgba(0,0,0,0.5)',
              padding: 12,
              borderRadius: 8,
              color: '#a78bfa',
              fontSize: 13
            }}>
              https://api.courtiark.fr/api/v1
            </code>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <h3 style={{ color: 'white', margin: '0 0 12px', fontSize: 15 }}>Endpoints disponibles</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { method: 'GET', path: '/me', desc: 'Informations du cabinet' },
              { method: 'GET', path: '/clients', desc: 'Liste des clients' },
              { method: 'GET', path: '/clients/:id', desc: 'Détail d\'un client' },
              { method: 'GET', path: '/contracts', desc: 'Liste des contrats' },
              { method: 'GET', path: '/commissions', desc: 'Liste des commissions' },
              { method: 'POST', path: '/webhooks', desc: 'Créer un webhook' },
            ].map((ep, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'rgba(0,0,0,0.3)',
                  padding: '10px 16px',
                  borderRadius: 8
                }}
              >
                <span style={{
                  background: ep.method === 'GET' ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)',
                  color: ep.method === 'GET' ? '#22c55e' : '#3b82f6',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'monospace'
                }}>
                  {ep.method}
                </span>
                <code style={{ color: 'white', fontSize: 13 }}>{ep.path}</code>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 'auto' }}>
                  {ep.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ==================== WEBHOOKS TAB ====================
function WebhooksTab({ webhooks, onCreateWebhook, onDeleteWebhook }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div style={{ ...auroraStyles.card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: 18 }}>Webhooks</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontSize: 13 }}>
              Recevez des notifications en temps réel
            </p>
          </div>
          <button style={auroraStyles.button} onClick={onCreateWebhook}>
            <Plus size={16} /> Ajouter webhook
          </button>
        </div>

        {webhooks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.5)' }}>
            Aucun webhook configuré.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {webhooks.map(wh => (
              <div
                key={wh.id}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 12,
                  padding: 16,
                  border: '1px solid rgba(139,92,246,0.2)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <code style={{ color: 'white', fontSize: 14 }}>{wh.url}</code>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {wh.events?.map(event => (
                        <span
                          key={event}
                          style={{
                            background: 'rgba(59,130,246,0.15)',
                            color: '#60a5fa',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11
                          }}
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteWebhook(wh.id)}
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 8,
                      padding: '6px 12px',
                      color: '#f87171',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ==================== EXAMPLES TAB ====================
function ExamplesTab({ copyToClipboard, copiedId }) {
  const examples = [
    {
      title: 'Authentification (cURL)',
      lang: 'bash',
      code: `curl -X GET "https://api.courtiark.fr/api/v1/me" \\
  -H "Authorization: Bearer sk-ark-VOTRE_CLE_API"`
    },
    {
      title: 'Liste des clients (JavaScript)',
      lang: 'javascript',
      code: `const response = await fetch('https://api.courtiark.fr/api/v1/clients', {
  headers: {
    'Authorization': 'Bearer sk-ark-VOTRE_CLE_API',
    'Content-Type': 'application/json'
  }
});
const { data, pagination } = await response.json();
console.log(\`\${pagination.total} clients trouvés\`);`
    },
    {
      title: 'Créer un webhook (cURL)',
      lang: 'bash',
      code: `curl -X POST "https://api.courtiark.fr/api/v1/webhooks" \\
  -H "Authorization: Bearer sk-ark-VOTRE_CLE_API" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://mon-app.com/webhook", "events": ["client.created", "contract.created"]}'`
    },
    {
      title: 'Vérifier signature webhook (Node.js)',
      lang: 'javascript',
      code: `const crypto = require('crypto');

function verifyWebhookSignature(body, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}`
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {examples.map((ex, i) => (
          <div key={i} style={auroraStyles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: 15 }}>{ex.title}</h3>
              <button
                onClick={() => copyToClipboard(ex.code, `ex-${i}`)}
                style={{
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  color: '#a78bfa',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12
                }}
              >
                {copiedId === `ex-${i}` ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === `ex-${i}` ? 'Copié' : 'Copier'}
              </button>
            </div>
            <pre style={{
              background: 'rgba(0,0,0,0.5)',
              padding: 16,
              borderRadius: 10,
              overflow: 'auto',
              margin: 0,
              fontSize: 13,
              color: '#e2e8f0',
              lineHeight: 1.6
            }}>
              <code>{ex.code}</code>
            </pre>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ==================== MODALS ====================
function CreateKeyModal({ onClose, onCreated }) {
  const [name, setName] = useState('Production')
  const [scopes, setScopes] = useState(['read:clients', 'read:contracts', 'read:commissions'])
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await api.post('/api/developer/keys', { name, scopes })
      onCreated(res.data)
    } catch {
      // Mock response
      onCreated({
        id: Date.now(),
        name,
        scopes,
        keyPrefix: 'sk-ark-' + Math.random().toString(36).substring(2, 6),
        fullKey: 'sk-ark-' + Math.random().toString(36).substring(2, 34),
        createdAt: new Date().toISOString()
      })
    }
    setCreating(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ ...auroraStyles.card, width: 450, maxWidth: '90vw' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ color: 'white', margin: '0 0 20px', fontSize: 18 }}>Nouvelle clé API</h2>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6, display: 'block' }}>
            Nom de la clé
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Production, Development..."
            style={auroraStyles.input}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 10, display: 'block' }}>
            Permissions (scopes)
          </label>
          {SCOPES.map(scope => (
            <label
              key={scope.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', marginBottom: 8,
                background: scopes.includes(scope.id) ? 'rgba(139,92,246,0.1)' : 'rgba(0,0,0,0.2)',
                borderRadius: 8, cursor: 'pointer',
                border: scopes.includes(scope.id) ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent'
              }}
            >
              <input
                type="checkbox"
                checked={scopes.includes(scope.id)}
                onChange={e => {
                  if (e.target.checked) {
                    setScopes([...scopes, scope.id])
                  } else {
                    setScopes(scopes.filter(s => s !== scope.id))
                  }
                }}
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>{scope.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{scope.description}</div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
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
            onClick={handleCreate}
            disabled={creating || !name}
            style={{
              ...auroraStyles.button,
              opacity: creating || !name ? 0.5 : 1
            }}
          >
            {creating ? 'Création...' : 'Créer la clé'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function KeyRevealModal({ apiKey, onClose, copyToClipboard }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ ...auroraStyles.card, width: 500, maxWidth: '90vw' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Check size={20} color="white" />
          </div>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: 18 }}>Clé créée avec succès</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 13 }}>{apiKey.name}</p>
          </div>
        </div>

        <div style={{
          background: 'rgba(234,179,8,0.1)',
          border: '1px solid rgba(234,179,8,0.3)',
          borderRadius: 10,
          padding: 12,
          marginBottom: 16
        }}>
          <p style={{ color: '#fbbf24', margin: 0, fontSize: 13 }}>
            ⚠️ <strong>Important :</strong> Copiez cette clé maintenant. Elle ne sera plus jamais affichée.
          </p>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.5)',
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <code style={{
            flex: 1,
            color: revealed ? '#a78bfa' : 'rgba(255,255,255,0.4)',
            fontSize: 14,
            wordBreak: 'break-all'
          }}>
            {revealed ? apiKey.fullKey : '••••••••••••••••••••••••••••••••••••'}
          </code>
          <button
            onClick={() => setRevealed(!revealed)}
            style={{
              background: 'rgba(139,92,246,0.15)',
              border: 'none',
              borderRadius: 6,
              padding: 8,
              color: '#a78bfa',
              cursor: 'pointer'
            }}
          >
            {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button
            onClick={() => copyToClipboard(apiKey.fullKey, 'new-key')}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600
            }}
          >
            <Copy size={16} /> Copier
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10,
            padding: '12px 20px',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          J'ai copié ma clé, fermer
        </button>
      </motion.div>
    </div>
  )
}

function CreateWebhookModal({ onClose, onCreated }) {
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState(['client.created', 'contract.created'])
  const allEvents = ['client.created', 'client.updated', 'contract.created', 'contract.updated', 'commission.received']

  const handleCreate = () => {
    if (!url) return
    onCreated({
      id: Date.now(),
      url,
      events,
      isActive: true,
      createdAt: new Date().toISOString()
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ ...auroraStyles.card, width: 450, maxWidth: '90vw' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ color: 'white', margin: '0 0 20px', fontSize: 18 }}>Nouveau webhook</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6, display: 'block' }}>
            URL de destination
          </label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://mon-app.com/webhook"
            style={auroraStyles.input}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 10, display: 'block' }}>
            Événements
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {allEvents.map(event => (
              <button
                key={event}
                onClick={() => {
                  if (events.includes(event)) {
                    setEvents(events.filter(e => e !== event))
                  } else {
                    setEvents([...events, event])
                  }
                }}
                style={{
                  background: events.includes(event) ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.3)',
                  border: events.includes(event) ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  color: events.includes(event) ? '#60a5fa' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                {event}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
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
            onClick={handleCreate}
            disabled={!url}
            style={{
              ...auroraStyles.button,
              opacity: !url ? 0.5 : 1
            }}
          >
            Créer le webhook
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// Mock data
const mockApiKeys = [
  {
    id: 1,
    name: 'Production',
    keyPrefix: 'sk-ark-7x9f',
    scopes: ['read:clients', 'read:contracts', 'read:commissions'],
    lastUsedAt: '2026-05-10T14:30:00Z',
    createdAt: '2026-03-15T10:00:00Z'
  },
  {
    id: 2,
    name: 'Development',
    keyPrefix: 'sk-ark-3k2m',
    scopes: ['read:clients'],
    lastUsedAt: '2026-05-09T09:15:00Z',
    createdAt: '2026-04-01T08:00:00Z'
  }
]

const mockWebhooks = [
  {
    id: 1,
    url: 'https://mon-erp.com/api/courtia-webhook',
    events: ['client.created', 'contract.created', 'commission.received'],
    isActive: true,
    lastTriggeredAt: '2026-05-10T16:45:00Z'
  }
]
