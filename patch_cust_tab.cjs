const fs = require('fs');
const file = 'src/components/admin/tabs/AdminCustomersTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /showAlert\?: \(title: string, msg: string, type\?: any\) => void;/, 
  "showAlert?: (title: string, msg: string, type?: any) => void;\n  showConfirm?: (title: string, msg: string, onConfirm: () => void, type?: any) => void;"
);

code = code.replace(
  /showAlert,\n  resetCustomerPassword/, 
  "showAlert,\n  showConfirm,\n  resetCustomerPassword"
);

code = code.replace(
  /if \(confirm\(`Are you sure you want to delete customer account "\\\$\{cust\.name\}" \(\\\$\{cust\.email\}\)\? This action cannot be undone\.`\)\) \{([\s\S]*?)                                      \}/,
  "if (showConfirm) {\n                                        showConfirm('Delete Customer', `Are you sure you want to delete customer account \"\${cust.name}\" (\${cust.email})? This action cannot be undone.`, async () => {$1                                      });\n                                      }"
);

fs.writeFileSync(file, code);
