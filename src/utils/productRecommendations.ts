import { CartItem, Order, Product } from '../types';

export type RecommendationMatchType =
  | 'real_orders'
  | 'feature_match'
  | 'category_pair'
  | 'brand_ecosystem'
  | 'popular';

export interface BundleSuggestion {
  product: Product;
  score: number;
  matchType: RecommendationMatchType;
  coPurchaseCount: number;
  matchedFeatures: string[];
  reasonEn: string;
  reasonSw: string;
}

export interface SimilarRecommendation {
  product: Product;
  score: number;
  sameCategory: boolean;
  sameBrand: boolean;
  coPurchaseCount: number;
  matchedFeatures: string[];
  reasonEn: string;
  reasonSw: string;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'into', 'plus',
  'inch', 'inches', 'year', 'years', 'warranty', 'genuine', 'original', 'new',
  'best', 'high', 'quality', 'smart', 'pro', 'max', 'ultra', 'plus', 'series',
  'edition', 'model', 'black', 'white', 'silver', 'grey', 'gray', 'blue', 'gold',
  'system', 'device', 'product', 'home', 'office', 'price', 'offer', 'brand',
  'color', 'colour', 'weight', 'dimensions', 'features', 'specs', 'overview',
]);

// Domain-aware complementary category pairs for consumer electronics & home appliances
const COMPLEMENTARY_CATEGORIES: Record<string, string[]> = {
  'TV, Video & Projectors': [
    'Audio & Headphones',
    'Cables, Chargers & Power',
    'Smart Home & IoT',
    'Gaming Consoles & PC',
  ],
  'Phones & Wearables': [
    'Cables, Chargers & Power',
    'Audio & Headphones',
    'Smart Home & IoT',
    'PC Components & Storage',
  ],
  'Computers & Tablets': [
    'Office & Networking',
    'PC Components & Storage',
    'Cables, Chargers & Power',
    'Audio & Headphones',
  ],
  'Gaming Consoles & PC': [
    'Audio & Headphones',
    'TV, Video & Projectors',
    'PC Components & Storage',
    'Cables, Chargers & Power',
  ],
  'Cameras, Drones & Optics': [
    'PC Components & Storage',
    'Cables, Chargers & Power',
    'Audio & Headphones',
  ],
  'Audio & Headphones': [
    'Cables, Chargers & Power',
    'Phones & Wearables',
    'TV, Video & Projectors',
    'Smart Home & IoT',
  ],
  'Smart Home & IoT': [
    'Office & Networking',
    'Cables, Chargers & Power',
    'Audio & Headphones',
    'Air Conditioners & Cooling',
  ],
  'Office & Networking': [
    'Cables, Chargers & Power',
    'PC Components & Storage',
    'Computers & Tablets',
  ],
  'PC Components & Storage': [
    'Cables, Chargers & Power',
    'Computers & Tablets',
    'Office & Networking',
  ],
  'Air Conditioners & Cooling': [
    'Cables, Chargers & Power',
    'Smart Home & IoT',
    'Home Cleaning & Laundry',
  ],
  'Refrigeration & Freezers': [
    'Cables, Chargers & Power',
    'Kitchen Cooking & Ovens',
    'Smart Home & IoT',
  ],
  'Kitchen Cooking & Ovens': [
    'Cables, Chargers & Power',
    'Refrigeration & Freezers',
    'Home Cleaning & Laundry',
  ],
  'Home Cleaning & Laundry': [
    'Cables, Chargers & Power',
    'Smart Home & IoT',
    'Air Conditioners & Cooling',
  ],
  'Cables, Chargers & Power': [
    'Phones & Wearables',
    'Computers & Tablets',
    'Audio & Headphones',
  ],
};

// High-signal technical & accessory compatibility keywords (matched across name, specs, description)
const FEATURE_PATTERNS: { key: string; label: string; regex: RegExp; pairsWith?: RegExp }[] = [
  { key: 'usbc', label: 'USB-C', regex: /\b(usb[\s-]?c|type[\s-]?c|pd\s?\d*w?|power\s?delivery)\b/i },
  { key: 'hdmi', label: 'HDMI / 4K Display', regex: /\b(hdmi|4k|uhd|oled|qled|8k|hdr10|dolby\s?vision|projector)\b/i },
  { key: 'wireless_audio', label: 'Wireless / Bluetooth', regex: /\b(bluetooth|wireless|tws|anc|noise\s?cancel|soundbar|dolby\s?atmos)\b/i },
  { key: 'power_guard', label: 'Power & Surge Protection', regex: /\b(surge|stabilizer|voltage\s?guard|avr|ups|extension|power\s?strip|protector)\b/i },
  { key: 'inverter', label: 'Inverter', regex: /\b(inverter|dual\s?inverter|digital\s?inverter)\b/i },
  { key: 'fast_charge', label: 'Fast Charging', regex: /\b(fast\s?charg|quick\s?charg|super\s?fast|gan|magsafe|qi|power\s?bank|\d{2,3}w)\b/i },
  { key: 'storage', label: 'Storage & Memory', regex: /\b(ssd|nvme|hdd|sd\s?card|microsd|flash|ram|ddr4|ddr5|\d+\s?(gb|tb))\b/i },
  { key: 'networking', label: 'Wi-Fi / Mesh', regex: /\b(wi-?fi|wifi\s?6|router|mesh|ethernet|lan|gigabit)\b/i },
  { key: 'smart_iot', label: 'Smart App Control', regex: /\b(smart\s?home|alexa|google\s?home|tuya|matter|iot|smart\s?tv|android\s?tv)\b/i },
  { key: 'gaming', label: 'Gaming', regex: /\b(gaming|ps5|xbox|nintendo|120hz|144hz|rtx|controller|console)\b/i },
  { key: 'cooling_btu', label: 'AC Cooling', regex: /\b(\d{4,5}\s?btu|split\s?ac|air\s?conditioner|ton)\b/i },
];

function stripHtmlAndMarkdown(raw?: string): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/[|#*`[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ProductProfile {
  searchableText: string;
  tokens: Set<string>;
  specMap: Map<string, string>;
  featureLabels: Map<string, string>; // pattern.key -> pattern.label
  isProtectionOrPowerAccessory: boolean;
  isAccessoryItem: boolean;
}

export function extractProductProfile(product: Product): ProductProfile {
  const parts: string[] = [
    product.name || '',
    product.brand || '',
    product.category || '',
    product.tonnage || '',
    product.capacity || '',
    product.energyRating || '',
    product.warranty || '',
    stripHtmlAndMarkdown(product.description),
  ];

  const specMap = new Map<string, string>();
  if (product.specs && typeof product.specs === 'object') {
    Object.entries(product.specs).forEach(([k, v]) => {
      if (k && v) {
        specMap.set(k.trim().toLowerCase(), String(v).trim().toLowerCase());
        parts.push(`${k} ${v}`);
      }
    });
  }

  // Also parse "Key: Value" lines from description text
  if (product.description) {
    const cleanLines = product.description.replace(/<[^>]+>/g, '\n').split('\n');
    cleanLines.forEach((line) => {
      const m = line.match(/^\s*(?:\||[-•*])?\s*([^:|]{2,35}):\s*([^|\n]{1,60})/);
      if (m) {
        specMap.set(m[1].trim().toLowerCase(), m[2].trim().toLowerCase());
      }
    });
  }

  const searchableText = parts.join(' ').toLowerCase();
  const tokens = new Set<string>();
  searchableText
    .replace(/[^a-z0-9+.-]+/g, ' ')
    .split(/\s+/)
    .forEach((tok) => {
      const cleaned = tok.replace(/^[.-]+|[.-]+$/g, '');
      if (cleaned.length >= 2 && !STOP_WORDS.has(cleaned)) {
        tokens.add(cleaned);
      }
    });

  const featureLabels = new Map<string, string>();
  FEATURE_PATTERNS.forEach((fp) => {
    if (fp.regex.test(searchableText)) {
      featureLabels.set(fp.key, fp.label);
    }
  });

  const isProtectionOrPowerAccessory =
    featureLabels.has('power_guard') ||
    /\b(guard|stabilizer|surge|extension|ups|protector|adapter|charger|cable|plug)\b/i.test(searchableText);

  const isAccessoryItem =
    product.category === 'Cables, Chargers & Power' ||
    /\b(cable|charger|adapter|case|cover|bag|mount|bracket|stand|guard|protector|strip|hub|dongle|mouse|keyboard|earbuds|remote|filter)\b/i.test(
      product.name || ''
    );

  return {
    searchableText,
    tokens,
    specMap,
    featureLabels,
    isProtectionOrPowerAccessory,
    isAccessoryItem,
  };
}

function getOrderItemProductId(item: any): string | null {
  return item?.product?.id || item?.productId || item?.product_id || null;
}

/**
 * Builds a symmetric product-to-product co-purchase count graph from historical orders.
 */
export function buildCoPurchaseGraph(orders: Order[] = []): Map<string, Map<string, number>> {
  const graph = new Map<string, Map<string, number>>();
  if (!Array.isArray(orders) || orders.length === 0) return graph;

  orders.forEach((order) => {
    if (!order || order.status === 'Cancelled') return;
    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length < 2) return;

    const uniqueIds = Array.from(
      new Set(
        items
          .map(getOrderItemProductId)
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      )
    );
    if (uniqueIds.length < 2) return;

    for (let i = 0; i < uniqueIds.length; i++) {
      for (let j = i + 1; j < uniqueIds.length; j++) {
        const a = uniqueIds[i];
        const b = uniqueIds[j];
        if (!graph.has(a)) graph.set(a, new Map());
        if (!graph.has(b)) graph.set(b, new Map());
        graph.get(a)!.set(b, (graph.get(a)!.get(b) || 0) + 1);
        graph.get(b)!.set(a, (graph.get(b)!.get(a) || 0) + 1);
      }
    }
  });

  return graph;
}

function isEligibleClientProduct(candidate: Product): boolean {
  if (!candidate || !candidate.id) return false;
  if (candidate.isLocalOnly) return false;
  if (candidate.inStock === false) return false;
  if (typeof candidate.stock === 'number' && candidate.stock <= 0) return false;
  return true;
}

function getSharedFeatures(a: ProductProfile, b: ProductProfile): string[] {
  const shared: string[] = [];

  // 1. Named technical feature patterns (USB-C, 4K, Bluetooth, Inverter, etc.)
  a.featureLabels.forEach((label, key) => {
    if (b.featureLabels.has(key) && !shared.includes(label)) {
      shared.push(label);
    }
  });

  // 2. Exact spec values shared (e.g., Connectivity, Resolution, Wattage, Capacity)
  a.specMap.forEach((valA, keyA) => {
    const valB = b.specMap.get(keyA);
    if (valB && valA === valB && valA.length >= 2 && valA.length <= 28) {
      const pretty = valA.replace(/\b\w/g, (c) => c.toUpperCase());
      if (!shared.includes(pretty)) shared.push(pretty);
    }
  });

  return shared.slice(0, 3);
}

/**
 * Recommends 2–3 high-relevance "Frequently Bought Together" companion products
 * using real co-purchase order history, complementary category rules,
 * shared hardware specs/features, and brand ecosystem synergy.
 */
export function getFrequentlyBoughtTogether(
  targetProduct: Product,
  allProducts: Product[],
  orders: Order[] = [],
  limit = 2
): BundleSuggestion[] {
  if (!targetProduct || !Array.isArray(allProducts) || allProducts.length <= 1) return [];

  const coGraph = buildCoPurchaseGraph(orders);
  const targetCoPurchases = coGraph.get(targetProduct.id) || new Map<string, number>();
  const targetProfile = extractProductProfile(targetProduct);
  const complementaryCats = COMPLEMENTARY_CATEGORIES[targetProduct.category] || [];
  const targetBrand = (targetProduct.brand || '').trim().toLowerCase();
  const targetPrice = Math.max(1, Number(targetProduct.price || 0));

  const isHeavyAppliance = [
    'Air Conditioners & Cooling',
    'Refrigeration & Freezers',
    'Kitchen Cooking & Ovens',
    'Home Cleaning & Laundry',
    'TV, Video & Projectors',
  ].includes(targetProduct.category);

  const scored: BundleSuggestion[] = [];

  for (const candidate of allProducts) {
    if (candidate.id === targetProduct.id || !isEligibleClientProduct(candidate)) continue;

    const candProfile = extractProductProfile(candidate);
    const candBrand = (candidate.brand || '').trim().toLowerCase();
    const candPrice = Math.max(1, Number(candidate.price || 0));
    const coPurchaseCount = targetCoPurchases.get(candidate.id) || 0;
    const sharedFeatures = getSharedFeatures(targetProfile, candProfile);
    const complementaryIdx = complementaryCats.indexOf(candidate.category);
    const sameBrand = Boolean(targetBrand && candBrand && targetBrand === candBrand);
    const sameCategory = candidate.category === targetProduct.category;

    let score = 0;

    // 1. Real co-purchase order signal (strongest real-world signal)
    if (coPurchaseCount > 0) {
      score += 120 + Math.min(80, coPurchaseCount * 25);
    }

    // 2. Complementary category signal
    if (complementaryIdx !== -1) {
      score += 55 - complementaryIdx * 8;
    } else if (!sameCategory && candProfile.isAccessoryItem) {
      score += 22;
    }

    // 3. Hardware & feature compatibility rules
    if (isHeavyAppliance && candProfile.isProtectionOrPowerAccessory) {
      score += 42; // TVs, ACs, Fridges, Washers strongly pair with Surge Guards / Voltage Stabilizers
    }
    if (targetProfile.featureLabels.has('usbc') && candProfile.featureLabels.has('usbc')) {
      score += 28;
    }
    if (targetProfile.featureLabels.has('hdmi') && candProfile.featureLabels.has('hdmi')) {
      score += 28;
    }
    if (
      (targetProduct.category === 'TV, Video & Projectors' && candidate.category === 'Audio & Headphones') ||
      (targetProduct.category === 'Phones & Wearables' && candidate.category === 'Audio & Headphones')
    ) {
      score += 26;
    }
    if (
      (targetProduct.category === 'Computers & Tablets' || targetProduct.category === 'Cameras, Drones & Optics') &&
      candidate.category === 'PC Components & Storage'
    ) {
      score += 25;
    }

    // 4. Shared features & token overlap
    score += Math.min(36, sharedFeatures.length * 14);
    let tokenMatches = 0;
    targetProfile.tokens.forEach((tok) => {
      if (candProfile.tokens.has(tok)) tokenMatches++;
    });
    score += Math.min(18, tokenMatches * 3);

    // 5. Same brand ecosystem (bonus when pairing a phone with same-brand earbuds/charger, or appliance suite)
    if (sameBrand && !sameCategory) {
      score += 24;
    } else if (sameBrand && candProfile.isAccessoryItem) {
      score += 18;
    }

    // 6. Practical add-on pricing logic (add-ons shouldn't usually be 4x more expensive than the main item unless actually co-purchased)
    if (coPurchaseCount === 0) {
      if (candPrice <= targetPrice * 0.75) {
        score += 16;
      } else if (candPrice > targetPrice * 1.8) {
        score -= 35;
      }
      // Avoid pairing two near-identical primary products from the exact same category unless one is clearly an accessory
      if (sameCategory && !candProfile.isAccessoryItem) {
        score -= 38;
      }
    }

    // Small rating & featured tie-breaker
    score += (Number(candidate.rating || 0) * 1.5) + (candidate.featured ? 3 : 0);

    // Build honest, specific bilingual reason label
    let matchType: RecommendationMatchType = 'category_pair';
    let reasonEn = `Pairs with ${targetProduct.category}`;
    let reasonSw = `Inaendana na ${targetProduct.category}`;

    if (coPurchaseCount > 0) {
      matchType = 'real_orders';
      reasonEn = coPurchaseCount === 1
        ? 'Bought together in customer orders'
        : `Bought together in ${coPurchaseCount} orders`;
      reasonSw = coPurchaseCount === 1
        ? 'Zimenunuliwa pamoja na wateja'
        : `Zimenunuliwa pamoja kwenye oda ${coPurchaseCount}`;
    } else if (isHeavyAppliance && candProfile.isProtectionOrPowerAccessory) {
      matchType = 'feature_match';
      reasonEn = 'Essential power & surge protection';
      reasonSw = 'Ulinzi muhimu wa umeme na shoti';
    } else if (sharedFeatures.length > 0 && sameBrand) {
      matchType = 'brand_ecosystem';
      reasonEn = `${targetProduct.brand} ecosystem · ${sharedFeatures[0]}`;
      reasonSw = `Mfumo wa ${targetProduct.brand} · ${sharedFeatures[0]}`;
    } else if (sharedFeatures.length > 0) {
      matchType = 'feature_match';
      reasonEn = `Compatible · ${sharedFeatures[0]}`;
      reasonSw = `Inaendana · ${sharedFeatures[0]}`;
    } else if (sameBrand && !sameCategory) {
      matchType = 'brand_ecosystem';
      reasonEn = `Matches your ${targetProduct.brand} setup`;
      reasonSw = `Inaendana na vifaa vya ${targetProduct.brand}`;
    } else if (complementaryIdx !== -1) {
      matchType = 'category_pair';
      reasonEn = `Complementary ${candidate.category}`;
      reasonSw = `Kifaa kizuri kwa ${candidate.category}`;
    } else {
      matchType = 'popular';
      reasonEn = 'Popular store add-on';
      reasonSw = 'Kiambatanisho kinachopendwa';
    }

    scored.push({
      product: candidate,
      score,
      matchType,
      coPurchaseCount,
      matchedFeatures: sharedFeatures,
      reasonEn,
      reasonSw,
    });
  }

  scored.sort((a, b) => b.score - a.score);

  // Pick top `limit` with category diversity when possible (so we don't show 2 identical-type items if alternatives exist)
  const picked: BundleSuggestion[] = [];
  const usedCategories = new Set<string>();

  for (const item of scored) {
    if (picked.length >= limit) break;
    if (!usedCategories.has(item.product.category) || item.coPurchaseCount > 0) {
      picked.push(item);
      usedCategories.add(item.product.category);
    }
  }

  if (picked.length < limit) {
    for (const item of scored) {
      if (picked.length >= limit) break;
      if (!picked.some((p) => p.product.id === item.product.id)) {
        picked.push(item);
      }
    }
  }

  return picked;
}

/**
 * Ranks "Similar & Recommended Products" by category, brand, technical specs/features,
 * and price-tier proximity so alternatives are genuinely comparable.
 */
export function getSimilarRecommendations(
  targetProduct: Product,
  allProducts: Product[],
  orders: Order[] = [],
  limit = 8
): SimilarRecommendation[] {
  if (!targetProduct || !Array.isArray(allProducts) || allProducts.length <= 1) return [];

  const coGraph = buildCoPurchaseGraph(orders);
  const targetCoPurchases = coGraph.get(targetProduct.id) || new Map<string, number>();
  const targetProfile = extractProductProfile(targetProduct);
  const targetBrand = (targetProduct.brand || '').trim().toLowerCase();
  const targetCategory = (targetProduct.category || '').trim().toLowerCase();
  const targetPrice = Math.max(1, Number(targetProduct.price || 0));

  const results: SimilarRecommendation[] = [];

  for (const candidate of allProducts) {
    if (candidate.id === targetProduct.id || candidate.isLocalOnly) continue;

    const candProfile = extractProductProfile(candidate);
    const sameCategory = (candidate.category || '').trim().toLowerCase() === targetCategory;
    const sameBrand = Boolean(targetBrand && (candidate.brand || '').trim().toLowerCase() === targetBrand);
    const coPurchaseCount = targetCoPurchases.get(candidate.id) || 0;
    const sharedFeatures = getSharedFeatures(targetProfile, candProfile);

    let tokenMatches = 0;
    targetProfile.tokens.forEach((tok) => {
      if (candProfile.tokens.has(tok)) tokenMatches++;
    });

    // Price proximity score (0 to 25): items within 0.4x–2.5x price range score highest
    const candPrice = Math.max(1, Number(candidate.price || 0));
    const ratio = Math.max(targetPrice, candPrice) / Math.min(targetPrice, candPrice);
    const priceScore = ratio <= 1.5 ? 24 : ratio <= 2.5 ? 16 : ratio <= 4 ? 8 : 0;

    let score = 0;
    if (sameCategory) score += 75;
    if (sameBrand) score += 32;
    score += Math.min(40, sharedFeatures.length * 14);
    score += Math.min(28, tokenMatches * 4);
    score += priceScore;
    if (coPurchaseCount > 0) score += 18;

    // Prefer in-stock items strongly without hiding catalog if inventory is small
    const isInStock = candidate.inStock !== false && (candidate.stock === undefined || candidate.stock > 0);
    score += isInStock ? 25 : -45;
    score += (Number(candidate.rating || 0) * 1.5) + (candidate.featured ? 4 : 0);

    let reasonEn = 'Recommended alternative';
    let reasonSw = 'Chaguo linalopendekezwa';

    if (sameCategory && sameBrand && sharedFeatures.length > 0) {
      reasonEn = `${candidate.brand} · ${sharedFeatures[0]}`;
      reasonSw = `${candidate.brand} · ${sharedFeatures[0]}`;
    } else if (sameCategory && sharedFeatures.length > 0) {
      reasonEn = `Similar specs · ${sharedFeatures[0]}`;
      reasonSw = `Sifa zinazofanana · ${sharedFeatures[0]}`;
    } else if (sameCategory && sameBrand) {
      reasonEn = `Same brand & category`;
      reasonSw = `Chapa na kundi moja`;
    } else if (sameCategory) {
      reasonEn = `Same category alternative`;
      reasonSw = `Kundi moja la bidhaa`;
    } else if (sameBrand && sharedFeatures.length > 0) {
      reasonEn = `${candidate.brand} · ${sharedFeatures[0]}`;
      reasonSw = `${candidate.brand} · ${sharedFeatures[0]}`;
    } else if (sharedFeatures.length > 0) {
      reasonEn = `Shared feature: ${sharedFeatures[0]}`;
      reasonSw = `Sifa ya pamoja: ${sharedFeatures[0]}`;
    } else if (sameBrand) {
      reasonEn = `More from ${candidate.brand}`;
      reasonSw = `Zaidi kutoka ${candidate.brand}`;
    }

    results.push({
      product: candidate,
      score,
      sameCategory,
      sameBrand,
      coPurchaseCount,
      matchedFeatures: sharedFeatures,
      reasonEn,
      reasonSw,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Generates cart-level "Frequently Bought With Your Cart" recommendations
 * by aggregating FBT signals across every item currently in the shopping cart.
 */
export function getCartRecommendations(
  cart: CartItem[],
  allProducts: Product[],
  orders: Order[] = [],
  limit = 3
): BundleSuggestion[] {
  if (!Array.isArray(cart) || cart.length === 0 || !Array.isArray(allProducts)) return [];

  const cartIds = new Set(cart.map((c) => c.product?.id).filter(Boolean));
  const aggregated = new Map<string, BundleSuggestion>();

  for (const cartItem of cart) {
    if (!cartItem?.product) continue;
    const suggestions = getFrequentlyBoughtTogether(cartItem.product, allProducts, orders, 4);
    for (const s of suggestions) {
      if (cartIds.has(s.product.id)) continue;
      const existing = aggregated.get(s.product.id);
      if (!existing) {
        aggregated.set(s.product.id, { ...s });
      } else {
        existing.score += s.score * 0.65;
        if (s.coPurchaseCount > existing.coPurchaseCount) {
          existing.coPurchaseCount = s.coPurchaseCount;
          existing.matchType = s.matchType;
          existing.reasonEn = s.reasonEn;
          existing.reasonSw = s.reasonSw;
        }
      }
    }
  }

  return Array.from(aggregated.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
