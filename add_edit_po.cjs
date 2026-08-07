const fs = require('fs');

let content = fs.readFileSync('src/views/LabView.tsx', 'utf8');

// 1. Add editingPOId state
const stateBlock = /const \[purchaseOrders, setPurchaseOrders\] = useState<any\[\]>\(\[\]\);/;
const newStateBlock = `const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [editingPOId, setEditingPOId] = useState<string | null>(null);`;
content = content.replace(stateBlock, newStateBlock);

// 2. In Generar button: handle insert vs update
const saveLogic = /await localDB\.saveToCollection\('purchase_orders', newOrder\);/;
const newSaveLogic = `if (editingPOId) {
                      newOrder.id = editingPOId;
                      await localDB.updateInCollection('purchase_orders', editingPOId, newOrder);
                      if (user) await addAuditLog(user, \`Editó Orden de Compra: \${newOrder.area}\`, 'Laboratorio');
                      setEditingPOId(null);
                    } else {
                      await localDB.saveToCollection('purchase_orders', newOrder);
                      if (user) await addAuditLog(user, \`Generó Orden de Compra: \${newOrder.area}\`, 'Laboratorio');
                    }`;
content = content.replace(saveLogic, newSaveLogic);

// Remove the old audit log string (since we put it inside the new block)
const oldAuditLog = /\n\s*if \(user\) await addAuditLog\(user, `Generó Orden de Compra: \$\{newOrder\.area\}`\, 'Laboratorio'\);/;
content = content.replace(oldAuditLog, '');

// Reset editingPOId on open new
const openModalStr = /setShowPOModal\(true\);\n\s*setPoItems\(/;
const newOpenModalStr = `setEditingPOId(null);\n                  setShowPOModal(true);\n                  setPoItems(`;
content = content.replace(openModalStr, newOpenModalStr);

// Add Edit Button next to Delete button
const deleteBtnStr = /<Trash2 className="w-4 h-4" \/>\n\s*<\/button>\n\s*\)}\n\s*<button/;
const newDeleteBtnStr = `<Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => {
                                setEditingPOId(order.id);
                                setPoSelectedAreas(order.area === 'TODAS' ? ['TODAS'] : (order.area || '').split(', '));
                                setPoEncargado(order.encargado || 'ADMINISTRACION');
                                setPoItems(order.items || []);
                                setShowPOHistory(false);
                                setShowPOModal(true);
                              }}
                              className="text-sky-400 hover:text-sky-300 hover:bg-sky-400/10 p-1.5 rounded transition-colors"
                              title="Editar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                          )}
                          <button`;

content = content.replace(deleteBtnStr, newDeleteBtnStr);

// Modal Title should show Editing state
const modalTitle = /<h3 className="text-sm font-black text-white uppercase tracking-wider">Generar Orden de Compra<\/h3>/;
const newModalTitle = `<h3 className="text-sm font-black text-white uppercase tracking-wider">{editingPOId ? 'Editar Orden de Compra' : 'Generar Orden de Compra'}</h3>`;
content = content.replace(modalTitle, newModalTitle);

fs.writeFileSync('src/views/LabView.tsx', content);
