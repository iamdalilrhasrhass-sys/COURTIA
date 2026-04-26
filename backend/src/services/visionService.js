const { GoogleGenerativeAI } = require('@google/generative-ai');

class VisionService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async analyzeDocument(base64Data, mimeType) {
    const result = await this.model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType || 'application/pdf'
        }
      },
      {
        text: `Analyse ce document d'assurance. Extrait et retourne UNIQUEMENT un objet JSON valide avec ces champs (utilise null si non trouvé) :
{
  "type_document": "cni|rib|kbis|contrat|attestation|quittance|devis|autre",
  "nom": "...",
  "prenom": "...",
  "date_naissance": "YYYY-MM-DD",
  "numero": "numéro de contrat/police/CNI",
  "adresse": "...",
  "date_effet": "YYYY-MM-DD",
  "date_echeance": "YYYY-MM-DD",
  "compagnie": "nom de la compagnie d'assurance",
  "prime": 123.45,
  "resume": "résumé en 1-2 phrases"
}
Ne mets PAS de markdown, PAS de balises code, retourne UNIQUEMENT le JSON brut.`
      }
    ]);
    
    const response = result.response;
    const text = response.text();
    
    // Parse JSON from response
    let parsed;
    try {
      // Try direct parse
      parsed = JSON.parse(text.trim());
    } catch (e) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error('Impossible de parser la réponse JSON de Gemini');
      }
    }
    
    return {
      type: parsed.type_document || 'autre',
      donnees_extraites: parsed,
      confiance: parsed.type_document && parsed.type_document !== 'autre' ? 0.85 : 0.5,
      resume: parsed.resume || ''
    };
  }

  async classifyDocument(base64Data, mimeType) {
    const result = await this.model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType || 'application/pdf'
        }
      },
      {
        text: `Classifie ce document parmi les catégories suivantes : 'cni', 'rib', 'kbis', 'contrat', 'attestation', 'quittance', 'devis', 'autre'.
Retourne UNIQUEMENT un JSON : {"categorie": "...", "confiance": 0.XX}
Ne mets PAS de markdown, PAS de balises code, retourne UNIQUEMENT le JSON brut.`
      }
    ]);
    
    const text = result.response.text();
    let parsed;
    try {
      parsed = JSON.parse(text.trim());
    } catch (e) {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[1].trim());
      else throw new Error('Parse JSON classification échoué');
    }
    
    return {
      categorie: parsed.categorie || 'autre',
      confiance: parsed.confiance || 0.5
    };
  }

  async extractFromWhatsApp(base64Image) {
    return this.analyzeDocument(base64Image, 'image/jpeg');
  }
}

module.exports = new VisionService();
