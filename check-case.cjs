const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src').filter(f => f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.ts') || f.endsWith('.tsx'));
let bad = 0;

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const regex = /from\s+['"](\.[^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    let req = match[1];
    if (req.includes('?')) req = req.split('?')[0]; // handle query params
    const dir = path.dirname(f);
    const full = path.resolve(dir, req);
    try {
      // Find the actual file if it doesn't have an extension
      let exts = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx'];
      let found = false;
      let actualPath = '';
      for (let ext of exts) {
        if (fs.existsSync(full + ext)) {
          actualPath = full + ext;
          found = true;
          break;
        }
      }
      if (found) {
        const real = fs.realpathSync.native(actualPath);
        if (real !== actualPath) {
          console.log('Case mismatch in', f, ':', req, '(real:', real, ')');
          bad++;
        }
      }
    } catch (e) {
      console.log('Error checking', f, '->', req, e.message);
    }
  }
});
console.log('Bad imports:', bad);
