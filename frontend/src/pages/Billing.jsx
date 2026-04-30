import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import api from '../api'

export default function Billing() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const status = params.get('status')
  const [verifying, setVerifying] = useState(true)
  const [planInfo, setPlanInfo] = useState(null)

  useEffect(() => {
    if (status === 'success') {
      setTimeout(() => {
        api.get('/auth/me').then(r => {
          setPlanInfo(r.data)
          setVerifying(false)
        }).catch(() => setVerifying(false))
      }, 2000)
    } else {
      setVerifying(false)
    }
  }, [status])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {verifying ? (
          <>
            <Loader className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold">Vérification du paiement...</h2>
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Paiement réussi !</h2>
            <p className="text-gray-500 mt-2">
              {planInfo ? `Plan ${planInfo.plan} activé. Bienvenue !` : 'Votre abonnement est actif.'}
            </p>
            <button onClick={() => navigate('/dashboard')} className="mt-6 px-8 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700">
              Accéder au dashboard
            </button>
          </>
        ) : status === 'cancel' ? (
          <>
            <XCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Paiement annulé</h2>
            <p className="text-gray-500 mt-2">Aucun montant n'a été débité. Vous pouvez réessayer quand vous voulez.</p>
            <button onClick={() => navigate('/abonnement')} className="mt-6 px-8 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700">
              Réessayer
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900">Page de paiement</h2>
            <p className="text-gray-500 mt-2">Vous serez redirigé vers Stripe pour finaliser votre abonnement.</p>
            <button onClick={() => navigate('/abonnement')} className="mt-6 px-8 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700">
              Voir les offres
            </button>
          </>
        )}
      </div>
    </div>
  )
}
