const fs = require('fs');

let content = fs.readFileSync('src/views/LabView.tsx', 'utf8');
content = content.replace(/FileSpreadsheet\s*ChevronDown/, 'FileSpreadsheet,\n  ChevronDown');
fs.writeFileSync('src/views/LabView.tsx', content);
