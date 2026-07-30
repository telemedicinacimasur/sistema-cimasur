sed -i 's/b.fecha.localeCompare(a.fecha)/String(b.fecha || "").localeCompare(String(a.fecha || ""))/g' src/views/GestionView.tsx
sed -i 's/b.fecha.localeCompare(a.fecha)/String(b.fecha || "").localeCompare(String(a.fecha || ""))/g' src/views/SchoolView.tsx
sed -i 's/b.fecha.localeCompare(a.fecha)/String(b.fecha || "").localeCompare(String(a.fecha || ""))/g' src/views/LabView.tsx
sed -i 's/b.fecha.localeCompare(a.fecha)/String(b.fecha || "").localeCompare(String(a.fecha || ""))/g' src/views/CRMView.tsx
sed -i 's/b.fechaImportacion.localeCompare(a.fechaImportacion)/String(b.fechaImportacion || "").localeCompare(String(a.fechaImportacion || ""))/g' src/views/CRMView.tsx
sed -i 's/a.productoId.localeCompare(b.productoId)/String(a.productoId || "").localeCompare(String(b.productoId || ""))/g' src/views/admin/VentasConsignacionView.tsx
sed -i 's/a.clientName.localeCompare(b.clientName)/String(a.clientName || "").localeCompare(String(b.clientName || ""))/g' src/views/admin/VentasConsignacionView.tsx
sed -i 's/a.solucionLote.localeCompare(b.solucionLote)/String(a.solucionLote || "").localeCompare(String(b.solucionLote || ""))/g' src/views/admin/VentasConsignacionView.tsx
