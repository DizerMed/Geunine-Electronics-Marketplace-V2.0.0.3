const fs = require('fs');
const file = 'src/components/AdminVisitorAnalytics.tsx';
let code = fs.readFileSync(file, 'utf8');

const emptyState = `      {(!isLoadingSummary && summary?.totalVisits === 0) ? (
        <div className={\`my-8 p-12 text-center rounded-2xl border border-dashed \${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}\`}>
          <div className={\`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center \${isDark ? 'bg-slate-800 text-slate-400' : 'bg-white shadow-sm text-slate-500'}\`}>
            <Activity className="w-6 h-6 opacity-50" />
          </div>
          <h3 className={\`text-lg font-bold mb-2 \${isDark ? 'text-slate-300' : 'text-slate-700'}\`}>No Data Found</h3>
          <p className={\`text-sm max-w-md mx-auto \${isDark ? 'text-slate-500' : 'text-slate-500'}\`}>
            There are no visitor analytics logs for the selected timeframe or filters. Change the filters or check back later when visitors interact with the store.
          </p>
        </div>
      ) : (
        <>
      {/* KPI Stats Grid */}`;

code = code.replace('{/* KPI Stats Grid */}', emptyState);
code = code.replace(
  '{/* =========================================================================\n          VISITOR JOURNEY MODAL / DRAWER\n          ========================================================================= */}',
  `        </>\n      )}\n\n      {/* =========================================================================\n          VISITOR JOURNEY MODAL / DRAWER\n          ========================================================================= */}`
);

fs.writeFileSync(file, code);
console.log('patched');
