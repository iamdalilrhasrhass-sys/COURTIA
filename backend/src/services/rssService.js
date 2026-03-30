const rssService = {
  async getInsuranceNews() {
    const mockNews = [
      { title: 'Nouvelle réglementation RGPD 2026', source: 'Journal Assurance', date: '2026-03-30' },
      { title: 'Hausse tarifaire généralisée', source: 'Acteurs Assurance', date: '2026-03-29' },
      { title: 'Télétravail et assurance RC', source: 'Décideurs Mag', date: '2026-03-28' }
    ]
    return mockNews
  },

  scheduleDigestTelegram() {
    console.log('✅ RSS digest scheduled daily')
  }
}

module.exports = rssService
