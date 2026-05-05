import fs from 'fs';
let c = fs.readFileSync('src/views/LabView.tsx', 'utf-8');

c = c.replace(/<button onClick=\{async \(\) => \{\s*if\(true\)\s*\{\s*await localDB\.deleteFromCollection\('lab_records',[^}]+;\s*const updated = await localDB\.getCollection\('lab_records'\);\s*setRecords\(updated\);\s*\}\s*\}\}[^>]*>\s*<Trash2[^>]*>\s*<\/button>/g, `<RecordActions onDelete={async () => { await localDB.deleteFromCollection('lab_records', r.id); const updated = await localDB.getCollection('lab_records'); setRecords(updated); }} />`);

c = c.replace(/<button onClick=\{async \(\) => \{\s*if\(true\)\s*\{\s*await localDB\.deleteFromCollection\('lab_records', record\.id\);\s*const updated = await localDB\.getCollection\('lab_records'\);\s*setRecords\(updated\);\s*\}\s*\}\}[^>]*>\s*<Trash2[^>]*>\s*<\/button>/g, `<RecordActions onDelete={async () => { await localDB.deleteFromCollection('lab_records', record.id); const updated = await localDB.getCollection('lab_records'); setRecords(updated); }} />`);

fs.writeFileSync('src/views/LabView.tsx', c);
