const fs = require('fs');
let code = fs.readFileSync('src/lib/auth.ts', 'utf8');

const safeSet = `const safeSetLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || (e.message && e.message.toLowerCase().includes('quota')) || (e.message && e.message.toLowerCase().includes('exceeded'))) {
      console.warn('Local storage quota exceeded. Clearing cache to make room.');
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.includes('_limit_') || k.includes('_nolimit') || k.includes('undefined'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        localStorage.setItem(key, value);
      } catch (innerErr) {
        console.warn('Failed to save to local storage even after clearing cache.', innerErr);
      }
    } else {
      console.error('Error saving to local storage', e);
    }
  }
};
`;

if (!code.includes('safeSetLocalStorage')) {
  code = code.replace(/const saveToLocalStorage = /g, safeSet + '\nconst saveToLocalStorage = ');
}

code = code.replace(/localStorage\.setItem\((key),\s*JSON\.stringify\(\{\s*data,\s*timestamp:\s*Date\.now\(\)\s*\}\)\);/g, "safeSetLocalStorage($1, JSON.stringify({ data, timestamp: Date.now() }));");
code = code.replace(/localStorage\.setItem\((lsKey),\s*JSON\.stringify\(parsed\)\);/g, "safeSetLocalStorage($1, JSON.stringify(parsed));");

fs.writeFileSync('src/lib/auth.ts', code);
console.log('Patched setItem in auth.ts');
