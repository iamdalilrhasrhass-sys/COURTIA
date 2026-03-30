import { useState } from 'react'

export default function PortfolioValue() {
  const mockData = {
    totalClients: 127,
    activeContracts: 312,
    averagePremium: 485,
    averageLoyalty: 82,
    renewalRate: 0.92
  }

  const annualRevenue = mockData.activeContracts * mockData.averagePremium
  const commissionRate = 0.15 // 15%
  const annualCommission = annualRevenue * commissionRate
  
  // Valeur de portefeuille = Commissions annuelles * multiplicateur (basé sur fidélité)
  const portfolioValue = annualCommission * (mockData.averageLoyalty / 100) * 8 // x8 multiple

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gradient mb-6">Valeur de Portefeuille</h2>

      <div className="glass p-6 rounded-lg mb-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-slate-400">CA Annuel</p>
            <p className="text-3xl font-bold text-cyan">{annualRevenue.toLocaleString()}€</p>
          </div>
          <div>
            <p className="text-slate-400">Commissions Annuelles</p>
            <p className="text-3xl font-bold text-green-400">{Math.round(annualCommission).toLocaleString()}€</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-6 rounded-lg">
          <p className="text-slate-300">💰 VALEUR DE PORTEFEUILLE</p>
          <p className="text-4xl font-black text-cyan mt-2">{Math.round(portfolioValue).toLocaleString()}€</p>
          <p className="text-xs text-slate-400 mt-3">Basée sur fidélité client ({mockData.averageLoyalty}/100) et taux renouvellement ({Math.round(mockData.renewalRate * 100)}%)</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass p-4 rounded-lg">
          <p className="text-slate-400 text-sm">Clients</p>
          <p className="text-2xl font-bold text-white">{mockData.totalClients}</p>
        </div>
        <div className="glass p-4 rounded-lg">
          <p className="text-slate-400 text-sm">Contrats</p>
          <p className="text-2xl font-bold text-white">{mockData.activeContracts}</p>
        </div>
        <div className="glass p-4 rounded-lg">
          <p className="text-slate-400 text-sm">Fidélité Moy</p>
          <p className="text-2xl font-bold text-green-400">{mockData.averageLoyalty}%</p>
        </div>
      </div>
    </div>
  )
}
