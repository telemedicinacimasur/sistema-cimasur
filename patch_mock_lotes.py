import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """  if (clientLotes.length === 0) {
    const seed = ["""

end_target = """    ];
    allLotes.push(...seed);
    localStorage.setItem(key, JSON.stringify(allLotes));
    return seed;
  }
  
  return clientLotes;
};"""

start_idx = content.find(target)
end_idx = content.find(end_target)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + "  return clientLotes;\n};\n" + content[end_idx + len(end_target):]
    with open(file_path, 'w') as f:
        f.write(content)
else:
    print("Could not find block")
