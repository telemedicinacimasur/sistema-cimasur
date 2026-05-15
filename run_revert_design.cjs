const fs = require('fs');
const path = require('path');

const replacements = [
  // Backgrounds - Return to original light theme elements
  { regex: /bg-\[#0D1527\]/g, replacement: 'bg-[#F8FAFC]' },
  { regex: /bg-\[#152035\]/g, replacement: 'bg-white' },
  { regex: /bg-\[#111A2E\]/g, replacement: 'bg-[#F1F5F9]' },
  { regex: /bg-\[#1E293B\]/g, replacement: 'bg-[#E2E8F0]' },

  // Borders - Return to light theme
  { regex: /border-\[#1E293B\]/g, replacement: 'border-slate-200' },
  { regex: /border-\[#1E3A5F\]/g, replacement: 'border-slate-200' },

  // Divide - Return to light theme
  { regex: /divide-\[#1E293B\]/g, replacement: 'divide-slate-200' },

  // Text colors - Return to light theme
  { regex: /text-white/g, replacement: 'text-[#1E293B]' },
  { regex: /text-slate-200/g, replacement: 'text-[#334155]' },
  { regex: /text-slate-300/g, replacement: 'text-[#475569]' },
  { regex: /text-slate-400/g, replacement: 'text-[#64748B]' },
  
  // Specific UI adjustments for text that should be dark
  { regex: /text-\[#38BDF8\]/g, replacement: 'text-[#1E3A5F]' },
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
