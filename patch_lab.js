const fs = require('fs');

let content = fs.readFileSync('src/views/LabView.tsx', 'utf8');

const forms = [
  { name: 'GotasPurasForm', type: 'gotas-puras', deps: '[searchTerm, filterEstado]' },
  { name: 'ElaboracionForm', type: 'elaboracion', deps: '[searchTerm, filterEstado]' },
  { name: 'NosodesForm', type: 'nosodes', deps: '[searchTerm, filterEstado]' },
  { name: 'PreparacionForm', type: 'preparacion', deps: '[searchTerm, filterEstado]' },
  { name: 'TinturasMadresForm', type: 'tinturas', deps: '[searchTerm, filterEstado]' },
  { name: 'InsumosForm', type: 'insumos', deps: '[searchTerm, filterEstado]' },
  { name: 'VademecumForm', type: 'vademecum', deps: '[searchTerm, filterCategoria]' },
  { name: 'MantenimientoForm', type: 'mantenimiento', deps: '[searchTerm]' },
  { name: 'MagistralesForm', type: 'magistrales', deps: '[searchTerm]' },
];

for (const form of forms) {
  // Inject state
  const compRegex = new RegExp(`(function ${form.name}[\\s\\S]*?const \\[searchTerm, setSearchTerm\\] = useState\\('');)`);
  if (content.match(compRegex) && !content.includes(`function ${form.name}`) || !content.match(new RegExp(`function ${form.name}[\\s\\S]*?currentPage`))) {
    content = content.replace(compRegex, `$1\n  const [currentPage, setCurrentPage] = React.useState<number>(1);\n  const pageSize = 20;\n  React.useEffect(() => { setCurrentPage(1); }, ${form.deps});`);
  }

  // Find the table block for this form.
  // The structure is typically:
  // {records.filter(r => r.type === '...').filter(r => { ... }).sort(...).map(r => (
  // We want to replace this with an IIFE that calculates the filtered array, slices it, and adds the pagination component.
  
  const mapRegex = new RegExp(`\\{records\\.filter\\(r => r\\.type === '${form.type}'\\)[\\s\\S]*?\\.map\\([\\s\\S]*?\\(`, 'g');
  
  // Wait, replacing the map directly might be hard because we need to insert <Pagination> AFTER the </table></div>.
  // Let's use string replacement on a larger block.
  // We find: <div className="overflow-x-auto bg-[#1E293B]/50 ..."> or just the <table ...>
}
fs.writeFileSync('src/views/LabView.tsx', content);
