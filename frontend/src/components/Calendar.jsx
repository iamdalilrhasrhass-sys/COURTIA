import { useState, useEffect } from 'react'
import { Calendar, Plus, Clock, MapPin, X, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useClientStore } from '../stores/clientStore'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const TYPE_COLORS = {
  'meeting': 'bg-blue-500/20 text-blue-400 border-blue-500',
  'call': 'bg-purple-500/20 text-purple-400 border-purple-500',
  'email_follow_up': 'bg-green-500/20 text-green-400 border-green-500'
}

const TYPE_LABELS = {
  'meeting': '📞 Réunion',
  'call': '☎️ Appel',
  'email_follow_up': '📧 Email suivi'
}

export default function CalendarView() {
  const token = useAuthStore((state) => state.token)
  const clients = useClientStore((state) => state.clients)
  const [appointments, setAppointments] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    timezone: 'Europe/Paris',
    type: 'meeting'
  })

  useEffect(() => {
    fetchAllAppointments()
  }, [token])

  const fetchAllAppointments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      setAppointments(data.appointments || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
    }
  }

  const handleCreateAppointment = async () => {
    if (!selectedClient || !formData.title || !formData.start_time || !formData.end_time) {
      alert('Tous les champs sont requis')
      return
    }

    try {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/appointments/${editingId}` : '/api/appointments'
      
      const response = await fetch(`${API_URL}${url}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: selectedClient.id,
          ...formData
        })
      })

      if (response.ok) {
        setShowModal(false)
        setEditingId(null)
        setFormData({
          title: '',
          description: '',
          start_time: '',
          end_time: '',
          timezone: 'Europe/Paris',
          type: 'meeting'
        })
        setSelectedClient(null)
        fetchAllAppointments()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleDeleteAppointment = async (id) => {
    if (!confirm('Supprimer ce RDV?')) return
    
    try {
      await fetch(`${API_URL}/api/appointments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchAllAppointments()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleEditAppointment = (apt) => {
    setEditingId(apt.id)
    setSelectedClient(clients.find(c => c.id === apt.client_id))
    setFormData({
      title: apt.title,
      description: apt.description || '',
      start_time: apt.start_time,
      end_time: apt.end_time,
      timezone: apt.timezone || 'Europe/Paris',
      type: apt.type || 'meeting'
    })
    setShowModal(true)
  }

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getAppointmentsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return appointments.filter(a => a.start_time.startsWith(dateStr) && a.status !== 'annulé')
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 bg-dark-3/50"></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayAppointments = getAppointmentsForDate(date)
      const isToday = new Date().toDateString() === date.toDateString()

      days.push(
        <div
          key={day}
          className={`border p-2 min-h-24 cursor-pointer transition ${
            isToday
              ? 'bg-cyan/10 border-cyan'
              : 'bg-dark-3 border-slate-700 hover:border-cyan'
          }`}
        >
          <p className={`font-bold text-sm mb-1 ${isToday ? 'text-cyan' : 'text-slate-300'}`}>
            {day}
          </p>
          <div className="space-y-1">
            {dayAppointments.slice(0, 2).map(apt => (
              <div
                key={apt.id}
                className={`text-xs p-1 rounded truncate border ${TYPE_COLORS[apt.type] || TYPE_COLORS.meeting}`}
                onClick={() => handleEditAppointment(apt)}
              >
                {apt.title}
              </div>
            ))}
            {dayAppointments.length > 2 && (
              <div className="text-xs text-slate-500">+{dayAppointments.length - 2}</div>
            )}
          </div>
        </div>
      )
    }

    return days
  }

  const upcomingAppointments = appointments
    .filter(a => a.status !== 'annulé')
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 5)

  return (
    <div className="ml-64 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black text-gradient flex items-center gap-3">
          <Calendar size={32} />
          Calendrier
        </h1>
        <button
          onClick={() => {
            setEditingId(null)
            setSelectedClient(null)
            setFormData({
              title: '',
              description: '',
              start_time: '',
              end_time: '',
              timezone: 'Europe/Paris',
              type: 'meeting'
            })
            setShowModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Nouveau RDV
        </button>
      </div>

      {/* Month Navigation */}
      <div className="glass p-6 rounded-lg mb-8">
        <div className="flex justify-between items-center mb-6">
          <button onClick={prevMonth} className="btn-secondary">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-cyan">
            {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={nextMonth} className="btn-secondary">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="text-center font-bold text-cyan p-2 text-sm">
              {day}
            </div>
          ))}
          {renderCalendar()}
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="glass p-6 rounded-lg">
        <h2 className="text-2xl font-bold text-cyan mb-4 flex items-center gap-2">
          <Clock size={24} />
          Prochains RDV
        </h2>
        <div className="space-y-3">
          {upcomingAppointments.length === 0 ? (
            <p className="text-slate-400">Aucun RDV à venir</p>
          ) : (
            upcomingAppointments.map(apt => {
              const client = clients.find(c => c.id === apt.client_id)
              const startTime = new Date(apt.start_time)
              const endTime = new Date(apt.end_time)
              
              return (
                <div key={apt.id} className="bg-dark-3 p-4 rounded-lg border border-slate-700 hover:border-cyan transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-cyan">{apt.title}</p>
                      <p className="text-sm text-slate-400">{client?.first_name} {client?.last_name}</p>
                      <div className="flex gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${TYPE_COLORS[apt.type] || TYPE_COLORS.meeting}`}>
                          {TYPE_LABELS[apt.type]}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditAppointment(apt)}
                        className="p-2 hover:bg-slate-700 rounded transition"
                      >
                        <Edit2 size={16} className="text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteAppointment(apt.id)}
                        className="p-2 hover:bg-slate-700 rounded transition"
                      >
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal Création/Modification */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass p-8 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-cyan">
                {editingId ? 'Modifier RDV' : 'Créer RDV'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-cyan">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Client Selection */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Client *</label>
                <select
                  className="input-field w-full"
                  value={selectedClient?.id || ''}
                  onChange={(e) => {
                    const client = clients.find(c => c.id === parseInt(e.target.value))
                    setSelectedClient(client)
                  }}
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Titre *</label>
                <input
                  type="text"
                  placeholder="Ex: Revue d'assurance auto"
                  className="input-field w-full"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Description</label>
                <textarea
                  placeholder="Notes importantes..."
                  className="input-field w-full min-h-20 resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Date/Heure début *</label>
                <input
                  type="datetime-local"
                  className="input-field w-full"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>

              {/* End Time */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Date/Heure fin *</label>
                <input
                  type="datetime-local"
                  className="input-field w-full"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>

              {/* Type */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Type</label>
                <select
                  className="input-field w-full"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="meeting">Réunion</option>
                  <option value="call">Appel</option>
                  <option value="email_follow_up">Email suivi</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateAppointment}
                  className="btn-primary flex-1"
                >
                  {editingId ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
