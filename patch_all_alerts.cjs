const fs = require('fs');

function processFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  let originalCode = code;
  
  const hasAlertOrConfirm = /window\.alert\(|alert\(|window\.confirm\(|confirm\(/.test(code);
  if (!hasAlertOrConfirm) return;

  // Add import if not present
  if (!code.includes("import { customAlert, customConfirm } from")) {
    // try to determine relative path to utils/dialog
    const depth = file.split('/').length - 2; // src/App.tsx -> 0, src/components/A.tsx -> 1, src/components/admin/A.tsx -> 2
    let prefix = './';
    if (depth > 0) {
      prefix = '../'.repeat(depth);
    }
    const importStmt = `import { customAlert, customConfirm } from '${prefix}utils/dialog';\n`;
    
    // insert after last import
    const lastImportIndex = code.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfImport = code.indexOf('\n', lastImportIndex);
      code = code.slice(0, endOfImport + 1) + importStmt + code.slice(endOfImport + 1);
    } else {
      code = importStmt + code;
    }
  }

  // AdminOrdersTab, AdminStaffTab, AdminCustomersTab specific patches
  // They are already inside async callbacks
  code = code.replace(/if \(window\.confirm\(`Delete order \$\{o\.id\}\?`\)\) \{/g, "if (await customConfirm(`Delete order ${o.id}?`, 'Delete Order')) {");
  code = code.replace(/if \(confirm\(`Are you sure you want to remove staff member "\\\$\{st\.name\}"\? This action will revoke their login access immediately\.`\)\) \{/g, "if (await customConfirm(`Are you sure you want to remove staff member \"${st.name}\"? This action will revoke their login access immediately.`, 'Remove Staff')) {");
  code = code.replace(/if \(confirm\(`Are you sure you want to permanently delete staff member "\\\$\{st\.name\}" \(\\\$\{st\.email\}\)\? This action will revoke their login access immediately\.`\)\) \{/g, "if (await customConfirm(`Are you sure you want to permanently delete staff member \"${st.name}\" (${st.email})? This action will revoke their login access immediately.`, 'Delete Staff')) {");
  code = code.replace(/if \(confirm\(`Are you sure you want to delete customer account "\\\$\{cust\.name\}" \(\\\$\{cust\.email\}\)\? This action cannot be undone\.`\)\) \{/g, "if (await customConfirm(`Are you sure you want to delete customer account \"${cust.name}\" (${cust.email})? This action cannot be undone.`, 'Delete Customer')) {");
  code = code.replace(/if \(!window\.confirm\('Are you sure you want to purge visitor logs older than 60 days \(2 months\)\? This will free up database space while preserving recent traffic data\.'\)\) \{/g, "if (!(await customConfirm('Are you sure you want to purge visitor logs older than 60 days (2 months)? This will free up database space while preserving recent traffic data.', 'Purge Logs'))) {");

  // AdminPortal: 12051 & 13805
  code = code.replace(/if \(window\.confirm\('Remove all gallery images\? The main front image will be preserved\.'\)\) \{/g, "if (await customConfirm('Remove all gallery images? The main front image will be preserved.', 'Remove Images')) {");
  code = code.replace(/if \(confirm\(`Are you sure you want to permanently delete customer profile "\\\$\{selectedCustomerForCrm\.name\}" \(\\\$\{selectedCustomerForCrm\.email\}\)\? This action cannot be undone\.`\)\) \{/g, "if (await customConfirm(`Are you sure you want to permanently delete customer profile \"${selectedCustomerForCrm.name}\" (${selectedCustomerForCrm.email})? This action cannot be undone.`, 'Delete Customer')) {");
  
  // App.tsx specific ones
  code = code.replace(/alert\(`Cannot add "\\\$\{product\.name\}" to cart: Item is out of stock \(0 available\)\.`\);/g, "customAlert(`Cannot add \"${product.name}\" to cart: Item is out of stock (0 available).`, 'Out of Stock');");
  code = code.replace(/alert\(`Failed to add staff: \$\{err instanceof Error \? err\.message : 'Unknown error'\}`\);/g, "customAlert(`Failed to add staff: ${err instanceof Error ? err.message : 'Unknown error'}`, 'Error', 'error');");
  code = code.replace(/alert\(`Failed to update staff: \$\{err instanceof Error \? err\.message : 'Unknown error'\}`\);/g, "customAlert(`Failed to update staff: ${err instanceof Error ? err.message : 'Unknown error'}`, 'Error', 'error');");
  code = code.replace(/alert\(`Failed to reset password: \$\{err instanceof Error \? err\.message : 'Unknown error'\}`\);/g, "customAlert(`Failed to reset password: ${err instanceof Error ? err.message : 'Unknown error'}`, 'Error', 'error');");
  code = code.replace(/alert\(`Failed to delete staff: \$\{err instanceof Error \? err\.message : 'Unknown error'\}`\);/g, "customAlert(`Failed to delete staff: ${err instanceof Error ? err.message : 'Unknown error'}`, 'Error', 'error');");
  code = code.replace(/alert\(`Failed to delete user: \$\{err instanceof Error \? err\.message : 'Unknown error'\}`\);/g, "customAlert(`Failed to delete user: ${err instanceof Error ? err.message : 'Unknown error'}`, 'Error', 'error');");

  // General alert replacements
  code = code.replace(/window\.alert\(/g, "customAlert(");
  code = code.replace(/alert\(/g, "customAlert(");
  
  if (code !== originalCode) {
    fs.writeFileSync(file, code);
    console.log(`Patched ${file}`);
  }
}

const filesToPatch = [
  'src/components/admin/tabs/AdminOrdersTab.tsx',
  'src/components/admin/tabs/AdminStaffTab.tsx',
  'src/components/admin/tabs/AdminCustomersTab.tsx',
  'src/components/POSSalesHistory.tsx',
  'src/components/CategoryProductsPreviewModal.tsx',
  'src/components/AdminVisitorAnalytics.tsx',
  'src/components/AdminPortal.tsx',
  'src/components/ClientProfileModal.tsx',
  'src/components/InvoiceGenerator.tsx',
  'src/components/POSReceiptModal.tsx',
  'src/components/ClientShop.tsx',
  'src/utils/share.ts',
  'src/App.tsx'
];

filesToPatch.forEach(processFile);
