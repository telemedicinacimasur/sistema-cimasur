import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """          const loteData = {
            clienteId: item.clienteId,
            productoId: item.productoId,
            solucionLote: item.solucionLote,
            fechaVencimiento: item.fechaVencimiento,
            unidadesIniciales: item.unidadesIniciales,
            precioUnitNeto: item.precioUnitNeto,
            precioTotalNeto: totalVal,
            unidadesDisponibles: item.unidadesIniciales,
            mesesConsignados: 0,
            movimientos: {},
            createdAt: new Date().toISOString()
          };
          await db.collection('consignacion_lotes').add(loteData);
          successCount++;
        }
      } else {
        const key = `consignacion_lotes_${cid}`;
        const existing = localStorage.getItem(key);
        let allLotes = existing ? JSON.parse(existing) : [];"""

new_code = """          const loteData = {
            clienteId: item.clienteId,
            productoId: item.productoId,
            solucionLote: item.solucionLote,
            fechaVencimiento: item.fechaVencimiento,
            unidadesIniciales: item.unidadesIniciales,
            precioUnitNeto: item.precioUnitNeto,
            precioTotalNeto: totalVal,
            unidadesDisponibles: item.unidadesIniciales,
            mesesConsignados: 0,
            movimientos: {},
            createdAt: new Date().toISOString()
          };
          await addDoc(collection(db, 'crm_consignacion_lotes'), loteData);
          successCount++;
        }
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = localStorage.getItem(key);
        let allLotes = existing ? JSON.parse(existing) : [];"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
