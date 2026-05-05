import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'src', 'views');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Custom regex to match if(confirm(...)) { 
  // We need to keep the closing bracket inside the delete correctly or just remove it.
  // Actually, wait, if I just replace `if (confirm('...')) {` with `if (true) {` it's SAFER and won't break the brace matching!
  
  content = content.replace(/if\s*\(\s*window\.confirm\([^)]+\)\s*\)\s*\{/g, 'if (true) {');
  content = content.replace(/if\s*\(\s*confirm\([^)]+\)\s*\)\s*\{/g, 'if (true) {');
  
  fs.writeFileSync(filePath, content, 'utf-8');
}
console.log('Replaced confirm calls in views');
