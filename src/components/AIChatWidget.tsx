import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Cpu, ShieldCheck, MessageCircle, ExternalLink, CheckCircle2, Image as ImageIcon, AlertTriangle, Paperclip, ShoppingBag, ArrowRight, Hash, Tag, Search, Plus, Eye, RotateCcw, Clock } from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface AIChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  theme?: 'dark' | 'light';
  storeSettings?: StoreSettings;
  initialMode?: 'ai' | 'whatsapp';
  onSelectProduct?: (product: Product) => void;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  image?: string | null;
  isError?: boolean;
  isLimitReached?: boolean;
  linkedProducts?: Product[];
  taggedProducts?: Product[];
  timestamp?: number;
}

const CHAT_STORAGE_KEY = 'ge_orbi_ai_chat_history_v2';
const USAGE_STORAGE_KEY = 'ge_orbi_ai_daily_usage_v2';
const DAILY_MAX_RESPONSES = 20;

// Helper to get today's date key YYYY-MM-DD
const getTodayKey = () => new Date().toISOString().slice(0, 10);

// Helper to load stored daily AI responses count
const getStoredDailyUsage = (): { count: number; date: string } => {
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === getTodayKey()) {
        return { count: Number(parsed.count) || 0, date: parsed.date };
      }
    }
  } catch (e) {
    console.error('Error reading AI usage from storage:', e);
  }
  return { count: 0, date: getTodayKey() };
};

// Helper to update stored daily AI responses count
const incrementStoredDailyUsage = (): number => {
  try {
    const current = getStoredDailyUsage();
    const newCount = current.count + 1;
    localStorage.setItem(
      USAGE_STORAGE_KEY,
      JSON.stringify({ count: newCount, date: getTodayKey() })
    );
    return newCount;
  } catch (e) {
    console.error('Error saving AI usage to storage:', e);
    return 1;
  }
};

// Fallback Image Component to prevent broken images
const ProductImageWithFallback: React.FC<{ src?: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return (
      <div className={`flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0 ${className || 'w-8 h-8 rounded-lg'}`}>
        <ShoppingBag className="w-1/2 h-1/2 opacity-70" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setImgError(true)}
    />
  );
};

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({
  isOpen,
  onClose,
  products = [],
  theme = 'light',
  storeSettings,
  initialMode = 'ai',
  onSelectProduct,
}) => {
  const isDark = theme === 'dark';
  const { language } = useLanguage();
  const isSwahili = language === 'sw';

  const getWelcomeText = (lang: string) => {
    if (lang === 'sw') {
      return "Habari! Mimi ni **Orbi AI**, msaidizi wako wa ununuzi na ubora wa vifaa halisi vya Genuine Electronics Tanzania.\n\n### Jinsi ninavyoweza kukusaidia leo:\n- Kulinganisha **4K Smart TVs**, saizi za Majokofu, na AC za Inverter\n- Kuthibitisha **waranti rasmi ya miaka 2** na namba halisi za utambulisho (Serial Numbers)\n- Kuangalia upatikanaji wa bidhaa stoo na huduma ya kuletewa siku hiyo hiyo Dar es Salaam\n- Kuchambua picha za lebo au namba ya modeli unayotaka kuulizia\n\n💡 *Kidokezo: Andika **#** kwenye ujumbe wako kutaja bidhaa yoyote kutoka dukani!*";
    }
    return "Hello! I am **Orbi AI**, your Genuine Electronics shopping & specs assistant.\n\n### How I can help you today:\n- Compare **4K Smart TVs**, Refrigerator sizes, & Inverter ACs\n- Verify **official 2-year warranty** & genuine serial numbers\n- Check live store stock & same-day Dar es Salaam delivery\n- Analyze uploaded device model photos or serial labels\n\n💡 *Tip: Type **#** in your message to tag any product from our catalog!*";
  };

  const [chatMode, setChatMode] = useState<'ai' | 'whatsapp'>(initialMode);
  
  // Load chat history from localStorage or default to welcome message
  const [messages, setMessages] = useState<MessageItem[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading chat history:', e);
    }
    return [
      {
        id: 'welcome-1',
        sender: 'bot',
        text: getWelcomeText(language),
        timestamp: Date.now(),
      },
    ];
  });

  // Daily AI responses counter tracked locally per device
  const [dailyUsage, setDailyUsage] = useState<{ count: number; date: string }>(() => getStoredDailyUsage());

  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [taggedProducts, setTaggedProducts] = useState<Product[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [whatsappCustomMsg, setWhatsappCustomMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const aiInputRef = useRef<HTMLTextAreaElement | null>(null);
  const waInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync and persist chat messages to device local storage for seamless restoration
  useEffect(() => {
    try {
      if (messages.length > 0) {
        // Keep up to latest 50 messages to keep local storage clean & fast
        const toSave = messages.slice(-50);
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
      }
    } catch (e) {
      console.error('Error saving chat history to localStorage:', e);
    }
  }, [messages]);

  // Keep daily usage synced with current day
  useEffect(() => {
    const usage = getStoredDailyUsage();
    setDailyUsage(usage);
  }, []);

  // Clear / Reset chat function
  const handleClearChat = () => {
    const initialMsg: MessageItem = {
      id: `welcome-${Date.now()}`,
      sender: 'bot',
      text: getWelcomeText(language),
      timestamp: Date.now(),
    };
    setMessages([initialMsg]);
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify([initialMsg]));
    } catch (e) {
      console.error('Error clearing chat history:', e);
    }
  };

  // Auto-resize AI input textarea dynamically as user types
  useEffect(() => {
    if (aiInputRef.current) {
      aiInputRef.current.style.height = 'auto';
      const scrollH = aiInputRef.current.scrollHeight;
      const targetHeight = Math.min(Math.max(scrollH, 38), 120);
      aiInputRef.current.style.height = `${targetHeight}px`;
    }
  }, [input]);

  // Auto-resize WhatsApp input textarea dynamically as user types
  useEffect(() => {
    if (waInputRef.current) {
      waInputRef.current.style.height = 'auto';
      const scrollH = waInputRef.current.scrollHeight;
      const targetHeight = Math.min(Math.max(scrollH, 38), 120);
      waInputRef.current.style.height = `${targetHeight}px`;
    }
  }, [whatsappCustomMsg]);

  // Update default welcome message if user toggles client language before chatting
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome-1') {
        return [
          {
            id: 'welcome-1',
            sender: 'bot',
            text: getWelcomeText(language),
          },
        ];
      }
      return prev;
    });
  }, [language]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Direct Product Inspection / Navigation Action
  const handleInspectProduct = (p: Product) => {
    if (onSelectProduct) {
      onSelectProduct(p);
    } else {
      window.history.pushState(null, '', `/product/${p.id}`);
      window.dispatchEvent(new CustomEvent('nav-action', { detail: `product_${p.id}` }));
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    onClose();
  };

  // Dynamic WhatsApp Contact Setup
  const rawPhone = storeSettings?.whatsappNumber || storeSettings?.phone || '+255624057166';
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '') || '255624057166';
  const targetPhone = cleanPhone.startsWith('0') ? `255${cleanPhone.slice(1)}` : cleanPhone;
  const formattedDisplayPhone = `+${targetPhone.slice(0, 3)} ${targetPhone.slice(3, 6)} ${targetPhone.slice(6, 9)} ${targetPhone.slice(9)}`.trim();

  const openWhatsApp = (customMsg?: string) => {
    let text = customMsg || whatsappCustomMsg || (isSwahili ? `Habari Genuine Electronics Tanzania! Nahitaji msaada kutoka kwa muuzaji.` : `Hello Genuine Electronics Tanzania! I need assistance from your sales team.`);
    if (taggedProducts.length > 0) {
      const taggedNames = taggedProducts.map((p) => `${p.name} (TZS ${p.price.toLocaleString()})`).join(', ');
      text += `\n\n[Tagged Item: ${taggedNames}]`;
    }
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  // Handle Image File Selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Please select an image smaller than 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Filtered Products for Picker
  const filteredProducts = products.filter((p) => {
    if (!productSearchQuery) return true;
    const q = productSearchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    );
  }).slice(0, 8); // Top 8 matches

  // Dynamic input change & # hashtag auto-search filter logic
  const handleTextChange = (val: string, mode: 'ai' | 'whatsapp') => {
    if (mode === 'ai') {
      setInput(val);
    } else {
      setWhatsappCustomMsg(val);
    }

    const hashIndex = val.lastIndexOf('#');
    if (hashIndex !== -1) {
      const queryAfterHash = val.slice(hashIndex + 1);
      const q = queryAfterHash.toLowerCase().trim();
      setShowProductPicker(true);
      setProductSearchQuery(q);
    } else {
      if (showProductPicker) {
        setShowProductPicker(false);
        setProductSearchQuery('');
      }
    }
  };

  // Trigger # Tag button with active focus right after #
  const triggerHashTagPill = (mode: 'ai' | 'whatsapp') => {
    const activeText = mode === 'ai' ? input : whatsappCustomMsg;
    const ref = mode === 'ai' ? aiInputRef : waInputRef;

    let updatedText = activeText;
    const hashIndex = activeText.lastIndexOf('#');

    if (hashIndex === -1) {
      // Append # to input text
      updatedText = activeText ? (activeText.endsWith(' ') ? `${activeText}#` : `${activeText} #`) : '#';
      handleTextChange(updatedText, mode);
    } else {
      // If # already exists, keep picker open and sync query
      const queryAfterHash = activeText.slice(hashIndex + 1);
      setShowProductPicker(true);
      setProductSearchQuery(queryAfterHash.toLowerCase().trim());
    }

    // Set text box focus and place cursor right after the #
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        const targetPos = hashIndex !== -1 ? hashIndex + 1 : updatedText.length;
        ref.current.setSelectionRange(targetPos, updatedText.length);
      }
    }, 30);
  };

  // Add a product tag pill & cleanup trailing hashtag from input
  const addTaggedProduct = (product: Product, mode: 'ai' | 'whatsapp') => {
    if (!taggedProducts.find((p) => p.id === product.id)) {
      setTaggedProducts((prev) => [...prev, product]);
    }

    const activeText = mode === 'ai' ? input : whatsappCustomMsg;
    const hashIndex = activeText.lastIndexOf('#');
    if (hashIndex !== -1) {
      const cleanedText = activeText.slice(0, hashIndex).trim();
      if (mode === 'ai') {
        setInput(cleanedText);
      } else {
        setWhatsappCustomMsg(cleanedText);
      }
    }
    setShowProductPicker(false);
    setProductSearchQuery('');

    // Focus input and move cursor after tagged text
    const ref = mode === 'ai' ? aiInputRef : waInputRef;
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        const len = ref.current.value.length;
        ref.current.setSelectionRange(len, len);
      }
    }, 30);
  };

  const removeTaggedProduct = (productId: string) => {
    setTaggedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // Render Product Picker Popover
  const renderProductPickerPopover = (mode: 'ai' | 'whatsapp') => {
    if (!showProductPicker) return null;

    return (
      <div className={`p-2.5 border-t border-b shadow-2xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-bottom-1 ${
        isDark ? 'bg-slate-900 border-indigo-900/60' : 'bg-slate-50 border-indigo-200'
      }`}>
        <div className={`flex items-center justify-between pb-2 mb-2 border-b text-xs font-bold text-indigo-500 ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <span className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-indigo-500" />
            {filteredProducts.length > 0 
              ? `Matching Catalog Products (${filteredProducts.length}):` 
              : `No catalog matches for "${productSearchQuery ? '#' + productSearchQuery : '#'}"`}
          </span>
          <button
            type="button"
            onClick={() => setShowProductPicker(false)}
            aria-label="Close product tags popover"
            className={`p-0.5 cursor-pointer transition-colors ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Close suggestion pills"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {filteredProducts.length > 0 ? (
          <div className="space-y-1.5">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addTaggedProduct(p, mode)}
                aria-label={`Tag product ${p.name}`}
                className={`w-full text-left p-2 rounded-xl border flex items-center gap-2.5 transition-all text-xs cursor-pointer ${
                  isDark 
                    ? 'bg-slate-950 hover:bg-indigo-950/70 border-slate-800 hover:border-indigo-500/60 text-slate-200' 
                    : 'bg-white hover:bg-indigo-50 border-slate-200 hover:border-indigo-300 text-slate-800'
                }`}
              >
                <ProductImageWithFallback src={p.image} alt={p.name} className="w-7 h-7 rounded-lg object-cover border border-slate-700/50" />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold truncate text-xs">{p.name}</p>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{p.brand} • TZS {p.price.toLocaleString()}</span>
                </div>
                <Plus className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 italic py-1 text-center">Type product name, brand, or model to filter catalog items...</p>
        )}
      </div>
    );
  };

  // Extract linked products from text or catalog matching
  const findLinkedProducts = (text: string): Product[] => {
    const linked: Product[] = [];
    const foundIds = new Set<string>();

    // 1. Look for explicit [PRODUCT:id] tags
    const tagMatches = text.match(/\[PRODUCT:([a-zA-Z0-9_\-.:]+)\]/gi);
    if (tagMatches) {
      tagMatches.forEach((tag) => {
        const id = tag.replace(/\[PRODUCT:/i, '').replace(']', '').trim();
        const p = products.find(
          (prod) =>
            prod.id.toLowerCase() === id.toLowerCase() ||
            (prod.sku && prod.sku.toLowerCase() === id.toLowerCase()) ||
            prod.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === id.toLowerCase()
        );
        if (p && !foundIds.has(p.id)) {
          foundIds.add(p.id);
          linked.push(p);
        }
      });
    }

    // 2. Look for catalog product names or model numbers in text
    if (products.length > 0) {
      const lowerText = text.toLowerCase();
      products.forEach((p) => {
        if (foundIds.has(p.id)) return;
        const lowerName = p.name.toLowerCase();
        if (lowerText.includes(lowerName) || (p.sku && lowerText.includes(p.sku.toLowerCase()))) {
          foundIds.add(p.id);
          linked.push(p);
        }
      });
    }

    return linked.slice(0, 4);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !selectedImage && taggedProducts.length === 0) || loading) return;

    const userMsg = input.trim();
    const currentImg = selectedImage;
    const currentTagged = [...taggedProducts];

    setInput('');
    if (aiInputRef.current) {
      aiInputRef.current.style.height = '38px';
    }
    setSelectedImage(null);
    setTaggedProducts([]);
    setShowProductPicker(false);

    // Build user message text with tagged product context
    let fullUserPrompt = userMsg;
    if (currentTagged.length > 0) {
      const taggedDetails = currentTagged.map((p) => `[Tagged Item: ${p.name} - Brand: ${p.brand}, Price: TZS ${p.price.toLocaleString()}, SKU: ${p.sku || p.id}]`).join(' ');
      fullUserPrompt = `${userMsg} ${taggedDetails}`.trim();
    }

    const userMessageObj: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userMsg || (currentImg ? (isSwahili ? 'Picha imeambatanishwa kwa uchambuzi wa AI' : 'Attached photo for analysis') : (isSwahili ? 'Naulizia kuhusu bidhaa zilizotajwa' : 'Inquiring about tagged items')),
      image: currentImg,
      taggedProducts: currentTagged,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessageObj]);

    // Check if daily AI message limit is reached (20 responses per user/day) to save API tokens
    const currentUsage = getStoredDailyUsage();
    if (currentUsage.count >= DAILY_MAX_RESPONSES) {
      setDailyUsage(currentUsage);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-limit-${Date.now()}`,
          sender: 'bot',
          isLimitReached: true,
          text: isSwahili
            ? `Umefikia ukomo wa majibu ya AI ya bure kwa siku ya leo (**${DAILY_MAX_RESPONSES}/${DAILY_MAX_RESPONSES}**).\n\nKwa ufafanuzi zaidi, usaidizi wa picha za ziada, kagua bei au punguzo maalum la dukani, tafadhali ungana sasa hivi na afisa wetu wa huduma kwa wateja moja kwa moja kupitia **WhatsApp (${formattedDisplayPhone})**.`
            : `You have reached your free daily AI assistant response limit (**${DAILY_MAX_RESPONSES}/${DAILY_MAX_RESPONSES}**).\n\nFor further clarification, extended visual assistance, or special store discounts, please connect directly with our live sales agent on **WhatsApp (${formattedDisplayPhone})**.`,
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 35000);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: fullUserPrompt,
          image: currentImg,
          language,
          context: isSwahili 
            ? 'Ushauri na msaada wa ununuzi wa vifaa halisi vya elektroniki Tanzania'
            : 'Orbi AI client shopping assistance and genuine electronics specs consultation for Tanzania',
          productCatalog: products.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            brand: p.brand,
            category: p.category,
            price: p.price,
            discountPrice: p.discountPrice,
            discountPercentage: p.discountPercentage,
            isOnOffer: p.isOnOffer,
            offerTitle: p.offerTitle,
            description: p.description ? p.description.slice(0, 120) : '',
            specs: p.specs,
            warranty: p.warranty,
            stock: p.stock ?? p.stockCount,
            inStock: p.inStock,
            tonnage: p.tonnage,
            capacity: p.capacity,
            energyRating: p.energyRating,
          })),
        }),
      });
      clearTimeout(fetchTimeout);

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-err-${Date.now()}`,
            sender: 'bot',
            text: data.reply || (isSwahili
              ? `Orbi AI inapata changamoto ya mawasiliano kwa muda. Tafadhali bofya hapa chini kuwasiliana moja kwa moja na muuzaji wetu WhatsApp (${formattedDisplayPhone}).`
              : `Orbi AI is temporarily experiencing a connection delay. Please click below to chat directly with our store agent on WhatsApp (${formattedDisplayPhone}).`),
            isError: true,
            timestamp: Date.now(),
          },
        ]);
      } else {
        const botReplyText = data.reply || (isSwahili ? 'Nipo hapa kukusaidia kuchagua vifaa bora na halisi vya elektroniki!' : 'I am here to help you select genuine electronics!');
        const matchedProds = findLinkedProducts(botReplyText);

        // Increment daily count on successful AI response
        const newCount = incrementStoredDailyUsage();
        setDailyUsage({ count: newCount, date: getTodayKey() });

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: botReplyText,
            linkedProducts: matchedProds,
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: isSwahili
            ? `Tatizo la muunganisho limetokea. Timu yetu ya mauzo ipo tayari sasa hivi WhatsApp (${formattedDisplayPhone}) kukuhudumia mara moja!`
            : `Connection issue detected. Our live sales support team is active right now on WhatsApp (${formattedDisplayPhone}) to assist you immediately!`,
          isError: true,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format bot markdown text cleanly with dynamic CSS badges, lists, and inline product inspection chips
  const renderFormattedBotText = (rawText: string) => {
    const lines = rawText.split('\n');

    return (
      <div className="space-y-2 text-xs leading-relaxed">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
            const headingText = trimmed.replace(/^#+\s*/, '');
            return (
              <h4 key={lIdx} className={`font-black text-sm ${isDark ? 'text-indigo-300' : 'text-indigo-600'} mt-2 mb-1 flex items-center gap-1.5 border-b border-indigo-500/20 pb-1`}>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{headingText}</span>
              </h4>
            );
          }

          if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            const bulletText = trimmed.replace(/^[-*]\s*/, '');
            return (
              <div key={lIdx} className="flex items-start gap-2 pl-1 my-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <div className="flex-1">
                  {renderInlineFormatting(bulletText)}
                </div>
              </div>
            );
          }

          return (
            <p key={lIdx} className="my-1">
              {renderInlineFormatting(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  // Process inline bolding (**text**), Price highlights (TZS), and [PRODUCT:id] interactive chips
  const renderInlineFormatting = (text: string) => {
    const tokens = text.split(/(\[PRODUCT:[a-zA-Z0-9_\-.:]+\]|\*\*.*?\*\*)/gi);
    return tokens.map((token, tIdx) => {
      if (token.startsWith('[PRODUCT:') && token.endsWith(']')) {
        const prodId = token.replace(/\[PRODUCT:/i, '').replace(']', '').trim();
        const p = products.find(
          (prod) =>
            prod.id.toLowerCase() === prodId.toLowerCase() ||
            (prod.sku && prod.sku.toLowerCase() === prodId.toLowerCase()) ||
            prod.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === prodId.toLowerCase()
        );
        if (p) {
          return (
            <button
              key={tIdx}
              type="button"
              onClick={() => handleInspectProduct(p)}
              className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 dark:text-indigo-300 font-bold border border-indigo-500/30 transition-all cursor-pointer text-[11px] align-baseline shadow-2xs hover:scale-105 active:scale-95"
              title={isSwahili ? `Kagua ${p.name}` : `Inspect ${p.name}`}
            >
              <ShoppingBag className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="truncate max-w-[150px]">{p.name}</span>
              <ExternalLink className="w-2.5 h-2.5 shrink-0 ml-0.5 opacity-75" />
            </button>
          );
        }
        return null;
      }

      if (token.startsWith('**') && token.endsWith('**')) {
        const content = token.slice(2, -2);
        const isPrice = content.includes('TZS') || content.match(/\d+,\d+/);
        return (
          <strong
            key={tIdx}
            className={`font-black ${
              isPrice
                ? `${isDark ? 'text-emerald-400' : 'text-emerald-600'} bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20`
                : `${isDark ? 'text-white' : 'text-slate-900'}`
            }`}
          >
            {content}
          </strong>
        );
      }

      return token;
    });
  };

  return (
    <div className={`fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-[100] w-full h-full sm:w-[420px] sm:max-w-md sm:h-[600px] sm:max-h-[88vh] rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border overflow-hidden flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
      isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Header */}
      <div className={`p-3.5 sm:p-4 flex flex-col gap-2.5 shrink-0 border-b transition-colors ${
        isDark 
          ? 'bg-slate-950 text-white border-slate-800' 
          : 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-md transition-colors ${
              chatMode === 'ai' 
                ? (isDark ? 'bg-indigo-600 border border-indigo-400/40' : 'bg-white/20 border border-white/30 text-white')
                : 'bg-[#25D366] border border-emerald-400/40'
            }`}>
              {chatMode === 'ai' ? <Bot className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-sm flex items-center gap-1.5 tracking-tight text-white">
                {chatMode === 'ai' 
                  ? (isSwahili ? 'Msaidizi wa Ununuzi Orbi AI' : 'Orbi AI Shopping Assistant')
                  : (isSwahili ? 'Huduma kwa Wateja Genuine Electronics' : 'Genuine Electronics Support')}
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className={`text-[10px] flex items-center gap-1 font-medium ${isDark ? 'text-slate-300' : 'text-indigo-100'}`}>
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  {chatMode === 'ai' 
                    ? (isSwahili ? 'Orbi Tech Tanzania' : 'Orbi Tech Tanzania')
                    : `${formattedDisplayPhone}`}
                </p>
                {chatMode === 'ai' && (
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md flex items-center gap-0.5 ${
                      dailyUsage.count >= DAILY_MAX_RESPONSES
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : isDark
                        ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                        : 'bg-white/20 text-white border border-white/30'
                    }`}
                    title={isSwahili ? `Majibu ya AI: ${dailyUsage.count} kati ya ${DAILY_MAX_RESPONSES} kwa siku ya leo` : `Daily AI quota: ${dailyUsage.count}/${DAILY_MAX_RESPONSES} responses used`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    {dailyUsage.count}/{DAILY_MAX_RESPONSES}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {chatMode === 'ai' && messages.length > 1 && (
              <button
                type="button"
                onClick={handleClearChat}
                aria-label={isSwahili ? 'Anzisha mazungumzo upya' : 'Reset chat history'}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-indigo-200 hover:text-white hover:bg-indigo-700/60'
                }`}
                title={isSwahili ? 'Futa na anzisha mazungumzo upya' : 'Clear & start new chat'}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={onClose} 
              aria-label="Close Assistant"
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-indigo-200 hover:text-white hover:bg-indigo-700/60'
              }`}
              title="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className={`grid grid-cols-2 p-1 rounded-2xl border text-xs font-bold transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-indigo-700/60 border-indigo-500/50'
        }`}>
          <button
            type="button"
            onClick={() => setChatMode('ai')}
            aria-label="Switch to Orbi AI Shopping Assistant"
            className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              chatMode === 'ai'
                ? isDark
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-indigo-700 shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-indigo-100 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Orbi AI</span>
          </button>

          <button
            type="button"
            onClick={() => setChatMode('whatsapp')}
            aria-label="Switch to Direct WhatsApp Support"
            className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              chatMode === 'whatsapp'
                ? 'bg-[#25D366] text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-emerald-400'
                : 'text-indigo-100 hover:text-emerald-300'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{isSwahili ? 'WhatsApp ya Moja kwa Moja' : 'Direct WhatsApp'}</span>
          </button>
        </div>
      </div>

      {/* Body: AI Chat Mode vs WhatsApp Support Mode */}
      {chatMode === 'ai' ? (
        <>
          {/* Scrollable Message List */}
          <div className={`flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 ${
            isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'
          }`}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {/* Tagged Product Chips Attached on User Message */}
                {m.taggedProducts && m.taggedProducts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1 max-w-[85%] justify-end">
                    {m.taggedProducts.map((tp) => (
                      <span key={tp.id} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" /> {tp.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Attached Image Preview */}
                {m.image && (
                  <div className="mb-2 max-w-[75%] rounded-2xl overflow-hidden border shadow-sm">
                    <img src={m.image} alt="User upload" className="w-full h-auto max-h-48 object-cover" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[88%] sm:max-w-[85%] rounded-2xl p-3 shadow-xs ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-xs font-medium'
                      : m.isLimitReached
                      ? isDark ? 'bg-amber-950/70 border border-amber-600/60 text-amber-100 rounded-bl-xs' : 'bg-amber-50 border border-amber-300 text-amber-900 rounded-bl-xs'
                      : m.isError
                      ? isDark ? 'bg-rose-950/60 border border-rose-800 text-rose-200 rounded-bl-xs' : 'bg-rose-50 border border-rose-200 text-rose-800 rounded-bl-xs'
                      : isDark
                      ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs shadow-slate-950/50'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-slate-200/50'
                  }`}
                >
                  {m.isLimitReached ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 font-black text-amber-500 text-xs">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{isSwahili ? 'Ukomo wa Majibu ya Leo Umefikiwa (20/20)' : 'Daily Response Quota Reached (20/20)'}</span>
                      </div>
                      {renderFormattedBotText(m.text)}
                      <div className="pt-2 border-t border-amber-500/30 flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => openWhatsApp(isSwahili ? `Habari Genuine Electronics! Nimefikia ukomo wa AI na ningependa ufafanuzi zaidi kuhusu vifaa na bei za dukani.` : `Hello Genuine Electronics! I reached my AI chat quota and would like extended clarification and store quotes.`)}
                          aria-label={`Connect with Live Agent on WhatsApp ${formattedDisplayPhone}`}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                        >
                          <MessageCircle className="w-4 h-4 shrink-0" />
                          <span>{isSwahili ? `Ungana na Muuzaji WhatsApp (${formattedDisplayPhone})` : `Connect Live on WhatsApp (${formattedDisplayPhone})`}</span>
                        </button>
                      </div>
                    </div>
                  ) : m.isError ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5 font-bold text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{isSwahili ? 'Taarifa ya Mawasiliano' : 'Connection Notice'}</span>
                      </div>
                      <p>{m.text}</p>
                      <div className="pt-2 border-t border-rose-800/60 flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => openWhatsApp(isSwahili ? `Habari Genuine Electronics! Nahitaji msaada wa haraka na oda au ushauri wa bidhaa.` : `Hello Genuine Electronics! I need assistance with an order or product inquiry.`)}
                          aria-label={`Chat Direct on WhatsApp ${formattedDisplayPhone}`}
                          className="w-full py-2 px-3 rounded-xl bg-[#25D366] hover:bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>{isSwahili ? `Wasiliana WhatsApp (${formattedDisplayPhone})` : `Chat Direct on WhatsApp (${formattedDisplayPhone})`}</span>
                        </button>
                      </div>
                    </div>
                  ) : m.sender === 'bot' ? (
                    renderFormattedBotText(m.text)
                  ) : (
                    <span className="whitespace-pre-wrap">{m.text}</span>
                  )}
                </div>

                {/* Linked Product Cards Embed in AI Chat with Direct Inspect Navigation */}
                {m.linkedProducts && m.linkedProducts.length > 0 && (
                  <div className="mt-2.5 w-full max-w-[95%] space-y-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" /> {isSwahili ? 'Bidhaa Zilizopendekezwa Kutoka Dukani:' : 'Recommended Catalog Products:'}
                    </p>
                    {m.linkedProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleInspectProduct(p)}
                        className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer group shadow-xs hover:shadow-md ${
                          isDark
                            ? 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/60 hover:bg-slate-850'
                            : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'
                        }`}
                        title={isSwahili ? `Bonyeza kukagua ${p.name}` : `Click to inspect ${p.name}`}
                      >
                        <ProductImageWithFallback
                          src={p.image}
                          alt={p.name}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-700/40 group-hover:scale-105 transition-transform shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className={`font-extrabold text-xs truncate group-hover:text-indigo-400 transition-colors ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}>
                            {p.name}
                          </h5>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-xs font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              TZS {p.price.toLocaleString()}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
                              {p.brand}
                            </span>
                            {p.stock > 0 ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                                {isSwahili ? 'Ipo Stoo' : 'In Stock'}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleInspectProduct(p)}
                            aria-label={`Inspect ${p.name}`}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                            title={isSwahili ? 'Fungua ukurasa wa bidhaa na sifa zote' : 'Open full product page and specs'}
                          >
                            <span>{isSwahili ? 'Kagua' : 'Inspect'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openWhatsApp(isSwahili ? `Habari Genuine Electronics! Nahitaji kuulizia upatikanaji wa: ${p.name} (TZS ${p.price.toLocaleString()})` : `Hello Genuine Electronics! Inquiring about: ${p.name} (TZS ${p.price.toLocaleString()})`)}
                            aria-label={`Ask on WhatsApp about ${p.name}`}
                            className="p-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/30 cursor-pointer transition-all active:scale-95"
                            title={isSwahili ? 'Uliza kuhusu bidhaa hii WhatsApp' : 'Inquire on WhatsApp'}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className={`border rounded-2xl px-4 py-3 text-xs animate-pulse flex items-center gap-2 shadow-sm ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  <Cpu className="w-4 h-4 text-indigo-500 animate-spin" />
                  <span>{isSwahili ? 'Orbi AI inachambua sifa za vifaa na stoo...' : 'Orbi AI is analyzing inventory & technical specs...'}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Interactive # Product Tag Picker Popover */}
          {renderProductPickerPopover('ai')}

          {/* AI Quick Suggestion Chips Bar */}
          <div className={`px-3 py-1.5 border-t flex items-center gap-1.5 overflow-x-auto no-scrollbar ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <span className="text-[10px] font-extrabold uppercase text-indigo-400 flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-amber-400" />
            </span>
            {(isSwahili
              ? [
                  { label: '📺 TV za 55" & 65" 4K', prompt: 'Habari! Ni zipi TV bora za inchi 55 na 65 4K Smart TV zilizopo stoo?' },
                  { label: '🛡️ Waranti ya Miaka 2', prompt: 'Je, mchakato wa waranti rasmi ya miaka 2 na uthibitisho wa namba ya utambulisho unafanyaje kazi?' },
                  { label: '❄️ Majokofu & Inverter AC', prompt: 'Naomba ushauri wa majokofu ya milango miwili na AC zinazobana umeme (Inverter).' },
                  { label: '🚚 Delivery Dar', prompt: 'Je, mnafanya delivery ya siku hiyohiyo Dar es Salaam na gharama zake zikoje?' },
                ]
              : [
                  { label: '📺 55" & 65" 4K Smart TVs', prompt: 'Hello! What are the best 55" and 65" 4K Smart TVs currently in stock?' },
                  { label: '🛡️ 2-Year Official Warranty', prompt: 'How does the official 2-year warranty and serial number verification work?' },
                  { label: '❄️ Inverter Fridges & ACs', prompt: 'Can you recommend energy-saving inverter refrigerators and air conditioners?' },
                  { label: '🚚 Dar Delivery', prompt: 'Do you offer same-day delivery across Dar es Salaam, and how much does it cost?' },
                ]
            ).map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInput(chip.prompt);
                  setTimeout(() => {
                    if (aiInputRef.current) {
                      aiInputRef.current.focus();
                    }
                  }, 50);
                }}
                className={`shrink-0 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300 hover:border-indigo-500/50'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-400'
                }`}
              >
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Active Tagged Product Pills Bar above input */}
          {taggedProducts.length > 0 && (
            <div className={`px-3 py-2 border-t flex flex-wrap items-center gap-1.5 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <span className="text-[10px] font-extrabold uppercase text-indigo-400 flex items-center gap-1 mr-1">
                <Tag className="w-3 h-3" /> {isSwahili ? 'Zilizotajwa:' : 'Tagged:'}
              </span>
              {taggedProducts.map((p) => (
                <div key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
                  <span className="truncate max-w-[110px]">{p.name}</span>
                  <button type="button" onClick={() => removeTaggedProduct(p.id)} aria-label={`Remove tag ${p.name}`} className="text-indigo-400 hover:text-white cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Image Preview Bar above input */}
          {selectedImage && (
            <div className={`px-3 py-2 border-t flex items-center justify-between gap-2 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <img src={selectedImage} alt="Preview" className="w-8 h-8 rounded-lg object-cover border border-slate-700" />
                <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> {isSwahili ? 'Picha imeambatanishwa kwa uchambuzi' : 'Photo attached for AI analysis'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                aria-label="Remove attached photo"
                className={`p-1 rounded-lg cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Form Input Bar with Multi-line Textarea, # Tag Button & Image Attachment */}
          <form onSubmit={handleSend} className={`p-2.5 border-t flex items-end gap-2 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Quick # Product Tag Pill Trigger */}
            <button
              type="button"
              onClick={() => triggerHashTagPill('ai')}
              aria-label="Tag catalog product"
              className={`px-2.5 py-2 mb-0.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 ${
                showProductPicker || taggedProducts.length > 0
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                  : isDark
                  ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:text-indigo-300'
                  : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200'
              }`}
              title={isSwahili ? 'Taja bidhaa kutoka dukani (#)' : 'Tag a catalog product (#)'}
            >
              <Hash className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSwahili ? 'Taja' : 'Tag'}</span>
            </button>

            {/* Image Upload Trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach photo of model label or serial plate"
              className={`p-2 mb-0.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                selectedImage
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                  : isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900'
              }`}
              title={isSwahili ? 'Ambatanisha picha ya lebo ya kifaa au namba ya serial' : 'Attach photo of TV model label or serial plate'}
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Auto-Expanding Multi-line Textarea */}
            <textarea
              ref={aiInputRef}
              rows={1}
              placeholder={isSwahili ? 'Uliza sifa za kifaa au andika # kuchagua bidhaa...' : 'Ask specs or type # to filter catalog tag...'}
              value={input}
              onChange={(e) => handleTextChange(e.target.value, 'ai')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              aria-label="Type message or hash tag product"
              className={`flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 border resize-none leading-relaxed transition-all max-h-[120px] min-h-[38px] ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-indigo-500/40'
                  : 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-indigo-600/30'
              }`}
            />

            <button
              type="submit"
              disabled={loading || (!input.trim() && !selectedImage && taggedProducts.length === 0)}
              aria-label="Send message to AI assistant"
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2.5 mb-0.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      ) : (
        /* WhatsApp Direct Support Mode Screen with Parallel Input Frame */
        <div className={`flex-1 flex flex-col justify-between overflow-hidden ${
          isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'
        }`}>
          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
            {/* Store Agent Status Card */}
            <div className={`p-3 rounded-2xl border flex items-center gap-3 shadow-sm ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-10 h-10 rounded-2xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center shrink-0 border border-[#25D366]/20 relative">
                <MessageCircle className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <h4 className={`font-extrabold text-xs sm:text-sm flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {isSwahili ? 'Afisa Mauzo Genuine Electronics' : 'Genuine Electronics Sales Agent'}
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20" />
                </h4>
                <p className={`text-xs font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {formattedDisplayPhone}
                </p>
                <p className="text-[10px] text-slate-400">{isSwahili ? 'Dar es Salaam • Majibu ya Haraka WhatsApp' : 'Dar es Salaam • Instant WhatsApp Response'}</p>
              </div>
            </div>

            {/* Direct Support Description Card */}
            <div className={`p-3 rounded-2xl border text-xs space-y-1 ${
              isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
            }`}>
              <p className="font-bold flex items-center gap-1 text-emerald-500">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {isSwahili ? 'Msaada wa Moja kwa Moja na Mauzo' : 'Direct Support & Live Sales'}
              </p>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {isSwahili 
                  ? 'Andika ujumbe wako hapa chini au chagua mada. Kubonyeza Tuma kutafungua ujumbe wako moja kwa moja kwa meneja wetu wa WhatsApp!'
                  : 'Write your message below or select a suggestion chip. Tapping Send will launch your message directly with our WhatsApp support manager!'}
              </p>
            </div>

            {/* Tagged Items Banner if any */}
            {taggedProducts.length > 0 && (
              <div className={`p-2.5 rounded-2xl border space-y-1.5 ${
                isDark ? 'bg-indigo-950/40 border-indigo-900/60' : 'bg-indigo-50 border-indigo-200'
              }`}>
                <span className="text-[10px] font-extrabold uppercase text-indigo-400 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> {isSwahili ? 'Bidhaa Zilizotajwa Zimeambatanishwa:' : 'Tagged Product Attached:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {taggedProducts.map((p) => (
                    <div key={p.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
                      <span className="truncate max-w-[130px]">{p.name}</span>
                      <button type="button" onClick={() => removeTaggedProduct(p.id)} aria-label={`Remove tag ${p.name}`} className="text-indigo-400 hover:text-white cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Suggestions / Topics Bar directly ABOVE the bottom Text Box */}
          <div className={`px-3 py-2 border-t flex flex-col gap-1.5 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" /> {isSwahili ? 'Mapendekezo ya Mada:' : 'Suggestions / Topics:'}
              </span>
              {whatsappCustomMsg && (
                <button
                  type="button"
                  onClick={() => handleTextChange('', 'whatsapp')}
                  aria-label="Clear custom WhatsApp message"
                  className="text-slate-500 hover:text-slate-300 normal-case font-medium text-[10px] cursor-pointer"
                >
                  {isSwahili ? 'Futa' : 'Clear'}
                </button>
              )}
            </div>

            {/* Scrollable Suggestion Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {(isSwahili
                ? [
                    { label: '📦 Upatikanaji & Delivery', msg: 'Habari! Naomba kufahamu kuhusu uwezekano wa delivery ya leo na kagua stock.' },
                    { label: '💰 Punguzo la Bei', msg: 'Habari Genuine Electronics! Naomba msaada wa kupata punguzo la bei.' },
                    { label: '🛡️ Waranti & Serial Number', msg: 'Habari! Naomba msaada wa kukagua warranty na serial number ya kifaa.' },
                    { label: '🚚 Kufuatilia Oda', msg: 'Habari! Naomba msaada wa kufuatilia mzigo/oda yangu.' },
                  ]
                : [
                    { label: '📦 Stock & Delivery', msg: 'Hello! I would like to check current stock and same-day delivery options.' },
                    { label: '💰 Price Discount Quote', msg: 'Hello Genuine Electronics! I would like to request a price discount quote.' },
                    { label: '🛡️ Warranty & Serial', msg: 'Hello! I would like to verify warranty and serial authenticity for a product.' },
                    { label: '🚚 Track Order', msg: 'Hello! I need assistance tracking my pending order.' },
                  ]
              ).map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTextChange(item.msg, 'whatsapp')}
                  aria-label={`Select topic ${item.label}`}
                  className={`shrink-0 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                    whatsappCustomMsg === item.msg
                      ? 'bg-[#25D366] text-white border-emerald-500 shadow-xs'
                      : isDark
                      ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300 hover:border-emerald-500/50'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-400'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive # Product Tag Picker Popover in WhatsApp Mode */}
          {renderProductPickerPopover('whatsapp')}

          {/* Fixed Bottom Frame with Multi-line Text Area & Send Button side-by-side */}
          <div className={`p-2.5 border-t flex items-end gap-2 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* Tag Button trigger */}
            <button
              type="button"
              onClick={() => triggerHashTagPill('whatsapp')}
              aria-label="Tag catalog product"
              className={`px-2.5 py-2 mb-0.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 ${
                showProductPicker || taggedProducts.length > 0
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                  : isDark
                  ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:text-indigo-300'
                  : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200'
              }`}
              title={isSwahili ? 'Taja bidhaa kutoka dukani (#)' : 'Tag catalog product (#)'}
            >
              <Hash className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSwahili ? 'Taja' : 'Tag'}</span>
            </button>

            {/* Auto-Expanding Multi-line Text Area for WhatsApp */}
            <textarea
              ref={waInputRef}
              rows={1}
              value={whatsappCustomMsg}
              onChange={(e) => handleTextChange(e.target.value, 'whatsapp')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  openWhatsApp();
                }
              }}
              aria-label="Write message to WhatsApp support"
              placeholder={isSwahili ? 'Andika ujumbe au weka # kutaja bidhaa...' : 'Write message or type # to filter product tag...'}
              className={`flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 border resize-none leading-relaxed transition-all max-h-[120px] min-h-[38px] ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-emerald-500/50'
                  : 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-emerald-500/40'
              }`}
            />

            {/* Send Button inside Chat Frame */}
            <button
              type="button"
              onClick={() => openWhatsApp()}
              aria-label="Send message on WhatsApp"
              className="bg-[#25D366] hover:bg-emerald-600 text-white px-3 py-2.5 mb-0.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
              title={isSwahili ? 'Tuma ujumbe WhatsApp' : 'Send message on WhatsApp'}
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSwahili ? 'Tuma' : 'Send'}</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Chat UI Footer Copyright */}
      <div className={`px-3 py-2 border-t text-[10px] text-center font-semibold tracking-tight shrink-0 select-none ${
        isDark ? 'bg-slate-950/90 border-slate-800/80 text-slate-400' : 'bg-slate-100/90 border-slate-200 text-slate-500'
      }`}>
        Product by Orbi Financial Technologies Ltd Tanzania copyright @ {new Date().getFullYear()}
      </div>
    </div>
  );
};
