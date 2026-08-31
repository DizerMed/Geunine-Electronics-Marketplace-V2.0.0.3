const fs = require('fs');

const files = [
  'src/components/admin/tabs/AdminOrdersTab.tsx',
  'src/components/admin/tabs/AdminStaffTab.tsx',
  'src/components/admin/tabs/AdminCustomersTab.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // AdminOrdersTab
  code = code.replace(
    /if \(showConfirm\) \{\s*showConfirm\('Delete Orders', `Delete \$\{selectedOrderIds\.length\} selected orders\?`, async \(\) => \{([\s\S]*?)                        \}\);\s*\}/,
    "if (await customConfirm(`Delete ${selectedOrderIds.length} selected orders?`, 'Delete Orders')) {$1                      }"
  );
  code = code.replace(
    /if \(showConfirm\) \{\s*showConfirm\('Clear Orders', 'Are you sure you want to clear ALL online orders\?', async \(\) => \{([\s\S]*?)                        \}\);\s*\}/,
    "if (await customConfirm('Are you sure you want to clear ALL online orders?', 'Clear Orders')) {$1                      }"
  );

  // AdminStaffTab
  code = code.replace(
    /if \(showConfirm\) \{\s*showConfirm\('Delete Staff', `Delete staff member \$\{st\.name\}\?`, async \(\) => \{([\s\S]*?)                                              \}\);\s*\}/,
    "if (await customConfirm(`Delete staff member ${st.name}?`, 'Delete Staff')) {$1                                            }"
  );

  fs.writeFileSync(file, code);
}
console.log('Fixed tabs to use customConfirm');
