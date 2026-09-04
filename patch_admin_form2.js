import fs from 'fs';
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const toggleReplacement = `
                        <div className="flex flex-col gap-3">
                          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-bold">
                            <input
                              type="checkbox"
                              checked={formIsLocalOnly}
                              onChange={(e) => setFormIsLocalOnly(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                            />
                            <span>Local Stock Only (Hide from online store)</span>
                          </label>
                        </div>
`;

code = code.replace(
  /<label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-bold">\s*<input\s*type="checkbox"\s*checked=\{formIsVatInclusive\}/,
  toggleReplacement + '\n<label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-bold">\n<input type="checkbox" checked={formIsVatInclusive}'
);

fs.writeFileSync('src/components/AdminPortal.tsx', code);
