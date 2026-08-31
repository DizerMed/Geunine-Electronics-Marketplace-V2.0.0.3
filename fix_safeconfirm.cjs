const fs = require('fs');

const files = ['src/components/POSSalesHistory.tsx', 'src/components/CategoryProductsPreviewModal.tsx'];
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/const safeConfirm = \(title: string, message: string, onConfirm: \(\) => void, type\?: 'confirm' \| 'warning'\) => \{/g, "const safeConfirm = async (title: string, message: string, onConfirm: () => void, type?: 'confirm' | 'warning') => {");
  fs.writeFileSync(file, code);
}
console.log('Fixed safeConfirm to be async');
