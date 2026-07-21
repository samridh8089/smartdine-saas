// Local Storage Mock Database for SmartDine QR
// Simulates a full Supabase Postgres backend to allow running out-of-the-box

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  phone: string;
  address: string;
  settings: {
    currency: string;
    gst_percentage: number;
    service_charge_percentage: number;
  };
  subscription_plan: 'starter' | 'pro' | 'premium';
  subscription_status: 'active' | 'trial' | 'past_due' | 'cancelled';
  trial_ends_at: string;
  created_at: string;
}

export interface Profile {
  id: string;
  restaurant_id: string | null;
  email: string;
  full_name: string;
  role: 'owner' | 'staff' | 'super_admin';
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  is_veg: boolean;
}

export interface Table {
  id: string;
  restaurant_id: string;
  name: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_name: string; // snapshots
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string;
  table_name?: string;
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  special_instructions?: string;
  subtotal: number;
  gst: number;
  service_charge: number;
  total: number;
  created_at: string;
  items: OrderItem[];
}

// Check plan limits
export const PLAN_LIMITS = {
  starter: { maxTables: 5, maxItems: 15 },
  pro: { maxTables: 20, maxItems: 50 },
  premium: { maxTables: 9999, maxItems: 9999 }
};

// Initial Seed Data
const seedRestaurants: Restaurant[] = [
  {
    id: 'rest-burger-palace',
    name: 'Burger Palace',
    slug: 'burger-palace',
    logo_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=150&h=150&fit=crop&q=80',
    phone: '+1 (555) 019-2834',
    address: '123 Gourmet Ave, Foodtown',
    settings: { currency: 'INR', gst_percentage: 8, service_charge_percentage: 5 },
    subscription_plan: 'pro',
    subscription_status: 'active',
    trial_ends_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rest-pizza-bella',
    name: 'Pizza Bella',
    slug: 'pizza-bella',
    logo_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150&h=150&fit=crop&q=80',
    phone: '+1 (555) 014-9988',
    address: '456 Napoli Street, Crustville',
    settings: { currency: 'INR', gst_percentage: 10, service_charge_percentage: 0 },
    subscription_plan: 'starter',
    subscription_status: 'trial',
    trial_ends_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const seedProfiles: Profile[] = [
  {
    id: 'user-burger-owner',
    restaurant_id: 'rest-burger-palace',
    email: 'burger@owner.com',
    full_name: 'Alex Burger',
    role: 'owner'
  },
  {
    id: 'user-pizza-owner',
    restaurant_id: 'rest-pizza-bella',
    email: 'pizza@owner.com',
    full_name: 'Giovanni Bella',
    role: 'owner'
  },
  {
    id: 'user-super-admin',
    restaurant_id: null,
    email: 'admin@smartdine.com',
    full_name: 'Super Admin',
    role: 'super_admin'
  }
];

const seedCategories: Category[] = [
  { id: 'cat-burgers', restaurant_id: 'rest-burger-palace', name: 'Burgers', sort_order: 1 },
  { id: 'cat-sides', restaurant_id: 'rest-burger-palace', name: 'Sides & Fries', sort_order: 2 },
  { id: 'cat-drinks', restaurant_id: 'rest-burger-palace', name: 'Drinks', sort_order: 3 },
  { id: 'cat-pizzas', restaurant_id: 'rest-pizza-bella', name: 'Pizzas', sort_order: 1 },
  { id: 'cat-salads', restaurant_id: 'rest-pizza-bella', name: 'Salads', sort_order: 2 }
];

const seedMenuItems: MenuItem[] = [
  {
    id: 'item-classic-burger',
    restaurant_id: 'rest-burger-palace',
    category_id: 'cat-burgers',
    name: 'Classic Cheeseburger',
    description: 'Juicy beef patty, melted cheddar, lettuce, tomato, pickles, and our signature palace sauce.',
    price: 299.00,
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&q=80',
    is_available: true,
    is_veg: false
  },
  {
    id: 'item-truffle-burger',
    restaurant_id: 'rest-burger-palace',
    category_id: 'cat-burgers',
    name: 'Truffle Mushroom Burger',
    description: 'Premium angus beef, wild mushrooms, Swiss cheese, truffle aioli on a brioche bun.',
    price: 389.00,
    image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop&q=80',
    is_available: true,
    is_veg: false
  },
  {
    id: 'item-truffle-fries',
    restaurant_id: 'rest-burger-palace',
    category_id: 'cat-sides',
    name: 'Truffle Parmesan Fries',
    description: 'Crispy skin-on fries tossed in white truffle oil, grated parmesan, and fresh parsley.',
    price: 169.00,
    image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop&q=80',
    is_available: true,
    is_veg: true
  },
  {
    id: 'item-onion-rings',
    restaurant_id: 'rest-burger-palace',
    category_id: 'cat-sides',
    name: 'Craft Beer Onion Rings',
    description: 'Thick-cut sweet onions double-dipped in local IPA batter, fried to golden perfection.',
    price: 149.00,
    image_url: 'https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?w=400&h=300&fit=crop&q=80',
    is_available: true,
    is_veg: true
  },
  {
    id: 'item-soda',
    restaurant_id: 'rest-burger-palace',
    category_id: 'cat-drinks',
    name: 'Artisanal Cola',
    description: 'House-made botanically brewed cola with pure cane sugar and natural spices.',
    price: 89.00,
    image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=300&fit=crop&q=80',
    is_available: true,
    is_veg: true
  },
  // Pizza Bella Items
  {
    id: 'item-margherita',
    restaurant_id: 'rest-pizza-bella',
    category_id: 'cat-pizzas',
    name: 'Margherita Pizza',
    description: 'San Marzano tomatoes, fresh buffalo mozzarella, fresh basil, and extra virgin olive oil.',
    price: 349.00,
    image_url: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&h=300&fit=crop&q=80',
    is_available: true,
    is_veg: true
  },
  {
    id: 'item-diavola',
    restaurant_id: 'rest-pizza-bella',
    category_id: 'cat-pizzas',
    name: 'Pizza Diavola',
    description: 'Spicy calabrian salami, mozzarella, tomato sauce, and hot honey drizzle.',
    price: 429.00,
    image_url: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=400&h=300&fit=crop&q=80',
    is_available: true,
    is_veg: false
  },
  {
    id: 'item-caesar',
    restaurant_id: 'rest-pizza-bella',
    category_id: 'cat-salads',
    name: 'Bella Caesar Salad',
    description: 'Crisp romaine, sourdough garlic croutons, creamy caesar dressing, shaved parmesan.',
    price: 229.00,
    image_url: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&h=300&fit=crop&q=80',
    is_available: true,
    is_veg: true
  }
];

const seedTables: Table[] = [
  { id: 'tbl-burger-1', restaurant_id: 'rest-burger-palace', name: 'Table 1' },
  { id: 'tbl-burger-2', restaurant_id: 'rest-burger-palace', name: 'Table 2' },
  { id: 'tbl-burger-3', restaurant_id: 'rest-burger-palace', name: 'Table 3' },
  { id: 'tbl-pizza-1', restaurant_id: 'rest-pizza-bella', name: 'Table 1' },
  { id: 'tbl-pizza-2', restaurant_id: 'rest-pizza-bella', name: 'Table 2' }
];

const seedOrders: Order[] = [
  {
    id: 'ord-b1',
    restaurant_id: 'rest-burger-palace',
    table_id: 'tbl-burger-1',
    table_name: 'Table 1',
    status: 'completed',
    subtotal: 767.00,
    gst: 61.36,
    service_charge: 38.35,
    total: 866.71,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    items: [
      { id: 'oi-1', order_id: 'ord-b1', menu_item_id: 'item-classic-burger', menu_item_name: 'Classic Cheeseburger', quantity: 2, price: 299.00 },
      { id: 'oi-2', order_id: 'ord-b1', menu_item_id: 'item-truffle-fries', menu_item_name: 'Truffle Parmesan Fries', quantity: 1, price: 169.00 }
    ]
  },
  {
    id: 'ord-b2',
    restaurant_id: 'rest-burger-palace',
    table_id: 'tbl-burger-2',
    table_name: 'Table 2',
    status: 'preparing',
    special_instructions: 'No pickles on the burger please.',
    subtotal: 478.00,
    gst: 38.24,
    service_charge: 23.90,
    total: 540.14,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    items: [
      { id: 'oi-3', order_id: 'ord-b2', menu_item_id: 'item-truffle-burger', menu_item_name: 'Truffle Mushroom Burger', quantity: 1, price: 389.00 },
      { id: 'oi-4', order_id: 'ord-b2', menu_item_id: 'item-soda', menu_item_name: 'Artisanal Cola', quantity: 1, price: 89.00 }
    ]
  },
  {
    id: 'ord-b3',
    restaurant_id: 'rest-burger-palace',
    table_id: 'tbl-burger-3',
    table_name: 'Table 3',
    status: 'new',
    subtotal: 448.00,
    gst: 35.84,
    service_charge: 22.40,
    total: 506.24,
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    items: [
      { id: 'oi-5', order_id: 'ord-b3', menu_item_id: 'item-classic-burger', menu_item_name: 'Classic Cheeseburger', quantity: 1, price: 299.00 },
      { id: 'oi-6', order_id: 'ord-b3', menu_item_id: 'item-onion-rings', menu_item_name: 'Craft Beer Onion Rings', quantity: 1, price: 149.00, notes: 'Extra crispy' }
    ]
  }
];

class MockDatabase {
  private getStore<T>(key: string, seed: T[]): T[] {
    if (typeof window === 'undefined') return seed;
    const data = localStorage.getItem(`smartdine_${key}`);
    if (!data) {
      localStorage.setItem(`smartdine_${key}`, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(data);
  }

  private saveStore<T>(key: string, data: T[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`smartdine_${key}`, JSON.stringify(data));
      // Dispatch storage event to update standard state listeners in other parts of the client
      window.dispatchEvent(new Event('storage'));
    }
  }

  // --- Core Stores ---
  get restaurants(): Restaurant[] { return this.getStore('restaurants', seedRestaurants); }
  set restaurants(data: Restaurant[]) { this.saveStore('restaurants', data); }

  get profiles(): Profile[] { return this.getStore('profiles', seedProfiles); }
  set profiles(data: Profile[]) { this.saveStore('profiles', data); }

  get categories(): Category[] { return this.getStore('categories', seedCategories); }
  set categories(data: Category[]) { this.saveStore('categories', data); }

  get menuItems(): MenuItem[] { return this.getStore('menuItems', seedMenuItems); }
  set menuItems(data: MenuItem[]) { this.saveStore('menuItems', data); }

  get tables(): Table[] { return this.getStore('tables', seedTables); }
  set tables(data: Table[]) { this.saveStore('tables', data); }

  get orders(): Order[] { return this.getStore('orders', seedOrders); }
  set orders(data: Order[]) { this.saveStore('orders', data); }

  // --- Auth Simulation ---
  getCurrentUser(): Profile | null {
    if (typeof window === 'undefined') return null;
    const session = localStorage.getItem('smartdine_session');
    if (!session) return null;
    const user = this.profiles.find(p => p.id === session);
    return user || null;
  }

  login(email: string): Profile {
    const user = this.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('User not found. Use admin@smartdine.com, burger@owner.com, or pizza@owner.com');
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartdine_session', user.id);
    }
    return user;
  }

  signup(email: string, fullName: string, restaurantName: string, slug: string): Profile {
    const existing = this.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (existing) throw new Error('User already exists');

    const restSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const slugConflict = this.restaurants.find(r => r.slug === restSlug);
    if (slugConflict) throw new Error('Restaurant URL slug is already taken');

    const restaurantId = 'rest-' + Math.random().toString(36).substr(2, 9);
    const newRestaurant: Restaurant = {
      id: restaurantId,
      name: restaurantName,
      slug: restSlug,
      phone: '',
      address: '',
      settings: { currency: 'INR', gst_percentage: 5, service_charge_percentage: 0 },
      subscription_plan: 'starter',
      subscription_status: 'trial',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };

    const newUserId = 'user-' + Math.random().toString(36).substr(2, 9);
    const newProfile: Profile = {
      id: newUserId,
      restaurant_id: restaurantId,
      email: email.toLowerCase(),
      full_name: fullName,
      role: 'owner'
    };

    // Seed default categories
    const newCategories: Category[] = [
      { id: `cat-${restaurantId}-1`, restaurant_id: restaurantId, name: 'Starters', sort_order: 1 },
      { id: `cat-${restaurantId}-2`, restaurant_id: restaurantId, name: 'Main Course', sort_order: 2 }
    ];

    this.restaurants = [...this.restaurants, newRestaurant];
    this.profiles = [...this.profiles, newProfile];
    this.categories = [...this.categories, ...newCategories];

    if (typeof window !== 'undefined') {
      localStorage.setItem('smartdine_session', newUserId);
    }
    return newProfile;
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('smartdine_session');
    }
  }

  // --- Restaurant Management ---
  getRestaurantBySlug(slug: string): Restaurant | undefined {
    return this.restaurants.find(r => r.slug === slug);
  }

  getRestaurantById(id: string): Restaurant | undefined {
    return this.restaurants.find(r => r.id === id);
  }

  updateRestaurant(id: string, data: Partial<Restaurant>): Restaurant {
    let updated: Restaurant | null = null;
    this.restaurants = this.restaurants.map(r => {
      if (r.id === id) {
        updated = { ...r, ...data } as Restaurant;
        return updated;
      }
      return r;
    });
    if (!updated) throw new Error('Restaurant not found');
    return updated;
  }

  // --- Category CRUD ---
  getCategories(restaurantId: string): Category[] {
    return this.categories
      .filter(c => c.restaurant_id === restaurantId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  createCategory(restaurantId: string, name: string): Category {
    const newCat: Category = {
      id: 'cat-' + Math.random().toString(36).substr(2, 9),
      restaurant_id: restaurantId,
      name,
      sort_order: this.getCategories(restaurantId).length + 1
    };
    this.categories = [...this.categories, newCat];
    return newCat;
  }

  updateCategory(id: string, name: string): Category {
    let updated: Category | null = null;
    this.categories = this.categories.map(c => {
      if (c.id === id) {
        updated = { ...c, name };
        return updated;
      }
      return c;
    });
    if (!updated) throw new Error('Category not found');
    return updated;
  }

  deleteCategory(id: string): void {
    this.categories = this.categories.filter(c => c.id !== id);
    // Cascade delete menu items under this category
    this.menuItems = this.menuItems.filter(item => item.category_id !== id);
  }

  // --- Menu Items CRUD ---
  getMenuItems(restaurantId: string): MenuItem[] {
    return this.menuItems.filter(i => i.restaurant_id === restaurantId);
  }

  createMenuItem(restaurantId: string, data: Omit<MenuItem, 'id' | 'restaurant_id'>): MenuItem {
    const rest = this.getRestaurantById(restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    // Subscription Limit check
    const currentItemsCount = this.getMenuItems(restaurantId).length;
    const plan = rest.subscription_plan;
    const limit = PLAN_LIMITS[plan].maxItems;
    if (currentItemsCount >= limit) {
      throw new Error(`Your ${plan.toUpperCase()} plan limits you to ${limit} menu items. Please upgrade to add more.`);
    }

    const newItem: MenuItem = {
      id: 'item-' + Math.random().toString(36).substr(2, 9),
      restaurant_id: restaurantId,
      ...data
    };
    this.menuItems = [...this.menuItems, newItem];
    return newItem;
  }

  updateMenuItem(id: string, data: Partial<MenuItem>): MenuItem {
    let updated: MenuItem | null = null;
    this.menuItems = this.menuItems.map(item => {
      if (item.id === id) {
        updated = { ...item, ...data } as MenuItem;
        return updated;
      }
      return item;
    });
    if (!updated) throw new Error('Menu item not found');
    return updated;
  }

  deleteMenuItem(id: string): void {
    this.menuItems = this.menuItems.filter(item => item.id !== id);
  }

  // --- Tables CRUD ---
  getTables(restaurantId: string): Table[] {
    return this.tables.filter(t => t.restaurant_id === restaurantId);
  }

  createTable(restaurantId: string, name: string): Table {
    const rest = this.getRestaurantById(restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    // Subscription Limit check
    const currentTablesCount = this.getTables(restaurantId).length;
    const plan = rest.subscription_plan;
    const limit = PLAN_LIMITS[plan].maxTables;
    if (currentTablesCount >= limit) {
      throw new Error(`Your ${plan.toUpperCase()} plan limits you to ${limit} tables. Please upgrade to add more.`);
    }

    const newTable: Table = {
      id: 'tbl-' + Math.random().toString(36).substr(2, 9),
      restaurant_id: restaurantId,
      name
    };
    this.tables = [...this.tables, newTable];
    return newTable;
  }

  deleteTable(id: string): void {
    this.tables = this.tables.filter(t => t.id !== id);
  }

  // --- Orders ---
  getOrders(restaurantId: string): Order[] {
    return this.orders
      .filter(o => o.restaurant_id === restaurantId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getOrderById(id: string): Order | undefined {
    return this.orders.find(o => o.id === id);
  }

  createOrder(
    restaurantId: string,
    tableId: string,
    items: { menuItemId: string; quantity: number; notes?: string }[],
    specialInstructions?: string
  ): Order {
    const restaurant = this.getRestaurantById(restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    const table = this.tables.find(t => t.id === tableId);
    if (!table) throw new Error('Table not found');

    const allItems = this.getMenuItems(restaurantId);

    let subtotal = 0;
    const orderItems: OrderItem[] = [];
    const orderId = 'ord-' + Math.random().toString(36).substr(2, 9);

    for (const entry of items) {
      const menuItem = allItems.find(i => i.id === entry.menuItemId);
      if (!menuItem) throw new Error(`Item ${entry.menuItemId} not found`);

      const price = menuItem.price;
      subtotal += price * entry.quantity;

      orderItems.push({
        id: 'oi-' + Math.random().toString(36).substr(2, 9),
        order_id: orderId,
        menu_item_id: menuItem.id,
        menu_item_name: menuItem.name,
        quantity: entry.quantity,
        price,
        notes: entry.notes
      });
    }

    const gst = parseFloat(((subtotal * (restaurant.settings.gst_percentage || 0)) / 100).toFixed(2));
    const serviceCharge = parseFloat(((subtotal * (restaurant.settings.service_charge_percentage || 0)) / 100).toFixed(2));
    const total = parseFloat((subtotal + gst + serviceCharge).toFixed(2));

    const newOrder: Order = {
      id: orderId,
      restaurant_id: restaurantId,
      table_id: tableId,
      table_name: table.name,
      status: 'new',
      special_instructions: specialInstructions,
      subtotal,
      gst,
      service_charge: serviceCharge,
      total,
      created_at: new Date().toISOString(),
      items: orderItems
    };

    this.orders = [newOrder, ...this.orders];
    return newOrder;
  }

  updateOrderStatus(id: string, status: Order['status']): Order {
    let updated: Order | null = null;
    this.orders = this.orders.map(o => {
      if (o.id === id) {
        updated = { ...o, status, updated_at: new Date().toISOString() } as unknown as Order;
        return updated;
      }
      return o;
    });
    if (!updated) throw new Error('Order not found');
    return updated;
  }

  // --- Super Admin Control Panel ---
  getSuperAdminStats() {
    const totalRests = this.restaurants.length;
    const activeSubs = this.restaurants.filter(r => r.subscription_status === 'active').length;
    
    // Estimate cumulative mock revenue from completed orders
    const totalRev = this.orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.total, 0);

    return {
      totalRestaurants: totalRests,
      totalRevenue: totalRev,
      activeSubscriptions: activeSubs
    };
  }

  updateRestaurantPlan(id: string, plan: 'starter' | 'pro' | 'premium', status: Restaurant['subscription_status']): Restaurant {
    let updated: Restaurant | null = null;
    this.restaurants = this.restaurants.map(r => {
      if (r.id === id) {
        updated = {
          ...r,
          subscription_plan: plan,
          subscription_status: status,
          trial_ends_at: status === 'active' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : r.trial_ends_at
        };
        return updated;
      }
      return r;
    });
    if (!updated) throw new Error('Restaurant not found');
    return updated;
  }
}

export const mockDb = new MockDatabase();
