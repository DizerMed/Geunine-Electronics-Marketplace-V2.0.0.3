import fs from 'fs';
let code = fs.readFileSync('src/components/ClientShop.tsx', 'utf8');

const replacements = [
  {
    find: "import { ProductDetailPage } from './ProductDetailPage';",
    replace: "const ProductDetailPage = React.lazy(() => import('./ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));"
  },
  {
    find: "import { InvoicePrintModal } from './InvoicePrintModal';",
    replace: "const InvoicePrintModal = React.lazy(() => import('./InvoicePrintModal').then(m => ({ default: m.InvoicePrintModal })));"
  },
  {
    find: "import { POSReceiptModal } from './POSReceiptModal';",
    replace: "const POSReceiptModal = React.lazy(() => import('./POSReceiptModal').then(m => ({ default: m.POSReceiptModal })));"
  },
  {
    find: "import { ProductCompareModal, CompareFloatingBar } from './ProductCompareModal';",
    replace: "import { CompareFloatingBar } from './ProductCompareModal';\nconst ProductCompareModal = React.lazy(() => import('./ProductCompareModal').then(m => ({ default: m.ProductCompareModal })));"
  },
  {
    find: "import { ExpressBuyDrawer } from './ExpressBuyDrawer';",
    replace: "const ExpressBuyDrawer = React.lazy(() => import('./ExpressBuyDrawer').then(m => ({ default: m.ExpressBuyDrawer })));"
  },
  {
    find: "import { ReceiptVerificationModal } from './ReceiptVerificationModal';",
    replace: "const ReceiptVerificationModal = React.lazy(() => import('./ReceiptVerificationModal').then(m => ({ default: m.ReceiptVerificationModal })));"
  },
  {
    find: "import { ReviewForm } from './ReviewForm';",
    replace: "const ReviewForm = React.lazy(() => import('./ReviewForm').then(m => ({ default: m.ReviewForm })));"
  }
];

for (const {find, replace} of replacements) {
  code = code.replace(find, replace);
}

fs.writeFileSync('src/components/ClientShop.tsx', code);
console.log('patched');
