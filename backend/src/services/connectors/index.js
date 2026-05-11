/**
 * COURTIA — Connector Registry
 * Architecture pluggable pour intégrations compagnies/grossistes
 * 
 * Chaque connector implémente l'interface:
 * {
 *   code: string,
 *   name: string,
 *   type: 'grossiste' | 'compagnie',
 *   status: 'available' | 'manual_only' | 'deprecated',
 *   requestQuote: async (normalizedData, credentials) => QuoteResult
 * }
 */

const fs = require('fs')
const path = require('path')

// Registry des connectors
const connectorRegistry = new Map()

/**
 * Interface abstraite pour un connector
 */
class BaseConnector {
  constructor(code, name, type = 'grossiste') {
    this.code = code
    this.name = name
    this.type = type
    this.status = 'manual_only'
  }

  /**
   * Méthode à override par les implémentations
   * @param {object} normalizedData - Données tarif normalisées
   * @param {object} credentials - Credentials déchiffrés
   * @returns {Promise<object>}
   */
  async requestQuote(normalizedData, credentials) {
    return {
      status: 'manual_only',
      message: `API ${this.name} non disponible. Mode assisté : envoyez la demande manuellement.`,
      provider_code: this.code,
      manual_url: null,
      email_template: null
    }
  }

  /**
   * Vérifie si le connector est opérationnel
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    return this.status === 'available'
  }

  /**
   * Retourne les infos du connector (sans credentials)
   */
  getInfo() {
    return {
      code: this.code,
      name: this.name,
      type: this.type,
      status: this.status
    }
  }
}

// ============================================================
// STUB CONNECTORS — MODE MANUEL POUR V1
// Chaque provider renvoie un message d'assistance
// ============================================================

class AprilConnector extends BaseConnector {
  constructor() {
    super('april', 'April', 'grossiste')
  }

  async requestQuote(normalizedData, credentials) {
    return {
      status: 'manual_only',
      message: 'April : API non disponible. Connectez-vous à april.fr/espace-courtier',
      provider_code: this.code,
      manual_url: 'https://www.april.fr/espace-courtier',
      products: ['sante', 'prevoyance', 'emprunteur']
    }
  }
}

class AlptisConnector extends BaseConnector {
  constructor() {
    super('alptis', 'Alptis Assurances', 'grossiste')
  }

  async requestQuote(normalizedData, credentials) {
    return {
      status: 'manual_only',
      message: 'Alptis : Utilisez l\'extranet courtier alptis.org',
      provider_code: this.code,
      manual_url: 'https://www.alptis.org/espace-courtier',
      products: ['sante', 'prevoyance']
    }
  }
}

class SollyAzarConnector extends BaseConnector {
  constructor() {
    super('sollyazar', 'Solly Azar', 'grossiste')
  }

  async requestQuote(normalizedData, credentials) {
    return {
      status: 'manual_only',
      message: 'Solly Azar : Tarification via sollyazar.com ou email',
      provider_code: this.code,
      manual_url: 'https://www.sollyazar.com/espace-pro',
      products: ['sante', 'auto', 'habitation', 'mrp']
    }
  }
}

class NeolianeConnector extends BaseConnector {
  constructor() {
    super('neoliane', 'Néoliane', 'grossiste')
  }

  async requestQuote(normalizedData, credentials) {
    return {
      status: 'manual_only',
      message: 'Néoliane : Tarification via espace courtier',
      provider_code: this.code,
      manual_url: 'https://www.neoliane-sante.fr/espace-courtier',
      products: ['sante', 'prevoyance']
    }
  }
}

class EcaConnector extends BaseConnector {
  constructor() {
    super('eca', 'ECA Assurances', 'grossiste')
  }

  async requestQuote(normalizedData, credentials) {
    return {
      status: 'manual_only',
      message: 'ECA : Accès extranet eca-assurances.com',
      provider_code: this.code,
      manual_url: 'https://www.eca-assurances.com/extranet',
      products: ['sante', 'auto', 'habitation']
    }
  }
}

class WazariConnector extends BaseConnector {
  constructor() {
    super('wazari', 'Wazari', 'grossiste')
  }

  async requestQuote(normalizedData, credentials) {
    return {
      status: 'manual_only',
      message: 'Wazari : Spécialiste emprunteur - wazari.fr',
      provider_code: this.code,
      manual_url: 'https://www.wazari.fr/pro',
      products: ['emprunteur']
    }
  }
}

class AssurOneConnector extends BaseConnector {
  constructor() {
    super('assurone', 'AssurOne Group', 'grossiste')
  }

  async requestQuote(normalizedData, credentials) {
    return {
      status: 'manual_only',
      message: 'AssurOne : Portail courtier assurone.com',
      provider_code: this.code,
      manual_url: 'https://www.assurone.com/courtiers',
      products: ['sante', 'prevoyance', 'rc_pro']
    }
  }
}

class AssurimoConnector extends BaseConnector {
  constructor() {
    super('assurimo', 'Assurimo', 'grossiste')
  }

  async requestQuote(normalizedData, credentials) {
    return {
      status: 'manual_only',
      message: 'Assurimo : Spécialiste immobilier - assurimo.fr',
      provider_code: this.code,
      manual_url: 'https://www.assurimo.fr/espace-courtier',
      products: ['pno', 'copropriete', 'immeuble']
    }
  }
}

class SwissLifeConnector extends BaseConnector {
  constructor() {
    super('swisslife', 'SwissLife', 'compagnie')
  }

  async requestQuote(normalizedData, credentials) {
    return {
      status: 'manual_only',
      message: 'SwissLife : Contact via votre inspecteur commercial',
      provider_code: this.code,
      manual_url: 'https://www.swisslife.fr/pro',
      products: ['vie', 'epargne', 'retraite', 'prevoyance']
    }
  }
}

class GeneraliConnector extends BaseConnector {
  constructor() {
    super('generali', 'Generali France', 'compagnie')
  }

  async requestQuote(normalizedData, credentials) {
    return {
      status: 'manual_only',
      message: 'Generali : Extranet pro.generali.fr',
      provider_code: this.code,
      manual_url: 'https://pro.generali.fr',
      products: ['sante', 'prevoyance', 'vie', 'auto', 'rc_pro']
    }
  }
}

// ============================================================
// REGISTRATION
// ============================================================

function registerBuiltinConnectors() {
  const builtins = [
    new AprilConnector(),
    new AlptisConnector(),
    new SollyAzarConnector(),
    new NeolianeConnector(),
    new EcaConnector(),
    new WazariConnector(),
    new AssurOneConnector(),
    new AssurimoConnector(),
    new SwissLifeConnector(),
    new GeneraliConnector()
  ]

  builtins.forEach(c => connectorRegistry.set(c.code, c))
  console.log(`[ConnectorRegistry] ${builtins.length} connectors enregistrés`)
}

/**
 * Auto-load custom connectors from connectors/*.js
 * Permet d'ajouter de nouveaux providers sans modifier ce fichier
 */
function loadCustomConnectors() {
  const connectorsDir = __dirname
  
  try {
    const files = fs.readdirSync(connectorsDir)
    
    files.forEach(file => {
      if (file === 'index.js' || !file.endsWith('.js')) return
      
      try {
        const connectorPath = path.join(connectorsDir, file)
        const connector = require(connectorPath)
        
        if (connector && connector.code) {
          connectorRegistry.set(connector.code, connector)
          console.log(`[ConnectorRegistry] Custom connector loaded: ${connector.code}`)
        }
      } catch (err) {
        console.warn(`[ConnectorRegistry] Failed to load ${file}:`, err.message)
      }
    })
  } catch (err) {
    // Directory read error - ignore
  }
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Récupère un connector par code
 * @param {string} code 
 * @returns {BaseConnector|null}
 */
function getConnector(code) {
  return connectorRegistry.get(code) || null
}

/**
 * Liste tous les connectors
 * @returns {Array<object>}
 */
function listConnectors() {
  return Array.from(connectorRegistry.values()).map(c => c.getInfo())
}

/**
 * Envoie une demande de tarif à un provider
 * @param {string} providerCode 
 * @param {object} normalizedData 
 * @param {object} credentials - Credentials déchiffrés
 * @returns {Promise<object>}
 */
async function requestQuote(providerCode, normalizedData, credentials = {}) {
  const connector = getConnector(providerCode)
  
  if (!connector) {
    return {
      status: 'error',
      message: `Provider ${providerCode} non trouvé`,
      provider_code: providerCode
    }
  }
  
  try {
    return await connector.requestQuote(normalizedData, credentials)
  } catch (err) {
    console.error(`[ConnectorRegistry] Error requesting quote from ${providerCode}:`, err.message)
    return {
      status: 'error',
      message: `Erreur technique: ${err.message}`,
      provider_code: providerCode
    }
  }
}

/**
 * Envoie une demande à plusieurs providers en parallèle
 * @param {Array<string>} providerCodes 
 * @param {object} normalizedData 
 * @param {Map<string, object>} credentialsByCode - Map code -> credentials
 * @returns {Promise<Array<object>>}
 */
async function requestQuotesMulti(providerCodes, normalizedData, credentialsByCode = new Map()) {
  const promises = providerCodes.map(code => {
    const creds = credentialsByCode.get(code) || {}
    return requestQuote(code, normalizedData, creds)
  })
  
  return Promise.all(promises)
}

// Initialize on module load
registerBuiltinConnectors()
loadCustomConnectors()

module.exports = {
  BaseConnector,
  getConnector,
  listConnectors,
  requestQuote,
  requestQuotesMulti,
  connectorRegistry
}