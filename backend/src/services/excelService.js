const XLSX = require('xlsx');
const path = require('path');

const excelService = {
  // Generate Excel with clients and contracts
  async generateClientsExport(clientsList, contractsList) {
    try {
      const workbook = XLSX.utils.book_new();

      // Clients sheet
      const clientsData = clientsList.map(c => ({
        'Nom': `${c.first_name} ${c.last_name}`,
        'Email': c.email,
        'Téléphone': c.phone,
        'Statut': c.status,
        'Score Fidélité': c.loyalty_score || 0,
        'Score Risque': c.risk_score || 0,
        'Créé le': new Date(c.created_at).toLocaleDateString('fr-FR')
      }));

      const clientsSheet = XLSX.utils.json_to_sheet(clientsData);
      clientsSheet['!cols'] = [
        { wch: 25 },
        { wch: 30 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Clients');

      // Contracts sheet
      const contractsData = contractsList.map(c => ({
        'Client': c.client_name || 'N/A',
        'Type': c.type,
        'Assureur': c.insurer || 'N/A',
        'Prime': `${c.premium}€`,
        'Statut': c.status,
        'Début': new Date(c.start_date).toLocaleDateString('fr-FR'),
        'Fin': new Date(c.end_date).toLocaleDateString('fr-FR')
      }));

      const contractsSheet = XLSX.utils.json_to_sheet(contractsData);
      contractsSheet['!cols'] = [
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(workbook, contractsSheet, 'Contrats');

      // Summary sheet
      const summaryData = [
        { Métrique: 'Total clients', Valeur: clientsList.length },
        { Métrique: 'Clients actifs', Valeur: clientsList.filter(c => c.status === 'active').length },
        { Métrique: 'Total contrats', Valeur: contractsList.length },
        { Métrique: 'Contrats actifs', Valeur: contractsList.filter(c => c.status === 'active').length },
        { Métrique: 'Score fidélité moyen', Valeur: (clientsList.reduce((sum, c) => sum + (c.loyalty_score || 0), 0) / clientsList.length).toFixed(1) },
        { Métrique: 'Score risque moyen', Valeur: (clientsList.reduce((sum, c) => sum + (c.risk_score || 0), 0) / clientsList.length).toFixed(1) }
      ];

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 30 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

      // Write file
      const fileName = `export_clients_${Date.now()}.xlsx`;
      const filePath = path.join('/tmp', fileName);
      XLSX.writeFile(workbook, filePath);

      return filePath;
    } catch (error) {
      console.error('Excel generation error:', error);
      throw error;
    }
  }
};

module.exports = excelService;
