import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const generateDevisPdf = async (devis, client, items) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const fileName = `devis_${devis.id}.pdf`;
  const filePath = path.join('/tmp', fileName);
  
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Aurora Design System PDF Theme
  const colors = { dark: '#050510', accent: '#5B4DF5', text: '#333' };

  // Header
  doc.rect(0, 0, 600, 100).fill(colors.dark);
  doc.fillColor('white').fontSize(20).text('COURTIA', 50, 40);
  doc.fontSize(10).text('Courtage Premium', 50, 65);
  
  // Title
  doc.fillColor(colors.text).fontSize(16).text('Proposition d\'Assurance', 400, 40);
  doc.fontSize(10).text(`Réf: ${devis.id}`, 400, 60);

  // Client Info
  doc.fontSize(10).text(`${client.full_name}`, 50, 150);
  doc.text(`${client.address || 'Adresse non renseignée'}`, 50, 165);

  // Table
  doc.moveDown(10);
  doc.rect(50, 200, 500, 20).fill(colors.accent);
  doc.fillColor('white').text('Désignation', 60, 205);
  doc.text('Plafond', 300, 205);
  doc.text('Prime', 450, 205);

  let y = 230;
  doc.fillColor(colors.text);
  items.forEach(item => {
    doc.text(item.label, 60, y);
    doc.text(item.plafond, 300, y);
    doc.text(item.prime, 450, y);
    y += 20;
  });

  // Footer
  doc.fontSize(8).fillColor('#888').text('COURTIA — courtage premium • ORIAS 12345678 • RC Pro AXA n°1234', 50, 750, { align: 'center' });

  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};