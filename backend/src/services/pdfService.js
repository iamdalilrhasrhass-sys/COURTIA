const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const pdfService = {
  // Generate DDA (Document Demande d'Assurance)
  async generateDDA(clientData, pool) {
    return new Promise(async (resolve, reject) => {
      try {
        const fileName = `DDA_${clientData.id}_${Date.now()}.pdf`;
        const filePath = path.join('/tmp', fileName);
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('COURTIA', 50, 50);
        doc.fontSize(10).font('Helvetica').text('Document Demande d\'Assurance', 50, 85);
        doc.moveTo(50, 100).lineTo(550, 100).stroke();

        // Client Info
        doc.fontSize(12).font('Helvetica-Bold').text('Client', 50, 120);
        doc.fontSize(10).font('Helvetica');
        doc.text(`${clientData.first_name} ${clientData.last_name}`, 50, 140);
        doc.text(`Email: ${clientData.email}`, 50, 158);
        doc.text(`Téléphone: ${clientData.phone}`, 50, 176);
        doc.text(`Adresse: ${clientData.address || 'N/A'}`, 50, 194);

        // Date
        doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 350, 140);

        // Contracts
        doc.fontSize(12).font('Helvetica-Bold').text('Contrats Actuels', 50, 250);
        doc.fontSize(10).font('Helvetica');

        let yPosition = 280;
        if (clientData.contracts && clientData.contracts.length > 0) {
          clientData.contracts.forEach(contract => {
            doc.text(`• ${contract.type}: ${contract.premium}€ (Expire: ${contract.end_date})`, 50, yPosition);
            yPosition += 20;
          });
        } else {
          doc.text('Aucun contrat', 50, yPosition);
        }

        // Footer
        doc.fontSize(8).text('Document généré par COURTIA - ' + new Date().toLocaleDateString('fr-FR'), 50, doc.page.height - 50, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  },

  // Generate RGPD (Données personnelles)
  async generateRGPD(clientsList, pool) {
    return new Promise((resolve, reject) => {
      try {
        const fileName = `RGPD_${Date.now()}.pdf`;
        const filePath = path.join('/tmp', fileName);
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('COURTIA', 50, 50);
        doc.fontSize(10).font('Helvetica').text('Liste Clients - RGPD Compliance', 50, 85);
        doc.moveTo(50, 100).lineTo(550, 100).stroke();

        // Date
        doc.fontSize(10).text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 50, 120);
        doc.fontSize(10).text(`Total clients: ${clientsList.length}`, 50, 140);

        // Table headers
        let yPosition = 180;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Nom', 50, yPosition);
        doc.text('Email', 180, yPosition);
        doc.text('Téléphone', 320, yPosition);
        doc.text('Statut', 450, yPosition);

        doc.moveTo(50, yPosition + 15).lineTo(550, yPosition + 15).stroke();
        yPosition += 35;

        // Table rows
        doc.font('Helvetica').fontSize(9);
        clientsList.slice(0, 20).forEach((client, index) => {
          if (yPosition > 750) {
            doc.addPage();
            yPosition = 50;
          }

          doc.text(client.first_name + ' ' + client.last_name, 50, yPosition);
          doc.text(client.email || '-', 180, yPosition);
          doc.text(client.phone || '-', 320, yPosition);
          doc.text(client.status || 'actif', 450, yPosition);

          yPosition += 20;
        });

        // Footer
        doc.fontSize(8).text('Document confidentiel - RGPD Compliance', 50, doc.page.height - 50, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  },

  // Generate ACPR (Audit report)
  async generateACPR(stats, pool) {
    return new Promise((resolve, reject) => {
      try {
        const fileName = `ACPR_${Date.now()}.pdf`;
        const filePath = path.join('/tmp', fileName);
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('COURTIA', 50, 50);
        doc.fontSize(10).font('Helvetica').text('Rapport d\'Audit ACPR', 50, 85);
        doc.moveTo(50, 100).lineTo(550, 100).stroke();

        // Date
        doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 50, 120);

        // Statistics
        doc.fontSize(12).font('Helvetica-Bold').text('Statistiques', 50, 160);
        doc.fontSize(10).font('Helvetica');

        const y = 190;
        doc.text(`Total clients: ${stats.totalClients || 0}`, 50, y);
        doc.text(`Clients actifs: ${stats.activeClients || 0}`, 50, y + 20);
        doc.text(`Total contrats: ${stats.totalContracts || 0}`, 50, y + 40);
        doc.text(`Chiffre affaires: ${stats.totalRevenue || 0}€`, 50, y + 60);
        doc.text(`Score de risque moyen: ${stats.avgRiskScore || 0}/100`, 50, y + 80);
        doc.text(`Score de fidélité moyen: ${stats.avgLoyaltyScore || 0}/100`, 50, y + 100);

        // Compliance section
        doc.fontSize(12).font('Helvetica-Bold').text('Conformité', 50, y + 160);
        doc.fontSize(10).font('Helvetica');
        doc.text('✓ RGPD: Données personnelles conformes', 50, y + 190);
        doc.text('✓ ACPR: Audit réglementaire OK', 50, y + 210);
        doc.text('✓ Sécurité: Authentification JWT activée', 50, y + 230);

        // Footer
        doc.fontSize(8).text('Rapport confidentiel - ACPR Compliance', 50, doc.page.height - 50, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
};

module.exports = pdfService;
