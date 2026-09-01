import fs from 'fs';
let code = fs.readFileSync('src/components/ClientShop.tsx', 'utf8');

const replacements = [
  {
    find: /<ProductDetailPage[\s\S]*?\/>/,
    replace: (match) => `<React.Suspense fallback={null}>\n${match}\n</React.Suspense>`
  },
  {
    find: /<InvoicePrintModal[\s\S]*?\/>/,
    replace: (match) => `<React.Suspense fallback={null}>\n${match}\n</React.Suspense>`
  },
  {
    find: /<POSReceiptModal[\s\S]*?\/>/,
    replace: (match) => `<React.Suspense fallback={null}>\n${match}\n</React.Suspense>`
  },
  {
    find: /<ProductCompareModal[\s\S]*?\/>/,
    replace: (match) => `<React.Suspense fallback={null}>\n${match}\n</React.Suspense>`
  },
  {
    find: /<ExpressBuyDrawer[\s\S]*?\/>/,
    replace: (match) => `<React.Suspense fallback={null}>\n${match}\n</React.Suspense>`
  },
  {
    find: /<ReceiptVerificationModal[\s\S]*?\/>/,
    replace: (match) => `<React.Suspense fallback={null}>\n${match}\n</React.Suspense>`
  }
];

for (const {find, replace} of replacements) {
  code = code.replace(find, replace);
}

fs.writeFileSync('src/components/ClientShop.tsx', code);
console.log('patched suspense');
