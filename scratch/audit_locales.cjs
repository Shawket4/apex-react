const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const enJsonPath = path.join(root, 'src/shared/i18n/locales/en.json');
const enJson = JSON.parse(fs.readFileSync(enJsonPath, 'utf8'));

function getNested(obj, key) {
  const parts = key.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

const usedKeys = new Set();
const walk = (dir) => {
  fs.readdirSync(dir).forEach((f) => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'node_modules' && !f.startsWith('.') && f !== 'scratch' && f !== 'dist' && f !== 'build') walk(p);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const content = fs.readFileSync(p, 'utf8');
      const matches = content.matchAll(/t\(['\"]([^'\"]+)['\"]/g);
      for (const m of matches) {
        usedKeys.add(m[1]);
      }
    }
  });
};

walk(root);

const missing = [];
for (const key of usedKeys) {
  if (key.includes('`') || key.includes('${')) continue; // Skip dynamic keys
  if (getNested(enJson, key) === undefined) {
    missing.push(key);
  }
}

console.log('Missing Keys:');
console.log(missing.sort().join('\n'));
