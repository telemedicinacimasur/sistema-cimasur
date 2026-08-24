import re

with open('src/views/LabView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove the incorrectly placed paginatedRecords block
wrong_block = r"  const \[currentPage, setCurrentPage\] = useState<number>\(1\);\n  const pageSize = 20;\n  useEffect\(\(\) => \{ setCurrentPage\(1\); \}, \[selectedArea, searchTerm, kardexSearchTerm\]\);\n  const paginatedRecords = filteredRecords\.slice\(\(currentPage - 1\) \* pageSize, currentPage \* pageSize\);\n"
text = re.sub(wrong_block, '', text)

# Now put it below the filteredRecords definition
correct_spot = r"(const filteredRecords = inventoryRecords\.filter\([\s\S]*?\n\s*\};\n)"
text = re.sub(correct_spot, r"\1  const [currentPage, setCurrentPage] = useState<number>(1);\n  const pageSize = 20;\n  useEffect(() => { setCurrentPage(1); }, [selectedArea, searchTerm, kardexSearchTerm]);\n  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);\n", text)

with open('src/views/LabView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
