const fs = require('fs');

const files = [
  'src/app/(dashboard)/dashboard/settings/page.tsx',
  'src/app/(dashboard)/dashboard/tables/page.tsx',
  'src/app/(dashboard)/dashboard/kds/page.tsx',
  'src/app/(dashboard)/dashboard/orders/page.tsx',
  'src/app/(customer)/order-tracking/[order_id]/page.tsx',
  'src/app/(dashboard)/dashboard/reports/page.tsx',
  'src/components/customer/CustomerMenu.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Look for numbers like 650, 655, 750, 850, 855, 955 in classes
    const match = line.match(/(emerald|purple|indigo|slate|amber|rose|teal|red|blue)-(55\b|105\b|155\b|255\b|355\b|455\b|650\b|655\b|750\b|850\b|855\b|955\b)/);
    if (match) {
      console.log(`${file} Line ${idx + 1}: ${line.trim()}`);
    }
  });
});
