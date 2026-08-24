import re

with open('src/views/LabView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

forms = [
    {'name': 'GotasPurasForm', 'type': 'gotas-puras'},
    {'name': 'ElaboracionForm', 'type': 'elaboracion'},
    {'name': 'NosodesForm', 'type': 'nosodes'},
    {'name': 'PreparacionForm', 'type': 'preparacion'},
    {'name': 'TinturasMadresForm', 'type': 'tinturas'},
    {'name': 'InsumosForm', 'type': 'insumos'},
    {'name': 'VademecumForm', 'type': 'vademecum'},
    {'name': 'MantenimientoForm', 'type': 'mantenimiento'},
    {'name': 'MagistralesForm', 'type': 'magistrales'},
]

for form in forms:
    comp_name = form['name']
    f_type = form['type']
    
    # We find the component bounds
    comp_match = re.search(r'(function ' + comp_name + r'[\s\S]*?\n})', text)
    if not comp_match:
        print(f"Component {comp_name} not found")
        continue
    comp_body = comp_match.group(1)
    
    # Find the filter logic inside tbody
    # We look for: {records.filter(r => r.type === 'XYZ').filter(r => { ... }).sort(...).map(
    # Wait, some components don't have .sort() or .filter(), let's make it flexible.
    # It starts with: \{records\.filter\(r => r\.type === 'XYZ'\)(.*?)\.map\(([a-zA-Z0-9_]+) => \(
    
    # Actually, the string we want to extract is from `records.filter(r => r.type === 'XYZ')` until `.map`
    match_chain = re.search(r'\{((records|filteredHistory)\.filter\(r => r\.type === \'' + f_type + r'\'\)[\s\S]*?)\.map\(([\s\S]*?) => \(', comp_body)
    if not match_chain:
        print(f"Chain not found in {comp_name}")
        continue
        
    chain = match_chain.group(1).strip()
    var_name = match_chain.group(3).strip()
    if var_name.startswith('('):
        var_name = var_name[1:].split(',')[0].strip() # in case it's (record, index)
    
    # We will inject this before the `return (`
    injection = f"""
  const filteredRecordsList = {chain};
  const paginatedRecords = filteredRecordsList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
"""
    # Find the last `return (` in the component body
    last_return_idx = comp_body.rfind('  return (')
    if last_return_idx == -1:
        last_return_idx = comp_body.rfind('return (')
    
    if last_return_idx != -1:
        comp_body = comp_body[:last_return_idx] + injection + comp_body[last_return_idx:]
    
    # Now replace the chain in the JSX with `paginatedRecords`
    comp_body = comp_body.replace('{' + chain + '.map(', '{paginatedRecords.map(')
    
    # Now inject <Pagination> right after </table></div>
    # Find the </table></div> inside the return
    comp_body = re.sub(r'(</table>\s*</div>)', r'\1\n        <Pagination\n          currentPage={currentPage}\n          totalItems={filteredRecordsList.length}\n          pageSize={pageSize}\n          onPageChange={setCurrentPage}\n        />', comp_body)
    
    # Put the modified component back into text
    text = text.replace(comp_match.group(1), comp_body)

with open('src/views/LabView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Done")
