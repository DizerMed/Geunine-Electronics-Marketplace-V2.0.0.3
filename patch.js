const fs = require('fs');
const file = 'src/components/TopViewedProductsBreakdown.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const filteredProducts = products.filter(p => {\n    if (filterMode === 'trending') return p.isTrending || (p.trendScore && p.trendScore >= 35);\n    if (filterMode === 'search-driven') return (p.topCorrelatedSearches && p.topCorrelatedSearches.length > 0) || (p.searchAssistedViews && p.searchAssistedViews > 0);\n    return true;\n  });",
  "const filteredProducts = products.filter(p => {\n    if (filterMode === 'trending') return p.isTrending || (p.trendScore && p.trendScore >= 35);\n    if (filterMode === 'search-driven') return (p.topCorrelatedSearches && p.topCorrelatedSearches.length > 0) || (p.searchAssistedViews && p.searchAssistedViews > 0);\n    return true;\n  }).sort((a, b) => {\n    if (filterMode === 'trending') {\n      const scoreA = a.trendScore || (a.isTrending ? 85 : 0);\n      const scoreB = b.trendScore || (b.isTrending ? 85 : 0);\n      return scoreB - scoreA;\n    }\n    if (filterMode === 'search-driven') {\n      return (b.searchAssistedViews || 0) - (a.searchAssistedViews || 0);\n    }\n    return (b.views || 0) - (a.views || 0);\n  });"
);

code = code.replace(
  "{filteredProducts.slice(0, 10).map((prod, idx) => {",
  "{filteredProducts.map((prod, idx) => {"
);

fs.writeFileSync(file, code);
console.log('patched');
