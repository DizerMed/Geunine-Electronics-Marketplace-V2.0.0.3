import fs from 'fs';
let code = fs.readFileSync('src/components/ClientShop.tsx', 'utf8');

const emptyDealsRegex = /\{\s*filteredProducts\.length === 0 \? \(\s*<div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">/g;

code = code.replace(emptyDealsRegex, (match) => {
  return `{productsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 lg:gap-8">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <ProductSkeletonCard key={\`initial-deals-skeleton-\${idx}\`} />
                  ))}
                </div>
              ) : ` + match.slice(1);
});

const emptyMainRegex = /\{\s*filteredProducts\.length === 0 \? \(\s*<div className="w-full flex flex-col gap-10">/g;

code = code.replace(emptyMainRegex, (match) => {
  return `{productsLoading ? (
              <div className="w-full">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6 lg:gap-8 mb-8">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <ProductSkeletonCard key={\`initial-main-skeleton-\${idx}\`} />
                  ))}
                </div>
              </div>
            ) : ` + match.slice(1);
});

fs.writeFileSync('src/components/ClientShop.tsx', code);
