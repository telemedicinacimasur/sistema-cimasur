import re

with open('src/views/LabView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix 1: stock insumos map ending
text = text.replace("                    ));\n                    })()}\n                   {filteredRecords.length === 0", "                    ))}\n                   {filteredRecords.length === 0")

# Fix 2: Kardex map ending
kardex_map_end = r"                        </td>\n                      </tr>\n                    \)\)\}\n                    \{followups\.filter"
kardex_map_end_repl = r"                        </td>\n                      </tr>\n                    ));\n                    })()}\n                    {followups.filter"
text = re.sub(kardex_map_end, kardex_map_end_repl, text)


with open('src/views/LabView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
