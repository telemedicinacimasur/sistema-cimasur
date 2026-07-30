const fs = require('fs');
let code = fs.readFileSync('src/lib/auth.ts', 'utf8');

const oldSave = `const saveToLocalStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
};`;

const newSave = `const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || (e.message && e.message.includes('quota'))) {
      console.warn('Local storage quota exceeded. Clearing older cache to make room.');
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.includes('_limit_') || k.includes('_nolimit') || k.includes('undefined'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
      } catch (innerErr) {
        console.warn('Failed to save to local storage even after clearing cache.', innerErr);
      }
    } else {
      console.error('Error saving to local storage', e);
    }
  }
};`;

if (code.includes(oldSave)) {
  code = code.replace(oldSave, newSave);
  fs.writeFileSync('src/lib/auth.ts', code);
  console.log('Patched saveToLocalStorage');
} else {
  console.log('Could not find oldSave in src/lib/auth.ts');
}
