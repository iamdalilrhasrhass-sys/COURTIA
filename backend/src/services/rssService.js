const logger = require('../lib/logger');

const rssService = {
  async getInsuranceNews() {
    return {
      success: false,
      error: 'configuration_required',
      provider: 'rss',
      items: [],
      message: 'Configure an RSS provider before displaying insurance news.',
    };
  },

  scheduleDigestTelegram() {
    logger.info({ provider: 'rss' }, 'rss digest scheduler disabled until provider is configured');
  },
};

module.exports = rssService;
