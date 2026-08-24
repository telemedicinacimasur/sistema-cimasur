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
  const compRegex = new RegExp(`(function ${form.name}[\\s\\S]*?const \\[searchTerm, setSearchTerm\\] = useState\\('[^']*'\\);)`);
  if (!content.match(new RegExp(`function ${form.name}[\\s\\S]*?currentPage`))) {
    content = content.replace(compRegex, `$1\n  const [currentPage, setCurrentPage] = useState<number>(1);\n  const pageSize = 20;\n  useEffect(() => { setCurrentPage(1); }, ${form.deps});`);
  }
}

// And for StockManager, it already has filteredRecords
const stockRegex = new RegExp(`(const filteredRecords = inventoryRecords\\.filter[\\s\\S]*?\\n\\s*\\};\\n)`);
if (!content.includes('const paginatedRecords = filteredRecords.slice')) {
    content = content.replace(stockRegex, `$1\n  const [currentPage, setCurrentPage] = useState<number>(1);\n  const pageSize = 20;\n  useEffect(() => { setCurrentPage(1); }, [selectedArea, searchTerm, kardexSearchTerm]);\n  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);\n`);
}

// Replace stockManager map
content = content.replace(/\{filteredRecords\.map\(/g, '{paginatedRecords.map(');
// Add Pagination to StockManager
content = content.replace(/(<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>[\s\S]*?\{editingStockId && \()/g, `
            <Pagination
              currentPage={currentPage}
              totalItems={filteredRecords.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
$1`);

fs.writeFileSync('src/views/LabView.tsx', content);
