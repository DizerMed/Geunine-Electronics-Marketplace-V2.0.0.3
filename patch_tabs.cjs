const fs = require('fs');
const files = [
  'src/components/admin/tabs/AdminOrdersTab.tsx',
  'src/components/admin/tabs/AdminStaffTab.tsx',
  'src/components/admin/tabs/AdminCustomersTab.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // 1. Add showConfirm to Props interface
  code = code.replace(/showAlert: \(title: string, msg: string, type\?: any\) => void;/, "showAlert: (title: string, msg: string, type?: any) => void;\n  showConfirm?: (title: string, msg: string, onConfirm: () => void, type?: any) => void;");

  // 2. Add showConfirm to component destruction
  code = code.replace(/showAlert,\n  ensureOnline/, "showAlert,\n  showConfirm,\n  ensureOnline");

  // 3. Replace alert usages
  code = code.replace(/alert\('Upload error: ' \+ \(err\?\.message \|\| 'Failed to upload photo'\)\);/g, "showAlert('Upload error', err?.message || 'Failed to upload photo', 'error');");
  code = code.replace(/alert\('Password copied to clipboard!'\);/g, "showAlert('Success', 'Password copied to clipboard!', 'alert');");

  // 4. Replace confirm usages. We have a few specific ones.
  // AdminOrdersTab
  code = code.replace(/if \(window\.confirm\(`Delete \$\{selectedOrderIds\.length\} selected orders\?`\)\) \{([\s\S]*?)        \}/, 
    "if (showConfirm) {\n                        showConfirm('Delete Orders', `Delete ${selectedOrderIds.length} selected orders?`, async () => {$1        });\n                      }");
  code = code.replace(/if \(window\.confirm\('Are you sure you want to clear ALL online orders\?'\)\) \{([\s\S]*?)        \}/,
    "if (showConfirm) {\n                        showConfirm('Clear Orders', 'Are you sure you want to clear ALL online orders?', async () => {$1        });\n                      }");
  code = code.replace(/if \(window\.confirm\(`Delete order \$\{o\.id\}\?`\)\) \{([\s\S]*?)                                    \}/,
    "if (showConfirm) {\n                                  showConfirm('Delete Order', `Delete order ${o.id}?`, async () => {$1                                    });\n                                  }");

  // AdminStaffTab
  code = code.replace(/if \(confirm\(`Are you sure you want to remove staff member "\\\$\{st\.name\}"\? This action will revoke their login access immediately\.`\)\) \{([\s\S]*?)                                    \}/,
    "if (showConfirm) {\n                                      showConfirm('Remove Staff', `Are you sure you want to remove staff member \"\${st.name}\"? This action will revoke their login access immediately.`, async () => {$1                                    });\n                                    }");
  code = code.replace(/if \(confirm\(`Delete staff member \$\{st\.name\}\?`\)\) \{([\s\S]*?)                                            \}/,
    "if (showConfirm) {\n                                              showConfirm('Delete Staff', `Delete staff member ${st.name}?`, async () => {$1                                            });\n                                            }");
  code = code.replace(/if \(confirm\(`Are you sure you want to permanently delete staff member "\\\$\{st\.name\}" \(\\\$\{st\.email\}\)\? This action will revoke their login access immediately\.`\)\) \{([\s\S]*?)                        \}/,
    "if (showConfirm) {\n                          showConfirm('Delete Staff', `Are you sure you want to permanently delete staff member \"\${st.name}\" (\${st.email})? This action will revoke their login access immediately.`, async () => {$1                        });\n                        }");

  // AdminCustomersTab
  code = code.replace(/if \(confirm\(`Are you sure you want to delete customer account "\\\$\{cust\.name\}" \(\\\$\{cust\.email\}\)\? This action cannot be undone\.`\)\) \{([\s\S]*?)                                      \}/,
    "if (showConfirm) {\n                                        showConfirm('Delete Customer', `Are you sure you want to delete customer account \"\${cust.name}\" (\${cust.email})? This action cannot be undone.`, async () => {$1                                      });\n                                      }");

  fs.writeFileSync(file, code);
}
console.log('patched tabs');
