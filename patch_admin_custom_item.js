import fs from 'fs';
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

const stateVariables = `
  const [isPosCustomItemModalOpen, setIsPosCustomItemModalOpen] = useState(false);
  const [posCustomItemName, setPosCustomItemName] = useState('');
  const [posCustomItemPrice, setPosCustomItemPrice] = useState('');
  const [posCustomItemQty, setPosCustomItemQty] = useState('1');
`;

code = code.replace(
  "const [isZReportOpen, setIsZReportOpen] = useState(false);",
  "const [isZReportOpen, setIsZReportOpen] = useState(false);\n" + stateVariables
);

const customItemModal = `
      {/* POS Custom Item Modal */}
      {isPosCustomItemModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={\`w-full max-w-sm rounded-3xl \${cardBg} border border-slate-200/50 dark:border-slate-700/50 shadow-2xl overflow-hidden\`}>
            <div className={\`p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800\`}>
              <h3 className={\`font-black text-lg \${textTitle}\`}>Sell Custom Item</h3>
              <button onClick={() => setIsPosCustomItemModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-white dark:bg-slate-700 rounded-full shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={\`block text-xs font-bold mb-1 \${textSub}\`}>Item Name</label>
                <input
                  type="text"
                  value={posCustomItemName}
                  onChange={(e) => setPosCustomItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="e.g., Local Stock Item"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={\`block text-xs font-bold mb-1 \${textSub}\`}>Price (TZS)</label>
                  <input
                    type="number"
                    value={posCustomItemPrice}
                    onChange={(e) => setPosCustomItemPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={\`block text-xs font-bold mb-1 \${textSub}\`}>Quantity</label>
                  <input
                    type="number"
                    value={posCustomItemQty}
                    onChange={(e) => setPosCustomItemQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    min="1"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!posCustomItemName.trim() || !posCustomItemPrice) {
                    customAlert('Please fill in name and price');
                    return;
                  }
                  const customProduct = {
                    id: \`custom-\${Date.now()}\`,
                    name: posCustomItemName,
                    brand: 'Local',
                    category: 'All',
                    price: Number(posCustomItemPrice),
                    image: '',
                    stock: 9999,
                    inStock: true
                  };
                  setPosCart([{ product: customProduct as any, quantity: Number(posCustomItemQty) || 1 }, ...posCart]);
                  setIsPosCustomItemModalOpen(false);
                  setPosCustomItemName('');
                  setPosCustomItemPrice('');
                  setPosCustomItemQty('1');
                  triggerHaptic('success');
                }}
                className="w-full py-3 mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(
  "{/* POS Z-Report End-of-Day Balancing Modal */}",
  customItemModal + "\n      {/* POS Z-Report End-of-Day Balancing Modal */}"
);

const customItemButton = `
                {/* Custom Item / Local Stock */}
                <button
                  type="button"
                  onClick={() => setIsPosCustomItemModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                  title="Add Custom Item / Local Stock to Cart"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Custom Item</span>
                </button>
`;

code = code.replace(
  "{/* Z-Report / Daily Register Closure */}",
  customItemButton + "\n                {/* Z-Report / Daily Register Closure */}"
);

fs.writeFileSync('src/components/AdminPortal.tsx', code);
