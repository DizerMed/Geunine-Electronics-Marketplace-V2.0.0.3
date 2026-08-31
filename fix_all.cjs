const fs = require('fs');

let staff = fs.readFileSync('src/components/admin/tabs/AdminStaffTab.tsx', 'utf8');
staff = staff.replace(/confirm\(`Are you sure you want to remove staff member "\\\$\{st\.name\}"\? This action will revoke their login access immediately\.`\)/g, "await customConfirm(`Are you sure you want to remove staff member \"${st.name}\"? This action will revoke their login access immediately.`, 'Remove Staff')");
staff = staff.replace(/onClick=\{\(\) => \{\s*if \(await customConfirm/g, "onClick={async () => {\nif (await customConfirm");
staff = staff.replace(/confirm\(`Are you sure you want to permanently delete staff member "\\\$\{st\.name\}" \(\\\$\{st\.email\}\)\? This action will revoke their login access immediately\.`\)/g, "await customConfirm(`Are you sure you want to permanently delete staff member \"${st.name}\" (${st.email})? This action will revoke their login access immediately.`, 'Delete Staff')");
fs.writeFileSync('src/components/admin/tabs/AdminStaffTab.tsx', staff);

let cust = fs.readFileSync('src/components/admin/tabs/AdminCustomersTab.tsx', 'utf8');
cust = cust.replace(/confirm\(`Are you sure you want to delete customer account "\\\$\{cust\.name\}" \(\\\$\{cust\.email\}\)\? This action cannot be undone\.`\)/g, "await customConfirm(`Are you sure you want to delete customer account \"${cust.name}\" (${cust.email})? This action cannot be undone.`, 'Delete Customer')");
cust = cust.replace(/onClick=\{\(\) => \{\s*if \(await customConfirm/g, "onClick={async () => {\nif (await customConfirm");
fs.writeFileSync('src/components/admin/tabs/AdminCustomersTab.tsx', cust);

let pos = fs.readFileSync('src/components/POSSalesHistory.tsx', 'utf8');
pos = pos.replace(/\} else if \(window\.confirm\(message\)\) \{/g, "} else if (await customConfirm(message, title)) {");
fs.writeFileSync('src/components/POSSalesHistory.tsx', pos);

let cat = fs.readFileSync('src/components/CategoryProductsPreviewModal.tsx', 'utf8');
cat = cat.replace(/\} else if \(window\.confirm\(message\)\) \{/g, "} else if (await customConfirm(message, title)) {");
fs.writeFileSync('src/components/CategoryProductsPreviewModal.tsx', cat);

let portal = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');
portal = portal.replace(/confirm\(`Are you sure you want to permanently delete customer profile "\\\$\{selectedCustomerForCrm\.name\}" \(\\\$\{selectedCustomerForCrm\.email\}\)\? This action cannot be undone\.`\)/g, "await customConfirm(`Are you sure you want to permanently delete customer profile \"${selectedCustomerForCrm.name}\" (${selectedCustomerForCrm.email})? This action cannot be undone.`, 'Delete Customer')");
portal = portal.replace(/onClick=\{\(\) => \{\s*if \(await customConfirm/g, "onClick={async () => {\nif (await customConfirm");
fs.writeFileSync('src/components/AdminPortal.tsx', portal);

console.log('Fixed all confirms');
