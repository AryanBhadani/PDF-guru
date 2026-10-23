const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'sample-pdfs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function create1PagePDF() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4 portrait
  page.drawText('1-Page Test PDF', { x: 50, y: 800, size: 24 });
  page.drawText('This is a single page PDF for testing.', { x: 50, y: 750, size: 14 });
  const pdfBytes = await pdf.save();
  fs.writeFileSync(path.join(outputDir, '1-page.pdf'), pdfBytes);
  console.log('Created 1-page.pdf');
}

async function createMultiPagePDF() {
  const pdf = await PDFDocument.create();
  for (let i = 1; i <= 5; i++) {
    const page = pdf.addPage([595, 842]);
    page.drawText(`Page ${i}`, { x: 50, y: 800, size: 24 });
    page.drawText('Multi-page test PDF', { x: 50, y: 750, size: 14 });
  }
  const pdfBytes = await pdf.save();
  fs.writeFileSync(path.join(outputDir, 'multi-page.pdf'), pdfBytes);
  console.log('Created multi-page.pdf');
}

async function createPortraitPDF() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4 portrait
  page.drawText('Portrait PDF', { x: 50, y: 800, size: 24 });
  page.drawText('This is a portrait orientation PDF.', { x: 50, y: 750, size: 14 });
  const pdfBytes = await pdf.save();
  fs.writeFileSync(path.join(outputDir, 'portrait.pdf'), pdfBytes);
  console.log('Created portrait.pdf');
}

async function createLandscapePDF() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // A4 landscape
  page.drawText('Landscape PDF', { x: 50, y: 550, size: 24 });
  page.drawText('This is a landscape orientation PDF.', { x: 50, y: 500, size: 14 });
  const pdfBytes = await pdf.save();
  fs.writeFileSync(path.join(outputDir, 'landscape.pdf'), pdfBytes);
  console.log('Created landscape.pdf');
}

async function createLargePDF() {
  const pdf = await PDFDocument.create();
  for (let i = 1; i <= 50; i++) {
    const page = pdf.addPage([595, 842]);
    page.drawText(`Page ${i} of 50`, { x: 50, y: 800, size: 24 });
    page.drawText('Large PDF test - 50 pages', { x: 50, y: 750, size: 14 });
  }
  const pdfBytes = await pdf.save();
  fs.writeFileSync(path.join(outputDir, '50-pages.pdf'), pdfBytes);
  console.log('Created 50-pages.pdf');
}

async function main() {
  await create1PagePDF();
  await createMultiPagePDF();
  await createPortraitPDF();
  await createLandscapePDF();
  await createLargePDF();
  console.log('All sample PDFs generated in tests/sample-pdfs/');
}

main().catch(console.error);
