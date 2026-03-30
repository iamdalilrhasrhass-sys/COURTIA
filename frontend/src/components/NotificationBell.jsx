import { useState } from 'react'
import { Bell, AlertCircle, CheckCircle, Info } from 'lucide-react'

export default function NotificationBell() {
  const [showPanel, setShowPanel] = useState(false)
  const [alerts] = useState([
    { id: 1, type: 'urgent', title: 'Contrat expirant', msg: 'Auto - Jean Dupont expire dans 15j', time: '2h' },
    { id: 2, type: 'warning', title: 'Prospect stagnant', msg: 'ABC Corp bloqué depuis 20j', time: '5h' },
    { id: 3, type: 'info', title: 'Nouveau client', msg: 'Marie Martin enregistrée', time: '1j' }
  ])

  const unread = alerts.length

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 hover:bg-slate-700 rounded-lg transition"
      >
        <Bell size={20} className="text-cyan" />
        {unread > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute right-0 top-12 w-80 glass rounded-lg p-4 shadow-2xl z-50 max-h-96 overflow-y-auto">
          <h3 className="font-bold text-cyan mb-4">Alertes ({unread})</h3>
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                alert.type === 'urgent' ? 'bg-red-500/10 border-red-500' :
                alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500' :
                'bg-blue-500/10 border-blue-500'
              }`}>
                <div className="flex items-start gap-2">
                  {alert.type === 'urgent' && <AlertCircle size={16} className="text-red-500 mt-1" />}
                  {alert.type === 'warning' && <AlertCircle size={16} className="text-yellow-500 mt-1" />}
                  {alert.type === 'info' && <Info size={16} className="text-blue-500 mt-1" />}
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-white">{alert.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{alert.msg}</p>
                    <p className="text-xs text-slate-500 mt-2">{alert.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
