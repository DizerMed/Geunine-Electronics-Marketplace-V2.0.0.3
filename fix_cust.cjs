const fs = require('fs');
let code = fs.readFileSync('src/components/admin/tabs/AdminCustomersTab.tsx', 'utf8');

code = code.replace(
  /onClick=\{\(\) => \{\s*if \(confirm\(`Are you sure you want to delete customer account "\\\$\{cust\.name\}" \(\\\$\{cust\.email\}\)\? This action cannot be undone\.`\)\) \{/g,
  "onClick={async () => {\n                                      if (await customConfirm(`Are you sure you want to delete customer account \"${cust.name}\" (${cust.email})? This action cannot be undone.`, 'Delete Customer')) {"
);

fs.writeFileSync('src/components/admin/tabs/AdminCustomersTab.tsx', code);
console.log('Fixed cust');
