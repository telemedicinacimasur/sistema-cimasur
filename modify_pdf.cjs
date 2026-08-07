const fs = require('fs');
let content = fs.readFileSync('src/views/admin/VentasConsignacionView.tsx', 'utf8');

const regex36 = /autoTable\(doc, \{\s*startY: 36,\s*head: \[headers\],\s*body: data,\s*foot: \[\['', '', '', 'TOTAL', String\(totalStock\)\]\],\s*theme: 'grid',\s*margin: \{ left: 14, right: 14 \},\s*headStyles: \{[^}]+\},\s*footStyles: \{[^}]+\},\s*styles: \{[^}]+\}\s*\}\);/g;

content = content.replace(regex36, `autoTable(doc, {
                        startY: 36,
                        head: [headers],
                        body: data,
                        foot: [['', '', '', 'TOTAL', String(totalStock)]],
                        theme: 'plain',
                        margin: { left: 14, right: 14 },
                        headStyles: { textColor: [30, 58, 95], fontSize: 9, fontStyle: 'bold', fillColor: [248, 250, 252] },
                        footStyles: { textColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', fillColor: [248, 250, 252] },
                        styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85] },
                        didDrawCell: (cellData) => {
                           if (cellData.row.section === 'head' || cellData.row.section === 'body' || cellData.row.section === 'foot') {
                              doc.setDrawColor(226, 232, 240);
                              doc.setLineWidth(0.1);
                              doc.line(cellData.cell.x, cellData.cell.y + cellData.cell.height, cellData.cell.x + cellData.cell.width, cellData.cell.y + cellData.cell.height);
                           }
                        }
                      });`);

const regex42 = /autoTable\(doc, \{\s*startY: 42,\s*head: \[headers\],\s*body: data,\s*foot: \[\['TOTALES DECLARADOS', '', String\(totalUnits\), '', formatCurrency\(grandTotal\)\]\],\s*theme: 'grid',\s*margin: \{ left: 14, right: 14 \},\s*headStyles: \{[^}]+\},\s*footStyles: \{[^}]+\},\s*styles: \{[^}]+\}\s*\}\);/g;

content = content.replace(regex42, `autoTable(doc, {
                        startY: 42,
                        head: [headers],
                        body: data,
                        foot: [['TOTALES DECLARADOS', '', String(totalUnits), '', formatCurrency(grandTotal)]],
                        theme: 'plain',
                        margin: { left: 14, right: 14 },
                        headStyles: { textColor: [30, 58, 95], fontSize: 9, fontStyle: 'bold', fillColor: [248, 250, 252] },
                        footStyles: { textColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', fillColor: [248, 250, 252] },
                        styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85] },
                        didDrawCell: (cellData) => {
                           if (cellData.row.section === 'head' || cellData.row.section === 'body' || cellData.row.section === 'foot') {
                              doc.setDrawColor(226, 232, 240);
                              doc.setLineWidth(0.1);
                              doc.line(cellData.cell.x, cellData.cell.y + cellData.cell.height, cellData.cell.x + cellData.cell.width, cellData.cell.y + cellData.cell.height);
                           }
                        }
                      });`);

fs.writeFileSync('src/views/admin/VentasConsignacionView.tsx', content);
