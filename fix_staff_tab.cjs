const fs = require('fs');

let staffTab = fs.readFileSync('src/components/admin/tabs/AdminStaffTab.tsx', 'utf8');
staffTab = staffTab.replace(
  /if \(showConfirm\) \{\s*showConfirm\('Delete Staff', `Delete staff member \$\{st\.name\}\?`, async \(\) => \{\s*if \(st\.avatar\) \{\s*await deleteStorageImage\(st\.avatar\);\s*\}\);\s*\}\s*deleteStaff\(st\.id\);\s*\}/,
  "if (showConfirm) {\n                                              showConfirm('Delete Staff', `Delete staff member ${st.name}?`, async () => {\n                                                if (st.avatar) {\n                                                  await deleteStorageImage(st.avatar);\n                                                }\n                                                deleteStaff(st.id);\n                                              });\n                                            }"
);
fs.writeFileSync('src/components/admin/tabs/AdminStaffTab.tsx', staffTab);
console.log('Fixed staff tab syntax errors');
