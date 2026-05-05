import fs from 'fs';
import path from 'path';

let content = fs.readFileSync(path.join(process.cwd(), 'src/lib/pdfUtils.ts'), 'utf-8');

content = content.replace(/body: data\.map\(item => \[item\.label, item\.value\]\),/g, "body: data.map(item => [\n      item.label !== null && item.label !== undefined ? String(item.label) : '',\n      item.value !== null && item.value !== undefined ? String(item.value) : ''\n    ]),");

content = content.replace(/body: table\.rows,/g, "body: table.rows.map(r => r.map(c => c !== null && c !== undefined ? String(c) : '')),");

fs.writeFileSync(path.join(process.cwd(), 'src/lib/pdfUtils.ts'), content, 'utf-8');
console.log('Fixed PDF utils mapping for JS objects/undefined');
