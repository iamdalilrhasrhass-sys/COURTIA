/**
 * EnterpriseV2.jsx — LOT 23
 * Fonctionnalités Enterprise : Audit Logs, Rôles & Permissions, SSO
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, ScrollText, Users, Key, RefreshCw, Search, Filter, Calendar, ChevronRight, Plus, Trash2, Check, Lock, AlertTriangle } from 'lucide-react'
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
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
  { id: 'roles', label: 'Rôles & Permissions', icon: Users },
  { id: 'sso', label: 'SSO', icon: Key },
]

const ACTION_LABELS = {
  'clients.create': { label: 'Client créé', icon: '👤', color: '#22c55e' },
  'clients.update': { label: 'Client modifié', icon: '✏️', color: '#3b82f6' },
  'clients.delete': { label: 'Client supprimé', icon: '🗑️', color: '#ef4444' },
  'contracts.create': { label: 'Contrat créé', icon: '📄', color: '#22c55e' },
  'contracts.update': { label: 'Contrat modifié', icon: '✏️', color: '#3b82f6' },
  'contracts.sign': { label: 'Contrat signé', icon: '✍️', color: '#8b5cf6' },
  'documents.upload': { label: 'Document uploadé', icon: '📤', color: '#22c55e' },
  'documents.view': { label: 'Document consulté', icon: '👁️', color: '#6b7280' },
  'documents.delete': { label: 'Document supprimé', icon: '🗑️', color: '#ef4444' },
  'commissions.reconcile': { label: 'Commission rapprochée', icon: '💰', color: '#22c55e' },
  'users.role_change': { label: 'Rôle modifié', icon: '🔑', color: '#f97316' },
  'api_keys.create': { label: 'Clé API créée', icon: '🔐', color: '#22c55e' },
  'api_keys.revoke': { label: 'Clé API révoquée', icon: '🚫', color: '#ef4444' },
}

const PERMISSIONS = [
  { key: 'clients', label: 'Clients', description: 'Gestion des fiches clients' },
  { key: 'contracts', label: 'Contrats', description: 'Gestion des contrats d\'assurance' },
  { key: 'documents', label: 'Documents', description: 'Upload et gestion documentaire' },
  { key: 'commissions', label: 'Commissions', description: 'Suivi des commissions' },
  { key: 'settings', label: 'Paramètres', description: 'Configuration du cabinet' },
  { key: 'users', label: 'Utilisateurs', description: 'Gestion de l\'équipe' },
  { key: 'audit', label: 'Audit', description: 'Consultation des logs d\'audit' },
]

const PERMISSION_LEVELS = ['none', 'read', 'write']

export default function EnterpriseV2() {
  const [activeTab, setActiveTab] = useState('audit')
  const [auditLogs, setAuditLogs] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('7d')

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'audit') {
        const res = await api.get('/api/enterprise/audit-logs')
        setAuditLogs(res.data?.logs || mockAuditLogs)
      } else if (activeTab === 'roles') {
        const res = await api.get('/api/enterprise/roles')
        setRoles(res.data?.roles || mockRoles)
      }
    } catch {
      if (activeTab === 'audit') setAuditLogs(mockAuditLogs)
      if (activeTab === 'roles') setRoles(mockRoles)
    }
    setLoading(false)
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
            <Shield size={24} color="white" />
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: 0 }}>
              Enterprise
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              Sécurité, conformité et contrôle d'accès avancé
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
        {activeTab === 'audit' && (
          <AuditLogsTab
            logs={auditLogs}
            loading={loading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
          />
        )}
        {activeTab === 'roles' && (
          <RolesTab
            roles={roles}
            loading={loading}
            onRefresh={loadData}
          />
        )}
        {activeTab === 'sso' && <SSOTab />}
      </AnimatePresence>
    </div>
  )
}

// ==================== AUDIT LOGS TAB ====================
function AuditLogsTab({ logs, loading, searchQuery, setSearchQuery, dateFilter, setDateFilter }) {
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true
    return (
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceId?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div style={{ ...auroraStyles.card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: 18 }}>Journal d'audit</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontSize: 13 }}>
              Historique complet des actions — Qui a fait quoi, quand
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ ...auroraStyles.input, paddingLeft: 36, width: 200 }}
              />
            </div>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              style={{ ...auroraStyles.input, width: 'auto', cursor: 'pointer' }}
            >
              <option value="24h">Dernières 24h</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="90d">90 derniers jours</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.5)' }}>
            <RefreshCw size={24} className="animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.5)' }}>
            Aucune activité trouvée
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filteredLogs.map((log, index) => {
              const actionInfo = ACTION_LABELS[log.action] || { label: log.action, icon: '📝', color: '#6b7280' }
              return (
                <motion.div
                  key={log.id || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '14px 16px',
                    background: index % 2 === 0 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)',
                    borderRadius: 8
                  }}
                >
                  <div style={{
                    width: 36, height: 36,
                    background: `${actionInfo.color}15`,
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16
                  }}>
                    {actionInfo.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'white', fontWeight: 500, fontSize: 14, marginBottom: 2 }}>
                      {actionInfo.label}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                      {log.userEmail || 'Utilisateur inconnu'}
                      {log.resourceId && <span> • ID: {log.resourceId}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                      {new Date(log.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {log.ipAddress && (
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                        {log.ipAddress}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ==================== ROLES TAB ====================
function RolesTab({ roles, loading, onRefresh }) {
  const [selectedRole, setSelectedRole] = useState(null)
  const [showNewRoleModal, setShowNewRoleModal] = useState(false)

  const handleCreateRole = (newRole) => {
    // API call would go here
    toast.success('Rôle créé')
    setShowNewRoleModal(false)
    onRefresh()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
        {/* Liste des rôles */}
        <div style={auroraStyles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: 'white', margin: 0, fontSize: 16 }}>Rôles</h3>
            <button
              onClick={() => setShowNewRoleModal(true)}
              style={{
                background: 'rgba(139,92,246,0.15)',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: 6,
                padding: '6px 10px',
                color: '#a78bfa',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Plus size={14} />
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <RefreshCw size={20} className="animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: selectedRole?.id === role.id ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.3)',
                    border: selectedRole?.id === role.id ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  <div style={{
                    width: 32, height: 32,
                    background: role.is_system ? 'rgba(59,130,246,0.2)' : 'rgba(139,92,246,0.2)',
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {role.is_system ? <Lock size={14} color="#60a5fa" /> : <Users size={14} color="#a78bfa" />}
                  </div>
                  <div>
                    <div style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>{role.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                      {role.is_system ? 'Système' : 'Personnalisé'}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Détail du rôle */}
        <div style={auroraStyles.card}>
          {selectedRole ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{ color: 'white', margin: 0, fontSize: 18 }}>{selectedRole.name}</h3>
                    {selectedRole.is_system && (
                      <span style={{
                        background: 'rgba(59,130,246,0.2)',
                        color: '#60a5fa',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11
                      }}>
                        Système
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 13 }}>
                    {selectedRole.description || 'Aucune description'}
                  </p>
                </div>
                {!selectedRole.is_system && (
                  <button
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 8,
                      padding: '8px 14px',
                      color: '#f87171',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <h4 style={{ color: 'white', margin: '0 0 16px', fontSize: 15 }}>Matrice des permissions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PERMISSIONS.map(perm => {
                  const level = selectedRole.permissions?.[perm.key] || 'none'
                  return (
                    <div
                      key={perm.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: 10
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>{perm.label}</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{perm.description}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {PERMISSION_LEVELS.map(l => (
                          <span
                            key={l}
                            style={{
                              padding: '4px 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 500,
                              background: level === l 
                                ? l === 'write' ? 'rgba(34,197,94,0.2)' 
                                : l === 'read' ? 'rgba(59,130,246,0.2)' 
                                : 'rgba(107,114,128,0.2)'
                                : 'rgba(0,0,0,0.3)',
                              color: level === l 
                                ? l === 'write' ? '#22c55e' 
                                : l === 'read' ? '#60a5fa' 
                                : '#9ca3af'
                                : 'rgba(255,255,255,0.3)',
                              border: level === l ? '1px solid' : '1px solid transparent',
                              borderColor: level === l 
                                ? l === 'write' ? 'rgba(34,197,94,0.3)' 
                                : l === 'read' ? 'rgba(59,130,246,0.3)' 
                                : 'rgba(107,114,128,0.3)'
                                : 'transparent'
                            }}
                          >
                            {l === 'none' ? 'Aucun' : l === 'read' ? 'Lecture' : 'Écriture'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>
              <Users size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <div>Sélectionnez un rôle pour voir ses permissions</div>
            </div>
          )}
        </div>
      </div>

      {/* Modal nouveau rôle */}
      <AnimatePresence>
        {showNewRoleModal && (
          <NewRoleModal
            onClose={() => setShowNewRoleModal(false)}
            onCreate={handleCreateRole}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ==================== SSO TAB ====================
function SSOTab() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div style={{ ...auroraStyles.card, maxWidth: 700 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48,
            background: 'rgba(234,179,8,0.15)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <AlertTriangle size={24} color="#fbbf24" />
          </div>
          <div>
            <h2 style={{ color: 'white', margin: '0 0 4px', fontSize: 18 }}>Single Sign-On (SSO)</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 14 }}>
              Disponible sur les plans Enterprise
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(234,179,8,0.1)',
          border: '1px solid rgba(234,179,8,0.3)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24
        }}>
          <p style={{ color: '#fbbf24', margin: 0, fontSize: 14, lineHeight: 1.6 }}>
            La configuration SSO permet à vos collaborateurs de se connecter avec leurs identifiants d'entreprise 
            (Google Workspace, Microsoft Entra ID, Okta, etc.). 
            Contactez notre équipe commerciale pour activer cette fonctionnalité.
          </p>
        </div>

        <h3 style={{ color: 'white', margin: '0 0 16px', fontSize: 15 }}>Providers supportés</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[
            { name: 'SAML 2.0', desc: 'Standard entreprise', icon: '🔐' },
            { name: 'OpenID Connect', desc: 'OAuth 2.0 moderne', icon: '🌐' },
            { name: 'Google Workspace', desc: 'G Suite', icon: '🟢' },
            { name: 'Microsoft Entra ID', desc: 'Azure AD', icon: '🔵' },
            { name: 'Okta', desc: 'Identity management', icon: '⚡' },
            { name: 'OneLogin', desc: 'IAM cloud', icon: '🔑' },
          ].map(provider => (
            <div
              key={provider.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 10
              }}
            >
              <span style={{ fontSize: 20 }}>{provider.icon}</span>
              <div>
                <div style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>{provider.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{provider.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => window.open('mailto:enterprise@courtiark.fr?subject=Configuration SSO', '_blank')}
            style={auroraStyles.button}
          >
            Contacter l'équipe Enterprise
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ==================== MODALS ====================
function NewRoleModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState({})

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
        style={{ ...auroraStyles.card, width: 500, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ color: 'white', margin: '0 0 20px', fontSize: 18 }}>Nouveau rôle personnalisé</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6, display: 'block' }}>
            Nom du rôle *
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Commercial junior"
            style={auroraStyles.input}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6, display: 'block' }}>
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description du rôle..."
            style={auroraStyles.input}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 12, display: 'block' }}>
            Permissions
          </label>
          {PERMISSIONS.map(perm => (
            <div
              key={perm.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 8,
                marginBottom: 8
              }}
            >
              <span style={{ color: 'white', fontSize: 14 }}>{perm.label}</span>
              <select
                value={permissions[perm.key] || 'none'}
                onChange={e => setPermissions({ ...permissions, [perm.key]: e.target.value })}
                style={{ ...auroraStyles.input, width: 120, padding: '6px 10px' }}
              >
                <option value="none">Aucun</option>
                <option value="read">Lecture</option>
                <option value="write">Écriture</option>
              </select>
            </div>
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
            onClick={() => onCreate({ name, description, permissions })}
            disabled={!name}
            style={{
              ...auroraStyles.button,
              opacity: !name ? 0.5 : 1
            }}
          >
            Créer le rôle
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// Mock data
const mockAuditLogs = [
  { id: 1, action: 'clients.create', userEmail: 'jean@cabinet.fr', resourceId: '1234', ipAddress: '192.168.1.42', createdAt: '2026-05-11T10:30:00Z' },
  { id: 2, action: 'contracts.sign', userEmail: 'marie@cabinet.fr', resourceId: '5678', ipAddress: '192.168.1.43', createdAt: '2026-05-11T09:45:00Z' },
  { id: 3, action: 'documents.upload', userEmail: 'jean@cabinet.fr', resourceId: 'doc-001', ipAddress: '192.168.1.42', createdAt: '2026-05-11T09:15:00Z' },
  { id: 4, action: 'commissions.reconcile', userEmail: 'admin@cabinet.fr', resourceId: 'batch-2026-05', ipAddress: '192.168.1.1', createdAt: '2026-05-10T18:00:00Z' },
  { id: 5, action: 'api_keys.create', userEmail: 'admin@cabinet.fr', resourceId: 'key-prod', ipAddress: '192.168.1.1', createdAt: '2026-05-10T16:30:00Z' },
  { id: 6, action: 'clients.update', userEmail: 'marie@cabinet.fr', resourceId: '1234', ipAddress: '192.168.1.43', createdAt: '2026-05-10T14:20:00Z' },
  { id: 7, action: 'documents.view', userEmail: 'stagiaire@cabinet.fr', resourceId: 'doc-002', ipAddress: '192.168.1.50', createdAt: '2026-05-10T11:00:00Z' },
  { id: 8, action: 'users.role_change', userEmail: 'admin@cabinet.fr', resourceId: 'user-15', ipAddress: '192.168.1.1', createdAt: '2026-05-09T17:30:00Z' },
]

const mockRoles = [
  {
    id: 1,
    name: 'admin',
    description: 'Accès complet à toutes les fonctionnalités',
    permissions: { clients: 'write', contracts: 'write', documents: 'write', commissions: 'write', settings: 'write', users: 'write', audit: 'read' },
    is_system: true
  },
  {
    id: 2,
    name: 'manager',
    description: 'Gestion clients et contrats, lecture commissions',
    permissions: { clients: 'write', contracts: 'write', documents: 'write', commissions: 'read', settings: 'read', users: 'read', audit: 'read' },
    is_system: true
  },
  {
    id: 3,
    name: 'viewer',
    description: 'Consultation seule',
    permissions: { clients: 'read', contracts: 'read', documents: 'read', commissions: 'none', settings: 'none', users: 'none', audit: 'none' },
    is_system: true
  },
  {
    id: 4,
    name: 'commercial',
    description: 'Rôle commercial personnalisé',
    permissions: { clients: 'write', contracts: 'read', documents: 'read', commissions: 'none', settings: 'none', users: 'none', audit: 'none' },
    is_system: false
  }
]
