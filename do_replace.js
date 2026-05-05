import fs from 'fs';
let c = fs.readFileSync('src/views/SchoolView.tsx', 'utf-8');

c = c.replace(/<button[^>]*>\s*<Trash2[^>]*>\s*<\/button>/g, (match, p1, offset, string) => {
  // If it's near 'school_leads' or 'students', we check it
  return `<RecordActions onDelete={async () => {
    // will be replaced safely contextually
  }} />`;
});
// actually let's just do a string replace for the one we know.
c = c.replace(/<button[^>]*onClick=\{async \(\) => \{\s*if \(true\) \{\s*await localDB\.deleteFromCollection\('students', s\.id\);\s*alert\('Alumno eliminado\.'\);\s*\}\s*\}\}[^>]*>\s*<Trash2[^>]*>\s*<\/button>/g, `<RecordActions onDelete={async () => { await localDB.deleteFromCollection('students', s.id); }} />`);

fs.writeFileSync('src/views/SchoolView.tsx', c);
