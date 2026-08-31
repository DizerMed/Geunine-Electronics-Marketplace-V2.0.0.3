const fs = require('fs');

// AdminOrdersTab
let ordersTab = fs.readFileSync('src/components/admin/tabs/AdminOrdersTab.tsx', 'utf8');
ordersTab = ordersTab.replace(
  /if \(showConfirm\) \{\s*showConfirm\('Delete Orders', `Delete \$\{selectedOrderIds\.length\} selected orders\?`, async \(\) => \{\s*for \(const id of selectedOrderIds\) \{\s*await deleteOrder\(id\);\s*\}\);\s*\}\s*setSelectedOrderIds\(\[\]\);\s*\}/,
  "if (showConfirm) {\n                        showConfirm('Delete Orders', `Delete ${selectedOrderIds.length} selected orders?`, async () => {\n                          for (const id of selectedOrderIds) {\n                            await deleteOrder(id);\n                          }\n                          setSelectedOrderIds([]);\n                        });\n                      }"
);
ordersTab = ordersTab.replace(
  /if \(showConfirm\) \{\s*showConfirm\('Clear Orders', 'Are you sure you want to clear ALL online orders\?', async \(\) => \{\s*await clearOrders\(\);\s*\}\);\s*\}\s*setSelectedOrderIds\(\[\]\);\s*\}/,
  "if (showConfirm) {\n                        showConfirm('Clear Orders', 'Are you sure you want to clear ALL online orders?', async () => {\n                          await clearOrders();\n                          setSelectedOrderIds([]);\n                        });\n                      }"
);
ordersTab = ordersTab.replace(
  /if \(showConfirm\) \{\s*showConfirm\('Delete Order', `Delete order \$\{o\.id\}\?`, async \(\) => \{\s*await deleteOrder\(o\.id\);\s*\}\);\s*\}\s*setSelectedOrderIds\(selectedOrderIds\.filter\(id => id !== o\.id\)\);\s*\}/,
  "if (showConfirm) {\n                                  showConfirm('Delete Order', `Delete order ${o.id}?`, async () => {\n                                    await deleteOrder(o.id);\n                                    setSelectedOrderIds(selectedOrderIds.filter(id => id !== o.id));\n                                  });\n                                }"
);
fs.writeFileSync('src/components/admin/tabs/AdminOrdersTab.tsx', ordersTab);

// AdminStaffTab
let staffTab = fs.readFileSync('src/components/admin/tabs/AdminStaffTab.tsx', 'utf8');
staffTab = staffTab.replace(
  /if \(showConfirm\) \{\s*showConfirm\('Delete Staff', `Delete staff member \$\{st\.name\}\?`, async \(\) => \{\s*await deleteStaff\(st\.id\);\s*\}\);\s*\}\s*\}/,
  "if (showConfirm) {\n                                              showConfirm('Delete Staff', `Delete staff member ${st.name}?`, async () => {\n                                                await deleteStaff(st.id);\n                                              });\n                                            }"
);
fs.writeFileSync('src/components/admin/tabs/AdminStaffTab.tsx', staffTab);
console.log('Fixed syntax errors');
