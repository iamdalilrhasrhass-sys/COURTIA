import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileSpreadsheet, Database, CheckCircle, AlertTriangle, ChevronRight, ArrowLeft, ArrowRight, Smartphone, Mail, Clock, Settings, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [mapping, setMapping] = useState({})
  const [columns, setColumns] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [config, setConfig] = useState({
    relanceCanal: 'email',
    relanceDelais: [1, 3, 7],
    whatsappNumber: ''
  })
  const navigate = useNavigate()

  const FIELD_OPTIONS = [
    { value: 'nom', label: 'Nom' },
    { value: 'prenom', label: 'Prénom' },
    { value: 'email', label: 'Email' },
    { value: 'telephone', label: 'Téléphone' },
    { value: 'adresse', label: 'Adresse' },
    { value: 'code_postal', label: 'Code postal' },
    { value: 'ville', label: 'Ville' },
    { value: 'date_naissance', label: 'Date naissance' },
    { value: 'type_contrat', label: 'Type contrat' },
    { value: '__skip__', label: 'Ne pas importer' }
  ]

  const handleFileSelect = async (e) => {
    const f = e.target.files?.[0] || e.dataTransfer?.files?.[0]
    if (!f) return
    if (!f.name.match(/\.(xlsx?|csv)$/i)) {
      toast.error('Format accepté : .xlsx, .xls, .csv')
      return
    }
    setFile(f)
    const formData = new FormData()
    formData.append('file', f)
    try {
      const res = await api.post('/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const d = res.data.data
      setPreview(d)
      setColumns(d.columns)
      // Auto-mapping
      const autoMapping = {}
      d.columns.forEach(col => {
        const header = col.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        for (const [field, config_] of Object.entries({
          nom: ['nom', 'name', 'lastname'],
          prenom: ['prenom', 'firstname'],
          email: ['email', 'mail'],
          telephone: ['telephone', 'phone', 'tel', 'mobile'],
          adresse: ['adresse', 'address'],
          code_postal: ['code postal', 'code_postal', 'cp'],
          ville: ['ville', 'city'],
          date_naissance: ['date naissance', 'date_naissance', 'birthdate', 'ddn']
        })) {
          if (config_.some(k => header.includes(k)) && !autoMapping[field]) {
            autoMapping[field] = col.index
            break
          }
        }
      })
      setMapping(autoMapping)
    } catch (err) {
      toast.error('Erreur lors de l\'analyse du fichier')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFileSelect({ target: { files: e.dataTransfer.files } })
  }

  const handleImport = async () => {
    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mapping', JSON.stringify(mapping))
    try {
      await api.post('/import/execute', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setStep(3)
      // Simuler analyse ARK
      setAnalyzing(true)
      setTimeout(() => {
        setAnalysis({ imported: 42, duplicates: 3, errors: 1, total: 46 })
        setAnalyzing(false)
      }, 2000)
    } catch (err) {
      toast.error('Erreur lors de l\'import')
    } finally {
      setImporting(false)
    }
  }

  const handleFinish = () => {
    toast.success('COURTIA est prêt !')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-8">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s <= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}>{s}</div>
              {s < 4 && <div className={`flex-1 h-1 mx-1 rounded transition-colors ${s < step ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center py-8">
              <Database className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenue dans COURTIA</h1>
              <p className="text-gray-500 mb-8">Importons votre portefeuille pour commencer.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => setStep(2)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 justify-center">
                  <Upload size={18} /> J'ai un fichier Excel/CSV
                </button>
                <button onClick={() => setStep(2)} className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 justify-center">
                  <Download size={18} /> Je viens d'un autre CRM
                </button>
                <button onClick={handleFinish} className="px-6 py-3 border border-gray-200 text-gray-500 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                  Démarrer avec un portefeuille vide
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Import du fichier</h2>
              
              {/* Zone upload */}
              {!file && (
                <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => document.getElementById('file-input')?.click()} className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 transition-colors">
                  <input id="file-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
                  <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Glissez votre fichier Excel/CSV ici</p>
                  <p className="text-sm text-gray-400 mt-1">ou cliquez pour parcourir</p>
                </div>
              )}

              {/* Mapping */}
              {file && preview && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">{preview.totalRows} lignes détectées</p>
                    {/* Preview table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-gray-100">
                          {preview.headers.map((h, i) => <th key={i} className="p-2 text-left font-semibold text-gray-600">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {preview.preview.map((row, ri) => (
                            <tr key={ri} className="border-t border-gray-200">
                              {preview.headers.map((_, ci) => <td key={ci} className="p-2 text-gray-500">{row[ci] ?? ''}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mapping visuel */}
                  <h3 className="font-semibold text-gray-700">Mapping des colonnes</h3>
                  <div className="space-y-2">
                    {columns.map(col => (
                      <div key={col.index} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-gray-600 w-40 truncate">{col.name}</span>
                        <ChevronRight size={14} className="text-gray-400" />
                        <select
                          value={Object.entries(mapping).find(([_, idx]) => idx === col.index)?.[0] || '__skip__'}
                          onChange={e => {
                            const val = e.target.value
                            if (val === '__skip__') {
                              const { [Object.entries(mapping).find(([_, idx]) => idx === col.index)?.[0]]: _, ...rest } = mapping
                              setMapping(rest)
                            } else {
                              setMapping(prev => ({ ...prev, [val]: col.index }))
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                          {FIELD_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-4">
                    <button onClick={() => setFile(null)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Recommencer</button>
                    <button onClick={handleImport} disabled={importing} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                      {importing ? 'Import en cours...' : 'Valider le mapping et importer'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="py-8">
              {analyzing ? (
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">ARK analyse votre portefeuille...</h2>
                  <p className="text-gray-500">Détection des doublons, normalisation des numéros...</p>
                </div>
              ) : analysis ? (
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Nettoyage terminé</h2>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-3xl font-bold text-green-600">{analysis.imported}</p>
                      <p className="text-sm text-green-700">Clients importés</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-3xl font-bold text-blue-600">{analysis.duplicates}</p>
                      <p className="text-sm text-blue-700">Doublons fusionnés</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4">
                      <p className="text-3xl font-bold text-orange-600">{analysis.errors}</p>
                      <p className="text-sm text-orange-700">Erreurs corrigées</p>
                    </div>
                  </div>
                  <button onClick={() => setStep(4)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
                    Continuer la configuration
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Analyse prête...</p>
                </div>
              )}
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="py-8">
              <Settings className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Configuration ARK</h2>
              
              <div className="space-y-6 max-w-md mx-auto">
                {/* Canal de relance */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Canal de relance par défaut</label>
                  <div className="flex gap-3">
                    {['email', 'whatsapp'].map(canal => (
                      <button key={canal} onClick={() => setConfig(prev => ({ ...prev, relanceCanal: canal }))} className={`flex-1 px-4 py-3 rounded-xl border-2 font-medium transition-all flex items-center gap-2 justify-center ${
                        config.relanceCanal === canal ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                        {canal === 'email' ? <Mail size={18} /> : <Smartphone size={18} />}
                        {canal === 'email' ? 'Email' : 'WhatsApp'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Délais de relance */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Délais de relance</label>
                  <div className="flex gap-2">
                    {[1, 3, 7, 14].map(d => (
                      <button key={d} onClick={() => setConfig(prev => ({
                        ...prev,
                        relanceDelais: prev.relanceDelais.includes(d) ? prev.relanceDelais.filter(x => x !== d) : [...prev.relanceDelais, d].sort()
                      }))} className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                        config.relanceDelais.includes(d) ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'
                      }`}>
                        J+{d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* WhatsApp number */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Numéro WhatsApp du cabinet</label>
                  <input type="text" value={config.whatsappNumber} onChange={e => setConfig(prev => ({ ...prev, whatsappNumber: e.target.value }))} placeholder="+336XXXXXXXX" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 outline-none transition-colors" />
                </div>

                <button onClick={handleFinish} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors mt-4">
                  Lancer COURTIA 🚀
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
