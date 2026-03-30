import { useState } from 'react'
import { Mail, Send } from 'lucide-react'

const EMAIL_TEMPLATES = {
  renewal: {
    subject: 'Renouvellement de votre assurance {{CLIENT_NAME}}',
    body: `Bonjour {{CLIENT_FIRST_NAME}},

Votre contrat {{CONTRACT_TYPE}} arrive à expiration le {{EXPIRY_DATE}}.

Je vous propose de procéder au renouvellement pour maintenir votre couverture sans interruption.

À bientôt,
Cordialement`
  },
  crosssell: {
    subject: 'Opportunité complémentaire pour {{CLIENT_NAME}}',
    body: `Bonjour {{CLIENT_FIRST_NAME}},

Suite à notre dernier échange, je vous propose d'enrichir votre protection avec {{PRODUCT}}.

Cela vous permettra de bénéficier d'une couverture plus complète.

Disponible pour discuter,
Cordialement`
  },
  followup: {
    subject: 'Suivi - {{CLIENT_NAME}}',
    body: `Bonjour {{CLIENT_FIRST_NAME}},

Je reviens vers vous suite à notre dernier contact.

Avez-vous des questions ou besoin d'ajustements sur votre couverture?

À votre écoute,
Cordialement`
  }
}

export default function EmailTemplates({ client }) {
  const [selectedTemplate, setSelectedTemplate] = useState('renewal')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const loadTemplate = (templateKey) => {
    setSelectedTemplate(templateKey)
    const template = EMAIL_TEMPLATES[templateKey]
    let subj = template.subject
    let bod = template.body

    // Replace variables
    subj = subj.replace('{{CLIENT_NAME}}', `${client.first_name} ${client.last_name}`)
    bod = bod.replace('{{CLIENT_FIRST_NAME}}', client.first_name)
    bod = bod.replace('{{CLIENT_NAME}}', `${client.first_name} ${client.last_name}`)
    bod = bod.replace('{{CONTRACT_TYPE}}', 'Auto')
    bod = bod.replace('{{EXPIRY_DATE}}', '2026-06-15')
    bod = bod.replace('{{PRODUCT}}', 'Assurance Habitation')

    setSubject(subj)
    setBody(bod)
  }

  const sendEmail = async () => {
    // TODO: Implémenter l'envoi via backend
    alert(`Email envoyé à ${client.email}!`)
  }

  return (
    <div className="glass p-6 rounded-lg">
      <h3 className="text-xl font-bold text-cyan mb-4 flex items-center gap-2">
        <Mail size={24} />
        Envoyer un email
      </h3>

      {/* Templates */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => loadTemplate('renewal')}
          className={`p-2 rounded text-sm font-bold transition ${
            selectedTemplate === 'renewal' ? 'bg-blue-500 text-white' : 'bg-dark-3'
          }`}
        >
          Renouvellement
        </button>
        <button
          onClick={() => loadTemplate('crosssell')}
          className={`p-2 rounded text-sm font-bold transition ${
            selectedTemplate === 'crosssell' ? 'bg-blue-500 text-white' : 'bg-dark-3'
          }`}
        >
          Cross-sell
        </button>
        <button
          onClick={() => loadTemplate('followup')}
          className={`p-2 rounded text-sm font-bold transition ${
            selectedTemplate === 'followup' ? 'bg-blue-500 text-white' : 'bg-dark-3'
          }`}
        >
          Suivi
        </button>
      </div>

      {/* Compose */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="À:"
          className="input-field w-full"
          defaultValue={client.email}
          disabled
        />
        <input
          type="text"
          placeholder="Objet:"
          className="input-field w-full"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          placeholder="Message..."
          className="input-field w-full min-h-32 resize-none"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-secondary flex-1"
          >
            Aperçu
          </button>
          <button
            onClick={sendEmail}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Send size={20} />
            Envoyer
          </button>
        </div>
      </div>
    </div>
  )
}
