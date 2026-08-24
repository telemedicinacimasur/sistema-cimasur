import re

with open('src/views/LabView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

comp_match = re.search(r'(function MagistralesForm[\s\S]*?\n})', text)
comp_body = comp_match.group(1)

# Add pagination state
comp_body = re.sub(r'const \[searchTerm, setSearchTerm\] = useState\(\'\'\);',
                   r"const [searchTerm, setSearchTerm] = useState('');\n  const [currentPage, setCurrentPage] = useState<number>(1);\n  const pageSize = 20;\n  useEffect(() => { setCurrentPage(1); }, [searchTerm]);",
                   comp_body)

# Replace the return in IIFE
comp_body = re.sub(r'(return filtered\.map\(r => \()',
                   r'const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);\n                return paginated.map(r => (',
                   comp_body)

# Note: We need to also inject <Pagination> right after </table></div> of that specific table.
# The table is followed by </div></div> and then `{selectedElabRecord && (`
# Wait, let's just do a specific regex replace for the end of MagistralesForm's history table.
comp_body = re.sub(r'(</table>\s*</div>\s*</div>\s*)\{selectedElabRecord &&',
                   r'\1<Pagination currentPage={currentPage} totalItems={records.filter(r => r.type === \'magistrales\').filter(r => !searchTerm || String(r.nroCotizacion || \'\').toLowerCase().includes(searchTerm.toLowerCase()) || String(r.mvTratante || \'\').toLowerCase().includes(searchTerm.toLowerCase()) || String(r.nroAsignado || \'\').toLowerCase().includes(searchTerm.toLowerCase()) || formatDate(r.fecha).toLowerCase().includes(searchTerm.toLowerCase()) || String(r.preparador || \'\').toLowerCase().includes(searchTerm.toLowerCase())).length} pageSize={pageSize} onPageChange={setCurrentPage} />\n      {selectedElabRecord &&',
                   comp_body)

text = text.replace(comp_match.group(1), comp_body)

with open('src/views/LabView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("MagistralesForm fixed")
