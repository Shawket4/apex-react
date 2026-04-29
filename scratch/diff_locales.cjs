const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const enPath = path.join(root, 'src/shared/i18n/locales/en.json');
const arPath = path.join(root, 'src/shared/i18n/locales/ar.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

function findMissing(enObj, arObj, prefix = '') {
  const missing = [];
  for (const key in enObj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (!(key in arObj)) {
      missing.push(fullKey);
    } else if (typeof enObj[key] === 'object' && enObj[key] !== null) {
      missing.push(...findMissing(enObj[key], arObj[key], fullKey));
    }
  }
  return missing;
}

const missing = findMissing(en, ar);
console.log('Missing in ar.json:');
console.log(missing.join('\n'));
