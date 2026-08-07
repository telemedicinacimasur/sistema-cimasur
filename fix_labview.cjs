const fs = require('fs');

let content = fs.readFileSync('src/views/LabView.tsx', 'utf8');

// 1. Add lucide-react imports
content = content.replace(/} from 'lucide-react';/, `  ChevronDown,\n  Check\n} from 'lucide-react';`);

// 2. Fix setPoSelectedArea(selectedArea) -> setPoSelectedAreas([selectedArea === 'TODAS' ? 'TODAS' : selectedArea])
content = content.replace(/setPoSelectedArea\(selectedArea\);/, `setPoSelectedAreas([selectedArea === 'TODAS' ? 'TODAS' : selectedArea]);`);

// 3. Fix error TS2339: Property 'id' does not exist on type '{ fecha: string; ... }'
// It occurs when doing `newOrder.id = editingPOId;`
const newOrderDef = /const newOrder = {/g;
const newOrderDefReplacement = `const newOrder: any = {`;
content = content.replace(newOrderDef, newOrderDefReplacement);

// 4. Missing area field in itemsToBuy mapping
const itemsToBuyMapping = /reposicion: ''\n\s*}\)\)\);/;
const itemsToBuyMappingReplacement = `reposicion: '',\n                      area: r.area || ''\n                    })));`;
content = content.replace(itemsToBuyMapping, itemsToBuyMappingReplacement);

fs.writeFileSync('src/views/LabView.tsx', content);
