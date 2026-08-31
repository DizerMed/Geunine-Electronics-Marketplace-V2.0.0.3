const fs = require('fs');
let code = fs.readFileSync('src/components/admin/tabs/AdminOrdersTab.tsx', 'utf8');

code = code.replace(
  /if \(await customConfirm\(`Delete \$\{selectedOrderIds\.length\} selected orders\?`, 'Delete Orders'\)\) \{\s*for \(const id of selectedOrderIds\) \{\s*await deleteOrder\(id\);\s*\}\s*setSelectedOrderIds\(\[\]\);\s*\}\);\s*\}/,
  "if (await customConfirm(`Delete ${selectedOrderIds.length} selected orders?`, 'Delete Orders')) {\n                        for (const id of selectedOrderIds) {\n                          await deleteOrder(id);\n                        }\n                        setSelectedOrderIds([]);\n                      }"
);

code = code.replace(
  /if \(await customConfirm\('Are you sure you want to clear ALL online orders\?', 'Clear Orders'\)\) \{\s*await clearOrders\(\);\s*setSelectedOrderIds\(\[\]\);\s*\}\);\s*\}/,
  "if (await customConfirm('Are you sure you want to clear ALL online orders?', 'Clear Orders')) {\n                        await clearOrders();\n                        setSelectedOrderIds([]);\n                      }"
);

code = code.replace(
  /if \(await customConfirm\(`Delete order \$\{o\.id\}\?`, 'Delete Order'\)\) \{\s*await deleteOrder\(o\.id\);\s*setSelectedOrderIds\(selectedOrderIds\.filter\(id => id !== o\.id\)\);\s*\}\);\s*\}/,
  "if (await customConfirm(`Delete order ${o.id}?`, 'Delete Order')) {\n                                    await deleteOrder(o.id);\n                                    setSelectedOrderIds(selectedOrderIds.filter(id => id !== o.id));\n                                  }"
);

fs.writeFileSync('src/components/admin/tabs/AdminOrdersTab.tsx', code);
console.log('Fixed admin orders syntax error');
