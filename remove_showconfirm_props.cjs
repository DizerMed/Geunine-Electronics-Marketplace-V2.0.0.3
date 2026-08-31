const fs = require('fs');

const files = [
  'src/components/admin/tabs/AdminOrdersTab.tsx',
  'src/components/admin/tabs/AdminStaffTab.tsx',
  'src/components/admin/tabs/AdminCustomersTab.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/  showConfirm\?: \(title: string, msg: string, onConfirm: \(\) => void, type\?: any\) => void;\n/, '');
  code = code.replace(/  showConfirm,\n/, '');
  fs.writeFileSync(file, code);
}
console.log('Removed showConfirm props');
