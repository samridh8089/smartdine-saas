// Database Service Layer communicating directly with Supabase
import { supabase } from './supabase';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  cover_image_url?: string;
  phone: string;
  address: string;
  gst_number?: string;
  settings: {
    currency: string;
    gst_percentage: number;
    service_charge_percentage: number;
    theme_color?: string;
    gst_enabled?: boolean;
    service_charge_enabled?: boolean;
    custom_charges?: { id: string; name: string; type: 'fixed' | 'percentage'; value: number; enabled: boolean }[];
    payment_enabled?: boolean;
    upi_id?: string;
    upi_name?: string;
    payment_qr?: string;
    takeaway_enabled?: boolean;
    kitchen_bell_type?: string;
    waiter_bell_type?: string;
    kitchen_bell_url?: string;
    waiter_bell_url?: string;
  };
  subscription_plan: 'starter' | 'pro' | 'premium';
  subscription_status: 'active' | 'trial' | 'past_due' | 'cancelled';
  trial_ends_at: string;
  created_at: string;
  billing_interval: 'monthly' | 'yearly';
}

export interface Profile {
  id: string;
  restaurant_id: string | null;
  email: string;
  full_name: string;
  role: 'owner' | 'manager' | 'waiter' | 'kitchen' | 'cashier' | 'super_admin';
  plain_password?: string;
}

export interface PricingPlan {
  id: 'starter' | 'pro' | 'premium';
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  created_at?: string;
}

export interface CustomerRequest {
  id: string;
  restaurant_id: string;
  table_id: string;
  table_name: string;
  type: 'call_waiter' | 'request_bill';
  status: 'pending' | 'accepted' | 'completed';
  created_at: string;
}

export interface AuditLog {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  user_email: string;
  action: string;
  details: string;
  created_at: string;
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
  menu_item_name: string;
  quantity: number;
  price: number;
  notes?: string;
  batch_id?: string;
}

export interface OrderBatch {
  id: string;
  order_id: string;
  batch_number: number;
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'served';
  special_instructions?: string;
  created_at: string;
  updated_at: string;
  accepted_at?: string;
  preparing_at?: string;
  ready_at?: string;
  served_at?: string;
  accepted_by?: string;
  preparing_by?: string;
  ready_by?: string;
  served_by?: string;
  items: OrderItem[];
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
  completed_at?: string;
  completed_by?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  items: OrderItem[];
  batches?: OrderBatch[];
  custom_charges?: { id: string; name: string; type: 'fixed' | 'percentage'; value: number; enabled: boolean }[];
  payment_status?: 'pending' | 'customer_marked_paid' | 'paid';
  payment_method?: string;
  payment_reference?: string;
  paid_at?: string;
  marked_paid_by?: string;
  order_type?: 'dine_in' | 'takeaway';
  customer_arrival_minutes?: number;
  takeaway_notes?: string;
}

export const PLAN_LIMITS = {
  starter: { maxTables: 5, maxItems: 15 },
  pro: { maxTables: 20, maxItems: 50 },
  premium: { maxTables: 9999, maxItems: 9999 }
};

export const db = {
  // --- Restaurant Management ---
  async getRestaurants(): Promise<Restaurant[]> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as Restaurant[];
  },

  async getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug.toLowerCase());
    if (error || !data || data.length === 0) return null;
    return data[0] as Restaurant;
  },

  async getRestaurantById(id: string): Promise<Restaurant | null> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id);
    if (error || !data || data.length === 0) return null;
    return data[0] as Restaurant;
  },

  async updateRestaurant(id: string, data: Partial<Restaurant>): Promise<Restaurant> {
    const { data: updated, error } = await supabase
      .from('restaurants')
      .update(data)
      .eq('id', id)
      .select();
    if (error || !updated || updated.length === 0) {
      throw new Error(error?.message || 'Restaurant not found');
    }
    return updated[0] as Restaurant;
  },

  // --- Category CRUD ---
  async getCategories(restaurantId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true });
    if (error || !data) return [];
    return data as Category[];
  },

  async createCategory(restaurantId: string, name: string): Promise<Category> {
    const cats = await this.getCategories(restaurantId);
    const sortOrder = cats.length + 1;
    const { data, error } = await supabase
      .from('categories')
      .insert({ restaurant_id: restaurantId, name, sort_order: sortOrder })
      .select();
    if (error || !data || data.length === 0) {
      throw new Error(error?.message || 'Failed to create category');
    }
    return data[0] as Category;
  },

  async updateCategory(id: string, name: string): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', id)
      .select();
    if (error || !data || data.length === 0) {
      throw new Error(error?.message || 'Failed to update category');
    }
    return data[0] as Category;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --- Menu Items CRUD ---
  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId);
    if (error || !data) return [];
    return data as MenuItem[];
  },

  async createMenuItem(restaurantId: string, data: Omit<MenuItem, 'id' | 'restaurant_id'>): Promise<MenuItem> {
    const rest = await this.getRestaurantById(restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    const currentItems = await this.getMenuItems(restaurantId);
    const plan = rest.subscription_plan;
    const limit = PLAN_LIMITS[plan].maxItems;
    if (currentItems.length >= limit) {
      throw new Error(`Your ${plan.toUpperCase()} plan limits you to ${limit} menu items. Please upgrade to add more.`);
    }

    const { data: inserted, error } = await supabase
      .from('menu_items')
      .insert({ ...data, restaurant_id: restaurantId })
      .select();
    if (error || !inserted || inserted.length === 0) {
      throw new Error(error?.message || 'Failed to create menu item');
    }
    return inserted[0] as MenuItem;
  },

  async updateMenuItem(id: string, data: Partial<MenuItem>): Promise<MenuItem> {
    const { data: updated, error } = await supabase
      .from('menu_items')
      .update(data)
      .eq('id', id)
      .select();
    if (error || !updated || updated.length === 0) {
      throw new Error(error?.message || 'Menu item not found');
    }
    return updated[0] as MenuItem;
  },

  async deleteMenuItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --- Tables CRUD ---
  async getTables(restaurantId: string): Promise<Table[]> {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId);
    if (error || !data) return [];
    return data as Table[];
  },

  async createTable(restaurantId: string, name: string): Promise<Table> {
    const rest = await this.getRestaurantById(restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    const currentTables = await this.getTables(restaurantId);
    const plan = rest.subscription_plan;
    const limit = PLAN_LIMITS[plan].maxTables;
    if (currentTables.length >= limit) {
      throw new Error(`Your ${plan.toUpperCase()} plan limits you to ${limit} tables. Please upgrade to add more.`);
    }

    const { data: inserted, error } = await supabase
      .from('tables')
      .insert({ restaurant_id: restaurantId, name })
      .select();
    if (error || !inserted || inserted.length === 0) {
      throw new Error(error?.message || 'Failed to create table');
    }
    return inserted[0] as Table;
  },

  async deleteTable(id: string): Promise<void> {
    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --- Orders ---
  async getOrders(restaurantId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), order_batches(*)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];

    return data.map((o: any) => {
      const items = (o.order_items || []).map((oi: any) => ({
        id: oi.id,
        order_id: oi.order_id,
        menu_item_id: oi.menu_item_id,
        menu_item_name: oi.menu_item_name || 'Unknown Item',
        quantity: oi.quantity,
        price: Number(oi.price),
        notes: oi.notes,
        batch_id: oi.batch_id
      }));

      const batches = (o.order_batches || []).map((b: any) => ({
        id: b.id,
        order_id: b.order_id,
        batch_number: b.batch_number,
        status: b.status,
        special_instructions: b.special_instructions,
        created_at: b.created_at,
        updated_at: b.updated_at,
        accepted_at: b.accepted_at,
        preparing_at: b.preparing_at,
        ready_at: b.ready_at,
        served_at: b.served_at,
        accepted_by: b.accepted_by,
        preparing_by: b.preparing_by,
        ready_by: b.ready_by,
        served_by: b.served_by,
        items: [] as OrderItem[]
      })).sort((a: any, b: any) => a.batch_number - b.batch_number);

      items.forEach((item: any) => {
        const batch = batches.find((b: any) => b.id === item.batch_id);
        if (batch) {
          batch.items.push(item);
        }
      });

      return {
        id: o.id,
        restaurant_id: o.restaurant_id,
        table_id: o.table_id,
        table_name: o.table_name || 'Table',
        status: o.status,
        special_instructions: o.special_instructions,
        subtotal: Number(o.subtotal),
        gst: Number(o.gst),
        service_charge: Number(o.service_charge),
        total: Number(o.total),
        created_at: o.created_at,
        completed_at: o.completed_at,
        completed_by: o.completed_by,
        cancelled_at: o.cancelled_at,
        cancelled_by: o.cancelled_by,
        cancellation_reason: o.cancellation_reason,
        custom_charges: o.custom_charges,
        payment_status: o.payment_status || 'pending',
        payment_method: o.payment_method,
        payment_reference: o.payment_reference,
        paid_at: o.paid_at,
        marked_paid_by: o.marked_paid_by,
        order_type: o.order_type || 'dine_in',
        customer_arrival_minutes: o.customer_arrival_minutes,
        takeaway_notes: o.takeaway_notes,
        items,
        batches
      };
    }) as Order[];
  },

  async getOrderById(id: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), order_batches(*)')
      .eq('id', id);
    if (error || !data || data.length === 0) return null;

    const o = data[0];
    const items = (o.order_items || []).map((oi: any) => ({
      id: oi.id,
      order_id: oi.order_id,
      menu_item_id: oi.menu_item_id,
      menu_item_name: oi.menu_item_name || 'Unknown Item',
      quantity: oi.quantity,
      price: Number(oi.price),
      notes: oi.notes,
      batch_id: oi.batch_id
    }));

    const batches = (o.order_batches || []).map((b: any) => ({
      id: b.id,
      order_id: b.order_id,
      batch_number: b.batch_number,
      status: b.status,
      special_instructions: b.special_instructions,
      created_at: b.created_at,
      updated_at: b.updated_at,
      accepted_at: b.accepted_at,
      preparing_at: b.preparing_at,
      ready_at: b.ready_at,
      served_at: b.served_at,
      accepted_by: b.accepted_by,
      preparing_by: b.preparing_by,
      ready_by: b.ready_by,
      served_by: b.served_by,
      items: [] as OrderItem[]
    })).sort((a: any, b: any) => a.batch_number - b.batch_number);

    items.forEach((item: any) => {
      const batch = batches.find((b: any) => b.id === item.batch_id);
      if (batch) {
        batch.items.push(item);
      }
    });

    return {
      id: o.id,
      restaurant_id: o.restaurant_id,
      table_id: o.table_id,
      table_name: o.table_name || 'Table',
      status: o.status,
      special_instructions: o.special_instructions,
      subtotal: Number(o.subtotal),
      gst: Number(o.gst),
      service_charge: Number(o.service_charge),
      total: Number(o.total),
      created_at: o.created_at,
      completed_at: o.completed_at,
      completed_by: o.completed_by,
      cancelled_at: o.cancelled_at,
      cancelled_by: o.cancelled_by,
      cancellation_reason: o.cancellation_reason,
      custom_charges: o.custom_charges,
      payment_status: o.payment_status || 'pending',
      payment_method: o.payment_method,
      payment_reference: o.payment_reference,
      paid_at: o.paid_at,
      marked_paid_by: o.marked_paid_by,
      order_type: o.order_type || 'dine_in',
      customer_arrival_minutes: o.customer_arrival_minutes,
      takeaway_notes: o.takeaway_notes,
      items,
      batches
    } as Order;
  },

  async createOrder(
    restaurantId: string,
    tableId: string,
    items: { menuItemId: string; quantity: number; notes?: string }[],
    specialInstructions?: string,
    orderType: 'dine_in' | 'takeaway' = 'dine_in',
    customerArrivalMinutes?: number,
    takeawayNotes?: string,
    paymentStatus: 'pending' | 'customer_marked_paid' | 'paid' = 'pending',
    idempotencyKey?: string
  ): Promise<Order> {
    const restaurant = await this.getRestaurantById(restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    const tables = await this.getTables(restaurantId);
    const table = tables.find(t => t.id === tableId);
    if (!table) throw new Error('Table not found');

    const allItems = await this.getMenuItems(restaurantId);

    let batchSubtotal = 0;
    const itemsPayload: any[] = [];

    // Calculate subtotal and build items list
    for (const entry of items) {
      const menuItem = allItems.find(i => i.id === entry.menuItemId);
      if (!menuItem) throw new Error(`Item ${entry.menuItemId} not found`);

      batchSubtotal += menuItem.price * entry.quantity;
      itemsPayload.push({
        menu_item_id: menuItem.id,
        menu_item_name: menuItem.name,
        quantity: entry.quantity,
        price: menuItem.price,
        notes: entry.notes
      });
    }

    // Check if there is an active order for this table (Dine-in only)
    let activeOrder = null;
    if (orderType === 'dine_in') {
      const { data: activeOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('table_id', tableId)
        .in('status', ['new', 'accepted', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: false });
      activeOrder = activeOrders && activeOrders.length > 0 ? activeOrders[0] : null;
    }

    if (!activeOrder) {
      // 1. Create a new order
      const gstEnabled = restaurant.settings.gst_enabled !== false;
      const gstPercentage = gstEnabled ? (restaurant.settings.gst_percentage || 0) : 0;
      const serviceChargeEnabled = restaurant.settings.service_charge_enabled !== false;
      const serviceChargePercentage = serviceChargeEnabled ? (restaurant.settings.service_charge_percentage || 0) : 0;

      const gst = parseFloat(((batchSubtotal * gstPercentage) / 100).toFixed(2));
      const serviceCharge = parseFloat(((batchSubtotal * serviceChargePercentage) / 100).toFixed(2));

      // Calculate custom charges
      let customChargesTotal = 0;
      const customChargesSnapshot = (restaurant.settings.custom_charges || [])
        .filter(c => c.enabled === true)
        .map(c => {
          const val = c.type === 'percentage' 
            ? parseFloat(((batchSubtotal * c.value) / 100).toFixed(2))
            : c.value;
          customChargesTotal += val;
          return c;
        });

      const total = parseFloat((batchSubtotal + gst + serviceCharge + customChargesTotal).toFixed(2));

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurantId,
          table_id: tableId,
          table_name: table.name,
          status: 'new',
          special_instructions: specialInstructions,
          subtotal: batchSubtotal,
          gst,
          service_charge: serviceCharge,
          total,
          custom_charges: customChargesSnapshot,
          order_type: orderType,
          customer_arrival_minutes: customerArrivalMinutes,
          takeaway_notes: takeawayNotes,
          payment_status: paymentStatus,
          paid_at: paymentStatus !== 'pending' ? new Date().toISOString() : null,
          idempotency_key: idempotencyKey
        })
        .select();

      if (orderError) {
        if (idempotencyKey && (orderError.code === '23505' || orderError.message?.includes('unique constraint'))) {
          const { data: existingOrders } = await supabase
            .from('orders')
            .select('id')
            .eq('idempotency_key', idempotencyKey);
          if (existingOrders && existingOrders.length > 0) {
            const fullOrder = await this.getOrderById(existingOrders[0].id);
            if (fullOrder) return fullOrder;
          }
        }
        throw new Error(orderError.message || 'Failed to submit order');
      }

      if (!orderData || orderData.length === 0) {
        throw new Error('Failed to submit order');
      }

      const newOrder = orderData[0];

      // Create Batch #1
      const { data: batchData, error: batchError } = await supabase
        .from('order_batches')
        .insert({
          order_id: newOrder.id,
          batch_number: 1,
          status: 'new',
          special_instructions: specialInstructions,
          idempotency_key: idempotencyKey ? `${idempotencyKey}-batch1` : undefined
        })
        .select();

      if (batchError || !batchData || batchData.length === 0) {
        await supabase.from('orders').delete().eq('id', newOrder.id);
        throw new Error(batchError?.message || 'Failed to create order batch');
      }

      const newBatch = batchData[0];

      // Create order items
      const finalItemsPayload = itemsPayload.map(item => ({
        order_id: newOrder.id,
        batch_id: newBatch.id,
        ...item
      }));

      console.log('BATCH ITEMS CREATED (New Order):', JSON.stringify(finalItemsPayload));

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .insert(finalItemsPayload)
        .select();
        
      console.log('ORDER_ITEMS INSERTED (New Order):', JSON.stringify(itemsData));

      if (itemsError) {
        await supabase.from('orders').delete().eq('id', newOrder.id);
        throw new Error(itemsError.message || 'Failed to submit order items');
      }

      const fullOrder = await this.getOrderById(newOrder.id);
      if (!fullOrder) throw new Error('Failed to retrieve new order');
      return fullOrder;
    } else {
      // 2. Active order exists! Append batch to it.
      // Fetch existing batches to determine batch number
      const { data: existingBatches, error: batchesErr } = await supabase
        .from('order_batches')
        .select('*')
        .eq('order_id', activeOrder.id);

      const nextBatchNum = (existingBatches?.length || 0) + 1;

      // Create new batch
      const { data: batchData, error: batchError } = await supabase
        .from('order_batches')
        .insert({
          order_id: activeOrder.id,
          batch_number: nextBatchNum,
          status: 'new',
          special_instructions: specialInstructions,
          idempotency_key: idempotencyKey
        })
        .select();

      if (batchError) {
        if (idempotencyKey && (batchError.code === '23505' || batchError.message?.includes('unique constraint'))) {
          const { data: existingBatches } = await supabase
            .from('order_batches')
            .select('order_id')
            .eq('idempotency_key', idempotencyKey);
          if (existingBatches && existingBatches.length > 0) {
            const fullOrder = await this.getOrderById(existingBatches[0].order_id);
            if (fullOrder) return fullOrder;
          }
        }
        throw new Error(batchError.message || 'Failed to create order batch');
      }

      if (!batchData || batchData.length === 0) {
        throw new Error('Failed to create order batch');
      }

      const newBatch = batchData[0];

      // Create order items
      const finalItemsPayload = itemsPayload.map(item => ({
        order_id: activeOrder.id,
        batch_id: newBatch.id,
        ...item
      }));

      console.log('BATCH ITEMS CREATED (Active Order Append):', JSON.stringify(finalItemsPayload));

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .insert(finalItemsPayload)
        .select();
        
      console.log('ORDER_ITEMS INSERTED (Active Order Append):', JSON.stringify(itemsData));

      if (itemsError) {
        await supabase.from('order_batches').delete().eq('id', newBatch.id);
        throw new Error(itemsError.message || 'Failed to submit order items');
      }

      // Append new special instructions to old ones if present
      const updatedInstructions = activeOrder.special_instructions
        ? `${activeOrder.special_instructions}\n[Batch #${nextBatchNum}]: ${specialInstructions || ''}`
        : specialInstructions;

      const gstEnabled = restaurant.settings.gst_enabled !== false;
      const gstPercentage = gstEnabled ? (restaurant.settings.gst_percentage || 0) : 0;
      const serviceChargeEnabled = restaurant.settings.service_charge_enabled !== false;
      const serviceChargePercentage = serviceChargeEnabled ? (restaurant.settings.service_charge_percentage || 0) : 0;

      const newSubtotal = Number(activeOrder.subtotal) + batchSubtotal;
      const gst = parseFloat(((newSubtotal * gstPercentage) / 100).toFixed(2));
      const serviceCharge = parseFloat(((newSubtotal * serviceChargePercentage) / 100).toFixed(2));

      let customChargesTotal = 0;
      const customChargesSnapshot = (restaurant.settings.custom_charges || [])
        .filter(c => c.enabled === true)
        .map(c => {
          const val = c.type === 'percentage' 
            ? parseFloat(((newSubtotal * c.value) / 100).toFixed(2))
            : c.value;
          customChargesTotal += val;
          return c;
        });

      const newTotal = parseFloat((newSubtotal + gst + serviceCharge + customChargesTotal).toFixed(2));

      const { error: updateOrderErr } = await supabase
        .from('orders')
        .update({
          status: 'new',
          special_instructions: updatedInstructions,
          subtotal: newSubtotal,
          gst,
          service_charge: serviceCharge,
          total: newTotal,
          custom_charges: customChargesSnapshot
        })
        .eq('id', activeOrder.id);

      if (updateOrderErr) {
        console.error('Failed to update parent order totals:', updateOrderErr.message);
      }

      const fullOrder = await this.getOrderById(activeOrder.id);
      if (!fullOrder) throw new Error('Failed to retrieve updated order');
      return fullOrder;
    }
  },

  async updateOrderStatus(id: string, status: Order['status'], userName?: string, cancellationReason?: string): Promise<Order> {
    const updatePayload: any = { status };
    if (status === 'completed') {
      updatePayload.completed_at = new Date().toISOString();
      if (userName) updatePayload.completed_by = userName;
    }
    if (status === 'cancelled') {
      updatePayload.cancelled_at = new Date().toISOString();
      if (userName) updatePayload.cancelled_by = userName;
      if (cancellationReason) updatePayload.cancellation_reason = cancellationReason;
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error || !updated || updated.length === 0) {
      throw new Error(error?.message || 'Order not found');
    }

    // If status is completed or cancelled, sync batches
    if (status === 'completed' || status === 'cancelled') {
      await supabase
        .from('order_batches')
        .update({ status: 'served' })
        .eq('order_id', id);
    }

    const fullOrder = await this.getOrderById(id);
    if (!fullOrder) throw new Error('Order not found');
    return fullOrder;
  },

  async updateOrderPaymentStatus(
    orderId: string,
    paymentStatus: Order['payment_status'],
    userName?: string,
    method?: string,
    reference?: string
  ): Promise<Order> {
    const updatePayload: any = { payment_status: paymentStatus };
    const now = new Date().toISOString();
    if (paymentStatus === 'customer_marked_paid' || paymentStatus === 'paid') {
      updatePayload.paid_at = now;
    }
    if (paymentStatus === 'paid') {
      if (userName) updatePayload.marked_paid_by = userName;
      if (method) updatePayload.payment_method = method;
      if (reference) updatePayload.payment_reference = reference;
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select();

    if (error || !updated || updated.length === 0) {
      throw new Error(error?.message || 'Order not found');
    }

    const fullOrder = await this.getOrderById(orderId);
    if (!fullOrder) throw new Error('Order not found');
    return fullOrder;
  },

  async updateBatchStatus(batchId: string, status: OrderBatch['status'], userName?: string): Promise<Order> {
    const updatePayload: any = { status, updated_at: new Date().toISOString() };
    const now = new Date().toISOString();
    if (status === 'accepted') updatePayload.accepted_at = now;
    if (status === 'preparing') updatePayload.preparing_at = now;
    if (status === 'ready') updatePayload.ready_at = now;
    if (status === 'served') updatePayload.served_at = now;

    if (userName) {
      if (status === 'accepted') updatePayload.accepted_by = userName;
      if (status === 'preparing') updatePayload.preparing_by = userName;
      if (status === 'ready') updatePayload.ready_by = userName;
      if (status === 'served') updatePayload.served_by = userName;
    }

    const { data: updatedBatchData, error: batchErr } = await supabase
      .from('order_batches')
      .update(updatePayload)
      .eq('id', batchId)
      .select();

    if (batchErr || !updatedBatchData || updatedBatchData.length === 0) {
      throw new Error(batchErr?.message || 'Batch not found');
    }

    const batch = updatedBatchData[0];
    const orderId = batch.order_id;

    // Fetch all batches of this order to recalculate order status
    const { data: allBatches, error: allBatchesErr } = await supabase
      .from('order_batches')
      .select('*')
      .eq('order_id', orderId);

    if (allBatchesErr || !allBatches) {
      throw new Error(allBatchesErr?.message || 'Failed to fetch order batches');
    }

    // Recalculate status of the order based on its latest active batch
    let nextOrderStatus: Order['status'] = 'served';

    if (allBatches && allBatches.length > 0) {
      const sortedBatches = [...allBatches].sort((a, b) => b.batch_number - a.batch_number);
      const latestActiveBatch = sortedBatches.find(b => b.status !== 'served') || sortedBatches[0];
      nextOrderStatus = latestActiveBatch.status as any;
    } else {
      nextOrderStatus = status as any;
    }

    // Update parent order status
    const { error: orderUpdateErr } = await supabase
      .from('orders')
      .update({ status: nextOrderStatus })
      .eq('id', orderId);

    if (orderUpdateErr) {
      throw new Error(orderUpdateErr.message);
    }

    const fullOrder = await this.getOrderById(orderId);
    if (!fullOrder) throw new Error('Order not found');
    return fullOrder;
  },

  // --- Super Admin Control Panel & SaaS Stats ---
  async getSuperAdminStats(): Promise<{
    totalRestaurants: number;
    totalRevenue: number; // MRR
    activeSubscriptions: number; // Active paid
    mrr: number;
    arr: number;
    totalPaidCustomers: number;
    trialUsers: number;
    expiredLicenses: number;
    activeLicenses: number;
  }> {
    const { data: rests, error: restsErr } = await supabase.from('restaurants').select('*');
    if (restsErr || !rests) throw new Error(restsErr?.message || 'Failed to fetch admin stats');

    const pricingPlans = await this.getPricingPlans();
    const planPrices = pricingPlans.reduce((acc, plan) => {
      acc[plan.id] = { monthly: plan.price_monthly, yearly: plan.price_yearly };
      return acc;
    }, {} as Record<string, { monthly: number; yearly: number }>);

    // Fallbacks if pricing plans database is not loaded yet
    const getPlanPrice = (plan: 'starter' | 'pro' | 'premium', interval: 'monthly' | 'yearly') => {
      const prices = planPrices[plan] || {
        starter: { monthly: 299, yearly: 2990 },
        pro: { monthly: 799, yearly: 7990 },
        premium: { monthly: 1499, yearly: 14990 }
      }[plan];
      return interval === 'yearly' ? prices.yearly : prices.monthly;
    };

    let mrr = 0;
    let totalPaidCustomers = 0;
    let trialUsers = 0;
    let expiredLicenses = 0;
    let activeLicenses = 0;

    const now = new Date();

    rests.forEach(r => {
      const plan = (r.subscription_plan || 'starter') as 'starter' | 'pro' | 'premium';
      const status = r.subscription_status || 'trial';
      const interval = (r.billing_interval || 'monthly') as 'monthly' | 'yearly';
      const trialEnds = new Date(r.trial_ends_at);
      const isTrialExpired = status === 'trial' && trialEnds < now;
      const isCancelled = status === 'cancelled' || status === 'past_due';

      if (status === 'active') {
        totalPaidCustomers += 1;
        activeLicenses += 1;
        const price = getPlanPrice(plan, interval);
        if (interval === 'yearly') {
          mrr += price / 12;
        } else {
          mrr += price;
        }
      } else if (status === 'trial' && !isTrialExpired) {
        trialUsers += 1;
        activeLicenses += 1;
      } else if (isTrialExpired || isCancelled) {
        expiredLicenses += 1;
      }
    });

    const arr = mrr * 12;

    return {
      totalRestaurants: rests.length,
      totalRevenue: mrr, // Display MRR in the card
      activeSubscriptions: activeLicenses,
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      totalPaidCustomers,
      trialUsers,
      expiredLicenses,
      activeLicenses
    };
  },

  async updateRestaurantPlan(id: string, plan: 'starter' | 'pro' | 'premium', status: Restaurant['subscription_status']): Promise<Restaurant> {
    const trialEndsAt = status === 'active' 
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() 
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: updated, error } = await supabase
      .from('restaurants')
      .update({
        subscription_plan: plan,
        subscription_status: status,
        trial_ends_at: trialEndsAt
      })
      .eq('id', id)
      .select();

    if (error || !updated || updated.length === 0) {
      throw new Error(error?.message || 'Restaurant not found');
    }

    return updated[0] as Restaurant;
  },

  // --- Pricing Plans CRUD ---
  async getPricingPlans(): Promise<PricingPlan[]> {
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .order('price_monthly', { ascending: true });
    if (error || !data || data.length === 0) {
      return [
        { id: 'starter', name: 'Starter', price_monthly: 299, price_yearly: 2990, features: ['Up to 5 tables', 'Up to 15 menu items', 'Standard KDS', 'QR Code Generation'] },
        { id: 'pro', name: 'Pro', price_monthly: 799, price_yearly: 7990, features: ['Up to 20 tables', 'Up to 50 menu items', 'Premium KDS', 'Analytics Dashboard', 'Waiter Panel', 'Real-time Alerts'] },
        { id: 'premium', name: 'Premium', price_monthly: 1499, price_yearly: 14990, features: ['Unlimited tables', 'Unlimited menu items', 'Priority Support', 'Branding settings', 'Real-time Analytics', 'Waiter & Kitchen Panels'] }
      ];
    }
    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      price_monthly: Number(d.price_monthly),
      price_yearly: Number(d.price_yearly),
      features: Array.isArray(d.features) ? d.features : JSON.parse(d.features || '[]')
    })) as PricingPlan[];
  },

  async updatePricingPlan(id: string, data: Partial<PricingPlan>): Promise<PricingPlan> {
    const { data: updated, error } = await supabase
      .from('pricing_plans')
      .update(data)
      .eq('id', id)
      .select();
    if (error || !updated || updated.length === 0) {
      throw new Error(error?.message || 'Pricing plan not found');
    }
    return updated[0] as PricingPlan;
  },

  // --- Deletion ---
  async deleteRestaurant(restaurantId: string): Promise<void> {
    // Delete profiles first
    await supabase.from('profiles').delete().eq('restaurant_id', restaurantId);
    // Delete restaurant (which cascades to tables, categories, menu items, orders, order items)
    const { error } = await supabase.from('restaurants').delete().eq('id', restaurantId);
    if (error) throw new Error(error.message);
  },

  // --- Customer Requests (Waiter Portal Calls) ---
  async getCustomerRequests(restaurantId: string): Promise<CustomerRequest[]> {
    const { data, error } = await supabase
      .from('customer_requests')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as CustomerRequest[];
  },

  async createCustomerRequest(restaurantId: string, tableId: string, type: 'call_waiter' | 'request_bill'): Promise<CustomerRequest> {
    const tables = await this.getTables(restaurantId);
    const table = tables.find(t => t.id === tableId);
    if (!table) throw new Error('Table not found');

    const { data, error } = await supabase
      .from('customer_requests')
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        table_name: table.name,
        type,
        status: 'pending'
      })
      .select();
    if (error || !data || data.length === 0) {
      throw new Error(error?.message || 'Failed to submit call request');
    }
    return data[0] as CustomerRequest;
  },

  async acceptCustomerRequest(requestId: string): Promise<CustomerRequest> {
    const { data, error } = await supabase
      .from('customer_requests')
      .update({ status: 'completed' })
      .eq('id', requestId)
      .select();
    if (error || !data || data.length === 0) {
      throw new Error(error?.message || 'Failed to accept request');
    }
    return data[0] as CustomerRequest;
  },

  async resolveCustomerRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('customer_requests')
      .update({ status: 'completed' })
      .eq('id', requestId);
    if (error) throw new Error(error.message);
  },

  // --- Audit Logging ---
  async getAuditLogs(restaurantId: string): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as AuditLog[];
  },

  async createAuditLog(restaurantId: string, userId: string | null, email: string, action: string, details: string): Promise<void> {
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: restaurantId,
        user_id: userId,
        user_email: email,
        action,
        details
      });
  },

  // --- Staff Management ---
  async getStaffProfiles(restaurantId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .neq('role', 'super_admin');
    if (error || !data) return [];
    return data as Profile[];
  },

  async createStaffProfile(email: string, password: string, fullName: string, role: Profile['role'], restaurantId: string): Promise<Profile> {
    const { createClient } = await import('@supabase/supabase-js');
    const tempSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    
    // Sign up via the temporary client so it doesn't affect active session
    const { data, error } = await tempSupabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          fullName,
          role,
          restaurant_id: restaurantId,
          plain_password: password
        }
      }
    });
    
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Failed to create staff auth user');
    
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
       
    if (profileErr || !profileData) {
      throw new Error(profileErr?.message || 'Staff profile sync failed');
    }
    return profileData as Profile;
  },

  async deleteStaffProfile(id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_staff_user', { target_user_id: id });
    if (error) throw new Error(error.message || 'Failed to delete staff account');
  },

  async updateStaffPassword(email: string, oldPassword: string, newPassword: string): Promise<void> {
    const { createClient } = await import('@supabase/supabase-js');
    const tempSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    
    // 1. Sign in as the staff member
    const { error: signInError } = await tempSupabase.auth.signInWithPassword({
      email,
      password: oldPassword
    });
    
    if (signInError) {
      throw new Error('Failed to authenticate staff user for password reset (Make sure they have a plain_password set).');
    }
    
    // 2. Update their password
    const { error: updateError } = await tempSupabase.auth.updateUser({
      password: newPassword
    });
    
    if (updateError) {
      await tempSupabase.auth.signOut();
      throw new Error(updateError.message || 'Failed to update password');
    }
    
    // 3. Update the plain_password in the profiles table
    const { error: profileError } = await tempSupabase
      .from('profiles')
      .update({ plain_password: newPassword })
      .eq('email', email);
      
    await tempSupabase.auth.signOut();
    
    if (profileError) {
      throw new Error(profileError.message || 'Failed to update plain_password in profile');
    }
  }
};
