import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  X, 
  ShoppingBag, 
  FileText, 
  Users, 
  Edit, 
  Zap, 
  ExternalLink, 
  Printer, 
  ArrowRight, 
  Copy, 
  Check, 
  Phone, 
  MessageCircle, 
  PackageCheck,
  AlertCircle,
  Command,
  TrendingUp,
  Tag
} from 'lucide-react';
import { Product, Order, UserProfile, CustomerProfile, formatTZS } from '../types';
import { 
  executeAdminGlobalSearch, 
  SearchCategoryFilter, 
  GlobalSearchResultItem, 
  ProductSearchResult, 
  OrderSearchResult, 
  CustomerSearchResult,
  aggregateCustomerProfiles
} from '../utils/adminSearch';
import { triggerHaptic } from '../utils/haptics';

interface AdminGlobalSearchBarProps {
  products: Product[];
  orders: Order[];
  profiles?: UserProfile[];
  isDark: boolean;
  onEditProduct: (product: Product) => void;
  onSellInPOS: (product: Product) => void;
  onViewProductInStore?: (product: Product) => void;
  onOpenInvoice: (order: Order) => void;
  onOpenCustomerCrm: (customer: CustomerProfile & { ordersList: Order[] }) => void;
  onNavigateTab: (tab: any) => void;
  onFilterInventory?: (searchTerm: string) => void;
}

export const AdminGlobalSearchBar: React.FC<AdminGlobalSearchBarProps> = ({
  products = [],
  orders = [],
  profiles = [],
  isDark,
  onEditProduct,
  onSellInPOS,
  onViewProductInStore,
  onOpenInvoice,
  onOpenCustomerCrm,
  onNavigateTab,
  onFilterInventory,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<SearchCategoryFilter>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Compute aggregated customer profiles
  const aggregatedCustomers = useMemo(() => {
    return aggregateCustomerProfiles(profiles, orders);
  }, [profiles, orders]);

  // Execute smart real-time search with string-length & prefix ranking
  const { results, counts } = useMemo(() => {
    return executeAdminGlobalSearch({
      query,
      products,
      orders,
      customers: aggregatedCustomers,
      filter: activeFilter,
      limitPerCategory: 25,
    });
  }, [query, products, orders, aggregatedCustomers, activeFilter]);

  // Reset selected index when query or results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeFilter]);

  // Keyboard shortcut ⌘K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleCopySku = (e: React.MouseEvent, sku: string) => {
    e.stopPropagation();
    if (!sku) return;
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    triggerHaptic('light');
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        executePrimaryAction(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const executePrimaryAction = (result: GlobalSearchResultItem) => {
    triggerHaptic('light');
    setIsOpen(false);

    if (result.type === 'product') {
      onEditProduct(result.item);
    } else if (result.type === 'order') {
      onOpenInvoice(result.item);
    } else if (result.type === 'customer') {
      onOpenCustomerCrm(result.item as CustomerProfile & { ordersList: Order[] });
    }
  };

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return (
    <div ref={containerRef} className="relative w-full max-w-md md:max-w-lg lg:max-w-xl">
      {/* Search Input Container */}
      <div 
        className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 ${
          isOpen
            ? 'ring-2 ring-blue-500/30 border-blue-500 shadow-md'
            : isDark
            ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
        }`}
      >
        <Search className={`w-4 h-4 shrink-0 transition-colors ${isOpen ? 'text-blue-500' : 'text-slate-400'}`} />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search products (e.g. Inverter), orders, or customers..."
          className="w-full bg-transparent border-none text-xs sm:text-sm font-medium focus:outline-none placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
        />

        {query ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Clear Search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd 
            onClick={() => {
              inputRef.current?.focus();
              setIsOpen(true);
            }}
            className={`hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border shrink-0 cursor-pointer ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-500'
            }`}
          >
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        )}
      </div>

      {/* Real-time Results Dropdown / Floating Panel */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className={`absolute left-0 right-0 mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[75vh] animate-in fade-in slide-in-from-top-2 duration-150 ${
            isDark 
              ? 'bg-slate-900/98 border-slate-800 text-slate-100 backdrop-blur-xl' 
              : 'bg-white/98 border-slate-200 text-slate-900 backdrop-blur-xl shadow-blue-500/5'
          }`}
        >
          {/* Filter Pills Header */}
          <div className={`p-2.5 border-b flex items-center justify-between gap-2 overflow-x-auto ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>All Results</span>
                {query.trim() && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {counts.all}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('products')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeFilter === 'products'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <ShoppingBag className="w-3 h-3" />
                <span>Products</span>
                {query.trim() && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeFilter === 'products' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {counts.products}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('orders')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeFilter === 'orders'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>Orders</span>
                {query.trim() && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeFilter === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {counts.orders}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('customers')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeFilter === 'customers'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Users className="w-3 h-3" />
                <span>Customers</span>
                {query.trim() && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeFilter === 'customers' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {counts.customers}
                  </span>
                )}
              </button>
            </div>

            {query.trim() && (
              <span className="text-[11px] text-slate-400 font-medium shrink-0 hidden sm:inline">
                Ranked by title match & length
              </span>
            )}
          </div>

          {/* Results List */}
          <div className="p-2 overflow-y-auto max-h-[55vh] space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/40">
            {!query.trim() ? (
              <div className="p-6 text-center space-y-2">
                <Search className="w-6 h-6 mx-auto text-slate-400 opacity-60" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Instant Global Filter
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Type any part of a product name (e.g. <span className="font-semibold text-blue-500">Inverter</span>), SKU, order ID, or customer phone to see results ranked in real time.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                  <span className="text-[10px] text-slate-400">Quick searches:</span>
                  {['Inverter', 'Solar', 'Battery', 'Front Load', 'TV'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setQuery(tag);
                        inputRef.current?.focus();
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-400 opacity-50" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching results found</p>
                <p className="text-xs text-slate-400">
                  No products, orders, or customers matched "<span className="font-medium text-slate-600 dark:text-slate-300">{query}</span>".
                </p>
              </div>
            ) : (
              results.map((result, idx) => {
                const isSelected = idx === selectedIndex;

                if (result.type === 'product') {
                  const prod = result.item;
                  const discountPct = prod.originalPrice && prod.originalPrice > prod.price
                    ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)
                    : 0;

                  return (
                    <div
                      key={result.id}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => executePrimaryAction(result)}
                      className={`pt-1.5 first:pt-0 p-2.5 rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected 
                          ? isDark ? 'bg-blue-600/15 ring-1 ring-blue-500/50' : 'bg-blue-50/80 ring-1 ring-blue-400' 
                          : isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Left: Image & Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {result.imageUrl ? (
                            <img 
                              src={result.imageUrl} 
                              alt={result.title} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <ShoppingBag className="w-5 h-5 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-md">
                              {result.title}
                            </h4>
                            {result.brand && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                {result.brand}
                              </span>
                            )}
                            {discountPct > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-600/10 text-rose-500 dark:text-rose-400 text-[10px] font-black border border-rose-500/20">
                                -{discountPct}%
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                            <span className="font-extrabold text-blue-600 dark:text-blue-400">
                              {formatTZS(result.price)}
                            </span>
                            {result.originalPrice && result.originalPrice > result.price && (
                              <span className="line-through text-[10px] opacity-70">
                                {formatTZS(result.originalPrice)}
                              </span>
                            )}
                            <span>•</span>
                            <span className={result.stock > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-500 font-bold'}>
                              {result.stock > 0 ? `${result.stock} in stock` : 'Out of Stock'}
                            </span>
                            {result.sku && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[10px]">SKU: {result.sku}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Instant Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 justify-end pt-1 sm:pt-0" onClick={e => e.stopPropagation()}>
                        {result.sku && (
                          <button
                            type="button"
                            onClick={(e) => handleCopySku(e, result.sku)}
                            title="Copy SKU"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                          >
                            {copiedSku === result.sku ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setIsOpen(false);
                            onEditProduct(prod);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95"
                          title="Instant Edit Product"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setIsOpen(false);
                            onSellInPOS(prod);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95"
                          title="Add to POS Register"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Sell (POS)</span>
                        </button>

                        {onViewProductInStore && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsOpen(false);
                              onViewProductInStore(prod);
                            }}
                            title="View in Storefront"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                if (result.type === 'order') {
                  const ord = result.item;
                  return (
                    <div
                      key={result.id}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => executePrimaryAction(result)}
                      className={`pt-1.5 first:pt-0 p-2.5 rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected 
                          ? isDark ? 'bg-emerald-600/15 ring-1 ring-emerald-500/50' : 'bg-emerald-50/80 ring-1 ring-emerald-400' 
                          : isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {result.title}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                              ord.status === 'Completed' || ord.status === 'Delivered'
                                ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-amber-600/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {ord.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {ord.customerName || 'Customer'}
                            </span>
                            {ord.customerPhone && (
                              <>
                                <span>•</span>
                                <span>{ord.customerPhone}</span>
                              </>
                            )}
                            <span>•</span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                              {formatTZS(result.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 justify-end pt-1 sm:pt-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setIsOpen(false);
                            onOpenInvoice(ord);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95"
                          title="Open Invoice / Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Invoice</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onNavigateTab('orders');
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                          title="Manage in Orders"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                if (result.type === 'customer') {
                  const cust = result.item;
                  return (
                    <div
                      key={result.id}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => executePrimaryAction(result)}
                      className={`pt-1.5 first:pt-0 p-2.5 rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected 
                          ? isDark ? 'bg-cyan-600/15 ring-1 ring-cyan-500/50' : 'bg-cyan-50/80 ring-1 ring-cyan-400' 
                          : isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center shrink-0 font-extrabold text-sm uppercase">
                          {result.name ? result.name.slice(0, 2) : 'CU'}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {result.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold border border-cyan-500/20">
                              {cust.tier || 'Standard'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {result.phone && (
                              <span>{result.phone}</span>
                            )}
                            {result.email && (
                              <>
                                <span>•</span>
                                <span className="truncate">{result.email}</span>
                              </>
                            )}
                            <span>•</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {result.totalOrders} orders ({formatTZS(result.lifetimeValue)})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 justify-end pt-1 sm:pt-0" onClick={e => e.stopPropagation()}>
                        {result.phone && (
                          <a
                            href={`https://wa.me/${result.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setIsOpen(false);
                            onOpenCustomerCrm(cust as any);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95"
                          title="Open CRM Profile"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>CRM</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onNavigateTab('customers');
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                          title="Manage in Customers Tab"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return null;
              })
            )}
          </div>

          {/* Bottom helper bar */}
          <div className={`px-4 py-2 border-t flex items-center justify-between text-[10px] text-slate-400 ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="flex items-center gap-2">
              <span>Navigate: <kbd className="font-mono font-bold">↑</kbd> <kbd className="font-mono font-bold">↓</kbd></span>
              <span>•</span>
              <span>Open: <kbd className="font-mono font-bold">Enter</kbd></span>
              <span>•</span>
              <span>Close: <kbd className="font-mono font-bold">Esc</kbd></span>
            </div>

            {query.trim() && onFilterInventory && (
              <button
                type="button"
                onClick={() => {
                  onFilterInventory(query);
                  onNavigateTab('inventory');
                  setIsOpen(false);
                }}
                className="text-blue-500 hover:text-blue-400 font-bold underline cursor-pointer"
              >
                Filter Inventory Table with "{query}" →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
