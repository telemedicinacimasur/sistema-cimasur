import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """  const handleRemoveProductFromMonthTemplate = async (loteId: string) => {
    console.log("Removing product:", loteId);
    if (!confirm("¿Está seguro de remover este producto de la planilla de este mes?")) return;
    try {"""

new_code = """  const handleRemoveProductFromMonthTemplate = async (loteId: string) => {
    console.log("Removing product:", loteId);
    try {"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
