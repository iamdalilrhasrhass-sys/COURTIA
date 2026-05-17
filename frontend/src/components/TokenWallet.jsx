import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";

const PACK_COLORS = { pack100:'border-gray-600', pack500:'border-gray-600', pack1500:'border-cyan-500', pack5000:'border-purple-500' };
const FEATURE_ICONS = { comparateur_devis:'⚡', rapport_pdf:'📄', sms_unitaire:'📱', signature_electro:'✍️', transcription_rdv_5min:'🎙️', ark_coach_analyse:'🎯', ark_negociateur:'🤝', bordereau_intel:'📊', police_intel:'🔍', ark_widget_conv:'💬' };

export default function TokenWallet() {
  const [data, setData] = useState(null);
  const [buying, setBuying] = useState(null);
  const [tab, setTab] = useState("wallet");
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/api/tokens/dashboard`, { headers }).then(r => r.json()).then(setData);
  }, []);

  async function buyPack(packKey) {
    setBuying(packKey);
    const res = await fetch(`${API}/api/tokens/checkout`, { method: "POST", headers, body: JSON.stringify({ pack: packKey }) });
    const data = await res.json();
    setBuying(null);
    if (data.checkout_url) window.location.href = data.checkout_url;
  }

  if (!data) return <div className="p-6 text-gray-400 animate-pulse">Chargement wallet...</div>;

  const { wallet, total_balance, transactions, feature_stats, features, packs, plan } = data;

  const planLabels = { starter: 'Starter', pro_ark: 'Pro ARK', pro_ark_voice: 'Pro ARK + Voice', premium: 'Premium' };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">🪙 Wallet Tokens COURTIA</h2>
          <p className="text-sm text-gray-400 mt-1">Plan actuel : <span className="text-cyan-400 font-medium">{planLabels[plan] || plan}</span></p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-white">{total_balance}</p>
          <p className="text-xs text-gray-400">tokens disponibles</p>
          {wallet.balance_bonus > 0 && <p className="text-xs text-amber-400">dont {wallet.balance_bonus} bonus</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800/60 rounded-xl p-1">
        {[["wallet","💳 Wallet"],["catalog","⚡ Features"],["historique","📋 Historique"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab===t?'bg-cyan-500 text-black':'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab Wallet */}
      {tab === "wallet" && (
        <div className="space-y-4">
          {/* Solde détail */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Solde principal", val: wallet.balance, color: "text-white" },
              { label: "Bonus", val: wallet.balance_bonus, color: "text-amber-400" },
              { label: "Total consommé", val: wallet.total_consumed, color: "text-gray-400" },
            ].map(s => (
              <div key={s.label} className="bg-gray-800/60 rounded-xl p-3 text-center border border-gray-700">
                <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Packs */}
          <p className="text-xs text-gray-400 uppercase tracking-wide">Acheter des tokens</p>
          <div className="grid grid-cols-2 gap-3">
            {packs && Object.entries(packs).map(([key, pack]) => (
              <div key={key} className={`rounded-xl border-2 p-4 relative ${PACK_COLORS[key] || 'border-gray-600'} bg-gray-800/40`}>
                {pack.popular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs bg-cyan-500 text-black px-3 py-0.5 rounded-full font-medium">Populaire</span>}
                <p className="font-semibold text-white">{pack.label}</p>
                <p className="text-2xl font-bold text-cyan-400 mt-1">{pack.tokens.toLocaleString('fr-FR')}</p>
                <p className="text-xs text-gray-400">tokens{pack.bonus_tokens > 0 ? ` + ${pack.bonus_tokens} bonus` : ''}</p>
                <p className="text-sm text-white font-medium mt-2">{(pack.prix_ht * 1.2).toFixed(2).replace('.', ',')} € TTC</p>
                <p className="text-xs text-gray-500">{((pack.prix_ht * 1.2) / pack.tokens * 100).toFixed(1)} c€/token</p>
                <button onClick={() => buyPack(key)} disabled={buying === key}
                  className="mt-3 w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-medium text-sm transition disabled:opacity-50">
                  {buying === key ? "Redirection..." : "Acheter →"}
                </button>
              </div>
            ))}
          </div>

          {/* Auto-recharge */}
          <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-white">Auto-recharge</p>
                <p className="text-xs text-gray-400 mt-0.5">Recharge automatique quand le solde est bas</p>
              </div>
              <div className={`w-12 h-6 rounded-full cursor-pointer transition ${wallet.auto_recharge_enabled ? 'bg-cyan-500' : 'bg-gray-600'}`}
                onClick={async () => {
                  await fetch(`${API}/api/tokens/auto-recharge`, { method: "POST", headers, body: JSON.stringify({ enabled: !wallet.auto_recharge_enabled }) });
                  setData(d => ({ ...d, wallet: { ...d.wallet, auto_recharge_enabled: !d.wallet.auto_recharge_enabled } }));
                }}>
                <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-all ${wallet.auto_recharge_enabled ? 'ml-6' : 'ml-0.5'}`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Catalog */}
      {tab === "catalog" && (
        <div className="space-y-2">
          {(features || []).map(f => {
            const planAllowed = f.plans_allowed?.includes(plan);
            const planIncluded = f.plans_included?.includes(plan);
            const stat = feature_stats?.find(s => s.feature_key === f.feature_key);
            return (
              <div key={f.feature_key} className={`rounded-xl p-3 border ${planAllowed ? 'border-gray-700/50 bg-gray-800/30' : 'border-red-900/30 bg-red-900/10'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{FEATURE_ICONS[f.feature_key] || '🔧'}</span>
                    <div>
                      <p className={`text-sm font-medium ${planAllowed ? 'text-white' : 'text-gray-500'}`}>{f.label}</p>
                      <p className="text-xs text-gray-500">{f.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {!planAllowed ? (
                      <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full">Upgrade requis</span>
                    ) : planIncluded || f.cost_tokens === 0 ? (
                      <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full">Inclus</span>
                    ) : (
                      <span className="text-xs bg-cyan-900/50 text-cyan-400 px-2 py-0.5 rounded-full font-medium">{f.cost_tokens} tokens</span>
                    )}
                    {stat && <p className="text-xs text-gray-500 mt-0.5">{stat.nb_uses} utilisations ce mois</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab Historique */}
      {tab === "historique" && (
        <div className="space-y-1">
          {(transactions || []).slice(0, 30).map(t => (
            <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-800">
              <div>
                <p className="text-xs text-gray-300">{t.description}</p>
                <p className="text-xs text-gray-500">{new Date(t.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${t.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {t.amount > 0 ? '+' : ''}{t.amount}
                </p>
                <p className="text-xs text-gray-500">{t.balance_after} restant</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
