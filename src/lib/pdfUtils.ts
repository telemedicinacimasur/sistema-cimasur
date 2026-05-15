import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PRIMARY_COLOR: [number, number, number] = [30, 58, 95]; // #1E3A5F Azul Marino Oscuro

const addWatermark = (doc: jsPDF, pageWidth: number, pageHeight: number) => {
  // Use a very subtle grey for watermark
  doc.setTextColor(240, 243, 247); 
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(100);
  
  // Center watermark and rotate
  doc.text('CIMASUR', pageWidth / 2, pageHeight / 2 + 20, { align: 'center', angle: 45 });
};

const setupPremiumPage = (doc: jsPDF, orientation: 'p' | 'l' = 'l', title: string, subtitle?: string) => {
  const pageWidth = orientation === 'p' ? 210 : 297;
  const pageHeight = orientation === 'p' ? 297 : 210;
  
  addWatermark(doc, pageWidth, pageHeight);

  // Left Side: Brand & Subtitle
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('CIMASUR', 14, 20);
  
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 113, 128); // Slate 500
    doc.text(subtitle, 14, 25);
  }

  // Right Side: Report Title & Date
  const cleanTitle = title.replace(/Sistema |CIMASUR|Dashboard|Gestión de|Panel Administrativo/gi, '').trim();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(cleanTitle.toUpperCase(), pageWidth - 14, 20, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 113, 128);
  doc.text(`Fecha Emisión: ${new Date().toLocaleString('es-CL')}`, pageWidth - 14, 25, { align: 'right' });
  
  // Clean separator line
  doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.setLineWidth(0.5);
  doc.line(14, 30, pageWidth - 14, 30);

  return { pageWidth, pageHeight };
};

export const exportTableToPDF = (title: string, headers: string[], data: any[][], fileName: string, orientation: 'p' | 'l' = 'l') => {
  // Always prefer Landscape for tables to ensure full width
  const orientationToUse = 'l'; 
  const doc = new jsPDF({ orientation: orientationToUse });
  const { pageWidth } = setupPremiumPage(doc, orientationToUse, title, 'Reporte de Registros');
  
  const safeData = data.map(row => row.map(cell => cell ?? ''));
  
  autoTable(doc, {
    startY: 40,
    head: [headers],
    body: safeData,
    theme: 'plain',
    margin: { left: 14, right: 14 },
    tableWidth: 'auto', // Use auto to stretch across page
    headStyles: {
      textColor: PRIMARY_COLOR,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      fillColor: [248, 250, 252], // Slate 50
    },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: 'linebreak',
      textColor: [51, 65, 85], // Slate 700
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255] // White
    },
    didDrawCell: (data) => {
       // Draw thin subtle border for rows
       if (data.row.section === 'head' || data.row.section === 'body') {
          doc.setDrawColor(226, 232, 240); // Slate 200
          doc.setLineWidth(0.1);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
       }
       // Top border for header
       if (data.row.section === 'head' && data.row.index === 0) {
          doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
          doc.setLineWidth(0.5);
          doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
       }
    }
  });

  // Example: If user wants summary/totals, we can add a footer text if need be
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  if (finalY < doc.internal.pageSize.getHeight() - 20) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total de registros: ${data.length}`, pageWidth - 14, finalY, { align: 'right' });
  }
  
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
  const productItem = data.find(i => i.label === 'Producto' || i.label === 'Paciente');
  const mainSubtitle = productItem && productItem.value ? productItem.value : 'Ficha de Registro';
  
  const { pageWidth } = setupPremiumPage(doc, orientation, title, mainSubtitle);
  
  let currentY = 40;

  // Main Fields Table
  const filterData = data.filter(item => item.label && item.label !== 'Producto' && item.label !== 'Paciente');
  if (filterData.length > 0) {
    autoTable(doc, {
      startY: currentY,
      body: filterData.map(item => [
        String(item.label).toUpperCase(),
        item.value !== null && item.value !== undefined ? String(item.value) : ''
      ]),
      theme: 'plain',
      margin: { left: 14, right: 14 },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 50, textColor: PRIMARY_COLOR },
        1: { textColor: [51, 65, 85] }
      },
      styles: { fontSize: 9, cellPadding: {top: 5, bottom: 5, left: 2, right: 2} },
      didDrawCell: (data) => {
         doc.setDrawColor(226, 232, 240);
         doc.setLineWidth(0.1);
         doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // Additional Tables
  if (tables && tables.length > 0) {
    tables.forEach(table => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
      doc.text(table.title.toUpperCase(), 14, currentY);
      currentY += 6;
      
      autoTable(doc, {
        startY: currentY,
        head: [table.headers],
        body: table.rows.map(r => r.map(c => c !== null && c !== undefined ? String(c) : '')),
        theme: 'plain',
        margin: { left: 14, right: 14 },
        headStyles: {
          textColor: PRIMARY_COLOR,
          fontSize: 8,
          fontStyle: 'bold',
          fillColor: [248, 250, 252],
        },
        styles: { fontSize: 8, cellPadding: 4, textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        didDrawCell: (data) => {
           if (data.row.section === 'head' || data.row.section === 'body') {
              doc.setDrawColor(226, 232, 240);
              doc.setLineWidth(0.1);
              doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
           }
           if (data.row.section === 'head' && data.row.index === 0) {
              doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
              doc.setLineWidth(0.5);
              doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
           }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
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
  const productItem = data.find(i => i.label === 'Producto' || i.label === 'Paciente');
  const mainSubtitle = productItem && productItem.value ? productItem.value : 'Ficha de Registro';
  
  const { pageWidth } = setupPremiumPage(doc, orientation, title, mainSubtitle);
  
  let currentY = 40;

  const filterData = data.filter(item => item.label && item.label !== 'Producto' && item.label !== 'Paciente');
  if (filterData.length > 0) {
    autoTable(doc, {
      startY: currentY,
      body: filterData.map(item => [
        String(item.label).toUpperCase(),
        item.value !== null && item.value !== undefined ? String(item.value) : ''
      ]),
      theme: 'plain',
      margin: { left: 14, right: 14 },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 50, textColor: PRIMARY_COLOR },
        1: { textColor: [51, 65, 85] }
      },
      styles: { fontSize: 9, cellPadding: {top: 5, bottom: 5, left: 2, right: 2} },
      didDrawCell: (data) => {
         doc.setDrawColor(226, 232, 240);
         doc.setLineWidth(0.1);
         doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  if (tables && tables.length > 0) {
    tables.forEach(table => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
      doc.text(table.title.toUpperCase(), 14, currentY);
      currentY += 6;
      
      autoTable(doc, {
        startY: currentY,
        head: [table.headers],
        body: table.rows.map(r => r.map(c => c !== null && c !== undefined ? String(c) : '')),
        theme: 'plain',
        margin: { left: 14, right: 14 },
        headStyles: {
          textColor: PRIMARY_COLOR,
          fontSize: 8,
          fontStyle: 'bold',
          fillColor: [248, 250, 252],
        },
        styles: { fontSize: 8, cellPadding: 4, textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        didDrawCell: (data) => {
           if (data.row.section === 'head' || data.row.section === 'body') {
              doc.setDrawColor(226, 232, 240);
              doc.setLineWidth(0.1);
              doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
           }
           if (data.row.section === 'head' && data.row.index === 0) {
              doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
              doc.setLineWidth(0.5);
              doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
           }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    });
  }
  
  window.open(doc.output('bloburl'), '_blank');
};

export const exportRecordToPDF = (title: string, recordData: { label: string, value: string }[], fileName: string) => {
  exportExpedienteToPDF(title, recordData, fileName);
};


