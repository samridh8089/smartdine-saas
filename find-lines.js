const fs = require('fs');

function findLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('purple-650') || line.includes('purple-655')) {
      console.log(`${filePath} Line ${idx + 1}: ${line.trim()}`);
    }
  });
}

findLines('src/app/(dashboard)/dashboard/settings/page.tsx');
findLines('src/components/customer/CustomerMenu.tsx');
