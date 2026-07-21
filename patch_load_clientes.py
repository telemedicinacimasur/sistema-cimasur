import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """      const contacts = await localDB.getCollection('consignacion_clientes');
      contacts.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      
      if (contacts.length === 0) {
        const defaultClients: any[] = [];
        for (const dc of defaultClients) {
          await localDB.saveToCollection('consignacion_clientes', dc);
        }
        setClientes(defaultClients);
      } else {
        setClientes(contacts);
      }"""

new_code = """      const contacts = await localDB.getCollection('consignacion_clientes');
      
      // Cleanup any mock/demo clients that were previously seeded
      for (const c of contacts) {
        if (c.id && c.id.startsWith('demo_')) {
          await localDB.deleteFromCollection('consignacion_clientes', c.id);
        }
      }
      
      const realContacts = contacts.filter((c: any) => c.id && !c.id.startsWith('demo_'));
      realContacts.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      
      setClientes(realContacts);"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
