const fs = require('fs');

let content = fs.readFileSync('src/views/LabView.tsx', 'utf8');

const target = /<FileText className="w-3\.5 h-3\.5" \/> Descargar\s*<\/button>\s*<\/td>/g;
content = content.replace(target, `<FileText className="w-3.5 h-3.5" /> Descargar\n                          </button>\n                          </div>\n                        </td>`);

fs.writeFileSync('src/views/LabView.tsx', content);
