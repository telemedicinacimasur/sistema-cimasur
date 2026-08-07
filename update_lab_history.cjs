const fs = require('fs');

let content = fs.readFileSync('src/views/LabView.tsx', 'utf8');

// 1. Add audit log when saving
const saveBlock = `await localDB.saveToCollection('purchase_orders', newOrder);
                    
                    const updatedPOs = await localDB.getCollection('purchase_orders');
                    setPurchaseOrders(updatedPOs || []);`;

const newSaveBlock = `await localDB.saveToCollection('purchase_orders', newOrder);
                    if (user) await addAuditLog(user, \`Generó Orden de Compra: \${newOrder.area}\`, 'Laboratorio');
                    const updatedPOs = await localDB.getCollection('purchase_orders');
                    setPurchaseOrders(updatedPOs || []);`;

content = content.replace(saveBlock, newSaveBlock);

// 2. Add Delete Button in History view
const actionBlock = `<button
                            onClick={() => {
                              const isAll = order.area === 'TODAS';`;

const newActionBlock = `<div className="flex items-center justify-end gap-2">
                          {canDelete && (
                            <button
                              onClick={async () => {
                                if (window.confirm('¿Está seguro de eliminar esta Orden de Compra?')) {
                                  try {
                                    await localDB.deleteFromCollection('purchase_orders', order.id);
                                    if (user) await addAuditLog(user, \`Eliminó Orden de Compra: \${order.area}\`, 'Laboratorio');
                                    const updatedPOs = await localDB.getCollection('purchase_orders');
                                    setPurchaseOrders(updatedPOs || []);
                                  } catch(e) {
                                    console.error(e);
                                  }
                                }
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1.5 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const isAll = order.area === 'TODAS';`;

content = content.replace(actionBlock, newActionBlock);

// We need to close the div added in the newActionBlock
const downloadBtnClose = `</span>\n                            Descargar\n                          </button>\n                        </td>`;
const newDownloadBtnClose = `</span>\n                            Descargar\n                          </button>\n                          </div>\n                        </td>`;

content = content.replace(downloadBtnClose, newDownloadBtnClose);

fs.writeFileSync('src/views/LabView.tsx', content);
