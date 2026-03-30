const vision = require('@google-cloud/vision');

const ocrService = {
  async extractFromImage(imagePath) {
    // Mock OCR - en prod utiliser Google Vision API
    const mockData = {
      client_name: 'Jean Dupont',
      contract_type: 'Assurance Auto',
      premium: 450,
      start_date: '2026-03-01',
      end_date: '2027-03-01',
      coverage: 'Tiers+',
      insurer: 'AXA'
    };
    
    console.log(`✅ OCR extracted from ${imagePath}:`, mockData);
    return mockData;
  }
};

module.exports = ocrService;
