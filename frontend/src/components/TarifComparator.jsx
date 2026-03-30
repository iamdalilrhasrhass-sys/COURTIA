export default function TarifComparator() {
  const offers = [
    { insurer: 'AXA', price: 450, coverage: 'Tiers+', deductible: 500, rating: 4.5 },
    { insurer: 'Allianz', price: 420, coverage: 'Tiers+', deductible: 300, rating: 4.2 },
    { insurer: 'MAIF', price: 480, coverage: 'RC+Vol', deductible: 0, rating: 4.8 }
  ]

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-cyan mb-6">Comparateur Tarifaire</h2>
      <div className="grid grid-cols-3 gap-4">
        {offers.map((o, i) => (
          <div key={i} className="glass p-4 rounded-lg">
            <p className="font-bold text-lg">{o.insurer}</p>
            <p className="text-2xl font-black text-green-400 mt-2">{o.price}€/an</p>
            <div className="mt-4 space-y-2 text-sm">
              <p>Couverture: {o.coverage}</p>
              <p>Franchise: {o.deductible}€</p>
              <p>Note: {'⭐'.repeat(Math.floor(o.rating))}</p>
            </div>
            <button className="w-full mt-4 bg-cyan/20 hover:bg-cyan/30 py-2 rounded text-sm">Choisir</button>
          </div>
        ))}
      </div>
    </div>
  )
}
