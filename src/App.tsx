import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Product, CartItem, Order, POSTransaction, StoreSettings, CategoryItem, BRAND_LOGO_URL, Staff, UserProfile, Review, getEATCurrentParts } from './types';
import { Navbar } from './components/Navbar';
import { FullScreenSaveLoader } from './components/FullScreenSaveLoader';
import { useSupabaseCollection, useSupabaseAuth } from './lib/useSupabase';
import { applyDynamicSEOMetadata } from './lib/seoManager';
import { useLoanAlerts } from './hooks/useLoanAlerts';
import { ShieldCheck, Sparkles, Bot, MessageSquareText } from 'lucide-react';
import { customAlert, customConfirm } from './utils/dialog';

const ClientApp = lazy(() => import('./components/ClientShop').then(m => ({ default: m.ClientShop })));
const InternetConnectionBanner = lazy(() => import('./components/InternetConnectionBanner').then(m => ({ default: m.InternetConnectionBanner })));
const WhatsAppFloatingButton = lazy(() => import('./components/WhatsAppFloatingButton').then(m => ({ default: m.WhatsAppFloatingButton })));
const CookieConsentBanner = lazy(() => import('./components/CookieConsentBanner').then(m => ({ default: m.CookieConsentBanner })));
const AIChatWidget = lazy(() => import('./components/AIChatWidget').then(m => ({ default: m.AIChatWidget })));
const InstallPwaBanner = lazy(() => import('./components/InstallPwaBanner').then(m => ({ default: m.InstallPwaBanner })));
const Footer = lazy(() => import('./components/Footer').then(m => ({ default: m.Footer })));
const ClientProfileModal = lazy(() => import('./components/ClientProfileModal').then(m => ({ default: m.ClientProfileModal })));

const AdminApp = lazy(() => import('./components/AdminPortal').then(m => ({ default: m.AdminPortal })));
const AuthScreen = lazy(() => import('./components/AuthScreen').then(m => ({ default: m.AuthScreen })));

export default function App() {
  const [currentView, setCurrentView] = useState<'client' | 'admin'>('client');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'orders' | 'tracking' | 'payment'>('orders');
  const { user, profile, loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [clientActiveCloudOps, setClientActiveCloudOps] = useState(0);
  const [clientCloudOpDetails, setClientCloudOpDetails] = useState<{ tableName?: string; action?: string } | null>(null);

  useEffect(() => {
    const handleStart = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail) setClientCloudOpDetails(detail);
      setClientActiveCloudOps(prev => prev + 1);
    };
    const handleEnd = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.force) {
        setClientActiveCloudOps(0);
        setClientCloudOpDetails(null);
        return;
      }
      setClientActiveCloudOps(prev => {
        const next = Math.max(0, prev - 1);
        if (next === 0) setClientCloudOpDetails(null);
        return next;
      });
    };

    window.addEventListener('supabase-write-start', handleStart);
    window.addEventListener('supabase-write-end', handleEnd);

    return () => {
      window.removeEventListener('supabase-write-start', handleStart);
      window.removeEventListener('supabase-write-end', handleEnd);
    };
  }, []);

  // Listen for nav-actions
  useEffect(() => {
    const handleNav = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail === 'orders' || customEvent.detail === 'tracking') {
        if (!user) {
          setIsAuthModalOpen(true);
        } else {
          setProfileModalTab('orders');
          setIsProfileModalOpen(true);
        }
      } else if (customEvent.detail === 'profile') {
        if (!user) {
          setIsAuthModalOpen(true);
        } else {
          setProfileModalTab('profile');
          setIsProfileModalOpen(true);
        }
      }
    };
    window.addEventListener('nav-action', handleNav);
    return () => window.removeEventListener('nav-action', handleNav);
  }, [user]);

  useEffect(() => {
    // Sync internal loading with authLoading but add a 2.5s safety fallback for instant UI mount
    if (!authLoading) {
      setLoading(false);
    }

    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [authLoading]);

  const [adminThemeMode, setAdminThemeMode] = useState<'system' | 'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ge_admin_theme');
      if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    }
    return 'system';
  });
  const [clientThemeMode, setClientThemeMode] = useState<'system' | 'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ge_client_theme');
      if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    }
    return 'light';
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    storeName: 'Genuine Electronics',
    tagline: 'Authorized Consumer & Enterprise Technology Retailer',
    tin: '104-982-371',
    vrn: '40-029182-Z',
    address: 'Kariakoo / Ndanda na Masasi Street, Dar es Salaam Tanzania',
    phone: '+255 624 057 166',
    email: 'sales@genuine-electronics.com',
    bankName: 'CRDB Bank Tanzania PLC',
    bankAccount: '0150 8829 4100',
    bankSwift: 'CORUTZTZ',
    mobileMoneyNumber: '0624 057 166',
    mobileMoneyName: 'Genuine Electronics Ltd',
    whatsappNumber: '+255 624 057 166',
    announcementText: '🎉 Special Offer: Free Express Delivery across Dar es Salaam on orders over TZS 500,000!',
    showAnnouncement: true,
    heroBadge: 'Authorized Dealer • 100% Genuine Guarantee',
    heroTitle: 'Next-Gen Technology & Home Appliances in Tanzania',
    heroSubtitle: 'Shop top global brands with official local warranty, official receipts, and same-day delivery.',
    heroImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
    logoUrl: BRAND_LOGO_URL,
    paymentMethods: [
      { id: '1', type: 'Bank Transfer', provider: 'Bank / CRDB / NMB', accountName: 'Genuine Electronics Ltd', accountNumber: '0150 8829 4100', instructions: 'Use Order ID as reference.', isActive: true },
      { id: '2', type: 'Mobile Money', provider: 'M-Pesa', accountName: 'Genuine Electronics', accountNumber: '0768 929 203', instructions: 'Send money to this till number.', isActive: true },
      { id: '3', type: 'Mobile Money', provider: 'Mixx By Yas', accountName: 'Genuine Electronics', accountNumber: '0658 929 203', instructions: 'Send money to this till number.', isActive: true },
      { id: '4', type: 'Mobile Money', provider: 'Airtel Money', accountName: 'Genuine Electronics', accountNumber: '0688 929 203', instructions: 'Send money to this till number.', isActive: true },
      { id: '5', type: 'Mobile Money', provider: 'Halotel HaloPesa', accountName: 'Genuine Electronics', accountNumber: '0628 929 203', instructions: 'Send money to this till number.', isActive: true },
      { id: '6', type: 'Cash', provider: 'Cash on Delivery', accountName: 'Cash', accountNumber: 'N/A', instructions: 'Pay cash to delivery personnel.', isActive: true },
      { id: '7', type: 'Orbi Pay', provider: 'Orbi Pay', accountName: 'Orbi Merchant', accountNumber: 'ORBI-9901', instructions: 'Instant Escrow Gateway from Orbi Fintech', isActive: false }
    ],
  });



  // Fetch store settings from cloud backend with real-time SSE updates
  useEffect(() => {
    const fetchSettings = async () => {
      if (!navigator.onLine) return;
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) return;
        const data = await res.json();
        if (data && data.settings) {
          const { id, updated_at, ...rest } = data.settings;
          setStoreSettings(prev => ({ ...prev, ...rest }));
        }
      } catch (err) {
        // Ignored
      }
    };

    fetchSettings();

    const handleLiveEvent = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const payload = customEvent.detail;
      if (!payload) return;

      if (payload.type === 'SETTINGS_CHANGED' && payload.settings) {
        const { id, updated_at, ...rest } = payload.settings;
        setStoreSettings(prev => ({ ...prev, ...rest }));
      }
    };

    const handleOnline = () => {
      fetchSettings();
    };

    const handleSyncCompleted = () => {
      fetchSettings();
    };

    const handleFocus = () => {
      if (navigator.onLine) {
        fetchSettings();
      }
    };

    window.addEventListener('cloud-live-event', handleLiveEvent);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline-sync-completed', handleSyncCompleted);
    window.addEventListener('force-store-refresh', handleSyncCompleted);
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      if (navigator.onLine && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchSettings();
      }
    }, 30000 + Math.floor(Math.random() * 5000));

    return () => {
      window.removeEventListener('cloud-live-event', handleLiveEvent);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline-sync-completed', handleSyncCompleted);
      window.removeEventListener('force-store-refresh', handleSyncCompleted);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const handleUpdateStoreSettings = async (newSettings: StoreSettings) => {
    setStoreSettings(newSettings);
    const settingsToSave = { ...newSettings, adminThemeMode };

    if (!navigator.onLine) return;

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave)
      });
      if (!response.ok) throw new Error('Server returned non-ok for settings sync');
    } catch (err) {
      console.warn('Failed to sync store settings to cloud:', err);
    }
  };
  
  const updateAdminTheme = async (mode: 'system' | 'dark' | 'light') => {
    setAdminThemeMode(mode);
    const settingsToSave = { ...storeSettings, adminThemeMode: mode };
    
    if (navigator.onLine) {
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settingsToSave)
        });
      } catch (err) {
        console.warn('Failed to sync theme mode to cloud:', err);
      }
    }
  };

  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);

  // System dark mode preference listener for Admin App
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if ((mediaQuery as any).removeListener) {
        (mediaQuery as any).removeListener(handleChange);
      }
    };
  }, []);

  const effectiveAdminTheme: 'dark' | 'light' =
    adminThemeMode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : adminThemeMode;

  const effectiveClientTheme: 'dark' | 'light' =
    clientThemeMode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : clientThemeMode;

  useEffect(() => {
    const adminEmail = 'admin@genuine-electronics.com';
    if (user && user.email && String(user.email || "").toLowerCase() === adminEmail) {
      setCurrentView('admin');
    }
  }, [user]);

  // Listen for session expiry during offline reconnect
  useEffect(() => {
    const handleSessionExpired = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const message = detail?.message || 'Your session has expired while you were offline. Please sign in again to continue.';
      setSessionExpiredNotice(message);
      setIsAuthModalOpen(true);
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, []);

  const handleAdminLogout = async () => {
    try {
      const { supabaseClient } = await import('./lib/supabaseClient');
      await supabaseClient.auth.signOut();
    } catch (err) {
      console.warn('Backend logout failed, proceeding with local view change', err);
    }
    localStorage.removeItem('ge_user_session');
    setSessionExpiredNotice(null);
    window.dispatchEvent(new Event('auth-state-changed'));
    setCurrentView('client');
  };

  const handleAuthSuccess = () => {
    setSessionExpiredNotice(null);
    setIsAuthModalOpen(false);
    try {
      const session = localStorage.getItem('ge_user_session');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed?.email?.toLowerCase() === 'admin@genuine-electronics.com' || parsed?.role === 'admin') {
          setCurrentView('admin');
        }
      }
    } catch (_) {}
  };

  const cycleAdminTheme = () => {
    setAdminThemeMode((prev) => {
      const next = prev === 'system' ? 'dark' : prev === 'dark' ? 'light' : 'system';
      try { localStorage.setItem('ge_admin_theme', next); } catch (_) {}
      return next;
    });
  };

  const cycleClientTheme = () => {
    setClientThemeMode((prev) => {
      const next = prev === 'system' ? 'dark' : prev === 'dark' ? 'light' : 'system';
      try { localStorage.setItem('ge_client_theme', next); } catch (_) {}
      return next;
    });
  };

  useEffect(() => {
    if (currentView === 'admin') {
      if (effectiveAdminTheme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } else {
      if (effectiveClientTheme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  }, [currentView, effectiveAdminTheme, adminThemeMode, effectiveClientTheme, clientThemeMode]);
  
  // Real-time Supabase sync for main entities
  const isAdmin = currentView === 'admin';
  const { data: products, loading: productsLoading, addItem: addSupabaseProduct, updateItem: updateSupabaseProduct, deleteItem: deleteSupabaseProduct, clearCollection: clearProducts } = useSupabaseCollection<Product>('products', [], isAdmin);
  const { data: orders, addItem: addSupabaseOrder, updateItem: updateSupabaseOrder, deleteItem: deleteOrder, clearCollection: clearOrders } = useSupabaseCollection<Order>('orders', [], isAdmin);
  const { data: posTransactions, addItem: addSupabasePOSTransaction, updateItem: updateSupabasePOSTransaction, deleteItem: deletePOSTransaction, clearCollection: clearPOSTransactions } = useSupabaseCollection<POSTransaction>('posTransactions', [], isAdmin);
  const { data: staff, updateItem: updateSupabaseStaff, deleteItem: deleteSupabaseStaff, clearCollection: clearStaff } = useSupabaseCollection<Staff>('staff', [], isAdmin);
  const { data: profiles, updateItem: updateSupabaseProfile, deleteItem: deleteSupabaseProfile, clearCollection: clearProfiles } = useSupabaseCollection<UserProfile>('profiles', [], isAdmin);
  const { data: categories, addItem: addFirestoreCategory, updateItem: updateFirestoreCategory, deleteItem: deleteFirestoreCategory, clearCollection: clearCategories } = useSupabaseCollection<CategoryItem>('categories', [], isAdmin);
  const { data: reviews } = useSupabaseCollection<Review>('reviews', []);

  // Aggregate reviews
  const productReviewsMap = useMemo(() => {
    const map: Record<string, { totalRating: number; count: number }> = {};
    reviews.forEach(review => {
      if (!map[review.productId]) {
        map[review.productId] = { totalRating: 0, count: 0 };
      }
      map[review.productId].totalRating += review.rating;
      map[review.productId].count += 1;
    });
    return map;
  }, [reviews]);

  const productsWithReviews = useMemo(() => {
    return products.map(product => {
      const stats = productReviewsMap[product.id];
      if (!stats || stats.count === 0) return product;
      return {
        ...product,
        rating: stats.totalRating / stats.count,
        reviewsCount: stats.count
      };
    });
  }, [products, productReviewsMap]);

  const addCategory = (categoryData: Omit<CategoryItem, 'id'>) => {
    const newCategory: CategoryItem = {
      ...categoryData,
      id: `cat-${Date.now()}`,
    };
    addFirestoreCategory(newCategory);
  };

  const updateCategory = (updatedCategory: CategoryItem) => {
    updateFirestoreCategory(updatedCategory);
  };

  const deleteCategory = (categoryId: string) => {
    deleteFirestoreCategory(categoryId);
  };

  // Client-specific state (kept in local storage since it's device specific)
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('ge_cart');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('ge_wishlist');
    return saved ? JSON.parse(saved) : ['prod-1', 'prod-3'];
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleSelectProductFromAI = useCallback((product: Product) => {
    setIsAiAssistantOpen(false);
    if (currentView !== 'client') {
      setCurrentView('client');
    }
    window.history.pushState(null, '', `/product/${product.id}`);
    window.dispatchEvent(new CustomEvent('nav-action', { detail: `product_${product.id}` }));
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  // Dynamic Real-time Automatic SEO Synchronization
  useEffect(() => {
    applyDynamicSEOMetadata(storeSettings, currentView, {
      products,
      categoriesList: categories,
      searchQuery: searchTerm,
    });
  }, [storeSettings, currentView, products, categories, searchTerm]);

  // Sync client state to local storage
  useEffect(() => {
    localStorage.setItem('ge_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('ge_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const { AlertsComponent } = useLoanAlerts(orders, user, () => {
    setCurrentView('client');
    setProfileModalTab('orders');
    setIsProfileModalOpen(true);
  });

  // Cart Actions
  const addToCart = (product: Product, quantity = 1) => {
    const availableStock = Math.max(0, Number(product.stock || 0));
    if (availableStock <= 0) {
      customAlert(`Cannot add "${product.name}" to cart: Item is out of stock (0 available).`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      const targetQty = Math.min(availableStock, currentQty + quantity);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: targetQty } : item
        );
      }
      return [...prev, { product, quantity: targetQty }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const product = products.find(p => p.id === productId);
    const availableStock = Math.max(0, Number(product?.stock ?? 9999));
    const targetQty = Math.min(availableStock, quantity);
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity: targetQty } : item))
    );
  };

  // Wishlist Actions
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  // Order Actions
  const createOrder = (orderData: Omit<Order, 'id' | 'createdAt' | 'trackingNumber'>) => {
    const eat = getEATCurrentParts();
    
    // Determine if the order is designated as a loan or contains customer credit information
    const pmApp = String(orderData.paymentMethod || orderData.payment_method || '').toLowerCase();
    const isCreditCardApp = pmApp.includes('credit card') || pmApp.includes('card') || pmApp.includes('visa') || pmApp.includes('mastercard');

    const isLoan = Boolean(
      orderData.isLoan === true ||
      orderData.is_loan === true ||
      (orderData.isLoan !== false && orderData.is_loan !== false && !isCreditCardApp && (
        pmApp.includes('loan') ||
        pmApp.includes('installment') ||
        pmApp.includes('mkopo') ||
        pmApp.includes('debt') ||
        pmApp.includes('deni') ||
        pmApp.includes('store credit') ||
        (pmApp.includes('credit') && !pmApp.includes('card'))
      )) ||
      (orderData.isLoan !== false && orderData.is_loan !== false && (orderData.loanBalance !== undefined && Number(orderData.loanBalance) > 0)) ||
      (orderData.isLoan !== false && orderData.is_loan !== false && Boolean(orderData.loanDueDate || orderData.loan_due_date))
    );

    const total = Number(orderData.totalAmount || orderData.total_amount || 0);
    const paid = Number(orderData.paidAmount ?? orderData.paid_amount ?? orderData.downPayment ?? orderData.down_payment ?? 0);
    const downPayment = isLoan ? Number(orderData.downPayment ?? orderData.down_payment ?? paid) : 0;
    const balance = isLoan
      ? (orderData.loanBalance !== undefined
          ? Number(orderData.loanBalance)
          : (orderData.loan_balance !== undefined
              ? Number(orderData.loan_balance)
              : Math.max(0, total - paid)))
      : 0;

    // Resolve customer ID (customer_id, customerId, userId, user_id)
    const customerId = orderData.customerId || orderData.customer_id || orderData.userId || orderData.user_id || user?.id || (user as any)?.uid || undefined;

    // Resolve loan due date / deadline
    const loanDueDateVal = isLoan
      ? (orderData.loanDueDate || orderData.loan_due_date || orderData.loanDueDateTime || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])
      : undefined;

    // Resolve shipping deadline separately if provided in orderData
    const shippingDeadline = orderData.deadline;

    // Resolve loan status (loan_status, loanStatus)
    let loanStatus: 'unpaid' | 'partial' | 'paid' | 'overdue' | undefined = isLoan ? (orderData.loanStatus || (orderData.loan_status as any)) : undefined;
    if (isLoan && !loanStatus) {
      if (balance <= 0) {
        loanStatus = 'paid';
      } else if (paid > 0) {
        loanStatus = 'partial';
      } else {
        loanStatus = 'unpaid';
      }
    }

    const newOrder: Order = {
      ...orderData,
      id: `ORD-${eat.yy}${eat.mm}${eat.dd}-${eat.hh}${eat.mn}${eat.ss}`,
      createdAt: new Date().toISOString(),
      trackingNumber: `GE-TRK-${Math.floor(Math.random() * 9000000 + 1000000)}`,
      userId: customerId,
      user_id: customerId,
      customerId: customerId,
      customer_id: customerId,
      isLoan: isLoan,
      is_loan: isLoan,
      downPayment: isLoan ? downPayment : undefined,
      down_payment: isLoan ? downPayment : undefined,
      paidAmount: paid,
      paid_amount: paid,
      loanBalance: isLoan ? balance : 0,
      loan_balance: isLoan ? balance : 0,
      outstandingBalance: isLoan ? balance : 0,
      outstanding_balance: isLoan ? balance : 0,
      deadline: shippingDeadline || (isLoan ? loanDueDateVal : undefined),
      loanDueDate: loanDueDateVal,
      loan_due_date: loanDueDateVal,
      loanDueTime: isLoan ? (orderData.loanDueTime || orderData.loan_due_time) : undefined,
      loan_due_time: isLoan ? (orderData.loanDueTime || orderData.loan_due_time) : undefined,
      loanDueDateTime: isLoan ? (orderData.loanDueDateTime || orderData.loan_due_date_time || loanDueDateVal) : undefined,
      loan_due_date_time: isLoan ? (orderData.loanDueDateTime || orderData.loan_due_date_time || loanDueDateVal) : undefined,
      loanStatus: loanStatus,
      loan_status: loanStatus,
      loanNationalId: isLoan ? (orderData.loanNationalId || orderData.loan_national_id) : undefined,
      loan_national_id: isLoan ? (orderData.loanNationalId || orderData.loan_national_id) : undefined,
      loanGuarantorName: isLoan ? (orderData.loanGuarantorName || orderData.loan_guarantor_name) : undefined,
      loan_guarantor_name: isLoan ? (orderData.loanGuarantorName || orderData.loan_guarantor_name) : undefined,
      loanGuarantorPhone: isLoan ? (orderData.loanGuarantorPhone || orderData.loan_guarantor_phone) : undefined,
      loan_guarantor_phone: isLoan ? (orderData.loanGuarantorPhone || orderData.loan_guarantor_phone) : undefined,
      loanRepayments: isLoan ? (orderData.loanRepayments || orderData.loan_repayments || orderData.partialPayments || []) : undefined,
      loan_repayments: isLoan ? (orderData.loanRepayments || orderData.loan_repayments || orderData.partialPayments || []) : undefined,
    };
    addSupabaseOrder(newOrder);
    setCart([]);
    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (orderToUpdate) {
      const updated = { ...orderToUpdate, status, updatedAt: new Date().toISOString() };
      return await updateSupabaseOrder(updated);
    }
  };

  const updateOrder = async (updatedOrder: Order) => {
    const updated = { ...updatedOrder, updatedAt: new Date().toISOString() };
    return await updateSupabaseOrder(updated);
  };

  // POS Actions
  const addPOSTransaction = async (txData: POSTransaction) => {
    const res = await addSupabasePOSTransaction(txData);
    if (!res || !res.success) {
      throw new Error(res?.error || 'Failed to save POS transaction to Supabase');
    }
  };

  const updatePOSTransaction = async (txData: POSTransaction) => {
    const res = await updateSupabasePOSTransaction(txData);
    if (!res || !res.success) {
      throw new Error(res?.error || 'Failed to update POS transaction in Supabase');
    }
  };

  // Inventory Product Actions
  const addProduct = async (productData: Omit<Product, 'id'> | Product): Promise<Product> => {
    const newProduct: Product = {
      ...productData,
      id: (productData as any).id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const res = await addSupabaseProduct(newProduct);
    if (!res || !res.success) {
      throw new Error(res?.error || 'Failed to add product to database');
    }
    return newProduct;
  };

  const updateProduct = async (updatedProduct: Product) => {
    const res = await updateSupabaseProduct(updatedProduct);
    if (!res || !res.success) {
      throw new Error(res?.error || 'Failed to update product in Supabase');
    }
  };

  const deleteProduct = useCallback(async (productId: string) => {
    const res = await deleteSupabaseProduct(productId);
    if (!res || !res.success) {
      throw new Error(res?.error || 'Failed to delete product from Supabase');
    }
  }, [deleteSupabaseProduct]);

  // Staff Actions
  const addStaff = async (staffData: Omit<Staff, 'id' | 'createdAt'> & { password?: string }) => {
    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: staffData.email,
          password: staffData.password || 'password123',
          fullName: staffData.name,
          role: staffData.role,
          status: staffData.status || 'Active',
          phone: staffData.phone,
          avatar: staffData.avatar,
          permissions: staffData.permissions
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create staff');
      }
      const data = await response.json();
      return data.staff;
    } catch (err) {
      console.error('Error adding staff:', err);
      customAlert(`Failed to add staff: ${err instanceof Error ? err.message : 'Unknown error'}`, 'Error', 'error');
      throw err;
    }
  };

  const updateStaff = async (staffData: Staff) => {
    try {
      const response = await fetch(`/api/admin/staff/${staffData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update staff');
      }
      updateSupabaseStaff(staffData);
      const data = await response.json();
      return data.staff;
    } catch (err) {
      console.error('Error updating staff:', err);
      customAlert(`Failed to update staff: ${err instanceof Error ? err.message : 'Unknown error'}`, 'Error', 'error');
      throw err;
    }
  };

  const resetStaffPassword = async (staffId: string, newPassword?: string) => {
    try {
      const response = await fetch(`/api/admin/staff/${staffId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset password');
      }
      return await response.json();
    } catch (err) {
      console.error('Error resetting password:', err);
      customAlert(`Failed to reset password: ${err instanceof Error ? err.message : 'Unknown error'}`, 'Error', 'error');
      throw err;
    }
  };

  const resetCustomerPassword = async (customerId: string, newPassword?: string, email?: string) => {
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(customerId)}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword, email })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to reset password');
      }
      return await response.json();
    } catch (err) {
      console.error('Error resetting customer password:', err);
      customAlert(`Failed to reset password: ${err instanceof Error ? err.message : 'Unknown error'}`, 'Error', 'error');
      throw err;
    }
  };

  const deleteStaff = async (staffId: string) => {
    try {
      // 1. Immediately remove from local state & cloud collection
      deleteSupabaseStaff(staffId);
      deleteSupabaseProfile(staffId);

      // 2. Authoritative deletion on backend (Auth + DB + in-memory store)
      const response = await fetch(`/api/admin/staff/${encodeURIComponent(staffId)}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete staff');
      }
    } catch (err) {
      console.error('Error deleting staff:', err);
      customAlert(`Failed to delete staff: ${err instanceof Error ? err.message : 'Unknown error'}`, 'Error', 'error');
    }
  };

  const deleteCustomer = async (customerId: string, email?: string) => {
    try {
      // 1. Immediately remove from local state & cloud collection
      deleteSupabaseProfile(customerId);
      deleteSupabaseStaff(customerId);

      // 2. Authoritative deletion on backend (Auth + DB + in-memory store)
      const response = await fetch(`/api/admin/users/${encodeURIComponent(customerId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      customAlert(`Failed to delete user: ${err instanceof Error ? err.message : 'Unknown error'}`, 'Error', 'error');
    }
  };

  const updateCustomerProfile = async (profileData: UserProfile) => {
    try {
      updateSupabaseProfile(profileData);
      await fetch(`/api/data/profiles/${profileData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
    } catch (err) {
      console.error('Error updating customer profile:', err);
    }
  };

  const cartCount = cart.reduce((a, c) => a + c.quantity, 0);

  const activeTheme = currentView === 'client' ? effectiveClientTheme : effectiveAdminTheme;
  const isAdminActive = currentView === 'admin' && Boolean(user && (profile?.role === 'admin' || user?.email === 'admin@genuine-electronics.com'));

  return (
    <div className={`${isAdminActive ? 'h-screen overflow-hidden' : 'min-h-screen'} flex flex-col font-sans transition-colors duration-200 ${
      activeTheme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {loading ? (
        <div className={`min-h-screen flex items-center justify-center w-full ${activeTheme === 'dark' ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900'}`}>
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
            <p className={`text-sm font-medium ${activeTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Securing Connection...</p>
            <p className={`text-xs ${activeTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{authLoading ? 'Checking authentication status...' : 'Finalizing UI...'}</p>
          </div>
        </div>
      ) : (
        <>
          <Suspense fallback={null}><InternetConnectionBanner /></Suspense>
          <Suspense fallback={null}><InstallPwaBanner theme={activeTheme} /></Suspense>
          {AlertsComponent}

          {currentView === 'client' ? (
            <div className="w-full flex-1 flex flex-col min-h-screen">
              <div className="w-full flex-1 flex flex-col">
                <Navbar categoriesList={categories}
                  currentView={currentView}
                  setCurrentView={setCurrentView}
                  cartCount={cartCount}
                  wishlistCount={wishlist.length}
                  onOpenCart={() => setIsCartOpen(true)}
                  onOpenWishlist={() => {
                    window.dispatchEvent(new CustomEvent('nav-action', { detail: 'wishlist' }));
                  }}
                  onOpenOrders={() => {
                    setProfileModalTab('orders');
                    setIsProfileModalOpen(true);
                  }}
                  onOpenProfile={() => {
                    setProfileModalTab('profile');
                    setIsProfileModalOpen(true);
                  }}
                  onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  products={products}
                  theme={effectiveClientTheme}
                  onToggleTheme={cycleClientTheme}
                  clientThemeMode={clientThemeMode}
                  storeSettings={storeSettings}
                  user={user}
                  profile={profile}
                  onLogout={handleAdminLogout}
                  onLoginClick={() => setIsAuthModalOpen(true)}
                />
                <Suspense fallback={<div className="flex-1 flex items-center justify-center p-12"><div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div></div>}>
                <ClientApp
                  products={productsWithReviews}
                  productsLoading={productsLoading}
                  categoriesList={categories}
                  cart={cart}
                  addToCart={addToCart}
                  removeFromCart={removeFromCart}
                  updateCartQuantity={updateCartQuantity}
                  wishlist={wishlist}
                  toggleWishlist={toggleWishlist}
                  orders={orders}
                  createOrder={createOrder}
                  onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  isCartOpen={isCartOpen}
                  setIsCartOpen={setIsCartOpen}
                  theme={effectiveClientTheme}
                  storeSettings={storeSettings}
                  user={user}
                  profile={profile}
                  onLogout={handleAdminLogout}
                  onLoginClick={() => setIsAuthModalOpen(true)}
                />
                </Suspense>
              </div>
              <Suspense fallback={null}>
                <Footer categoriesList={categories} storeSettings={storeSettings} />
              </Suspense>

              {/* Client Profile & Orders Tracking Modal */}
              <Suspense fallback={null}>
              <ClientProfileModal
                storeSettings={storeSettings} 
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                user={user}
                profile={profile}
                orders={orders}
                onUpdateProfile={(updated) => {
                  if (user || profile) {
                    updateCustomerProfile({
                      ...(profile || {}),
                      ...updated,
                      id: user?.id || profile?.id || 'client-profile'
                    });
                  }
                }}
                initialTab={profileModalTab}
                onLogout={() => {
                  handleAdminLogout();
                  setIsProfileModalOpen(false);
                }}
                isDark={effectiveClientTheme === 'dark'}
              />
              </Suspense>

              {/* Storefront Auth Screen Modal */}
              {isAuthModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
                  <div className="relative w-full max-w-md">
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}><AuthScreen 
                      theme={effectiveClientTheme}
                      sessionExpiredMessage={sessionExpiredNotice}
                      onSuccess={handleAuthSuccess}
                      onCancel={() => {
                        setIsAuthModalOpen(false);
                        setSessionExpiredNotice(null);
                      }}
                    /></Suspense>
                  </div>
                </div>
              )}
            </div>
          ) : (
            user ? (
              (profile?.role === 'admin' || user?.email === 'admin@genuine-electronics.com') ? (
                <div className="w-full flex-1 flex flex-col">
                  <Suspense fallback={<div className="flex-1 flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}><AdminApp
                    user={user}
                    profile={profile}
                    products={products}
                    categories={categories}
                    addCategory={addCategory}
                    updateCategory={updateCategory}
                    deleteCategory={deleteCategory}
                    clearCategories={clearCategories}
                    addProduct={addProduct}
                    updateProduct={updateProduct}
                    deleteProduct={deleteProduct}
                    clearProducts={clearProducts}
                    orders={orders}
                    updateOrderStatus={updateOrderStatus}
                    updateOrder={updateOrder}
                    deleteOrder={deleteOrder}
                    clearOrders={clearOrders}
                    posTransactions={posTransactions}
                    addPOSTransaction={addPOSTransaction}
                    updatePOSTransaction={updatePOSTransaction}
                    deletePOSTransaction={deletePOSTransaction}
                    clearPOSTransactions={clearPOSTransactions}
                    staff={staff}
                    addStaff={addStaff}
                    updateStaff={updateStaff}
                    deleteStaff={deleteStaff}
                    clearStaff={clearStaff}
                    resetStaffPassword={resetStaffPassword}
                    resetCustomerPassword={resetCustomerPassword}
                    profiles={profiles}
                    updateCustomerProfile={updateCustomerProfile}
                    deleteCustomer={deleteCustomer}
                    deleteUser={deleteCustomer}
                    clearProfiles={clearProfiles}
                    onSwitchToClient={() => setCurrentView('client')}
                    onSwitchToClientWithSearch={(query: string) => {
                      setSearchTerm(query);
                      setCurrentView('client');
                    }}
                    onLogout={handleAdminLogout}
                    theme={effectiveAdminTheme}
                    adminThemeMode={adminThemeMode}
                    onToggleTheme={cycleAdminTheme}
                    onSetAdminThemeMode={setAdminThemeMode}
                    storeSettings={storeSettings}
                    onUpdateStoreSettings={handleUpdateStoreSettings}
                  /></Suspense>
                </div>
              ) : (
                <div className={`min-h-screen flex items-center justify-center p-4 ${effectiveAdminTheme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
                  <div className={`max-w-md w-full p-8 rounded-2xl border text-center ${effectiveAdminTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${!profile ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                      <ShieldCheck className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{!profile ? 'Profile Not Found' : 'Access Denied'}</h2>
                    <p className={`mb-6 ${effectiveAdminTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {!profile 
                        ? "We couldn't retrieve your user profile. Please try logging in again or contact support."
                        : "Your account does not have administrative privileges. Please contact the store owner if you believe this is an error."}
                    </p>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => setCurrentView('client')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                      >
                        Return to Storefront
                      </button>
                      <button
                        onClick={handleAdminLogout}
                        className={`w-full font-semibold py-3 px-6 rounded-xl border ${effectiveAdminTheme === 'dark' ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <Suspense fallback={<div className="flex-1 flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}><AuthScreen 
                theme={effectiveAdminTheme} 
                sessionExpiredMessage={sessionExpiredNotice}
                onSuccess={handleAuthSuccess} 
                onCancel={() => {
                  setCurrentView('client');
                  setSessionExpiredNotice(null);
                }} 
              /></Suspense>
            )
          )}

          {/* Orbi AI Assistant Floating Widget */}
          {isAiAssistantOpen && (
            <Suspense fallback={null}>
            <AIChatWidget
              isOpen={isAiAssistantOpen}
              onClose={() => setIsAiAssistantOpen(false)}
              products={products}
              theme={effectiveClientTheme}
              storeSettings={storeSettings}
              onSelectProduct={handleSelectProductFromAI}
            />
          </Suspense>
          )}

          {/* Unified Floating Raised Chat Icon Hub with Pulsing Heartbeat Waves (Solid Modern Look) */}
          {currentView === 'client' && !isAiAssistantOpen && (
            <aside
              aria-label="Ask Orbi AI & Support"
              className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-3 pointer-events-auto select-none no-print group"
            >
              {/* Tooltip Label on Hover */}
              <div className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-2xl border backdrop-blur-md opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-3 transition-all duration-300 pointer-events-none ${
                effectiveClientTheme === 'dark' 
                  ? 'bg-slate-900/95 text-white border-slate-700/80' 
                  : 'bg-white/95 text-slate-900 border-slate-200'
              }`}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Orbi AI & WhatsApp Support</span>
              </div>

              {/* Floating Compact Circular Launcher with Transparent Dark Blue Background & Light Blue Icon */}
              <div className="relative flex items-center justify-center">
                {/* Outer Heartbeat Radar Waves */}
                <span className="absolute -inset-2 rounded-full bg-sky-400/20 animate-ping pointer-events-none" />
                <span className="absolute -inset-1 rounded-full bg-sky-400/15 animate-pulse pointer-events-none" />

                <button
                  type="button"
                  onClick={() => setIsAiAssistantOpen(true)}
                  className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center shadow-xl border-2 backdrop-blur-md active:scale-95 hover:scale-105 transition-all duration-300 cursor-pointer ${
                    effectiveClientTheme === 'dark'
                      ? 'bg-blue-950/80 hover:bg-blue-900/90 text-white shadow-blue-950/60 border-sky-400/50'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 border-indigo-400/50'
                  }`}
                  title="Ask Orbi AI & Direct WhatsApp Support"
                >
                  <div className="relative flex items-center justify-center">
                    <MessageSquareText className="w-5 h-5 sm:w-6 sm:h-6 text-sky-200 drop-shadow-sm" />
                    {/* Online green indicator */}
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 ${
                        effectiveClientTheme === 'dark' ? 'border-blue-950' : 'border-indigo-600'
                      }`}></span>
                    </span>
                  </div>
                  <Sparkles className="absolute top-1.5 right-1.5 w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-300 animate-pulse" />
                </button>
              </div>
            </aside>
          )}

          {/* Privacy & Cookie Consent Banner */}
          {currentView === 'client' && (
            <Suspense fallback={null}>
              <CookieConsentBanner />
            </Suspense>
          )}

          {/* Full Screen Save Loader for Client Operations */}
          {currentView === 'client' && (
            <FullScreenSaveLoader
              isVisible={clientActiveCloudOps > 0}
              tableName={clientCloudOpDetails?.tableName}
              action={clientCloudOpDetails?.action}
              onForceDismiss={() => {
                setClientActiveCloudOps(0);
                setClientCloudOpDetails(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

