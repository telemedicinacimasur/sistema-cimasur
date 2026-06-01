import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PRIMARY_COLOR: [number, number, number] = [30, 58, 95]; // #1E3A5F Azul Marino Oscuro

const addWatermark = (doc: jsPDF, pageWidth: number, pageHeight: number) => {
  // Watermark removed per user request: "en el PDF en genral solo me interesa el contenido de la ficha y nada más el resto chao"
};

const setupPremiumPage = (
  doc: jsPDF, 
  orientation: 'p' | 'l' = 'l', 
  title: string, 
  subtitle?: string, 
  subtitleFontSize: number = 9,
  cimasurFontSize: number = 18,
  titleFontSize: number = 12,
  dateFontSize: number = 9
) => {
  const pageWidth = orientation === 'p' ? 210 : 297;
  const pageHeight = orientation === 'p' ? 297 : 210;
  
  if (title.toUpperCase().includes('FÓRMULA MAGISTRAL') || title.toUpperCase().includes('FORMULA MAGISTRAL')) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('FICHA: FÓRMULA MAGISTRAL', 14, 10);
    
    if (subtitle && subtitle !== 'Ficha de Registro') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // Slate 900 (Deep/dark color)
      doc.text(subtitle.toUpperCase(), 14, 20);
    }
  } else {
    // Minimal clean title header on top so we know what the document is, but without watermarks, decorative lines or big dates.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(title.toUpperCase(), 14, 15);
    
    if (subtitle && subtitle !== 'Ficha de Registro') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(title.includes('PREPARACIÓN GOTAS PURAS') ? 30 : subtitleFontSize);
      const yPos = title.includes('PREPARACIÓN GOTAS PURAS') ? 24 : 21;
      doc.text(subtitle, 14, yPos);
    }
  }

  return { pageWidth, pageHeight };
};

export const exportTableToPDF = (title: string, headers: string[], data: any[][], fileName: string, orientation: 'p' | 'l' = 'l') => {
  const orientationToUse = orientation; 
  const doc = new jsPDF({ orientation: orientationToUse });
  const { pageWidth } = setupPremiumPage(doc, orientationToUse, title, 'Reporte de Registros');
  
  const safeData = data.map(row => row.map(cell => cell ?? ''));
  
  autoTable(doc, {
    startY: 25,
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
          doc.setDrawColor(120, 120, 120); // Darker slate grey
          doc.setLineWidth(0.2);
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
  orientation: 'p' | 'l' = 'p',
  subtitleFontSize: number = 9,
  cimasurFontSize: number = 18,
  titleFontSize: number = 12,
  dateFontSize: number = 9,
  images?: string[] // Optional base64 images to append at the end
) => {
  const doc = new jsPDF({ orientation });
  let productItem = data.find(i => i.label === 'Producto' || i.label === 'Paciente');
  if (!productItem) {
    productItem = data.find(i => i.label === 'MV Tratante');
  }
  const mainSubtitle = productItem && productItem.value ? productItem.value : 'Ficha de Registro';
   const { pageWidth, pageHeight } = setupPremiumPage(doc, orientation, title, mainSubtitle, subtitleFontSize, cimasurFontSize, titleFontSize, dateFontSize);
  
  let currentY = title.includes('PREPARACIÓN GOTAS PURAS') ? 40 : (title.includes('Fórmula Magistral') ? 28 : 25);

  // Main Fields Table
  const filterData = data.filter(item => item.label && item.label !== 'Producto' && item.label !== 'Paciente' && item.label !== 'MV Tratante' && item.label !== '---');
  if (filterData.length > 0) {
    if (title === 'REPORTE ANALÍTICO DE VENTAS' || filterData.length > 4) {
      // Create a 2-column key-value grid (which makes 4 columns total: Label1, Value1, Label2, Value2)
      const half = Math.ceil(filterData.length / 2);
      const gridRows = [];
      for (let i = 0; i < half; i++) {
        const item1 = filterData[i];
        const item2 = filterData[i + half];
        gridRows.push([
          String(item1.label).toUpperCase(),
          item1.value !== null && item1.value !== undefined ? String(item1.value) : '',
          item2 ? String(item2.label).toUpperCase() : '',
          item2 && item2.value !== null && item2.value !== undefined ? String(item2.value) : ''
        ]);
      }
      autoTable(doc, {
        startY: currentY,
        body: gridRows,
        theme: 'plain',
        margin: { left: 14, right: 14 },
        columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 'wrap', textColor: PRIMARY_COLOR },
          1: { textColor: [51, 65, 85] },
          2: { fontStyle: 'bold', cellWidth: 'wrap', textColor: PRIMARY_COLOR },
          3: { textColor: [51, 65, 85] }
        },
        styles: { fontSize: 7.5, cellPadding: {top: 2, bottom: 2, left: 2, right: 2} },
        didDrawCell: (data) => {
           doc.setDrawColor(120, 120, 120);
           doc.setLineWidth(0.2);
           doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 12;
    } else {
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
        styles: { fontSize: 8, cellPadding: {top: 3, bottom: 3, left: 2, right: 2} },
        didDrawCell: (data) => {
           doc.setDrawColor(120, 120, 120);
           doc.setLineWidth(0.2);
           doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Draw images first (so that they stay with the cover/dashboard section, e.g. on Page 1)
  const isAnalitico = title === 'REPORTE ANALÍTICO DE VENTAS';
  if (images && images.length > 0 && !isAnalitico) {
     images.forEach(imgData => {
         if (currentY + 95 > pageHeight) {
             doc.addPage(orientation);
             currentY = 25;
         }
         const imgWidth = pageWidth - 28;
         const imgHeight = 90;
         
         doc.addImage(imgData, 'PNG', 14, currentY, imgWidth, imgHeight);
         currentY += imgHeight + 15;
     });
  }

  // Additional Tables (each starting on its own brand new page!)
  if (tables && tables.length > 0) {
    tables.forEach(table => {
      doc.addPage(orientation);
      currentY = 25;
      
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
           if (table.title === 'Registro de Elaboración') {
               doc.setDrawColor(0, 0, 0); // Black
               doc.setLineWidth(0.2);
               doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
           } else {
               if (data.row.section === 'head' || data.row.section === 'body') {
                  doc.setDrawColor(120, 120, 120);
                  doc.setLineWidth(0.2);
                  doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
               }
               if (data.row.section === 'head' && data.row.index === 0) {
                  doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
                  doc.setLineWidth(0.5);
                  doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
               }
           }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    });
  }

  if (images && images.length > 0 && isAnalitico) {
     images.forEach(imgData => {
         doc.addPage(orientation);
         currentY = 25;
         const imgWidth = pageWidth - 28;
         const imgHeight = 90;
         doc.addImage(imgData, 'PNG', 14, currentY, imgWidth, imgHeight);
     });
  }
  
  doc.save(`${fileName}.pdf`);
};

export const viewExpedienteInNewTab = (
  title: string, 
  data: { label: string, value: string }[], 
  fileName: string, 
  tables?: { title: string, headers: string[], rows: any[][] }[],
  orientation: 'p' | 'l' = 'p',
  subtitleFontSize: number = 9,
  cimasurFontSize: number = 18,
  titleFontSize: number = 12,
  dateFontSize: number = 9
) => {
  const doc = new jsPDF({ orientation });
  let productItem = data.find(i => i.label === 'Producto' || i.label === 'Paciente');
  if (!productItem) {
    productItem = data.find(i => i.label === 'MV Tratante');
  }
  const mainSubtitle = productItem && productItem.value ? productItem.value : 'Ficha de Registro';
  
  const { pageWidth } = setupPremiumPage(doc, orientation, title, mainSubtitle, subtitleFontSize, cimasurFontSize, titleFontSize, dateFontSize);
  
  let currentY = title.includes('PREPARACIÓN GOTAS PURAS') ? 48 : (title.includes('Fórmula Magistral') ? 32 : 40);

  const filterData = data.filter(item => item.label && item.label !== 'Producto' && item.label !== 'Paciente' && item.label !== 'MV Tratante');
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
      styles: { fontSize: 8, cellPadding: {top: 3, bottom: 3, left: 2, right: 2} },
      didDrawCell: (data) => {
         doc.setDrawColor(120, 120, 120);
         doc.setLineWidth(0.2);
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
           if (table.title === 'Registro de Elaboración') {
               doc.setDrawColor(0, 0, 0); // Black
               doc.setLineWidth(0.2);
               doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
           } else {
               if (data.row.section === 'head' || data.row.section === 'body') {
                  doc.setDrawColor(120, 120, 120);
                  doc.setLineWidth(0.2);
                  doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
               }
               if (data.row.section === 'head' && data.row.index === 0) {
                  doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
                  doc.setLineWidth(0.5);
                  doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
               }
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


