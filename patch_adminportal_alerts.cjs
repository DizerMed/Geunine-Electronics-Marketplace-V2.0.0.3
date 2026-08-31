const fs = require('fs');
const file = 'src/components/AdminPortal.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace confirm customer delete
code = code.replace(
  /if \(confirm\(`Are you sure you want to permanently delete customer profile "\\\$\{selectedCustomerForCrm\.name\}" \(\\\$\{selectedCustomerForCrm\.email\}\)\? This action cannot be undone.`\)\) \{([\s\S]*?)\n\s*\}\n/g,
  `showConfirm(
    'Delete Customer',
    \`Are you sure you want to permanently delete customer profile "\${selectedCustomerForCrm.name}" (\${selectedCustomerForCrm.email})? This action cannot be undone.\`,
    () => {$1
    },
    'warning'
  );\n`
);

// Replace confirm remove gallery images
code = code.replace(
  /if \(window\.confirm\('Remove all gallery images\? The main front image will be preserved\.'\)\) \{\s*const updated = \{ \.\.\.editingProduct, gallery: \[\] \};\s*setEditingProduct\(updated\);\s*handleSaveProduct\(updated\);\s*\}/g,
  `showConfirm(
    'Remove Gallery Images',
    'Remove all gallery images? The main front image will be preserved.',
    () => {
      const updated = { ...editingProduct, gallery: [] };
      setEditingProduct(updated);
      handleSaveProduct(updated);
    },
    'warning'
  );`
);

// Replace standard alerts
code = code.replace(/alert\('All links copied to clipboard!'\);/g, "showAlert('Success', 'All links copied to clipboard!', 'alert');");
code = code.replace(/alert\('Confirmation string does not match\.'\);/g, "showAlert('Error', 'Confirmation string does not match.', 'error');");
code = code.replace(/alert\('Password copied to clipboard!'\);/g, "showAlert('Success', 'Password copied to clipboard!', 'alert');");

// Image upload alerts
code = code.replace(/alert\(err\.message \|\| 'Image upload failed'\);/g, "showAlert('Upload Failed', err.message || 'Image upload failed', 'error');");
code = code.replace(/alert\(err\.message \|\| 'Error uploading image'\);/g, "showAlert('Upload Failed', err.message || 'Error uploading image', 'error');");


fs.writeFileSync(file, code);
console.log('patched adminportal alerts');
