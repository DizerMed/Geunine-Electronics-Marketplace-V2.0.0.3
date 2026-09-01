import fs from 'fs';
let code = fs.readFileSync('src/components/ClientShop.tsx', 'utf8');

code = code.replace(
  "  products: Product[];",
  "  products: Product[];\n  productsLoading?: boolean;"
);

code = code.replace(
  "export const ClientShop: React.FC<ClientShopProps> = ({ storeSettings,",
  "export const ClientShop: React.FC<ClientShopProps> = ({ storeSettings,\n  productsLoading,"
);

fs.writeFileSync('src/components/ClientShop.tsx', code);
