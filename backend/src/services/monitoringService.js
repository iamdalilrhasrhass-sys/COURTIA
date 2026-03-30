const axios = require('axios');

const monitoringService = {
  async sendAlert(message) {
    if (!process.env.TELEGRAM_BOT_TOKEN) return;
    try {
      await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: process.env.TELEGRAM_ADMIN_ID || '836643845',
        text: `🚨 COURTIA ALERT:\n${message}`
      });
    } catch (err) {
      console.error('Alert send failed:', err.message);
    }
  },

  startHealthCheck() {
    setInterval(async () => {
      try {
        const response = await fetch('http://localhost:3000/health');
        if (!response.ok) {
          this.sendAlert(`Backend down! Status: ${response.status}`);
        }
      } catch (err) {
        this.sendAlert(`Backend unreachable! Error: ${err.message}`);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
};

module.exports = monitoringService;
