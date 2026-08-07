const fs = require('fs');

let content = fs.readFileSync('src/views/LabView.tsx', 'utf8');

const selectBlock = /<FormField label="Área de Reposición">[\s\S]*?<\/select>\s*<\/FormField>/;

const newSelectBlock = `<FormField label="Áreas de Reposición">
                  <div className="relative">
                    <button 
                      type="button"
                      onClick={() => setIsAreaDropdownOpen(!isAreaDropdownOpen)}
                      className="w-full bg-[#111A2E] text-white border border-[#1E293B] rounded-xl px-3 py-2 text-xs outline-none text-left flex justify-between items-center"
                    >
                      <span className="truncate">
                        {poSelectedAreas.includes('TODAS') 
                          ? 'Todas las Áreas' 
                          : poSelectedAreas.length > 0 
                            ? poSelectedAreas.join(', ') 
                            : 'Seleccionar Área...'}
                      </span>
                      <ChevronDown size={14} className="text-slate-400" />
                    </button>
                    
                    {isAreaDropdownOpen && (
                      <div className="absolute z-10 top-full mt-1 w-full bg-[#111A2E] border border-[#1E293B] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        <div 
                          className="px-3 py-2 border-b border-[#1E293B] hover:bg-[#15233C] cursor-pointer flex items-center gap-2"
                          onClick={() => {
                            const newAreas = ['TODAS'];
                            setPoSelectedAreas(newAreas);
                            const itemsForNewArea = inventoryRecords.filter(r => (Number(r.qty) || 0) <= getRecordAlertaThreshold(r));
                            setPoItems(itemsForNewArea.map(r => ({
                              id: r.id, item: r.item || '', code: r.code || '', qty: r.qty || '0', alerta: getRecordAlertaThreshold(r), area: r.area || '', reposicion: ''
                            })));
                          }}
                        >
                          <div className={\`w-4 h-4 rounded flex items-center justify-center border \${poSelectedAreas.includes('TODAS') ? 'bg-sky-500 border-sky-500' : 'border-[#1E293B] bg-[#0A101F]'}\`}>
                            {poSelectedAreas.includes('TODAS') && <Check size={12} className="text-white" />}
                          </div>
                          <span className="text-xs font-bold text-sky-400">TODAS LAS ÁREAS</span>
                        </div>
                        
                        {areas.map(a => {
                          const isSelected = !poSelectedAreas.includes('TODAS') && poSelectedAreas.includes(a);
                          return (
                            <div 
                              key={a}
                              className="px-3 py-2 border-b border-[#1E293B]/50 hover:bg-[#15233C] cursor-pointer flex items-center gap-2"
                              onClick={() => {
                                let newAreas = [...poSelectedAreas];
                                if (newAreas.includes('TODAS')) {
                                  newAreas = [a];
                                } else {
                                  if (isSelected) {
                                    newAreas = newAreas.filter(area => area !== a);
                                  } else {
                                    newAreas.push(a);
                                  }
                                }
                                if (newAreas.length === 0) newAreas = ['TODAS'];
                                setPoSelectedAreas(newAreas);
                                
                                const itemsForNewArea = inventoryRecords.filter(r => 
                                  (newAreas.includes('TODAS') || newAreas.includes(r.area)) && 
                                  (Number(r.qty) || 0) <= getRecordAlertaThreshold(r)
                                );
                                setPoItems(itemsForNewArea.map(r => ({
                                  id: r.id, item: r.item || '', code: r.code || '', qty: r.qty || '0', alerta: getRecordAlertaThreshold(r), area: r.area || '', reposicion: ''
                                })));
                              }}
                            >
                              <div className={\`w-4 h-4 rounded flex items-center justify-center border \${isSelected ? 'bg-sky-500 border-sky-500' : 'border-[#1E293B] bg-[#0A101F]'}\`}>
                                {isSelected && <Check size={12} className="text-white" />}
                              </div>
                              <span className="text-xs text-slate-300">{a}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </FormField>`;

content = content.replace(selectBlock, newSelectBlock);

// Replace remaining instances of poSelectedArea
content = content.replace(/poSelectedArea === 'TODAS'/g, "poSelectedAreas.includes('TODAS')");
content = content.replace(/poSelectedArea !== 'TODAS'/g, "!poSelectedAreas.includes('TODAS')");
content = content.replace(/area: poSelectedArea,/g, "area: poSelectedAreas.includes('TODAS') ? 'TODAS' : poSelectedAreas.join(', '),");
content = content.replace(/poSelectedArea\.toLowerCase\(\)/g, "(poSelectedAreas.includes('TODAS') ? 'todas' : poSelectedAreas.join('_')).toLowerCase()");
content = content.replace(/poSelectedArea\.toUpperCase\(\)/g, "poSelectedAreas.join(', ').toUpperCase()");

fs.writeFileSync('src/views/LabView.tsx', content);
