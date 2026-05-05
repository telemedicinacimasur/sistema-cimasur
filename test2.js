import fs from 'fs';
const content = fs.readFileSync('src/views/SchoolView.tsx', 'utf-8');
const oldText = `<button 
                             onClick={async () => {
                               if (true) {
                                 await localDB.deleteFromCollection('students', s.id);
                                 alert('Alumno eliminado.');
                               }
                             }} 
                             className="text-red-400 hover:text-red-600"
                           >
                              <Trash2 className="w-3.5 h-3.5" />
                           </button>`;
// Try to find index
const i = content.indexOf(`deleteFromCollection('students', s.id)`);
if (i !== -1) {
  console.log(content.substring(i - 150, i + 150));
}
