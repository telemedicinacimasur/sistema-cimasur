import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """      } else {
        const key = 'mock_consignacion_lotes';
        const existing = localStorage.getItem(key);
        if (existing) {
          setTodosLosLotes(JSON.parse(existing));
        } else {
          const demoLotes: any[] = [];
          const demoClients = ["demo_1", "demo_2", "demo_3"];
          demoClients.forEach(cId => {
            const clientLotes = getMockLotesForClient(cId);
            demoLotes.push(...clientLotes);
          });
          setTodosLosLotes(demoLotes);
        }
      }"""

new_code = """      } else {
        const key = 'mock_consignacion_lotes';
        const existing = localStorage.getItem(key);
        if (existing) {
          let allLotes = JSON.parse(existing);
          // Cleanup dummy data
          allLotes = allLotes.filter((l: any) => l.clienteId && !l.clienteId.startsWith('demo_'));
          localStorage.setItem(key, JSON.stringify(allLotes));
          setTodosLosLotes(allLotes);
        } else {
          setTodosLosLotes([]);
        }
      }"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
