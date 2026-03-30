import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function PredictiveDashboard() {
  const forecast = [
    { month: 'Apr', revenue: 8500 },
    { month: 'May', revenue: 9200 },
    { month: 'Jun', revenue: 9800 },
    { month: 'Jul', revenue: 10500 },
    { month: 'Aug', revenue: 11200 },
    { month: 'Sep', revenue: 11800 }
  ]

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-cyan mb-6">Prédictions CA (6 mois)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={forecast}>
          <CartesianGrid stroke="#374151" />
          <XAxis dataKey="month" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip />
          <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
