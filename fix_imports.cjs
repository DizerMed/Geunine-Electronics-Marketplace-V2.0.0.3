const fs = require('fs');

const files = [
  'src/components/admin/tabs/AdminOrdersTab.tsx',
  'src/components/admin/tabs/AdminStaffTab.tsx',
  'src/components/admin/tabs/AdminCustomersTab.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace("import {\nimport { customAlert, customConfirm } from '../../../utils/dialog';\n", "import { customAlert, customConfirm } from '../../../utils/dialog';\nimport {\n");
  code = code.replace("import {import { customAlert, customConfirm } from '../../../utils/dialog';", "import { customAlert, customConfirm } from '../../../utils/dialog';\nimport {");
  fs.writeFileSync(file, code);
}
console.log('Fixed imports');
