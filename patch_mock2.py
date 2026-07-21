import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """  const clientLotes = allLotes.filter((l: any) => l.clienteId === clienteId);"""

new_code = """  const clientLotes = allLotes.filter((l: any) => {
    if (l.clienteId !== clienteId) return false;
    if (l.id && (l.id.startsWith('lote_arnica_') || l.id.startsWith('lote_sarsa_') || l.id.startsWith('lote_beil_') || l.id.startsWith('lote_sili_'))) return false;
    return true;
  });"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
