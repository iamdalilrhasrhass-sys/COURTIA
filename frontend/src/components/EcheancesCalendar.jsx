import { useState } from 'react'
import { jsPDF } from 'jspdf'

export default function EcheancesCalendar() {
  const [month] = useState(new Date().getMonth())
  const [year] = useState(new Date().getFullYear())

  const mockEcheances = [
    { date: '2026-03-15', client: 'Jean Dupont', type: 'Auto', premium: 450, urgency: 'high' },
    { date: '2026-03-22', client: 'Marie Martin', type: 'Habitation', premium: 850, urgency: 'medium' },
    { date: '2026-04-05', client: 'ABC Corp', type: 'RC', premium: 1200, urgency: 'low' }
  ]

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.text('Planning Échéances', 10, 10)
    mockEcheances.forEach((e, i) => {
      doc.text(`${e.date} - ${e.client} - ${e.type} - ${e.premium}€`, 10, 20 + i * 10)
    })
    doc.save('echeances.pdf')
  }

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold text-cyan">Échéances {month + 1}/{year}</h2>
        <button onClick={exportPDF} className="btn-primary">PDF</button>
      </div>
      <div className="glass p-4 rounded-lg space-y-2">
        {mockEcheances.map((e, i) => (
          <div key={i} className={`p-3 rounded border-l-4 ${e.urgency === 'high' ? 'bg-red-500/10 border-red-500' : 'bg-slate-700/10'}`}>
            <p className="font-bold">{e.date} - {e.client}</p>
            <p className="text-sm text-slate-400">{e.type} - {e.premium}€</p>
          </div>
        ))}
      </div>
    </div>
  )
}
