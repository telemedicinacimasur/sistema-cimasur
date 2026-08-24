import re

with open('src/views/LabView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add Pagination to Stock Insumos Diario
# It ends around:
#           </div>
#        </div>
#        <div className="bg-[#152035] rounded-2xl border border-[#1E293B] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)] mt-6">

stock_table_end = r"""           </div>
        </div>
        <div className="bg-\[#152035\]"""

replacement = r"""           </div>
        <Pagination currentPage={currentPage} totalItems={filteredRecords.length} pageSize={pageSize} onPageChange={setCurrentPage} />
        </div>
        <div className="bg-[#152035]"""

text = re.sub(stock_table_end, replacement, text, count=1)


# 2. Add Pagination State for Kardex
# We can just put it near the other pagination state
# `const [kardexSearchTerm, setKardexSearchTerm] = useState('');`
# is at line 3879

kardex_state_inject = r"  const \[kardexSearchTerm, setKardexSearchTerm\] = useState\(''\);"
kardex_state_repl = """  const [kardexSearchTerm, setKardexSearchTerm] = useState('');
  const [kardexCurrentPage, setKardexCurrentPage] = useState<number>(1);
  const kardexPageSize = 20;
  useEffect(() => { setKardexCurrentPage(1); }, [kardexSearchTerm, selectedArea]);"""
text = re.sub(kardex_state_inject, kardex_state_repl, text, count=1)


# 3. Extract Kardex logic to a variable and paginate
kardex_tbody = r"""                 <tbody className="divide-y divide-slate-200">
                    \{followups\.slice\(\)\.sort\(\(a, b\) => String\(b\.fecha \|\| ''\)\.localeCompare\(String\(a\.fecha \|\| ''\)\)\)\.filter\(f => \{
                       let match = f\.area === selectedArea;
                       if \(kardexSearchTerm\) \{
                          const s = kardexSearchTerm\.toLowerCase\(\);
                          const text = `\$\{f\.item \|\| ''\} \$\{f\.motivo \|\| ''\} \$\{formatDate\(f\.fecha\)\}`\.toLowerCase\(\);
                          if \(!text\.includes\(s\)\) match = false;
                       \}
                       return match;
                    \}\)\.map\(\(f: any, i: number\) => \("""

kardex_tbody_repl = """                 <tbody className="divide-y divide-slate-200">
                    {(() => {
                        const filtered = followups.slice().sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || ''))).filter(f => {
                           let match = f.area === selectedArea;
                           if (kardexSearchTerm) {
                              const s = kardexSearchTerm.toLowerCase();
                              const text = `${f.item || ''} ${f.motivo || ''} ${formatDate(f.fecha)}`.toLowerCase();
                              if (!text.includes(s)) match = false;
                           }
                           return match;
                        });
                        const paginated = filtered.slice((kardexCurrentPage - 1) * kardexPageSize, kardexCurrentPage * kardexPageSize);
                        return paginated.map((f: any, i: number) => ("""

text = re.sub(kardex_tbody, kardex_tbody_repl, text, count=1)

# 4. Add <Pagination /> to Kardex table end
kardex_table_end = r"""                    \{followups\.length === 0 && \(
                      <tr><td colSpan=\{6\} className="p-8 text-center text-slate-400 italic">No hay movimientos registrados\.</td></tr>
                    \)\}
                 </tbody>
              </table>
           </div>
        </div>
      </div>"""

kardex_table_end_repl = """                    {followups.filter(f => f.area === selectedArea).length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">No hay movimientos registrados.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
           <Pagination currentPage={kardexCurrentPage} totalItems={followups.slice().filter(f => {
                       let match = f.area === selectedArea;
                       if (kardexSearchTerm) {
                          const s = kardexSearchTerm.toLowerCase();
                          const text = `${f.item || ''} ${f.motivo || ''} ${formatDate(f.fecha)}`.toLowerCase();
                          if (!text.includes(s)) match = false;
                       }
                       return match;
                    }).length} pageSize={kardexPageSize} onPageChange={setKardexCurrentPage} />
        </div>
      </div>"""

text = re.sub(kardex_table_end, kardex_table_end_repl, text, count=1)


# Also there are multiple missing closing brackets/parentheses for the map in Kardex
# The original ended with:
#                     ))}
# Let's fix the map ending if needed.
# Original: `                    ))}`
kardex_map_end = r"                    \)\)\}"
kardex_map_end_repl = "                    ));\n                    })()}"
text = re.sub(kardex_map_end, kardex_map_end_repl, text, count=1)

with open('src/views/LabView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done")
