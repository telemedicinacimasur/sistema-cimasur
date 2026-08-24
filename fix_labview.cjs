const fs = require('fs');

let content = fs.readFileSync('src/views/LabView.tsx', 'utf8');

if (!content.includes('import { Pagination }')) {
  content = content.replace("import { SearchableRefInput } from '../components/SearchableRefInput';", "import { SearchableRefInput } from '../components/SearchableRefInput';\nimport { Pagination } from '../components/Pagination';");
}

// Remove Conejero module card
content = content.replace(/\{\(\!user\?\.allowedSubmodules\?\.lab \|\| user\.allowedSubmodules\.lab\.includes\('conejero'\)\) && \([\s\S]*?onClick=\{\(\) => setActiveForm\('conejero'\)\}[\s\S]*?\)\}/, '');
// Remove Conejero module route
content = content.replace(/\{activeForm === 'conejero' && <div[\s\S]*?Volver<\/button><\/div>\}/, '');

const forms = [
  { name: 'GotasPurasForm', type: 'gotas-puras', deps: '[searchTerm, filterEstado]' },
  { name: 'ElaboracionForm', type: 'elaboracion', deps: '[searchTerm, filterEstado]' },
  { name: 'NosodesForm', type: 'nosodes', deps: '[searchTerm, filterEstado]' },
  { name: 'PreparacionForm', type: 'preparacion', deps: '[searchTerm, filterEstado]' },
  { name: 'TinturasMadresForm', type: 'tinturas', deps: '[searchTerm, filterEstado]' },
  { name: 'InsumosForm', type: 'insumos', deps: '[searchTerm, filterEstado]' },
  { name: 'VademecumForm', type: 'vademecum', deps: '[searchTerm, filterCategoria]' },
  { name: 'MantenimientoForm', type: 'mantenimiento', deps: '[searchTerm]' }
];

for (const form of forms) {
  // Add pagination state
  const stateRegex = new RegExp(`(const \\[searchTerm, setSearchTerm\\] = useState\\('');\\s*const \\[filter[^\\]]*\\] = useState[^;]*;)`);
  if (!content.includes(`const [currentPage, setCurrentPage] = useState<number>(1);`) || !content.match(new RegExp(`function ${form.name}[\\s\\S]*?currentPage`))) {
    content = content.replace(stateRegex, `$1\n  const [currentPage, setCurrentPage] = useState<number>(1);\n  const pageSize = 20;\n  useEffect(() => { setCurrentPage(1); }, ${form.deps});`);
  }
}

fs.writeFileSync('src/views/LabView.tsx', content);
