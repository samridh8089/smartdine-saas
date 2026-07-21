const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'src/app/(dashboard)/dashboard/tables/page.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('plan') || line.toLowerCase().includes('starter') || line.toLowerCase().includes('tier')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
