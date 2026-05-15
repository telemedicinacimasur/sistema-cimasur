const fs = require('fs');
const path = require('path');

const replacements = [
  // Backgrounds
  { regex: /bg-white\/90/g, replacement: 'bg-[#152035]/90' },
  { regex: /bg-white\/80/g, replacement: 'bg-[#0D1527]/80' },
  { regex: /bg-white\/50/g, replacement: 'bg-[#152035]/50' },
  { regex: /bg-white\/40/g, replacement: 'bg-[#1E293B]' },
  { regex: /bg-white\/30/g, replacement: 'bg-[#1E293B]/50' },
  { regex: /bg-white\/10/g, replacement: 'bg-[#1E293B]/80' },
  { regex: /bg-white\/5/g, replacement: 'bg-[#1E293B]/30' },
  { regex: /bg-white(?![A-Za-z0-9_-])/g, replacement: 'bg-[#152035]' },
  { regex: /bg-white0(?![A-Za-z0-9_-])/g, replacement: 'bg-[#152035]' },
  { regex: /bg-\[#F8FAFC\]/g, replacement: 'bg-[#0D1527]' }, 
  { regex: /bg-\[#F1F5F9\]/g, replacement: 'bg-[#111A2E]' },
  { regex: /bg-\[#E2E8F0\]/g, replacement: 'bg-[#1E293B]' },
  { regex: /bg-\[#0B0F19\]/g, replacement: 'bg-[#0D1527]' },
  { regex: /bg-\[#161B22\]/g, replacement: 'bg-[#152035]' },
  { regex: /bg-\[#111827\]/g, replacement: 'bg-[#111A2E]' },
  { regex: /bg-\[#1F2937\]/g, replacement: 'bg-[#1E293B]' },
  { regex: /bg-\[#0F172A\]/g, replacement: 'bg-[#0D1527]' },
  { regex: /bg-\[#162134\]/g, replacement: 'bg-[#152035]' },
  { regex: /bg-slate-50/g, replacement: 'bg-[#0D1527]' },
  { regex: /bg-slate-100/g, replacement: 'bg-[#111A2E]' },
  { regex: /bg-indigo-50/g, replacement: 'bg-[#111A2E]' },

  // Borders
  { regex: /border-\[#1E3A5F\]/g, replacement: 'border-[#1E293B]' },
  { regex: /border-\[#1F2937\]/g, replacement: 'border-[#1E293B]' },
  { regex: /border-slate-100/g, replacement: 'border-[#1E293B]' },
  { regex: /border-slate-200/g, replacement: 'border-[#1E293B]' },
  { regex: /border-slate-300/g, replacement: 'border-[#1E293B]' },
  { regex: /border-white\/10/g, replacement: 'border-[#1E293B]' },
  { regex: /border-white\/5/g, replacement: 'border-[#1E293B]/50' },

  // Divide
  { regex: /divide-\[#1E3A5F\]/g, replacement: 'divide-[#1E293B]' },
  { regex: /divide-\[#1F2937\]/g, replacement: 'divide-[#1E293B]' },

  // Texts
  { regex: /text-\[#1E3A5F\]/g, replacement: 'text-[#38BDF8]' }, // Or white? Most were headers, let's use white for text-[#1E293B]
  { regex: /text-\[#1E293B\]/g, replacement: 'text-white' },
  { regex: /text-\[#334155\]/g, replacement: 'text-slate-200' },
  { regex: /text-\[#475569\]/g, replacement: 'text-slate-300' },
  { regex: /text-\[#64748B\]/g, replacement: 'text-slate-400' },
  { regex: /text-\[#94A3B8\]/g, replacement: 'text-slate-400' },
  { regex: /text-\[#CBD5E1\]/g, replacement: 'text-slate-300' },
  { regex: /text-\[#F3F4F6\]/g, replacement: 'text-white' },

  // Hovers
  { regex: /hover:bg-\[#F1F5F9\]/g, replacement: 'hover:bg-[#1E293B]' },
  { regex: /hover:bg-\[#E2E8F0\]/g, replacement: 'hover:bg-[#1E293B]' },
  { regex: /hover:bg-\[#111827\]/g, replacement: 'hover:bg-[#1E293B]' },
  { regex: /hover:bg-\[#1F2937\]/g, replacement: 'hover:bg-[#1E293B]' },
  { regex: /hover:text-\[#1E3A5F\]/g, replacement: 'hover:text-white' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  for (const { regex, replacement } of replacements) {
    content = content.replace(regex, replacement);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

const ignoreDirs = ['node_modules', 'dist'];
const findFiles = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!ignoreDirs.includes(file)) {
        findFiles(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

findFiles('./src');
