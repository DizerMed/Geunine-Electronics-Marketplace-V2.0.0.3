import React, { useState, useMemo } from 'react';
import { Product, CategoryItem, StoreSettings } from '../../../types';
import {
  Zap,
  Sparkles,
  CheckCircle,
  Tags,
  List,
  Plus,
  Search,
  RefreshCw
} from 'lucide-react';

export interface AdminOffersTabProps {
  products: Product[];
  categories?: CategoryItem[];
  settingsForm: any;
  setSettingsForm: React.Dispatch<React.SetStateAction<any>>;
  handleSaveSettings: (e?: React.FormEvent) => Promise<void> | void;
  isSavingSettings: boolean;
  updateProduct: (product: Product) => Promise<void> | void;
  handleOpenAddModal: () => void;
  handleOpenEditModal: (product: Product) => void;
  showAlert: (title: string, msg: string, type?: any) => void;
  ensureOnline: (actionName?: string) => boolean;
  isDark: boolean;
  cardBg: string;
  textTitle: string;
  textSub: string;
  inputBg: string;
  formatTZS: (val: number) => string;
}

export const AdminOffersTab: React.FC<AdminOffersTabProps> = ({
  products,
  categories = [],
  settingsForm,
  setSettingsForm,
  handleSaveSettings,
  isSavingSettings,
  updateProduct,
  handleOpenAddModal,
  handleOpenEditModal,
  showAlert,
  ensureOnline,
  isDark,
  cardBg,
  textTitle,
  textSub,
  inputBg,
  formatTZS
}) => {
  // Offers local state
  const [bulkCategory, setBulkCategory] = useState<string>('All');
  const [bulkPercentage, setBulkPercentage] = useState<number>(10);
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);
  const [bulkDiscountFeedback, setBulkDiscountFeedback] = useState<string | null>(null);
  const [discountsSearch, setDiscountsSearch] = useState('');
  const [discountsFilter, setDiscountsFilter] = useState<'all' | 'active' | 'regular'>('all');

  // Stats calculation
  const offerStats = useMemo(() => {
    let live = 0;
    let featured = 0;
    let regular = 0;
    let totalDiscountPct = 0;
    let discountedCount = 0;

    products.forEach((prod) => {
      const orig = prod.originalPrice || 0;
      const hasDiscount = orig > prod.price;
      if (prod.isOnOffer || hasDiscount) {
        live++;
        if (hasDiscount) {
          const pct = ((orig - prod.price) / orig) * 100;
          totalDiscountPct += pct;
          discountedCount++;
        }
      } else {
        regular++;
      }
      if (prod.featured) {
        featured++;
      }
    });

    const averageMarkdown = discountedCount > 0 ? totalDiscountPct / discountedCount : 0;
    return { live, regular, featured, averageMarkdown };
  }, [products]);

  // Bulk Discount Handler
  const handleApplyBulkDiscount = async () => {
    if (!ensureOnline('apply bulk discount')) return;
    if (bulkPercentage <= 0 || bulkPercentage >= 100) {
      showAlert('Invalid Percentage', 'Please select a discount percentage between 1% and 99%.', 'warning');
      return;
    }

    setIsApplyingBulk(true);
    setBulkDiscountFeedback(null);

    try {
      let count = 0;
      for (const prod of products) {
        if (bulkCategory === 'All' || prod.category === bulkCategory) {
          const originalPrice = prod.originalPrice && prod.originalPrice > prod.price
            ? prod.originalPrice
            : prod.price;

          const discountedPrice = Math.round(originalPrice * (1 - bulkPercentage / 100));

          await updateProduct({
            ...prod,
            price: discountedPrice,
            originalPrice: originalPrice,
            isOnOffer: true,
            offerTitle: `${bulkPercentage}% OFF DISCOUNT`
          });
          count++;
        }
      }

      setBulkDiscountFeedback(`Successfully applied a ${bulkPercentage}% bulk discount to ${count} products under "${bulkCategory}"!`);
      showAlert('Bulk Discount Applied', `Updated ${count} products with a ${bulkPercentage}% discount.`);
    } catch (err: any) {
      showAlert('Bulk Discount Failed', err.message || 'Failed to update some products.', 'error');
    } finally {
      setIsApplyingBulk(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Premium Offers Header */}
      <div className={`relative overflow-hidden rounded-3xl border p-6 sm:p-7 ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border-slate-800' : 'bg-gradient-to-br from-white via-white to-amber-50 border-slate-200 shadow-sm'}`}>
        <div className="absolute -right-16 -top-20 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                <Zap className="w-3 h-3 fill-current" /> Campaign Studio
              </span>
              <span className={`text-[10px] font-bold ${textSub}`}>Ctrl + 8</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5 ${textTitle}`}>
              Promotional Campaigns & Deals
            </h1>
            <p className={`text-sm mt-2 max-w-2xl leading-relaxed ${textSub}`}>
              Control storefront promotions, launch category markdowns, and manage product-level offers from one clean workspace.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-0 lg:min-w-[430px]">
            {[
              ['Live Offers', offerStats.live, 'text-emerald-500'],
              ['Regular', offerStats.regular, 'text-slate-400'],
              ['Featured', offerStats.featured, 'text-blue-500'],
              ['Avg. Discount', `${offerStats.averageMarkdown.toFixed(0)}%`, 'text-amber-500']
            ].map(([label, value, color]) => (
              <div key={label} className={`rounded-2xl border px-3 py-3 ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
                <p className={`text-[9px] font-black uppercase tracking-wider ${textSub}`}>{label}</p>
                <p className={`text-lg font-black mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Control Center: Two-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: Storefront Active Campaign Control */}
        <div className={`lg:col-span-7 p-6 rounded-3xl border shadow-sm ${cardBg} hover:shadow-md transition-shadow flex flex-col justify-between`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <h3 className={`font-extrabold text-sm uppercase tracking-wider ${textTitle}`}>
                  Countdown Promo Banner
                </h3>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!settingsForm.offerEnabled}
                  onChange={(e) => setSettingsForm({ ...settingsForm, offerEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                <span className={`ml-2 text-xs font-bold ${textTitle}`}>
                  {settingsForm.offerEnabled ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[11px] font-black uppercase tracking-wider mb-1 ${textSub}`}>Campaign Main Title</label>
                <input
                  type="text"
                  value={settingsForm.offerTitle || 'LIMITED TIME OFFERS'}
                  onChange={(e) => setSettingsForm({ ...settingsForm, offerTitle: e.target.value })}
                  placeholder="e.g. FLASH SALE - UP TO 40% OFF"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-black uppercase tracking-wider mb-1 ${textSub}`}>Badge Label Text</label>
                <input
                  type="text"
                  value={settingsForm.offerBadgeText || 'SPECIAL HARDWARE DEALS'}
                  onChange={(e) => setSettingsForm({ ...settingsForm, offerBadgeText: e.target.value })}
                  placeholder="e.g. GENUINE HARDWARE DEALS"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputBg}`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-black uppercase tracking-wider mb-1 ${textSub}`}>Campaign Description / Subtitle</label>
              <input
                type="text"
                value={settingsForm.offerSubtitle || 'Certified Official Manufacturer Warranties. Authentic Electronics Delivered Across Tanzania.'}
                onChange={(e) => setSettingsForm({ ...settingsForm, offerSubtitle: e.target.value })}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${inputBg}`}
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/20 border border-slate-200/10 dark:bg-slate-950/40 space-y-2">
              <label className="block text-[10px] font-extrabold text-blue-500 uppercase tracking-widest">
                Target Expiration Date & Time
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="datetime-local"
                  value={settingsForm.offerEndsAt ? settingsForm.offerEndsAt.slice(0, 16) : ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, offerEndsAt: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-extrabold text-blue-500 bg-slate-950/30 ${isDark ? 'border-slate-800' : 'border-slate-300'}`}
                />
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { label: '+24h', hours: 24 },
                    { label: '+48h', hours: 48 },
                    { label: '+72h', hours: 72 },
                    { label: '+7d', hours: 168 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setHours(d.getHours() + preset.hours);
                        setSettingsForm({ ...settingsForm, offerEndsAt: d.toISOString() });
                      }}
                      className="px-2 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-[10px] text-slate-400 font-bold max-w-[240px]">
              Note: Banner displays are live. Changes auto-save within 500ms.
            </p>
            <button
              type="button"
              onClick={(e) => handleSaveSettings(e as any)}
              disabled={isSavingSettings}
              className="px-4.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/10 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5 text-white" />
              <span>Publish Banner Changes</span>
            </button>
          </div>
        </div>

        {/* Card 2: Enterprise Category-Wide Bulk Markdown Tool */}
        <div className={`lg:col-span-5 p-6 rounded-3xl border shadow-sm ${cardBg} hover:shadow-md transition-shadow flex flex-col justify-between`}>
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Tags className="w-4 h-4 text-blue-500" />
              <h3 className={`font-extrabold text-sm uppercase tracking-wider ${textTitle}`}>
                Category-Wide Bulk Markdown
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instantly discount multiple products! This markdown utility auto-recalculates selling prices from original product prices across your selected category.
            </p>

            <div className="space-y-3">
              <div>
                <label className={`block text-[11px] font-black uppercase tracking-wider mb-1 ${textSub}`}>
                  Select Target Product Category
                </label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputBg}`}
                >
                  <option value="All">All Categories ({products.length} products)</option>
                  {(() => {
                    const categoriesList = categories && categories.length > 0
                      ? categories.map(c => c.name)
                      : Array.from(new Set(products.map(p => p.category).filter(Boolean)));
                    return categoriesList.map(cat => (
                      <option key={cat} value={cat}>
                        {cat} ({products.filter(p => p.category === cat).length} products)
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label className={`block text-[11px] font-black uppercase tracking-wider mb-1 ${textSub}`}>
                  Apply Markdown Percentage Discount
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[5, 10, 15, 20, 25].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setBulkPercentage(pct)}
                      className={`py-1.5 rounded-lg border text-xs font-extrabold transition-all ${
                        bulkPercentage === pct
                          ? 'bg-blue-600 text-white border-transparent shadow-sm scale-105'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Custom discount:</span>
                  <input
                    type="number"
                    min="1"
                    max="95"
                    value={bulkPercentage}
                    onChange={(e) => setBulkPercentage(Math.max(1, Math.min(95, Number(e.target.value) || 1)))}
                    className={`w-16 px-2 py-1 rounded-lg border text-center text-xs font-bold ${inputBg}`}
                  />
                  <span className="text-xs font-bold text-slate-400">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {bulkDiscountFeedback && (
              <div className="p-2.5 rounded-xl text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-center">
                {bulkDiscountFeedback}
              </div>
            )}

            <button
              type="button"
              onClick={handleApplyBulkDiscount}
              disabled={isApplyingBulk}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-600/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isApplyingBulk ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Applying Discounts...</span>
                </>
              ) : (
                <>
                  <Tags className="w-3.5 h-3.5" />
                  <span>Apply {bulkPercentage}% Bulk Discount</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Individual Product Discounts Table Center */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm ${cardBg} space-y-4`}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/15">
              <List className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`font-extrabold text-sm ${textTitle}`}>
                Discounts & Deals Inventory
              </h3>
              <p className="text-[10px] text-slate-400 font-bold">
                Search, view active campaigns, and configure custom discount percentages per electronic piece.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Promotional Product</span>
          </button>
        </div>

        {/* Filters & Search Row */}
        <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-1 p-3 rounded-2xl ${isDark ? 'bg-slate-950/50 border border-slate-800' : 'bg-slate-50/80 border border-slate-200'}`}>
          {/* Search input */}
          <div className="w-full lg:flex-1 lg:max-w-xl relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              value={discountsSearch}
              onChange={(e) => setDiscountsSearch(e.target.value)}
              placeholder="Search name, brand, SKU..."
              className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-medium focus:outline-none ${inputBg}`}
            />
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Status:</span>
            {[
              { id: 'all', label: 'All Products' },
              { id: 'active', label: 'Discounted / Live' },
              { id: 'regular', label: 'Regular Price' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDiscountsFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  discountsFilter === tab.id
                    ? 'bg-slate-800 text-white border-transparent'
                    : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Discount Table rendering */}
        {(() => {
          const dSearch = (discountsSearch || '').toLowerCase().trim();
          const filtered = products.filter((prod) => {
            const matchesSearch = 
              !dSearch ||
              String(prod?.name || '').toLowerCase().includes(dSearch) ||
              String(prod?.brand || '').toLowerCase().includes(dSearch) ||
              String(prod?.category || '').toLowerCase().includes(dSearch) ||
              String(prod?.sku || '').toLowerCase().includes(dSearch);
            if (!matchesSearch) return false;

            if (discountsFilter === 'active') {
              const orig = prod.originalPrice || 0;
              return prod.isOnOffer || (orig > prod.price);
            } else if (discountsFilter === 'regular') {
              const orig = prod.originalPrice || 0;
              return !prod.isOnOffer && (orig <= prod.price);
            }
            return true;
          });

          if (filtered.length === 0) {
            return (
              <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-xs text-slate-400 font-medium">
                No products match your active search filters
              </div>
            );
          }

          return (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
              <table className="w-full text-left text-xs">
                <thead className={`text-[10px] font-black uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                  <tr>
                    <th className="p-3">Product Spec</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Selling Price</th>
                    <th className="p-3">Original Price</th>
                    <th className="p-3">Markdown %</th>
                    <th className="p-3">Storefront Offer</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {filtered.map((prod) => {
                    const orig = prod.originalPrice || 0;
                    const hasDisc = orig > prod.price;
                    const pct = hasDisc ? Math.round(((orig - prod.price) / orig) * 100) : 0;

                    return (
                      <tr key={prod.id} className="group hover:bg-blue-500/[0.035] transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-9 h-9 object-contain rounded-lg border bg-white p-0.5 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className={`font-bold block truncate max-w-[200px] ${textTitle}`}>
                                {prod.name}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">SKU: {prod.sku}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="bg-blue-500/10 text-blue-500 border border-blue-500/15 px-2 py-0.5 rounded-md font-bold text-[9px]">
                            {prod.category}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-blue-600 dark:text-blue-400 font-mono text-[13px]">
                          {formatTZS(prod.price)}
                        </td>
                        <td className="p-3 font-mono text-slate-400">
                          {orig > 0 ? (
                            <span className="line-through">{formatTZS(orig)}</span>
                          ) : (
                            <span className="italic text-[10px]">None</span>
                          )}
                        </td>
                        <td className="p-3">
                          {hasDisc ? (
                            <span className="bg-rose-500 text-white font-extrabold px-2 py-0.5 rounded-full text-[10px] tracking-tight">
                              -{pct}% OFF
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">0%</span>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={async () => {
                              const newOfferState = !prod.isOnOffer;
                              await updateProduct({
                                ...prod,
                                isOnOffer: newOfferState,
                                offerTitle: newOfferState ? (prod.offerTitle || 'LIMITED TIME OFFER') : undefined
                              });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 ${
                              prod.isOnOffer
                                ? 'bg-indigo-600 text-white font-black shadow-sm'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Zap className={`w-3 h-3 ${prod.isOnOffer ? 'fill-white' : ''}`} />
                            <span>{prod.isOnOffer ? 'ON SALE' : 'Regular'}</span>
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(prod)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white font-bold text-xs transition-colors"
                          >
                            Edit Discount
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
