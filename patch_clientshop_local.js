import fs from 'fs';
let code = fs.readFileSync('src/components/ClientShop.tsx', 'utf8');

code = code.replace(
  "const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;",
  "if (p.isLocalOnly) return false;\n    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;"
);

fs.writeFileSync('src/components/ClientShop.tsx', code);
