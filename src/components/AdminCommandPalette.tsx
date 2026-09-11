import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Layers, 
  ShoppingBag, 
  Zap, 
  FileText, 
  Users, 
  Globe, 
  Settings, 
  Plus, 
  Save, 
  QrCode, 
  Printer, 
  Moon, 
  Sun, 
  ArrowRight, 
  Check, 
  Tag, 
  Sparkles,
  Command
} from 'lucide-react';
import { Product, Order, POSTransaction, UserProfile, CustomerProfile, formatTZS } from '../types';
import { 
  calculateProductSearchScore, 
  calculateOrderSearchScore, 
  calculateCustomerSearchScore, 
  aggregateCustomerProfiles 
} from '../utils/adminSearch';

interface AdminCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: any) => void;
  onOpenAddProduct: () => void;
  onSaveSettings: () => void;
  onOpenScanner: () => void;
  onOpenPrintAllQr: () => void;
  onToggleTheme: () => void;
  onOpenShortcuts: () => void;
  products?: Product[];
  orders?: Order[];
  posTransactions?: POSTransaction[];
  profiles?: UserProfile[];
  onEditProduct?: (product: Product) => void;
  onSellInPOS?: (product: Product) => void;
  onOpenInvoice?: (order: Order) => void;
  onOpenCustomerCrm?: (customer: CustomerProfile & { ordersList: Order[] }) => void;
  isDark?: boolean;
}

export const AdminCommandPalette: React.FC<AdminCommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenAddProduct,
  onSaveSettings,
  onOpenScanner,
  onOpenPrintAllQr,
  onToggleTheme,
  onOpenShortcuts,
  products = [],
  orders = [],
  posTransactions = [],
  profiles = [],
  onEditProduct,
  onSellInPOS,
  onOpenInvoice,
  onOpenCustomerCrm,
  isDark = true,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const defaultActions = useMemo(() => [
    {
      id: 'add-product',
      title: 'Add New Genuine Product',
      category: 'Actions',
      shortcut: `${modKey}+N`,
      icon: <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      action: () => {
        onOpenAddProduct();
        onClose();
      }
    },
    {
      id: 'save-settings',
      title: 'Save Store Settings & Changes',
      category: 'Actions',
      shortcut: `${modKey}+S`,
      icon: <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      action: () => {
        onSaveSettings();
        onClose();
      }
    },
    {
      id: 'scan-qr',
      title: 'Scan Barcode / QR Code',
      category: 'Actions',
      shortcut: `${modKey}+B`,
      icon: <QrCode className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      action: () => {
        onOpenScanner();
        onClose();
      }
    },
    {
      id: 'print-qr',
      title: 'Print All Product QR Labels',
      category: 'Actions',
      shortcut: '',
      icon: <Printer className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
      action: () => {
        onOpenPrintAllQr();
        onClose();
      }
    },
    {
      id: 'toggle-theme',
      title: isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      category: 'System',
      shortcut: `${modKey}+Shift+L`,
      icon: isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />,
      action: () => {
        onToggleTheme();
        onClose();
      }
    },
    {
      id: 'shortcuts-modal',
      title: 'View Keyboard Shortcuts',
      category: 'System',
      shortcut: '?',
      icon: <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      action: () => {
        onOpenShortcuts();
        onClose();
      }
    },
    // Navigation Tabs
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard & Sales Analytics',
      category: 'Navigation',
      shortcut: `${modKey}+1`,
      icon: <Layers className="w-4 h-4 text-slate-600 dark:text-slate-400" />,
      action: () => {
        onNavigateTab('dashboard');
        onClose();
      }
    },
    {
      id: 'nav-inventory',
      title: 'Go to Inventory Management & Hardware',
      category: 'Navigation',
      shortcut: `${modKey}+2`,
      icon: <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      action: () => {
        onNavigateTab('inventory');
        onClose();
      }
    },
    {
      id: 'nav-pos',
      title: 'Go to POS Terminal Counter',
      category: 'Navigation',
      shortcut: `${modKey}+3`,
      icon: <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      action: () => {
        onNavigateTab('pos');
        onClose();
      }
    },
    {
      id: 'nav-orders',
      title: 'Go to Customer Online Orders',
      category: 'Navigation',
      shortcut: `${modKey}+4`,
      icon: <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      action: () => {
        onNavigateTab('orders');
        onClose();
      }
    },
    {
      id: 'nav-pos-sales',
      title: 'Go to POS Sales History & Receipts',
      category: 'Navigation',
      shortcut: `${modKey}+5`,
      icon: <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
      action: () => {
        onNavigateTab('pos-sales');
        onClose();
      }
    },
    {
      id: 'nav-staff',
      title: 'Go to Staff & Store Access Roles',
      category: 'Navigation',
      shortcut: `${modKey}+6`,
      icon: <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      action: () => {
        onNavigateTab('staff');
        onClose();
      }
    },
    {
      id: 'nav-customers',
      title: 'Go to Customers CRM & Profiles',
      category: 'Navigation',
      shortcut: `${modKey}+7`,
      icon: <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
      action: () => {
        onNavigateTab('customers');
        onClose();
      }
    },
    {
      id: 'nav-offers',
      title: 'Go to Offers & Discounts',
      category: 'Navigation',
      shortcut: `${modKey}+8`,
      icon: <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      action: () => {
        onNavigateTab('offers');
        onClose();
      }
    },
    {
      id: 'nav-seo',
      title: 'Go to SEO & Canonical Metadata Manager',
      category: 'Navigation',
      shortcut: `${modKey}+9`,
      icon: <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      action: () => {
        onNavigateTab('seo');
        onClose();
      }
    },
    {
      id: 'nav-audit-logs',
      title: 'Go to Enterprise Audit Logs & Security Hub',
      category: 'Navigation',
      shortcut: `${modKey}+Shift+A`,
      icon: <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      action: () => {
        onNavigateTab('audit-logs');
        onClose();
      }
    },
    {
      id: 'nav-settings',
      title: 'Go to Admin Settings & Store Templates',
      category: 'Navigation',
      shortcut: `${modKey}+0`,
      icon: <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />,
      action: () => {
        onNavigateTab('settings');
        onClose();
      }
    },
  ], [modKey, isDark, onOpenAddProduct, onSaveSettings, onOpenScanner, onOpenPrintAllQr, onToggleTheme, onOpenShortcuts, onNavigateTab, onClose]);

  // Aggregated Customer Profiles
  const aggregatedCustomers = useMemo(() => {
    return aggregateCustomerProfiles(profiles, orders);
  }, [profiles, orders]);

  // Product, Order, Customer & Action Search Matching
  const filteredItems = useMemo(() => {
    const q = search.trim();
    if (!q) return defaultActions;

    const matchedActions = defaultActions.filter(a => 
      (a.title && String(a.title).toLowerCase().includes(q.toLowerCase())) || 
      (a.category && String(a.category).toLowerCase().includes(q.toLowerCase()))
    );

    // Match products with strict string-length and prefix ranking
    const matchedProducts = products
      .map(p => ({
        product: p,
        score: calculateProductSearchScore(p, q),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ product: p }) => ({
        id: `prod-${p.id}`,
        title: `${p.name} (${p.sku || 'No SKU'})`,
        subtitle: `${formatTZS(p.price)} • Stock: ${p.stock} • ${p.brand || 'Genuine'}`,
        category: 'Products',
        shortcut: 'Edit',
        icon: <ShoppingBag className="w-4 h-4 text-blue-400" />,
        action: () => {
          if (onEditProduct) {
            onEditProduct(p);
          } else {
            onNavigateTab('inventory');
          }
          onClose();
        }
      }));

    // Match orders with relevance ranking
    const matchedOrders = orders
      .map(o => ({
        order: o,
        score: calculateOrderSearchScore(o, q),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ order: o }) => ({
        id: `order-${o.id}`,
        title: `Order #${String(o.id).slice(0, 8).toUpperCase()} - ${o.customerName || 'Customer'}`,
        subtitle: `${formatTZS(o.totalAmount || 0)} • ${o.status} • ${o.customerPhone || 'No phone'}`,
        category: 'Orders',
        shortcut: 'Invoice',
        icon: <FileText className="w-4 h-4 text-emerald-400" />,
        action: () => {
          if (onOpenInvoice) {
            onOpenInvoice(o);
          } else {
            onNavigateTab('orders');
          }
          onClose();
        }
      }));

    // Match customers with relevance ranking
    const matchedCustomers = aggregatedCustomers
      .map(c => ({
        customer: c,
        score: calculateCustomerSearchScore(c, q),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ customer: c }) => ({
        id: `cust-${c.id}`,
        title: `${c.name} (${c.tier || 'Standard'})`,
        subtitle: `${c.phone || c.email} • ${c.totalOrders} orders • ${formatTZS(c.lifetimeValue)}`,
        category: 'Customers',
        shortcut: 'CRM',
        icon: <Users className="w-4 h-4 text-cyan-400" />,
        action: () => {
          if (onOpenCustomerCrm) {
            onOpenCustomerCrm(c as any);
          } else {
            onNavigateTab('customers');
          }
          onClose();
        }
      }));

    return [...matchedActions, ...matchedProducts, ...matchedOrders, ...matchedCustomers];
  }, [search, defaultActions, products, orders, aggregatedCustomers, onEditProduct, onOpenInvoice, onOpenCustomerCrm, onNavigateTab, onClose]);

  // Key navigation (Arrow up/down, Enter, Esc)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className={`p-4 border-b flex items-center gap-3 ${
          isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, product SKU, order, or jump to tab..."
            className="w-full bg-transparent border-none text-sm font-medium focus:outline-none placeholder:text-slate-500"
          />
          <kbd className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg border shrink-0 ${
            isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
          }`}>
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="p-2 overflow-y-auto max-h-[60vh] space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <Command className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-sm font-bold">No results found</p>
              <p className="text-xs">Try searching for a different command or product name</p>
            </div>
          ) : (
            filteredItems.map((item: any, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDark
                      ? 'hover:bg-slate-800 text-slate-300'
                      : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.category && !isSelected && (
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                            isDark 
                              ? 'bg-slate-800/60 text-slate-400 border-slate-700/50' 
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {item.category}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <div className={`text-[11px] truncate ${isSelected ? 'text-white/80' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcut && (
                      <kbd className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg border ${
                        isSelected 
                          ? 'bg-white/20 border-white/30 text-white' 
                          : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-300 text-slate-700 shadow-xs'
                      }`}>
                        {item.shortcut}
                      </kbd>
                    )}
                    <ArrowRight className={`w-4 h-4 transition-transform ${isSelected ? 'translate-x-0.5 opacity-100' : 'opacity-0'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className={`px-4 py-2.5 border-t flex items-center justify-between text-[11px] ${
          isDark ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-600'
        }`}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className={`px-1.5 py-0.5 font-mono text-[9px] rounded border ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
              }`}>↑</kbd>
              <kbd className={`px-1.5 py-0.5 font-mono text-[9px] rounded border ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
              }`}>↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className={`px-1.5 py-0.5 font-mono text-[9px] rounded border ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
              }`}>↵</kbd>
              <span>to select</span>
            </span>
          </div>
          <span className="font-medium">Genuine Electronics Fast Command</span>
        </div>
      </div>
    </div>
  );
};
