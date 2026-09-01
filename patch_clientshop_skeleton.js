import fs from 'fs';
let code = fs.readFileSync('src/components/ClientShop.tsx', 'utf8');

const skeletonCode = `const ProductSkeletonCard = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 overflow-hidden shadow-xs flex flex-col animate-pulse">
    <div className="relative aspect-square bg-slate-200 dark:bg-slate-700/70 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center opacity-70">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400 dark:text-slate-400" />
      </div>
      <div className="absolute top-3 left-3 w-14 h-4.5 rounded-lg bg-slate-300 dark:bg-slate-600/80" />
    </div>
    <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-10 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="h-4 w-4/5 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-3 w-3/5 bg-slate-100 dark:bg-slate-700/50 rounded" />
      </div>
      <div className="pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-2">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="flex items-center gap-1.5 w-full">
          <div className="h-8 sm:h-9 flex-1 bg-slate-200 dark:bg-slate-700 rounded-lg sm:rounded-xl" />
          <div className="h-8 sm:h-9 w-8 sm:w-9 bg-slate-200 dark:bg-slate-700 rounded-lg sm:rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);

`;

code = code.replace(
  "export const ClientShop: React.FC<ClientShopProps> = ({ storeSettings,",
  skeletonCode + "export const ClientShop: React.FC<ClientShopProps> = ({ storeSettings,"
);

// Replace the isLoadingMore skeleton
const originalSkeletonRegex = /<div\s+key=\{\`loading-skeleton-card-\$\{idx\}\`\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
code = code.replace(
  originalSkeletonRegex,
  "<ProductSkeletonCard key={`loading-skeleton-card-${idx}`} />"
);

fs.writeFileSync('src/components/ClientShop.tsx', code);
