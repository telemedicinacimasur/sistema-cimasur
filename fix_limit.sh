sed -i 's/endDate: `${currentYear}-${pad(currentMonth + 1)}-${pad(lastDay)}`/endDate: `${currentYear}-${pad(currentMonth + 1)}-${pad(lastDay)}`, limitCount: -1/g' src/views/admin/SalesTiendaMLManager.tsx
sed -i 's/endDate: `${currentYear}-12-31`/endDate: `${currentYear}-12-31`, limitCount: -1/g' src/views/admin/SalesTiendaMLManager.tsx
