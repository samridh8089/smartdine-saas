const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'src/app/(dashboard)/dashboard/settings/page.tsx');
console.log('Reading file:', filePath);
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('disabled')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
