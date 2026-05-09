import { create } from 'zustand'
import { apiGet, apiPost, apiDelete } from '../utils/api'

const useDocumentInboxStore = create((set, get) => ({
  documents: [],
  requests: [],
  submissions: [],
  checklists: {},
  stats: { documents: {}, requests: {} },
  loading: false,
  error: null,

  fetchDocuments: async (clientId, status, category) => {
    set({ loading: true, error: null })
    try {
      let path = '/api/document-inbox?'
      if (clientId) path += `client_id=${clientId}&`
      if (status) path += `status=${status}&`
      if (category) path += `category=${category}&`
      const res = await apiGet(path)
      set({ documents: res.data || [], loading: false })
    } catch (_err) {
      set({ error: "Impossible de charger les documents reçus.", loading: false })
    }
  },

  fetchClientDocuments: async (clientId) => {
    set({ loading: true, error: null })
    try {
      const res = await apiGet(`/api/document-inbox/client/${clientId}`)
      set({ documents: res.data || [], loading: false })
    } catch (_err) {
      set({ error: "Impossible de charger les documents du client.", loading: false })
    }
  },

  uploadDocument: async (clientId, file, category) => {
    set({ loading: true, error: null })
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('client_id', clientId)
      if (category) formData.append('category', category)

      const token = localStorage.getItem('token') || localStorage.getItem('courtia_token')
      const res = await fetch(`/api/document-inbox/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Upload échoué')
      set({ loading: false })
      get().fetchDocuments()
      return data
    } catch (err) {
      set({ error: "Le fichier n'a pas pu être traité. Vérifiez le format puis réessayez.", loading: false })
      throw err
    }
  },

  updateDocumentStatus: async (id, status) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('courtia_token');
      const res = await fetch(`/api/document-inbox/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Erreur mise à jour');
      get().fetchDocuments();
    } catch (_err) {
      set({ error: "Impossible de mettre à jour le statut du document." });
    }
  },

  deleteDocument: async (id) => {
    try {
      await apiDelete(`/api/document-inbox/${id}`)
      get().fetchDocuments()
    } catch (_err) {
      set({ error: "Impossible de supprimer ce document." })
    }
  },

  fetchRequests: async (clientId, status) => {
    try {
      let path = '/api/document-inbox/request?'
      if (clientId) path += `client_id=${clientId}&`
      if (status) path += `status=${status}&`
      const res = await apiGet(path)
      set({ requests: res.data || [] })
    } catch (_err) {
      set({ error: "Impossible de charger les demandes de documents." })
    }
  },

  createRequest: async (clientId, requiredDocs, message, recipientEmail) => {
    set({ loading: true, error: null })
    try {
      const res = await apiPost('/api/document-inbox/request', {
        client_id: clientId,
        required_docs: requiredDocs,
        message: message || '',
        recipient_email: recipientEmail || null,
      })
      set({ loading: false })
      get().fetchRequests()
      return res.data
    } catch (err) {
      set({ error: "Impossible de créer la demande de documents.", loading: false })
      throw err
    }
  },

  sendRequest: async (id) => {
    try {
      await apiPost(`/api/document-inbox/request/${id}/send`, {})
      get().fetchRequests()
    } catch (_err) {
      set({ error: "Impossible d'envoyer la demande de documents." })
    }
  },

  fetchChecklist: async (clientId) => {
    try {
      const res = await apiGet(`/api/document-inbox/checklist/${clientId}`)
      set((s) => ({ checklists: { ...s.checklists, [clientId]: res.data } }))
    } catch (_err) {
      set({ error: "Impossible de charger la checklist." })
    }
  },

  createChecklist: async (clientId, contractId, title, requiredDocs) => {
    try {
      const res = await apiPost('/api/document-inbox/checklist', {
        client_id: clientId,
        contract_id: contractId || null,
        title: title || 'Dossier',
        required_docs: requiredDocs,
      })
      set((s) => ({ checklists: { ...s.checklists, [clientId]: res.data } }))
      return res.data
    } catch (_err) {
      set({ error: "Impossible de créer la checklist du dossier." })
    }
  },

  createSubmission: async (clientId, contractId, insurerEmail, subject, body, attachmentIds) => {
    set({ loading: true, error: null })
    try {
      const res = await apiPost('/api/document-inbox/submission', {
        client_id: clientId,
        contract_id: contractId || null,
        insurer_email: insurerEmail,
        subject,
        body,
        attachment_ids: attachmentIds || [],
      })
      set({ loading: false })
      get().fetchSubmissions()
      return res.data
    } catch (err) {
      set({ error: "Impossible de préparer l'envoi à l'assureur.", loading: false })
      throw err
    }
  },

  submitSubmission: async (id) => {
    try {
      const res = await apiPost(`/api/document-inbox/submission/${id}/submit`, {})
      get().fetchSubmissions()
      return res.data
    } catch (_err) {
      set({ error: "Impossible d'envoyer le dossier à l'assureur." })
    }
  },

  fetchSubmissions: async (clientId, status) => {
    try {
      let path = '/api/document-inbox/submission?'
      if (clientId) path += `client_id=${clientId}&`
      if (status) path += `status=${status}&`
      const res = await apiGet(path)
      set({ submissions: res.data || [] })
    } catch (_err) {
      set({ error: "Impossible de charger les envois." })
    }
  },

  fetchStats: async () => {
    try {
      const res = await apiGet('/api/document-inbox/stats')
      set({ stats: res.data || { documents: {}, requests: {} } })
    } catch (_err) {
      set({ error: "Impossible de charger les statistiques de documents." })
    }
  },

  clearError: () => set({ error: null }),
}))

export default useDocumentInboxStore
