import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function GrowthProjection() {
  const data = [
    { month: 'Avr', actual: 127, target: 130, projected: 135 },
    { month: 'Mai', actual: 135, target: 140, projected: 145 },
    { month: 'Juin', actual: 142, target: 150, projected: 155 },
    { month: 'Juil', actual: null, target: 160, projected: 165 }
  ]

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-cyan mb-6">Projection Croissance</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid stroke="#374151" />
          <XAxis dataKey="month" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip />
          <Line type="monotone" dataKey="actual" stroke="#0891b2" strokeWidth={2} />
          <Line type="monotone" dataKey="target" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 5" />
          <Line type="monotone" dataKey="projected" stroke="#34d399" strokeWidth={2} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
