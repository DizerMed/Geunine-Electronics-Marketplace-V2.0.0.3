import fs from 'fs';
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

code = code.replace(
  "const [formOfferTitle, setFormOfferTitle] = useState<string>('LIMITED TIME OFFER');",
  "const [formOfferTitle, setFormOfferTitle] = useState<string>('LIMITED TIME OFFER');\n  const [formIsLocalOnly, setFormIsLocalOnly] = useState<boolean>(false);"
);

code = code.replace(
  "offerTitle: formOfferTitle || (formIsOnOffer ? 'LIMITED TIME OFFER' : ''),",
  "offerTitle: formOfferTitle || (formIsOnOffer ? 'LIMITED TIME OFFER' : ''),\n          isLocalOnly: Boolean(formIsLocalOnly),"
);

code = code.replace(
  "offerTitle: formOfferTitle || (formIsOnOffer ? 'LIMITED TIME OFFER' : ''),",
  "offerTitle: formOfferTitle || (formIsOnOffer ? 'LIMITED TIME OFFER' : ''),\n          isLocalOnly: Boolean(formIsLocalOnly),"
);

// inside handleOpenEditModal
code = code.replace(
  "setFormOfferTitle(product.offerTitle || 'LIMITED TIME OFFER');",
  "setFormOfferTitle(product.offerTitle || 'LIMITED TIME OFFER');\n    setFormIsLocalOnly(Boolean(product.isLocalOnly));"
);

// inside handleOpenAddModal
code = code.replace(
  "setFormOfferTitle('LIMITED TIME OFFER');",
  "setFormOfferTitle('LIMITED TIME OFFER');\n    setFormIsLocalOnly(false);"
);

// Add the toggle to the UI, let's put it next to "In Stock" or "Vat Inclusive"
const toggleReplacement = `<div className="flex flex-col gap-3">
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-bold">
                              <input
                                type="checkbox"
                                checked={formIsLocalOnly}
                                onChange={(e) => setFormIsLocalOnly(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                              />
                              <span>Local Stock Only (Hide from online store)</span>
                            </label>
                          </div>`;

code = code.replace(
  /(<label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-bold">\s*<input\s*type="checkbox"\s*checked=\{formIsVatInclusive\}[\s\S]*?<\/label>)/,
  `$1\n                          ${toggleReplacement}`
);

fs.writeFileSync('src/components/AdminPortal.tsx', code);
