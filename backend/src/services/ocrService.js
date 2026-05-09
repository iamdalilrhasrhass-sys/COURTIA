function getOcrStatus() {
  const configured = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT);
  return {
    configured,
    provider: configured ? 'google_vision' : 'none',
    status: configured ? 'ready' : 'configuration_required',
    missing: configured ? [] : ['GOOGLE_APPLICATION_CREDENTIALS'],
  };
}

const ocrService = {
  getOcrStatus,

  async extractFromImage(imagePath) {
    const status = getOcrStatus();
    if (!status.configured) {
      return {
        success: false,
        error: 'configuration_required',
        provider: status.provider,
        missing: status.missing,
        data: null,
      };
    }

    let vision;
    try {
      vision = require('@google-cloud/vision');
    } catch (_err) {
      return {
        success: false,
        error: 'provider_unavailable',
        provider: 'google_vision',
        message: 'Google Vision SDK non installe.',
        data: null,
      };
    }

    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.textDetection(imagePath);
    const text = result.fullTextAnnotation?.text || '';

    return {
      success: true,
      provider: 'google_vision',
      text,
      data: { text },
    };
  },
};

module.exports = ocrService;
