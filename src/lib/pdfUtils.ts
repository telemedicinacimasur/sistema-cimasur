import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportTableToPDF = (title: string, headers: string[], data: any[][], fileName: string, orientation: 'p' | 'l' = 'l') => {
  const doc = new jsPDF({ orientation });
  
  // Update header width based on orientation
  const pageWidth = orientation === 'p' ? 210 : 297;
  
  // Add company logo or header styling
  doc.setFillColor(0, 23, 54); // #001736
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('CIMASUR', pageWidth/2, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('Gestión Académica y Laboratorio', pageWidth/2, 25, { align: 'center' });
  
  // Add title 
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(24);
  doc.text(title, 14, 45);
  
  // Add Date
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha de exportación: ${new Date().toLocaleString('es-CL')}`, 14, 52);
  
  // Generate Table
  const safeData = data.map(row => row.map(cell => cell ?? ''));
  autoTable(doc, {
    startY: 60,
    head: [headers],
    body: safeData,
    theme: 'striped',
    headStyles: {
      fillColor: [0, 23, 54],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    }
  });
  
  doc.save(`${fileName}.pdf`);
};

export const exportExpedienteToPDF = (
  title: string, 
  data: { label: string, value: string }[], 
  fileName: string, 
  tables?: { title: string, headers: string[], rows: any[][] }[],
  orientation: 'p' | 'l' = 'p'
) => {
  const doc = new jsPDF({ orientation });
  const pageWidth = orientation === 'p' ? 210 : 297;
  
  // Header
  doc.setFillColor(0, 23, 54);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('CIMASUR', pageWidth/2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Gestión Académica y Laboratorio', pageWidth/2, 25, { align: 'center' });
  
  // Extract prominent title dynamically (like Producto or Paciente)
  const productItem = data.find(i => i.label === 'Producto' || i.label === 'Paciente');
  const mainSubtitle = productItem && productItem.value ? productItem.value : title;
  const secondaryTitle = productItem ? title : '';

  // Title
  doc.setTextColor(0, 23, 54);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  const mainText = mainSubtitle.replace('Expediente: ', '');
  doc.text(mainText.toUpperCase(), 14, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  if (secondaryTitle) {
      doc.text(secondaryTitle.replace('Expediente: ', ''), 14, 54);
  }
  doc.setFontSize(10);
  doc.text(`Fecha de exportación: ${new Date().toLocaleString('es-CL')}`, 14, secondaryTitle ? 60 : 54);
  
  let currentY = secondaryTitle ? 68 : 62;

  // Main Fields Table
  autoTable(doc, {
    startY: currentY,
    body: data.map(item => [
      item.label !== null && item.label !== undefined ? String(item.label) : '',
      item.value !== null && item.value !== undefined ? String(item.value) : ''
    ]),
    theme: 'grid',
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    styles: { fontSize: 10, cellPadding: 3 },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Additional Tables
  if (tables) {
    tables.forEach(table => {
      doc.setFontSize(12);
      doc.text(table.title, 14, currentY);
      currentY += 5;
      
      autoTable(doc, {
        startY: currentY,
        head: [table.headers],
        body: table.rows.map(r => r.map(c => c !== null && c !== undefined ? String(c) : '')),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    });
  }
  
  doc.save(`${fileName}.pdf`);
};

export const viewExpedienteInNewTab = (
  title: string, 
  data: { label: string, value: string }[], 
  fileName: string, 
  tables?: { title: string, headers: string[], rows: any[][] }[],
  orientation: 'p' | 'l' = 'p'
) => {
  const doc = new jsPDF({ orientation });
  const pageWidth = orientation === 'p' ? 210 : 297;
  
  // Header
  doc.setFillColor(0, 23, 54);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('CIMASUR', pageWidth/2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Gestión Académica y Laboratorio', pageWidth/2, 25, { align: 'center' });
  
  // Extract prominent title dynamically (like Producto or Paciente)
  const productItem2 = data.find(i => i.label === 'Producto' || i.label === 'Paciente');
  const mainSubtitle2 = productItem2 && productItem2.value ? productItem2.value : title;
  const secondaryTitle2 = productItem2 ? title : '';

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  const mainText2 = mainSubtitle2.replace('Expediente: ', '');
  doc.text(mainText2.toUpperCase(), 14, 45);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  if (secondaryTitle2) {
      doc.text(secondaryTitle2.replace('Expediente: ', ''), 14, 52);
  }
  doc.setFontSize(10);
  doc.text(`Fecha de exportación: ${new Date().toLocaleString('es-CL')}`, 14, secondaryTitle2 ? 58 : 52);
  
  let currentY = secondaryTitle2 ? 65 : 60;

  // Main Fields Table
  autoTable(doc, {
    startY: currentY,
    body: data.map(item => [
      item.label !== null && item.label !== undefined ? String(item.label) : '',
      item.value !== null && item.value !== undefined ? String(item.value) : ''
    ]),
    theme: 'grid',
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    styles: { fontSize: 10, cellPadding: 3 },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Additional Tables
  if (tables) {
    tables.forEach(table => {
      doc.setFontSize(12);
      doc.text(table.title, 14, currentY);
      currentY += 5;
      
      autoTable(doc, {
        startY: currentY,
        head: [table.headers],
        body: table.rows.map(r => r.map(c => c !== null && c !== undefined ? String(c) : '')),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    });
  }
  
  window.open(doc.output('bloburl'), '_blank');
};

export const exportRecordToPDF = (title: string, recordData: { label: string, value: string }[], fileName: string) => {
  exportExpedienteToPDF(title, recordData, fileName);
};
