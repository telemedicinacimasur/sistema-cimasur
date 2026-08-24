with open('src/views/LabView.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# find the wrong injection
wrong_idx = -1
for i, line in enumerate(lines):
    if "const [currentPage, setCurrentPage] = useState<number>(1);" in line and "const pageSize = 20;" in lines[i+1] and "const paginatedRecords = filteredRecords" in lines[i+3]:
        wrong_idx = i
        break

if wrong_idx != -1:
    del lines[wrong_idx:wrong_idx+4]

# insert in correct spot
for i, line in enumerate(lines):
    if "const filteredRecords = inventoryRecords.filter(" in line:
        # find the end of this statement
        for j in range(i, len(lines)):
            if "}).sort(" in lines[j] and "));" in lines[j]:
                lines.insert(j+1, "  const [currentPage, setCurrentPage] = useState<number>(1);\n  const pageSize = 20;\n  useEffect(() => { setCurrentPage(1); }, [selectedArea, searchTerm, kardexSearchTerm]);\n  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);\n")
                break
        break

with open('src/views/LabView.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
