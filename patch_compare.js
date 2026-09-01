import fs from 'fs';
let code = fs.readFileSync('src/components/ClientShop.tsx', 'utf8');

const replacement = `const ProductCompareModal = React.lazy(() => import('./ProductCompareModal').then(m => ({ default: m.ProductCompareModal })));
const CompareFloatingBar = React.lazy(() => import('./ProductCompareModal').then(m => ({ default: m.CompareFloatingBar })));`;

code = code.replace(
  "import { CompareFloatingBar } from './ProductCompareModal';\nconst ProductCompareModal = React.lazy(() => import('./ProductCompareModal').then(m => ({ default: m.ProductCompareModal })));",
  replacement
);

code = code.replace(
  /<CompareFloatingBar([\s\S]*?)\/>/g,
  (match) => `<React.Suspense fallback={null}>\n${match}\n</React.Suspense>`
);

fs.writeFileSync('src/components/ClientShop.tsx', code);
