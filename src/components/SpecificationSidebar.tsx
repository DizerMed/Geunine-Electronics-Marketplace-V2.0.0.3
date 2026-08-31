import React, { useState, useMemo, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  X, 
  RotateCcw, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  ShieldCheck, 
  Star, 
  Tag, 
  DollarSign, 
  Filter, 
  CheckCircle2, 
  Box, 
  Cpu, 
  Tv, 
  Smartphone, 
  Gauge, 
  HardDrive, 
  MemoryStick, 
  Monitor, 
  Search, 
  Layers,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, formatTZS } from '../types';

export interface FilterState {
  minPrice: number | null;
  maxPrice: number | null;
  selectedBrands: string[];
  inStockOnly: boolean;
  onSaleOnly: boolean;
  genuineOnly: boolean;
  minRating: number | null;
  selectedWarranties: string[];
  selectedSpecs: Record<string, string[]>; // specKey -> array of selected values
}

export const INITIAL_FILTER_STATE: FilterState = {
  minPrice: null,
  maxPrice: null,
  selectedBrands: [],
  inStockOnly: false,
  onSaleOnly: false,
  genuineOnly: false,
  minRating: null,
  selectedWarranties: [],
  selectedSpecs: {}
};

interface SpecificationSidebarProps {
  products: Product[];
  category: string;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  isDark?: boolean;
  isSwahili?: boolean;
  totalMatchingCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Icon resolver for dynamically extracted spec categories
function getDynamicSpecIcon(key: string) {
  const lower = key.toLowerCase();
  if (lower.includes('ram') || lower.includes('memory')) return <MemoryStick className="w-3.5 h-3.5 text-blue-500" />;
  if (lower.includes('storage') || lower.includes('rom') || lower.includes('ssd') || lower.includes('hdd') || lower.includes('hard drive')) return <HardDrive className="w-3.5 h-3.5 text-emerald-500" />;
  if (lower.includes('screen') || lower.includes('display') || lower.includes('size') || lower.includes('inch')) return <Monitor className="w-3.5 h-3.5 text-indigo-500" />;
  if (lower.includes('resolution') || lower.includes('tv') || lower.includes('panel') || lower.includes('refresh') || lower.includes('hdr')) return <Tv className="w-3.5 h-3.5 text-purple-500" />;
  if (lower.includes('processor') || lower.includes('cpu') || lower.includes('chip') || lower.includes('gpu')) return <Cpu className="w-3.5 h-3.5 text-amber-500" />;
  if (lower.includes('energy') || lower.includes('power') || lower.includes('watt') || lower.includes('voltage') || lower.includes('battery')) return <Zap className="w-3.5 h-3.5 text-yellow-500" />;
  if (lower.includes('capacity') || lower.includes('liters') || lower.includes('load') || lower.includes('volume') || lower.includes('weight')) return <Box className="w-3.5 h-3.5 text-cyan-500" />;
  if (lower.includes('phone') || lower.includes('sim') || lower.includes('cellular') || lower.includes('network') || lower.includes('5g')) return <Smartphone className="w-3.5 h-3.5 text-pink-500" />;
  if (lower.includes('speed') || lower.includes('rpm') || lower.includes('tonnage') || lower.includes('btu') || lower.includes('cooling')) return <Gauge className="w-3.5 h-3.5 text-teal-500" />;
  return <Layers className="w-3.5 h-3.5 text-slate-500" />;
}

export const SpecificationSidebar: React.FC<SpecificationSidebarProps> = ({
  products,
  category,
  filters,
  onFilterChange,
  onResetFilters,
  isDark = false,
  isSwahili = false,
  totalMatchingCount,
  isOpenMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse
}) => {
  // Accordion toggle states - open price, availability, and specs by default
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price: true,
    quick: true,
    brands: true,
    warranty: false,
    rating: false
  });

  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const [specSearchTerms, setSpecSearchTerms] = useState<Record<string, string>>({});
  const [localMinPrice, setLocalMinPrice] = useState<string>('');
  const [localMaxPrice, setLocalMaxPrice] = useState<string>('');

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 1. Dynamic Price Bounds calculated strictly from the CURRENT on-screen/active category products
  const priceBounds = useMemo(() => {
    if (!products || products.length === 0) {
      return { min: 0, max: 10000000, step: 10000, realMin: 0, realMax: 0 };
    }
    const prices = products.map(p => Number(p.price) || 0).filter(p => p > 0);
    if (prices.length === 0) return { min: 0, max: 10000000, step: 10000, realMin: 0, realMax: 0 };

    const realMin = Math.min(...prices);
    const realMax = Math.max(...prices);

    // Round min down to nearest 5k or 10k, max up to nearest 10k
    const neatMin = Math.max(0, Math.floor(realMin / 10000) * 10000);
    const neatMax = Math.max(neatMin + 50000, Math.ceil(realMax / 10000) * 10000);
    const step = Math.max(5000, Math.round((neatMax - neatMin) / 50));

    return {
      min: neatMin,
      max: neatMax,
      step,
      realMin,
      realMax
    };
  }, [products]);

  // Synchronize numeric price inputs with active filters
  useEffect(() => {
    setLocalMinPrice(filters.minPrice !== null ? String(filters.minPrice) : '');
    setLocalMaxPrice(filters.maxPrice !== null ? String(filters.maxPrice) : '');
  }, [filters.minPrice, filters.maxPrice]);

  // Dynamic quick price tiers generated directly from current on-screen products
  const dynamicPriceTiers = useMemo(() => {
    const { realMin, realMax } = priceBounds;
    if (realMax <= 0 || realMax <= realMin) return [];

    const spread = realMax - realMin;
    const tiers: { label: string; min: number | null; max: number | null }[] = [];

    if (spread <= 150000) {
      // Small price spread
      const mid = Math.round((realMin + realMax) / 2 / 10000) * 10000;
      tiers.push({ label: `< ${formatTZS(mid)}`, min: null, max: mid });
      tiers.push({ label: `≥ ${formatTZS(mid)}`, min: mid, max: null });
    } else if (spread <= 600000) {
      // Medium price spread (e.g. 200k to 700k)
      const p33 = Math.round((realMin + spread * 0.33) / 10000) * 10000;
      const p66 = Math.round((realMin + spread * 0.66) / 10000) * 10000;
      tiers.push({ label: `< ${formatTZS(p33)}`, min: null, max: p33 });
      tiers.push({ label: `${formatTZS(p33)} - ${formatTZS(p66)}`, min: p33, max: p66 });
      tiers.push({ label: `> ${formatTZS(p66)}`, min: p66, max: null });
    } else {
      // Large price spread (e.g. 300k to 4M)
      const q1 = Math.round((realMin + spread * 0.25) / 50000) * 50000;
      const q2 = Math.round((realMin + spread * 0.50) / 50000) * 50000;
      const q3 = Math.round((realMin + spread * 0.75) / 50000) * 50000;

      tiers.push({ label: `< ${formatTZS(q1)}`, min: null, max: q1 });
      tiers.push({ label: `${formatTZS(q1)} - ${formatTZS(q2)}`, min: q1, max: q2 });
      tiers.push({ label: `${formatTZS(q2)} - ${formatTZS(q3)}`, min: q2, max: q3 });
      tiers.push({ label: `> ${formatTZS(q3)}`, min: q3, max: null });
    }

    return tiers;
  }, [priceBounds]);

  // 2. Purely Dynamic Real Specifications & Attributes Extraction (NO HARDCODING)
  const extractedData = useMemo(() => {
    const brandsMap: Record<string, number> = {};
    const warrantiesMap: Record<string, number> = {};
    const dynamicSpecsMap: Record<string, Record<string, number>> = {};

    let inStockCount = 0;
    let onSaleCount = 0;
    let genuineCount = 0;
    let topRatedCount = 0;

    if (!products || products.length === 0) {
      return {
        brands: [],
        warranties: [],
        specs: [],
        inStockCount: 0,
        onSaleCount: 0,
        genuineCount: 0,
        topRatedCount: 0
      };
    }

    products.forEach(p => {
      // Brand
      if (p.brand && p.brand.trim()) {
        const b = p.brand.trim();
        brandsMap[b] = (brandsMap[b] || 0) + 1;
      }

      // Stock, Sale, Genuine, Rating
      if (Number(p.stock || 0) > 0) inStockCount++;
      if (p.isOnOffer || (p.originalPrice && p.originalPrice > p.price)) onSaleCount++;
      if (p.isGenuineVerified !== false) genuineCount++;
      if (Number(p.rating || 0) >= 4.0) topRatedCount++;

      // Official Warranty
      if (p.warranty && p.warranty.trim()) {
        const w = p.warranty.trim();
        warrantiesMap[w] = (warrantiesMap[w] || 0) + 1;
      }

      // Dedicated common fields if present in product
      if (p.energyRating && p.energyRating.trim()) {
        const k = 'Energy Rating';
        const v = p.energyRating.trim();
        if (!dynamicSpecsMap[k]) dynamicSpecsMap[k] = {};
        dynamicSpecsMap[k][v] = (dynamicSpecsMap[k][v] || 0) + 1;
      }
      if (p.tonnage && p.tonnage.trim()) {
        const k = 'Tonnage / Power';
        const v = p.tonnage.trim();
        if (!dynamicSpecsMap[k]) dynamicSpecsMap[k] = {};
        dynamicSpecsMap[k][v] = (dynamicSpecsMap[k][v] || 0) + 1;
      }
      if (p.capacity && p.capacity.trim()) {
        const k = 'Capacity';
        const v = p.capacity.trim();
        if (!dynamicSpecsMap[k]) dynamicSpecsMap[k] = {};
        dynamicSpecsMap[k][v] = (dynamicSpecsMap[k][v] || 0) + 1;
      }

      // Explicit specs dictionary inside product.specs
      if (p.specs && typeof p.specs === 'object') {
        Object.entries(p.specs).forEach(([k, v]) => {
          if (!k || v === undefined || v === null) return;
          const cleanK = k.trim();
          const cleanV = String(v).trim();
          if (!cleanK || !cleanV || cleanV.length > 40) return;

          // Exclude internal/noise keys
          const lowerK = cleanK.toLowerCase();
          if (['id', 'created_at', 'updated_at', 'sku', 'barcode', 'price', 'image', 'brand'].includes(lowerK)) return;

          if (!dynamicSpecsMap[cleanK]) {
            dynamicSpecsMap[cleanK] = {};
          }
          dynamicSpecsMap[cleanK][cleanV] = (dynamicSpecsMap[cleanK][cleanV] || 0) + 1;
        });
      }

      // Extract bullet / structured lines from product description if present (e.g. "RAM: 8GB", "Display: 65 Inch")
      if (p.description && typeof p.description === 'string') {
        const lines = p.description.split(/[\n\r•;|]+/);
        lines.forEach(line => {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 1 && colonIdx < 25) {
            const potentialKey = line.substring(0, colonIdx).trim();
            const potentialVal = line.substring(colonIdx + 1).trim();
            if (
              potentialKey.length >= 3 && 
              potentialKey.length <= 25 && 
              potentialVal.length >= 1 && 
              potentialVal.length <= 35 &&
              !potentialKey.toLowerCase().includes('http') &&
              !potentialKey.toLowerCase().includes('note')
            ) {
              // Format key to title case
              const formattedKey = potentialKey.charAt(0).toUpperCase() + potentialKey.slice(1);
              if (!dynamicSpecsMap[formattedKey]) {
                dynamicSpecsMap[formattedKey] = {};
              }
              dynamicSpecsMap[formattedKey][potentialVal] = (dynamicSpecsMap[formattedKey][potentialVal] || 0) + 1;
            }
          }
        });
      }
    });

    // Format and sort dynamic spec categories - ONLY INCLUDE CATEGORIES THAT ACTUALLY HAVE VALID OPTIONS
    const formattedSpecs: {
      key: string;
      icon: React.ReactNode;
      options: { value: string; count: number }[];
    }[] = [];

    Object.entries(dynamicSpecsMap).forEach(([key, valMap]) => {
      const options = Object.entries(valMap)
        .map(([value, count]) => ({ value, count }))
        .filter(opt => opt.count > 0 && opt.value.trim().length > 0)
        .sort((a, b) => b.count - a.count);

      // Only show category if it has at least 1 option
      if (options.length > 0) {
        formattedSpecs.push({
          key,
          icon: getDynamicSpecIcon(key),
          options
        });
      }
    });

    // Sort spec categories so the ones with more diverse options or most populated come first
    formattedSpecs.sort((a, b) => b.options.length - a.options.length);

    return {
      brands: Object.entries(brandsMap).map(([brand, count]) => ({ brand, count })).sort((a, b) => b.count - a.count),
      warranties: Object.entries(warrantiesMap).map(([warranty, count]) => ({ warranty, count })).sort((a, b) => b.count - a.count),
      specs: formattedSpecs,
      inStockCount,
      onSaleCount,
      genuineCount,
      topRatedCount
    };
  }, [products]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.minPrice !== null || filters.maxPrice !== null) count++;
    if (filters.selectedBrands.length > 0) count += filters.selectedBrands.length;
    if (filters.inStockOnly) count++;
    if (filters.onSaleOnly) count++;
    if (filters.genuineOnly) count++;
    if (filters.minRating !== null) count++;
    if (filters.selectedWarranties.length > 0) count += filters.selectedWarranties.length;
    Object.values(filters.selectedSpecs).forEach(arr => {
      count += arr.length;
    });
    return count;
  }, [filters]);

  // Handlers
  const handleToggleBrand = (brand: string) => {
    const exists = filters.selectedBrands.includes(brand);
    const updated = exists 
      ? filters.selectedBrands.filter(b => b !== brand)
      : [...filters.selectedBrands, brand];
    onFilterChange({ ...filters, selectedBrands: updated });
  };

  const handleToggleWarranty = (warranty: string) => {
    const exists = filters.selectedWarranties.includes(warranty);
    const updated = exists
      ? filters.selectedWarranties.filter(w => w !== warranty)
      : [...filters.selectedWarranties, warranty];
    onFilterChange({ ...filters, selectedWarranties: updated });
  };

  const handleToggleSpec = (specKey: string, specValue: string) => {
    const currentList = filters.selectedSpecs[specKey] || [];
    const exists = currentList.includes(specValue);
    const updatedList = exists 
      ? currentList.filter(v => v !== specValue)
      : [...currentList, specValue];

    const updatedSpecs = { ...filters.selectedSpecs };
    if (updatedList.length === 0) {
      delete updatedSpecs[specKey];
    } else {
      updatedSpecs[specKey] = updatedList;
    }
    onFilterChange({ ...filters, selectedSpecs: updatedSpecs });
  };

  const handleApplyPriceInputs = () => {
    const minVal = localMinPrice.trim() ? Number(localMinPrice) : null;
    const maxVal = localMaxPrice.trim() ? Number(localMaxPrice) : null;
    onFilterChange({
      ...filters,
      minPrice: !isNaN(Number(minVal)) && minVal !== null ? Math.max(0, minVal) : null,
      maxPrice: !isNaN(Number(maxVal)) && maxVal !== null ? Math.max(0, maxVal) : null
    });
  };

  const handleApplyPriceSlider = (val: number) => {
    onFilterChange({
      ...filters,
      maxPrice: val
    });
  };

  const handleSelectPriceTier = (min: number | null, max: number | null) => {
    onFilterChange({
      ...filters,
      minPrice: min,
      maxPrice: max
    });
  };

  const currentMaxSliderValue = filters.maxPrice !== null ? filters.maxPrice : priceBounds.max;

  // Filtered brands by search term
  const displayedBrands = useMemo(() => {
    if (!brandSearchTerm.trim()) return extractedData.brands;
    const term = brandSearchTerm.toLowerCase();
    return extractedData.brands.filter(b => b.brand.toLowerCase().includes(term));
  }, [extractedData.brands, brandSearchTerm]);

  // Sidebar Inner Content JSX (Sleek, Compact, Single-Card, High-Density)
  const sidebarContent = (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto select-none space-y-3.5 text-xs pr-1 custom-scrollbar">
      {/* 1. Header with Active Counter & Reset Button */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 min-w-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider truncate">
            {isSwahili ? 'Vichujio' : 'Filter Products'}
          </h4>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
            {totalMatchingCount}
          </span>
        </div>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition-colors cursor-pointer"
            title="Reset all filters"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>{isSwahili ? 'Safisha' : 'Reset'}</span>
          </button>
        )}
      </div>

      {/* 2. DYNAMIC REAL PRICE RANGE FILTER (Calculated from Current Screen Products) */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between py-1 text-left font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors"
        >
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
            <DollarSign className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{isSwahili ? 'Kiwango cha Bei' : 'Price Range'}</span>
          </span>
          <div className="flex items-center gap-1">
            {(filters.minPrice !== null || filters.maxPrice !== null) && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            )}
            {openSections.price ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </div>
        </button>

        {openSections.price && (
          <div className="mt-2 space-y-2.5 animate-fadeIn">
            {/* Range Slider for Max Price */}
            <div>
              <div className="flex items-center justify-between text-[10px] mb-1 font-semibold">
                <span className="text-slate-400">{formatTZS(priceBounds.min)}</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">
                  Max: {formatTZS(currentMaxSliderValue)}
                </span>
              </div>
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={priceBounds.step}
                value={currentMaxSliderValue}
                onChange={(e) => handleApplyPriceSlider(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Min and Max Number Inputs */}
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <span className="text-[9px] font-semibold text-slate-400 block mb-0.5">Min (TZS)</span>
                <input
                  type="number"
                  placeholder={String(priceBounds.min)}
                  value={localMinPrice}
                  onChange={(e) => setLocalMinPrice(e.target.value)}
                  onBlur={handleApplyPriceInputs}
                  className="w-full px-2 py-1 rounded-lg border text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[9px] font-semibold text-slate-400 block mb-0.5">Max (TZS)</span>
                <input
                  type="number"
                  placeholder={String(priceBounds.max)}
                  value={localMaxPrice}
                  onChange={(e) => setLocalMaxPrice(e.target.value)}
                  onBlur={handleApplyPriceInputs}
                  className="w-full px-2 py-1 rounded-lg border text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Real Price Distribution Tiers */}
            {dynamicPriceTiers.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {dynamicPriceTiers.map((tier, idx) => {
                  const isSelected = filters.minPrice === tier.min && filters.maxPrice === tier.max;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPriceTier(tier.min, tier.max)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                      }`}
                    >
                      {tier.label}
                    </button>
                  );
                })}
              </div>
            )}

            {(filters.minPrice !== null || filters.maxPrice !== null) && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, minPrice: null, maxPrice: null })}
                className="w-full py-0.5 text-center text-[10px] font-semibold text-rose-500 hover:underline"
              >
                {isSwahili ? 'Weka upya bei' : 'Clear price'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Quick Availability Highlights */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => toggleSection('quick')}
          className="w-full flex items-center justify-between py-1 text-left font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors"
        >
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isSwahili ? 'Upatikanaji' : 'Availability & Offers'}</span>
          </span>
          {openSections.quick ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {openSections.quick && (
          <div className="mt-1.5 space-y-1 animate-fadeIn">
            {/* In Stock Toggle */}
            <label className="flex items-center justify-between p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.inStockOnly}
                  onChange={() => onFilterChange({ ...filters, inStockOnly: !filters.inStockOnly })}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                  {isSwahili ? 'Vipo Dukani' : 'In Stock Only'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {extractedData.inStockCount}
              </span>
            </label>

            {/* On Sale / Offers Toggle */}
            <label className="flex items-center justify-between p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.onSaleOnly}
                  onChange={() => onFilterChange({ ...filters, onSaleOnly: !filters.onSaleOnly })}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>{isSwahili ? 'Punguzo / Ofa' : 'On Sale Deals'}</span>
                </span>
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold font-mono">
                {extractedData.onSaleCount}
              </span>
            </label>

            {/* Genuine Verified Only */}
            <label className="flex items-center justify-between p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.genuineOnly}
                  onChange={() => onFilterChange({ ...filters, genuineOnly: !filters.genuineOnly })}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-500" />
                  <span>{isSwahili ? '100% Halisi' : 'Genuine Verified'}</span>
                </span>
              </div>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                {extractedData.genuineCount}
              </span>
            </label>
          </div>
        )}
      </div>

      {/* 4. DYNAMIC TECHNICAL SPECIFICATIONS (Only specs that exist on current products) */}
      {extractedData.specs.map(({ key, icon, options }) => {
        const activeOptions = filters.selectedSpecs[key] || [];
        const isSectionOpen = openSections[`spec_${key}`] !== false; // default open
        const specSearch = specSearchTerms[key] || '';
        
        const filteredOptions = specSearch.trim()
          ? options.filter(opt => opt.value.toLowerCase().includes(specSearch.toLowerCase()))
          : options;

        return (
          <div key={key} className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => toggleSection(`spec_${key}`)}
              className="w-full flex items-center justify-between py-1 text-left font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors"
            >
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300 truncate pr-1">
                {icon}
                <span className="truncate">{key}</span>
                {activeOptions.length > 0 && (
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[9px] font-black inline-flex items-center justify-center shrink-0">
                    {activeOptions.length}
                  </span>
                )}
              </span>
              {isSectionOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            </button>

            {isSectionOpen && (
              <div className="mt-1.5 space-y-1 animate-fadeIn">
                {/* Search input for large option lists */}
                {options.length > 6 && (
                  <div className="relative mb-1.5">
                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder={`Search ${key}...`}
                      value={specSearch}
                      onChange={(e) => setSpecSearchTerms(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full pl-6 pr-2 py-0.5 rounded text-[10px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto pr-0.5 custom-scrollbar">
                  {filteredOptions.map(({ value, count }) => {
                    const isSelected = activeOptions.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleToggleSpec(key, value)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 font-medium'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-xs flex items-center justify-center border text-[8px] ${
                          isSelected ? 'bg-white text-blue-600 border-white font-black' : 'border-slate-400'
                        }`}>
                          {isSelected && <Check className="w-2 h-2" />}
                        </div>
                        <span className="truncate max-w-[140px]">{value}</span>
                        <span className={`text-[9px] ${isSelected ? 'text-blue-100' : 'opacity-50'}`}>
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {activeOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...filters.selectedSpecs };
                      delete updated[key];
                      onFilterChange({ ...filters, selectedSpecs: updated });
                    }}
                    className="pt-1 text-[10px] text-rose-500 hover:underline block"
                  >
                    Clear {key}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* 5. Brands Filter (Only brands with products on page) */}
      {extractedData.brands.length > 0 && (
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => toggleSection('brands')}
            className="w-full flex items-center justify-between py-1 text-left font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors"
          >
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
              <Tag className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isSwahili ? 'Chapa' : 'Brands'}</span>
              {filters.selectedBrands.length > 0 && (
                <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 text-white text-[9px] font-black inline-flex items-center justify-center">
                  {filters.selectedBrands.length}
                </span>
              )}
            </span>
            {openSections.brands ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {openSections.brands && (
            <div className="mt-1.5 space-y-1 animate-fadeIn">
              {extractedData.brands.length > 5 && (
                <div className="relative mb-1.5">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search brand..."
                    value={brandSearchTerm}
                    onChange={(e) => setBrandSearchTerm(e.target.value)}
                    className="w-full pl-6 pr-2 py-0.5 rounded text-[10px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="space-y-0.5 max-h-40 overflow-y-auto pr-0.5 custom-scrollbar">
                {displayedBrands.map(({ brand, count }) => {
                  const isSelected = filters.selectedBrands.includes(brand);
                  return (
                    <label
                      key={brand}
                      className={`flex items-center justify-between p-1 rounded-md transition-colors cursor-pointer text-[11px] ${
                        isSelected 
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleBrand(brand)}
                          className="w-3 h-3 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="truncate">{brand}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">({count})</span>
                    </label>
                  );
                })}
              </div>

              {filters.selectedBrands.length > 0 && (
                <button
                  type="button"
                  onClick={() => onFilterChange({ ...filters, selectedBrands: [] })}
                  className="pt-1 text-[10px] text-rose-500 hover:underline block"
                >
                  Clear Brands
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. Warranty Filter (Only if available on page) */}
      {extractedData.warranties.length > 0 && (
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => toggleSection('warranty')}
            className="w-full flex items-center justify-between py-1 text-left font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors"
          >
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isSwahili ? 'Waranti' : 'Warranty'}</span>
              {filters.selectedWarranties.length > 0 && (
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white text-[9px] font-black inline-flex items-center justify-center">
                  {filters.selectedWarranties.length}
                </span>
              )}
            </span>
            {openSections.warranty ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {openSections.warranty && (
            <div className="mt-1.5 space-y-0.5 max-h-36 overflow-y-auto pr-0.5 animate-fadeIn custom-scrollbar">
              {extractedData.warranties.map(({ warranty, count }) => {
                const isSelected = filters.selectedWarranties.includes(warranty);
                return (
                  <label
                    key={warranty}
                    className={`flex items-center justify-between p-1 rounded-md transition-colors cursor-pointer text-[11px] ${
                      isSelected 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleWarranty(warranty)}
                        className="w-3 h-3 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="truncate">{warranty}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono">({count})</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. Rating Accordion */}
      <div className="pb-1">
        <button
          type="button"
          onClick={() => toggleSection('rating')}
          className="w-full flex items-center justify-between py-1 text-left font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors"
        >
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{isSwahili ? 'Nyota' : 'Rating'}</span>
          </span>
          {openSections.rating ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {openSections.rating && (
          <div className="mt-1.5 space-y-1 animate-fadeIn">
            {[4.5, 4.0, 3.5].map((stars) => {
              const isSelected = filters.minRating === stars;
              return (
                <button
                  key={stars}
                  type="button"
                  onClick={() => onFilterChange({ ...filters, minRating: isSelected ? null : stars })}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-2.5 h-2.5 ${i < Math.floor(stars) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} 
                        />
                      ))}
                    </div>
                    <span>{stars}+</span>
                  </div>
                  {isSelected && <Check className="w-3 h-3 text-amber-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 8. Reset All Bottom Action */}
      {activeFiltersCount > 0 && (
        <button
          type="button"
          onClick={onResetFilters}
          className="w-full py-1.5 px-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{isSwahili ? 'Safisha Vichujio Vyote' : 'Reset All Filters'}</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* 1. Desktop Sticky Compact Sidebar (Slim, Left-Pushed, Zero Clutter) */}
      <aside 
        className={`hidden lg:block shrink-0 transition-all duration-300 select-none self-stretch ${
          isCollapsed ? 'w-10' : 'w-56 xl:w-60 2xl:w-64'
        }`}
      >
        <div className={`sticky top-28 xl:top-32 max-h-[calc(100vh-7.5rem)] xl:max-h-[calc(100vh-8.5rem)] flex flex-col p-3 rounded-2xl border transition-all ${
          isDark 
            ? 'bg-slate-900/95 border-slate-800 text-white shadow-lg shadow-black/20' 
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
        }`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center py-2 space-y-3">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
                title="Expand Filters"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </div>
          ) : (
            <>
              {onToggleCollapse && (
                <div className="flex items-center justify-end mb-1">
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1 py-0.5 text-[10px] font-semibold rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Collapse Sidebar"
                  >
                    Hide
                  </button>
                </div>
              )}
              {sidebarContent}
            </>
          )}
        </div>
      </aside>

      {/* 2. Mobile & Tablet Slide-Over Drawer */}
      <AnimatePresence>
        {isOpenMobile && (
          <div className="fixed inset-0 z-50 lg:hidden flex justify-start">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            />

            {/* Slide Drawer from LEFT */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className={`relative w-full max-w-xs h-full shadow-2xl flex flex-col z-10 ${
                isDark ? 'bg-slate-900 border-r border-slate-800 text-white' : 'bg-white border-r border-slate-200 text-slate-900'
              }`}
            >
              {/* Drawer Top Bar */}
              <div className={`p-3 border-b flex items-center justify-between ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs">
                      {isSwahili ? 'Vichujio' : 'Filter Specs'}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate max-w-[160px]">
                      {category}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-3 flex-1 overflow-y-auto">
                {sidebarContent}
              </div>

              {/* Drawer Apply Bottom */}
              <div className={`p-3 border-t ${
                isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{isSwahili ? `Onyesha Vifaa (${totalMatchingCount})` : `Show ${totalMatchingCount} Products`}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export interface ActiveFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  isSwahili?: boolean;
}

export const ActiveFilterBar: React.FC<ActiveFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  isSwahili = false
}) => {
  const chips: { label: string; onRemove: () => void }[] = [];

  // Price chip
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    let label = '';
    if (filters.minPrice !== null && filters.maxPrice !== null) {
      label = `${formatTZS(filters.minPrice)} - ${formatTZS(filters.maxPrice)}`;
    } else if (filters.minPrice !== null) {
      label = `>= ${formatTZS(filters.minPrice)}`;
    } else if (filters.maxPrice !== null) {
      label = `<= ${formatTZS(filters.maxPrice)}`;
    }
    chips.push({
      label: `Price: ${label}`,
      onRemove: () => onFilterChange({ ...filters, minPrice: null, maxPrice: null })
    });
  }

  // Brands chips
  filters.selectedBrands.forEach(brand => {
    chips.push({
      label: `Brand: ${brand}`,
      onRemove: () => onFilterChange({
        ...filters,
        selectedBrands: filters.selectedBrands.filter(b => b !== brand)
      })
    });
  });

  // Stock, offer, genuine chips
  if (filters.inStockOnly) {
    chips.push({
      label: isSwahili ? 'Vipo Dukani' : 'In Stock Only',
      onRemove: () => onFilterChange({ ...filters, inStockOnly: false })
    });
  }
  if (filters.onSaleOnly) {
    chips.push({
      label: isSwahili ? 'Ofa' : 'On Sale Deals',
      onRemove: () => onFilterChange({ ...filters, onSaleOnly: false })
    });
  }
  if (filters.genuineOnly) {
    chips.push({
      label: isSwahili ? 'Halisi' : 'Genuine Verified',
      onRemove: () => onFilterChange({ ...filters, genuineOnly: false })
    });
  }

  // Rating chip
  if (filters.minRating !== null) {
    chips.push({
      label: `${filters.minRating}+ Stars`,
      onRemove: () => onFilterChange({ ...filters, minRating: null })
    });
  }

  // Warranties chips
  filters.selectedWarranties.forEach(warranty => {
    chips.push({
      label: `Warranty: ${warranty}`,
      onRemove: () => onFilterChange({
        ...filters,
        selectedWarranties: filters.selectedWarranties.filter(w => w !== warranty)
      })
    });
  });

  // Specs chips
  Object.entries(filters.selectedSpecs).forEach(([specKey, values]) => {
    values.forEach(val => {
      chips.push({
        label: `${specKey}: ${val}`,
        onRemove: () => {
          const updatedList = values.filter(v => v !== val);
          const updatedSpecs = { ...filters.selectedSpecs };
          if (updatedList.length === 0) {
            delete updatedSpecs[specKey];
          } else {
            updatedSpecs[specKey] = updatedList;
          }
          onFilterChange({ ...filters, selectedSpecs: updatedSpecs });
        }
      });
    });
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-3 p-2 rounded-xl bg-blue-50/70 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700/80">
      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
        <Filter className="w-3 h-3 text-blue-600 dark:text-blue-400" />
        <span>{isSwahili ? 'Vichujio:' : 'Active:'}</span>
      </span>

      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="hover:text-rose-600 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onResetFilters}
        className="ml-auto text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline px-1.5 py-0.5 cursor-pointer"
      >
        {isSwahili ? 'Ondoa Vyote' : 'Clear All'}
      </button>
    </div>
  );
};
