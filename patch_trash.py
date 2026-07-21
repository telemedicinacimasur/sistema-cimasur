import sys

file_path = 'src/views/admin/VentasConsignacionView.tsx'
with open(file_path, 'r') as f:
    content = f.read()

target = """  const handleRemoveProductFromMonthTemplate = async (loteId: string) => {
    console.log("Removing product:", loteId);
    if (!confirm("¿Está seguro de remover este producto de la planilla de este mes? El saldo y stock se recalcularán automáticamente.")) return;
    try {
      if (isFirebaseReady()) {
        const db = getDb();
        const movDocRef = doc(db, 'crm_consignacion_lotes', loteId, 'movimientos', selectedMonth);
        await deleteDoc(movDocRef);
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = localStorage.getItem(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          const idx = allLotes.findIndex((l: any) => l.id === loteId);
          if (idx !== -1 && allLotes[idx].movimientos) {
            delete allLotes[idx].movimientos[selectedMonth];
            localStorage.setItem(key, JSON.stringify(allLotes));
          }
        }
      }"""

new_code = """  const handleRemoveProductFromMonthTemplate = async (loteId: string) => {
    console.log("Removing product:", loteId);
    if (!confirm("¿Está seguro de remover este producto de la planilla de este mes?")) return;
    try {
      if (isFirebaseReady()) {
        const db = getDb();
        const movDocRef = doc(db, 'crm_consignacion_lotes', loteId, 'movimientos', selectedMonth);
        await setDoc(movDocRef, { hidden: true }, { merge: true });
      } else {
        const key = 'mock_consignacion_lotes';
        const existing = localStorage.getItem(key);
        if (existing) {
          const allLotes = JSON.parse(existing);
          const idx = allLotes.findIndex((l: any) => l.id === loteId);
          if (idx !== -1) {
            if (!allLotes[idx].movimientos) allLotes[idx].movimientos = {};
            allLotes[idx].movimientos[selectedMonth] = { hidden: true };
            localStorage.setItem(key, JSON.stringify(allLotes));
          }
        }
      }"""

content = content.replace(target, new_code)
with open(file_path, 'w') as f:
    f.write(content)
