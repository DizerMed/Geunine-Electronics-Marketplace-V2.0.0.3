const fs = require('fs');

let code = fs.readFileSync('src/components/admin/tabs/AdminOrdersTab.tsx', 'utf8');

code = code.replace(
  /updateOrder\(\{\s*\.\.\.o,\s*paymentStatus: newPaymentStatus,\s*paidAmount: updatedPaidAmount,\s*outstandingBalance: Math\.max\(0, o\.totalAmount - \(updatedPaidAmount \|\| 0\)\)\s*\}\s*\}\}/,
  "updateOrder({\n                                    ...o,\n                                    paymentStatus: newPaymentStatus,\n                                    paidAmount: updatedPaidAmount,\n                                    outstandingBalance: Math.max(0, o.totalAmount - (updatedPaidAmount || 0))\n                                  });\n                                }\n                              }}"
);

fs.writeFileSync('src/components/admin/tabs/AdminOrdersTab.tsx', code);
console.log('Fixed updateOrder syntax');
