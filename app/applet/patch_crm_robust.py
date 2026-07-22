import sys

def patch_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Robust Category select value
    # We use a part of the line to avoid encoding issues with 'í'
    old_cat_val_part = "value={(() => { const current = r.categoria || 'Sin"
    # Find the end of that IIFE block
    start_idx = content.find(old_cat_val_part)
    if start_idx != -1:
        end_idx = content.find("})()}", start_idx) + 5
        if end_idx != -1:
            old_full = content[start_idx:end_idx]
            new_full = "value={CATEGORIAS.find(c => c.toLowerCase() === String(r.categoria || 'Sin categoría').toLowerCase()) || 'Sin categoría'}"
            content = content.replace(old_full, new_full)
    
    # Robust Intranet select value
    old_int_val = "value={r.intranet || 'No'}"
    new_int_val = "value={isApproved(r.intranet) ? 'Si' : 'No'}"
    content = content.replace(old_int_val, new_int_val)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    patch_file(sys.argv[1])
