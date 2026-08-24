import re

with open('src/views/LabView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

comp_match = re.search(r'(function InsumosForm[\s\S]*?\n})', text)
comp_body = comp_match.group(1)

# Add pagination state
comp_body = re.sub(r'const \[searchTerm, setSearchTerm\] = useState\(\'\'\);',
                   r"const [searchTerm, setSearchTerm] = useState('');\n  const [currentPage, setCurrentPage] = useState<number>(1);\n  const pageSize = 20;\n  useEffect(() => { setCurrentPage(1); }, [searchTerm]);",
                   comp_body)

# Inject paginatedRecords
comp_body = re.sub(r'(\.sort\(\(a,b\) => String\(b\.fechaIngreso[\s\S]*?\)\);)',
                   r'\1\n  const paginatedRecords = filteredHistory.slice((currentPage - 1) * pageSize, currentPage * pageSize);',
                   comp_body)

# Replace map
comp_body = comp_body.replace('filteredHistory.map((r, idx) => (', 'paginatedRecords.map((r, idx) => (')

# Inject <Pagination>
comp_body = re.sub(r'(</table>\s*</div>)',
                   r'\1\n        <Pagination\n          currentPage={currentPage}\n          totalItems={filteredHistory.length}\n          pageSize={pageSize}\n          onPageChange={setCurrentPage}\n        />',
                   comp_body)

text = text.replace(comp_match.group(1), comp_body)

with open('src/views/LabView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("InsumosForm fixed")
