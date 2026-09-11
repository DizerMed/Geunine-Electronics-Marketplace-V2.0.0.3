import { Product, Order, UserProfile, CustomerProfile } from '../types';

export type SearchCategoryFilter = 'all' | 'products' | 'orders' | 'customers';

export interface ProductSearchResult {
  type: 'product';
  id: string;
  score: number;
  item: Product;
  title: string;
  subtitle: string;
  categoryName: string;
  sku: string;
  barcode: string;
  price: number;
  originalPrice?: number;
  stock: number;
  imageUrl?: string;
  brand?: string;
}

export interface OrderSearchResult {
  type: 'order';
  id: string;
  score: number;
  item: Order;
  title: string;
  subtitle: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status: Order['status'];
  itemsCount: number;
  createdAt: string;
}

export interface CustomerSearchResult {
  type: 'customer';
  id: string;
  score: number;
  item: CustomerProfile & { ordersList: Order[] };
  title: string;
  subtitle: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  totalOrders: number;
  lifetimeValue: number;
}

export type GlobalSearchResultItem = ProductSearchResult | OrderSearchResult | CustomerSearchResult;

/**
 * Normalizes a string by trimming, lowercasing, and removing common promotional symbols (™, ®, etc.)
 */
export function normalizeSearchString(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates a relevance score for a product given a user search query.
 * Implements strict string case/whitespace flexibility, prefix prioritization,
 * and string length ranking (shorter matching titles rank ahead of long titles).
 */
export function calculateProductSearchScore(product: Product, query: string): number {
  const q = normalizeSearchString(query);
  if (!q) return 0;

  const name = normalizeSearchString(product.name);
  const brand = normalizeSearchString(product.brand);
  const sku = normalizeSearchString(product.sku);
  const barcode = normalizeSearchString(product.barcode);
  const category = normalizeSearchString(product.category);
  const desc = normalizeSearchString(product.description);

  let score = 0;

  // 1. Exact Name Match
  if (name === q) {
    return 30000;
  }

  // 2. Starts with query (First string matching) - prioritized highest
  if (name.startsWith(q)) {
    // Huge base for starting with the query, plus length penalty so shorter titles rank first
    // e.g. "inverter 2kw" (len 12) gets ~11880 vs "inverter washing machine..." (len 40) gets ~11600
    score += 15000 + Math.max(0, 3000 - name.length * 15);
  } else {
    // Check if any word starts with query
    const words = name.split(/[\s\-_/\\+]+/);
    const wordIndex = words.findIndex(w => w.startsWith(q));
    if (wordIndex !== -1) {
      // Word starts with query (e.g. "LG ... Inverter ...")
      // Position penalty (earlier in title is better) + string length penalty
      score += 8000 - (wordIndex * 150) + Math.max(0, 1500 - name.length * 8);
    } else if (name.includes(q)) {
      // Substring match inside a word
      const charIndex = name.indexOf(q);
      score += 4000 - (charIndex * 10) + Math.max(0, 1000 - name.length * 5);
    }
  }

  // 3. Multi-token / word permutation matching
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    let matchedTokenCount = 0;
    for (const t of tokens) {
      if (name.includes(t) || brand.includes(t) || sku.includes(t) || category.includes(t)) {
        matchedTokenCount++;
      }
    }
    if (matchedTokenCount === tokens.length) {
      // All search tokens are present
      score += 6000 + Math.max(0, 2000 - name.length * 10);
    } else if (matchedTokenCount > 0) {
      score += (matchedTokenCount / tokens.length) * 2500;
    }
  }

  // 4. SKU Match
  if (sku === q) {
    score += 20000;
  } else if (sku.startsWith(q)) {
    score += 10000;
  } else if (sku.includes(q)) {
    score += 5000;
  }

  // 5. Barcode Match
  if (barcode && barcode.includes(q)) {
    score += 12000;
  }

  // 6. Brand Match
  if (brand.startsWith(q)) {
    score += 4000;
  } else if (brand.includes(q)) {
    score += 2000;
  }

  // 7. Category Match
  if (category.includes(q)) {
    score += 1000;
  }

  // 8. Description Match
  if (desc.includes(q)) {
    score += 300;
  }

  return score;
}

/**
 * Calculates a relevance score for an order
 */
export function calculateOrderSearchScore(order: Order, query: string): number {
  const q = normalizeSearchString(query);
  if (!q) return 0;

  const id = normalizeSearchString(order.id);
  const custName = normalizeSearchString(order.customerName);
  const phone = normalizeSearchString(order.customerPhone);
  const email = normalizeSearchString(order.customerEmail);

  let score = 0;

  // Order ID exact or partial match
  if (id === q) {
    return 25000;
  }
  if (id.startsWith(q) || id.replace(/[-_#]/g, '').startsWith(q)) {
    score += 14000;
  } else if (id.includes(q)) {
    score += 8000;
  }

  // Customer Name in Order
  if (custName.startsWith(q)) {
    score += 10000 + Math.max(0, 2000 - custName.length * 20);
  } else if (custName.includes(q)) {
    score += 5000;
  }

  // Phone Number in Order
  if (phone.includes(q.replace(/\s+/g, ''))) {
    score += 9000;
  }

  // Email in Order
  if (email.includes(q)) {
    score += 6000;
  }

  // Items purchased match
  if (Array.isArray(order.items)) {
    for (const item of order.items) {
      const pName = normalizeSearchString(item.product?.name);
      if (pName.startsWith(q)) {
        score += 3500;
      } else if (pName.includes(q)) {
        score += 2000;
      }
    }
  }

  return score;
}

/**
 * Calculates a relevance score for a customer profile
 */
export function calculateCustomerSearchScore(customer: CustomerProfile, query: string): number {
  const q = normalizeSearchString(query);
  if (!q) return 0;

  const name = normalizeSearchString(customer.name);
  const email = normalizeSearchString(customer.email);
  const phone = normalizeSearchString(customer.phone);
  const address = normalizeSearchString(customer.address);

  let score = 0;

  // Name
  if (name === q) {
    return 20000;
  }
  if (name.startsWith(q)) {
    score += 12000 + Math.max(0, 2000 - name.length * 20);
  } else {
    const words = name.split(/\s+/);
    if (words.some(w => w.startsWith(q))) {
      score += 7000;
    } else if (name.includes(q)) {
      score += 4000;
    }
  }

  // Phone
  const rawCleanPhone = phone.replace(/[\s\-_()+]/g, '');
  const rawCleanQuery = q.replace(/[\s\-_()+]/g, '');
  if (rawCleanPhone.includes(rawCleanQuery) && rawCleanQuery.length >= 3) {
    score += 10000;
  }

  // Email
  if (email.startsWith(q)) {
    score += 8000;
  } else if (email.includes(q)) {
    score += 5000;
  }

  // Address
  if (address.includes(q)) {
    score += 1500;
  }

  return score;
}

/**
 * Aggregates user profiles and order customer info into unified customer profiles
 */
export function aggregateCustomerProfiles(
  profiles: UserProfile[] = [],
  orders: Order[] = []
): (CustomerProfile & { ordersList: Order[] })[] {
  const map = new Map<string, CustomerProfile & { ordersList: Order[] }>();

  // Ingest user profiles
  profiles.forEach(p => {
    const key = (p.email || p.phone || p.id || '').toLowerCase().trim();
    if (!key) return;
    map.set(key, {
      id: p.id,
      name: p.fullName || p.full_name || p.displayName || p.email?.split('@')[0] || 'Customer',
      email: p.email || '',
      phone: p.phone || '',
      address: p.address || '',
      city: '',
      totalOrders: 0,
      lifetimeValue: 0,
      lastOrder: '',
      tier: 'Standard',
      ordersList: [],
    });
  });

  // Ingest orders to compute lifetime value & orders count
  orders.forEach(o => {
    const emailKey = (o.customerEmail || '').toLowerCase().trim();
    const phoneKey = (o.customerPhone || '').toLowerCase().trim();
    const key = emailKey || phoneKey || `guest-${o.id}`;

    let cust = map.get(key) || (emailKey ? map.get(emailKey) : undefined) || (phoneKey ? map.get(phoneKey) : undefined);

    if (!cust) {
      cust = {
        id: `cust-order-${o.id}`,
        name: o.customerName || 'Walk-in / Online Customer',
        email: o.customerEmail || '',
        phone: o.customerPhone || '',
        address: o.shippingAddress || o.shipping_address || '',
        city: '',
        totalOrders: 0,
        lifetimeValue: 0,
        lastOrder: o.createdAt || '',
        tier: 'Standard',
        ordersList: [],
      };
      map.set(key, cust);
    }

    cust.ordersList.push(o);
    cust.totalOrders += 1;
    cust.lifetimeValue += Number(o.totalAmount || 0);

    if (o.createdAt && (!cust.lastOrder || new Date(o.createdAt) > new Date(cust.lastOrder))) {
      cust.lastOrder = o.createdAt;
    }
  });

  // Assign tiers based on lifetime value
  const results = Array.from(map.values()).map(c => {
    let tier: CustomerProfile['tier'] = 'Standard';
    if (c.lifetimeValue >= 5000000) tier = 'Platinum VIP';
    else if (c.lifetimeValue >= 2000000) tier = 'Gold VIP';
    else if (c.lifetimeValue >= 500000) tier = 'Silver';

    return {
      ...c,
      tier,
    };
  });

  return results;
}

/**
 * Executes a global multi-entity search with string ranking and filter categories
 */
export function executeAdminGlobalSearch({
  query,
  products = [],
  orders = [],
  customers = [],
  filter = 'all',
  limitPerCategory = 20,
}: {
  query: string;
  products?: Product[];
  orders?: Order[];
  customers?: (CustomerProfile & { ordersList: Order[] })[];
  filter?: SearchCategoryFilter;
  limitPerCategory?: number;
}): {
  results: GlobalSearchResultItem[];
  counts: {
    all: number;
    products: number;
    orders: number;
    customers: number;
  };
} {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      results: [],
      counts: { all: 0, products: 0, orders: 0, customers: 0 },
    };
  }

  // 1. Search Products
  const scoredProducts: ProductSearchResult[] = [];
  for (const prod of products) {
    const score = calculateProductSearchScore(prod, trimmed);
    if (score > 0) {
      scoredProducts.push({
        type: 'product',
        id: `prod-${prod.id}`,
        score,
        item: prod,
        title: prod.name,
        subtitle: `${prod.brand || 'Genuine'} • ${prod.category || 'Hardware'}`,
        categoryName: prod.category || 'General',
        sku: prod.sku || '',
        barcode: prod.barcode || '',
        price: prod.price,
        originalPrice: prod.originalPrice,
        stock: Number(prod.stock || 0),
        imageUrl: Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : undefined,
        brand: prod.brand,
      });
    }
  }
  scoredProducts.sort((a, b) => b.score - a.score);

  // 2. Search Orders
  const scoredOrders: OrderSearchResult[] = [];
  for (const ord of orders) {
    const score = calculateOrderSearchScore(ord, trimmed);
    if (score > 0) {
      scoredOrders.push({
        type: 'order',
        id: `order-${ord.id}`,
        score,
        item: ord,
        title: `Order #${String(ord.id).slice(0, 8).toUpperCase()}`,
        subtitle: `${ord.customerName || 'Customer'} • ${ord.customerPhone || 'No phone'}`,
        customerName: ord.customerName || 'Customer',
        customerPhone: ord.customerPhone || '',
        totalAmount: Number(ord.totalAmount || 0),
        status: ord.status,
        itemsCount: Array.isArray(ord.items) ? ord.items.reduce((s, i) => s + (i.quantity || 1), 0) : 0,
        createdAt: ord.createdAt || '',
      });
    }
  }
  scoredOrders.sort((a, b) => b.score - a.score);

  // 3. Search Customers
  const scoredCustomers: CustomerSearchResult[] = [];
  for (const cust of customers) {
    const score = calculateCustomerSearchScore(cust, trimmed);
    if (score > 0) {
      scoredCustomers.push({
        type: 'customer',
        id: `cust-${cust.id}`,
        score,
        item: cust,
        title: cust.name,
        subtitle: cust.phone ? `${cust.phone} • ${cust.email || 'No email'}` : cust.email || 'Customer Profile',
        name: cust.name,
        email: cust.email,
        phone: cust.phone,
        address: cust.address,
        totalOrders: cust.totalOrders || 0,
        lifetimeValue: cust.lifetimeValue || 0,
      });
    }
  }
  scoredCustomers.sort((a, b) => b.score - a.score);

  const counts = {
    all: scoredProducts.length + scoredOrders.length + scoredCustomers.length,
    products: scoredProducts.length,
    orders: scoredOrders.length,
    customers: scoredCustomers.length,
  };

  let combinedResults: GlobalSearchResultItem[] = [];

  if (filter === 'products') {
    combinedResults = scoredProducts.slice(0, limitPerCategory);
  } else if (filter === 'orders') {
    combinedResults = scoredOrders.slice(0, limitPerCategory);
  } else if (filter === 'customers') {
    combinedResults = scoredCustomers.slice(0, limitPerCategory);
  } else {
    // 'all': Take top matches from each group and sort by score
    const topProducts = scoredProducts.slice(0, limitPerCategory);
    const topOrders = scoredOrders.slice(0, Math.min(10, limitPerCategory));
    const topCustomers = scoredCustomers.slice(0, Math.min(10, limitPerCategory));

    combinedResults = [...topProducts, ...topOrders, ...topCustomers].sort((a, b) => b.score - a.score);
  }

  return {
    results: combinedResults,
    counts,
  };
}
