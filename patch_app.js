import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  "const { data: products, addItem: addSupabaseProduct, updateItem: updateSupabaseProduct, deleteItem: deleteSupabaseProduct, clearCollection: clearProducts } = useSupabaseCollection<Product>('products', [], isAdmin);",
  "const { data: products, loading: productsLoading, addItem: addSupabaseProduct, updateItem: updateSupabaseProduct, deleteItem: deleteSupabaseProduct, clearCollection: clearProducts } = useSupabaseCollection<Product>('products', [], isAdmin);"
);

code = code.replace(
  "products={productsWithReviews}",
  "products={productsWithReviews}\n                  productsLoading={productsLoading}"
);

fs.writeFileSync('src/App.tsx', code);
