'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db, Order, Restaurant, CustomerRequest, OrderBatch } from '@/lib/db';
import { getActiveUser, supabase } from '@/lib/supabase';
import { useRestaurant } from '../../layout';
import { formatPrice, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Search, Printer, Check, X, AlertCircle, ShoppingBag, Bell, ClipboardList, CheckCircle, ChefHat } from 'lucide-react';


export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get('id');

  const { restaurant, activeRole, profile } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Tab state: 'orders' or 'requests'
  const [activeTab, setActiveTab] = useState<'orders' | 'requests'>('orders');
  const [customerRequests, setCustomerRequests] = useState<CustomerRequest[]>([]);

  // Real-time toast state
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

  const [processingRequestIds, setProcessingRequestIds] = useState<string[]>([]);
  const [processingOrderIds, setProcessingOrderIds] = useState<string[]>([]);

  const alertedOrderIds = useRef<Set<string>>(new Set());
  const alertedBatchIds = useRef<Set<string>>(new Set());
  const selectedOrderRef = useRef<Order | null>(selectedOrder);
  const isReloadingRef = useRef(false);
  const pendingReloadRef = useRef(false);
  useEffect(() => {
    selectedOrderRef.current = selectedOrder;
  }, [selectedOrder]);



  // Request browser notifications permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);



  const showDesktopNotification = (order: Order) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`New Order - ${order.table_name || 'Table'}`, {
          body: `Items: ${order.items?.map(i => `${i.quantity}x ${i.menu_item_name}`).join(', ') || 'No items'}. Total: ₹${order.total}`,
          icon: '/favicon.ico'
        });
      } catch (e) {
        console.error('Notification error:', e);
      }
    }
  };

  const loadInitialData = async (restId: string) => {
    const allOrders = await db.getOrders(restId);
    const filteredForRole = activeRole === 'waiter'
      ? allOrders.filter(o => ['ready', 'served', 'completed'].includes(o.status))
      : allOrders;
    setOrders(filteredForRole);

    // Cache existing order IDs on initial load so we don't chime for them
    allOrders.forEach(o => alertedOrderIds.current.add(o.id));

    // Load pending & active requests
    const reqs = await db.getCustomerRequests(restId);
    const activeReqs = reqs.filter(r => r.status === 'pending');
    setCustomerRequests(activeReqs);

    if (orderIdParam) {
      const selected = filteredForRole.find(o => o.id === orderIdParam);
      if (selected) setSelectedOrder(selected);
    } else if (filteredForRole.length > 0 && !selectedOrder) {
      setSelectedOrder(filteredForRole[0]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (restaurant?.id) {
      loadInitialData(restaurant.id);
    }
  }, [restaurant, orderIdParam]);

  const safeReloadOrders = async (restId: string) => {
    if (isReloadingRef.current) {
      pendingReloadRef.current = true;
      return;
    }
    isReloadingRef.current = true;
    try {
      const allOrders = await db.getOrders(restId);
      const filteredOrders = activeRole === 'waiter'
        ? allOrders.filter(o => ['ready', 'served', 'completed'].includes(o.status))
        : allOrders;
      setOrders(filteredOrders);

      const currentSelected = selectedOrderRef.current;
      if (currentSelected) {
        const updated = filteredOrders.find(o => o.id === currentSelected.id);
        if (updated) setSelectedOrder(updated);
      }

      const reqs = await db.getCustomerRequests(restId);
      const activeReqs = reqs.filter(r => r.status === 'pending');
      setOrders(filteredOrders);
      setCustomerRequests(activeReqs);
    } catch (e) {
      console.error('Failed to reload orders:', e);
    } finally {
      isReloadingRef.current = false;
      if (pendingReloadRef.current) {
        pendingReloadRef.current = false;
        await safeReloadOrders(restId);
      }
    }
  };

  useEffect(() => {
    if (restaurant?.id) {
      loadInitialData(restaurant.id);
    }
  }, [restaurant, orderIdParam]);

  const reloadFnRef = useRef(safeReloadOrders);
  useEffect(() => {
    reloadFnRef.current = safeReloadOrders;
  });

  // Realtime Supabase Subscription for Orders, Requests & Batches
  useEffect(() => {
    if (!restaurant) return;
    const restId = restaurant.id;

    const handleResync = () => {
      console.log('Force resync event received. Reloading Orders data...');
      reloadFnRef.current(restId);
    };
    window.addEventListener('force-resync', handleResync);

    console.log(`Subscribing to live orders, requests & batches updates for restaurant: ${restId}`);
    const channel = supabase
      .channel('live_orders_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restId}`
        },
        async (payload) => {
          console.log('Realtime Live Orders order change payload received:', payload);
          await reloadFnRef.current(restId);

          if (payload.eventType === 'INSERT') {
            const newOrderPayload = payload.new as Order;
            if (!alertedOrderIds.current.has(newOrderPayload.id)) {
              alertedOrderIds.current.add(newOrderPayload.id);
              console.log(`New order detected! Playing chimes for order ID: ${newOrderPayload.id}`);
              
              // Trigger hardware vibration
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
              }

              // Fetch full order with items and display desktop notification
              const fullOrder = await db.getOrderById(newOrderPayload.id);
              if (fullOrder) {
                showDesktopNotification(fullOrder);
                setToast({ message: `New Order Received - ${fullOrder.table_name || 'Table X'}`, visible: true });
                
                setTimeout(() => {
                  setToast(prev => prev && prev.message.includes(fullOrder.table_name || 'Table X') ? { ...prev, visible: false } : prev);
                }, 5000);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_requests',
          filter: `restaurant_id=eq.${restId}`
        },
        async (payload) => {
          console.log('Realtime Live Orders request change payload received:', payload);
          await reloadFnRef.current(restId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_batches'
        },
        async (payload) => {
          console.log('Realtime Live Orders batch change payload received:', payload);
          const batch = payload.new as OrderBatch;
          if (!batch) return;
          
          // Verify if this belongs to our restaurant by checking its parent order
          const { data: parentOrder } = await supabase
            .from('orders')
            .select('restaurant_id')
            .eq('id', batch.order_id)
            .single();

          if (parentOrder && parentOrder.restaurant_id === restId) {
            await reloadFnRef.current(restId);
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`Supabase Realtime Live Orders subscription status: ${status}`);
        if (err) {
          console.error(`Supabase Realtime Live Orders subscription error:`, err);
        }
      });

    return () => {
      console.log('Cleaning up Live Orders realtime channel subscription...');
      supabase.removeChannel(channel);
      window.removeEventListener('force-resync', handleResync);
    };
  }, [restaurant]);

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    router.replace(`/dashboard/orders?id=${order.id}`);
  };

  const updateOrderStatus = async (status: Order['status'], cancellationReason?: string) => {
    if (!selectedOrder || !restaurant) return;
    if (processingOrderIds.includes(selectedOrder.id)) return;

    if (status === 'cancelled' && !cancellationReason) {
      const reason = window.prompt('Please enter a cancellation reason (mandatory):');
      if (reason === null) return; // user cancelled the prompt
      if (!reason.trim()) {
        alert('You must provide a cancellation reason to cancel the order.');
        return;
      }
      return updateOrderStatus('cancelled', reason.trim());
    }

    setProcessingOrderIds(prev => [...prev, selectedOrder.id]);
    try {
      const updated = await db.updateOrderStatus(
        selectedOrder.id, 
        status, 
        profile?.full_name || 'Staff Member', 
        cancellationReason
      );
      setSelectedOrder(updated);
      
      const allOrders = await db.getOrders(restaurant.id);
      setOrders(allOrders);
      
      // Dispatch storage event locally
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      alert(`Failed to update order status: ${err.message}`);
    } finally {
      setProcessingOrderIds(prev => prev.filter(id => id !== selectedOrder.id));
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (processingRequestIds.includes(requestId)) return;

    const originalRequests = [...customerRequests];
    setCustomerRequests(prev => prev.filter(r => r.id !== requestId));
    setProcessingRequestIds(prev => [...prev, requestId]);

    try {
      window.dispatchEvent(new Event('stop-waiter-sound'));
      await db.acceptCustomerRequest(requestId);
      const updatedReqs = originalRequests.filter(r => r.id !== requestId);
    } catch (err: any) {
      setCustomerRequests(originalRequests);
      alert(`Failed to accept request: ${err.message}`);
    } finally {
      setProcessingRequestIds(prev => prev.filter(id => id !== requestId));
    }
  };

  const handleResolveRequest = async (requestId: string) => {
    if (processingRequestIds.includes(requestId)) return;

    const originalRequests = [...customerRequests];
    setCustomerRequests(prev => prev.filter(r => r.id !== requestId));
    setProcessingRequestIds(prev => [...prev, requestId]);

    try {
      window.dispatchEvent(new Event('stop-waiter-sound'));
      await db.resolveCustomerRequest(requestId);
      const updatedReqs = originalRequests.filter(r => r.id !== requestId);
      alert('Request marked resolved.');
    } catch (err: any) {
      setCustomerRequests(originalRequests);
      alert(`Failed to resolve request: ${err.message}`);
    } finally {
      setProcessingRequestIds(prev => prev.filter(id => id !== requestId));
    }
  };

  const handlePrintInvoice = () => {
    if (!selectedOrder || !restaurant) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = selectedOrder.items.map(item => `
      <tr>
        <td style="padding: 6px 0; font-weight: 600;">${item.quantity}x ${item.menu_item_name}</td>
        <td style="padding: 6px 0; text-align: right;">${formatPrice(item.price * item.quantity, restaurant.settings.currency)}</td>
      </tr>
    `).join('');

    let customChargesHtml = '';
    if (selectedOrder.custom_charges) {
      selectedOrder.custom_charges.forEach((charge: any) => {
        const val = charge.type === 'percentage' 
          ? selectedOrder.subtotal * (charge.value / 100) 
          : charge.value;
        customChargesHtml += `
          <tr>
            <td>${charge.name}:</td>
            <td class="text-right">${formatPrice(val, restaurant.settings.currency)}</td>
          </tr>
        `;
      });
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - #${selectedOrder.id.slice(-5).toUpperCase()}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 80mm;
              margin: 0 auto;
              padding: 20px 10px;
              color: #000;
              font-size: 12px;
              line-height: 1.4;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .header { margin-bottom: 15px; }
            .header h2 { margin: 0 0 5px 0; font-size: 16px; }
            .header p { margin: 0 0 3px 0; font-size: 11px; color: #555; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th { font-weight: bold; }
            td, th { padding: 4px 0; vertical-align: top; }
            .footer { margin-top: 20px; font-size: 10px; }
            @media print {
              body { margin: 0; padding: 10px; width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="text-center header">
            <h2>${restaurant.name}</h2>
            <p>${restaurant.address || 'Dining QR Order System'}</p>
            <p>Tel: ${restaurant.phone || 'N/A'}</p>
          </div>
          
          <div class="divider"></div>
          
          <div>
            <p><span class="bold">Receipt ID:</span> #${selectedOrder.id.slice(-5).toUpperCase()}</p>
            ${selectedOrder.order_type === 'takeaway' ? `
              <p><span class="bold">Type:</span> 🟣 TAKEAWAY</p>
              <p><span class="bold">Pickup Arrival:</span> ${selectedOrder.customer_arrival_minutes} minutes</p>
            ` : `
              <p><span class="bold">Table:</span> ${selectedOrder.table_name || 'N/A'}</p>
            `}
            <p><span class="bold">Date:</span> ${new Date(selectedOrder.created_at).toLocaleString()}</p>
            <p><span class="bold">Status:</span> ${selectedOrder.status.toUpperCase()}</p>
          </div>
          
          <div class="divider"></div>
          
          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left; padding-bottom: 5px;">Item</th>
                <th style="text-align: right; padding-bottom: 5px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <table>
            <tr>
              <td>Subtotal:</td>
              <td class="text-right">${formatPrice(selectedOrder.subtotal, restaurant.settings.currency)}</td>
            </tr>
            ${restaurant.settings.gst_enabled !== false && selectedOrder.gst > 0 ? `
              <tr>
                <td>GST:</td>
                <td class="text-right">${formatPrice(selectedOrder.gst, restaurant.settings.currency)}</td>
              </tr>
            ` : ''}
            ${restaurant.settings.service_charge_enabled !== false && selectedOrder.service_charge > 0 ? `
              <tr>
                <td>Service Charge:</td>
                <td class="text-right">${formatPrice(selectedOrder.service_charge, restaurant.settings.currency)}</td>
              </tr>
            ` : ''}
            ${customChargesHtml}
            <tr class="bold" style="font-size: 14px;">
              <td style="padding-top: 5px;">Total:</td>
              <td class="text-right" style="padding-top: 5px;">${formatPrice(selectedOrder.total, restaurant.settings.currency)}</td>
            </tr>
          </table>
          
          <div class="divider"></div>
          
          <div class="text-center footer">
            <p>Thank you for dining with us!</p>
            <p>SmartDine QR Order App</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'new': return <Badge variant="info">New</Badge>;
      case 'accepted': return <Badge variant="neutral">Accepted</Badge>;
      case 'preparing': return <Badge variant="warning">Preparing</Badge>;
      case 'ready': return <Badge variant="purple">Ready</Badge>;
      case 'served': return <Badge variant="success">Served</Badge>;
      case 'completed': return <Badge variant="success">Completed</Badge>;
      case 'cancelled': return <Badge variant="error">Cancelled</Badge>;
    }
  };

  if (loading || !restaurant) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="grid grid-cols-3 gap-6 h-[80vh]">
          <div className="bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="col-span-2 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.table_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(i => i.menu_item_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 flex flex-col h-[calc(100vh-8rem)]">
      {/* Alarm alerting cards for waiters */}
      {(activeRole === 'waiter' || activeRole === 'owner' || activeRole === 'manager') && (
        <div className="flex flex-col gap-4 shrink-0 animate-fade-in">
          {orders.some(o => o.status === 'ready') && (
            <div className="bg-orange-500 text-white rounded-2xl p-6 shadow-xl border border-orange-400 animate-pulse flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="bg-white/20 p-3.5 rounded-2xl animate-bounce">
                  <ChefHat className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-wide uppercase">READY FOR PICKUP!</h3>
                  <p className="text-sm text-orange-100 font-semibold mt-1">Order food is ready in the kitchen. Deliver it to the table and mark as served to stop the alarm.</p>
                </div>
              </div>
              <button
                disabled={orders.find(o => o.status === 'ready') ? processingOrderIds.includes(orders.find(o => o.status === 'ready')!.id) : false}
                className="!bg-white !text-orange-700 hover:bg-orange-50 font-extrabold px-6 py-3 rounded-xl shadow-lg border border-transparent cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0 z-10"
                onClick={async () => {
                  const firstReady = orders.find(o => o.status === 'ready');
                  if (firstReady) {
                    setProcessingOrderIds(prev => [...prev, firstReady.id]);
                    try {
                      window.dispatchEvent(new Event('stop-waiter-sound'));
                      const readyBatches = firstReady.batches?.filter(b => b.status === 'ready') || [];
                      for (const batch of readyBatches) {
                        await db.updateBatchStatus(batch.id, 'served');
                      }
                      const allOrders = await db.getOrders(restaurant.id);
                      setOrders(allOrders);
                      const updatedSelected = allOrders.find(o => o.id === (selectedOrder?.id || firstReady.id));
                      if (updatedSelected) setSelectedOrder(updatedSelected);
                      window.dispatchEvent(new Event('storage'));
                    } catch (err: any) {
                      alert(`Failed to serve order: ${err.message}`);
                    } finally {
                      setProcessingOrderIds(prev => prev.filter(id => id !== firstReady.id));
                    }
                  }
                }}
              >
                {orders.find(o => o.status === 'ready') && processingOrderIds.includes(orders.find(o => o.status === 'ready')!.id) && (
                  <div className="h-4 w-4 border-2 border-orange-700 border-t-transparent rounded-full animate-spin" />
                )}
                Serve Order
              </button>
            </div>
          )}

          {customerRequests.some(r => r.status === 'pending') && (
            <div className="bg-blue-600 text-white rounded-2xl p-6 shadow-xl border border-blue-500 animate-pulse flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="bg-white/20 p-3.5 rounded-2xl animate-bounce">
                  <Bell className="h-8 w-8 text-white fill-current animate-wiggle" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-wide uppercase">TABLE CALLING WAITER!</h3>
                  <div className="space-y-1 mt-1 text-sm text-blue-100 font-semibold">
                    {customerRequests.filter(r => r.status === 'pending').map(r => (
                      <p key={r.id}>🚨 {r.table_name} is calling a waiter ({r.type === 'call_waiter' ? 'Service Request' : 'Bill Request'}).</p>
                    ))}
                  </div>
                </div>
              </div>
              <button
                disabled={customerRequests.find(r => r.status === 'pending') ? processingRequestIds.includes(customerRequests.find(r => r.status === 'pending')!.id) : false}
                className="!bg-white !text-blue-700 hover:bg-blue-50 font-extrabold px-6 py-3 rounded-xl shadow-lg border border-transparent cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0 z-10"
                onClick={async () => {
                  const firstPending = customerRequests.find(r => r.status === 'pending');
                  if (firstPending) {
                    await handleAcceptRequest(firstPending.id);
                  }
                }}
              >
                {customerRequests.find(r => r.status === 'pending') && processingRequestIds.includes(customerRequests.find(r => r.status === 'pending')!.id) && (
                  <div className="h-4 w-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                )}
                Accept Request
              </button>
            </div>
          )}
        </div>
      )}

      {/* Header section with Tabs */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Live Orders & Requests</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage statuses, print bills, and resolve customer notifications in real time.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" /> Live Orders
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Bell className="h-3.5 w-3.5" /> Customer Calls
            {customerRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                {customerRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Orders Tab View */}
      {activeTab === 'orders' && (
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          {/* Left Side: Order List */}
          <div className="w-full md:w-5/12 flex flex-col space-y-4 min-h-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search order ID, table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <option value="all">All States</option>
                <option value="new">New</option>
                <option value="accepted">Accepted</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="served">Served</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
              {filteredOrders.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-slate-400 text-sm py-12 flex-col gap-2">
                  <ClipboardList className="h-8 w-8 text-slate-300" />
                  <span>No orders match this query.</span>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  return (
                    <button
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-md' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-950 dark:text-white">#{order.id.slice(-5).toUpperCase()}</span>
                          {getStatusBadge(order.status)}
                          {order.payment_status === 'paid' ? (
                            <Badge variant="success">Paid</Badge>
                          ) : order.payment_status === 'customer_marked_paid' ? (
                            <Badge variant="warning">Marked Paid</Badge>
                          ) : null}
                        </div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1.5 flex-wrap">
                          {order.order_type === 'takeaway' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 uppercase">
                              🟣 Takeaway
                            </span>
                          ) : (
                            <span>{order.table_name || 'N/A'}</span>
                          )}
                          <span>• {order.items.reduce((s, i) => s + i.quantity, 0)} items</span>
                          {order.order_type === 'takeaway' && (
                            <span className="text-purple-600 dark:text-purple-400 font-extrabold text-[9px]">
                              (Pickup {order.customer_arrival_minutes}m)
                            </span>
                          )}
                        </p>
                        <p className="text-xs truncate max-w-[200px] text-slate-500 dark:text-slate-400">
                          {order.items.map(i => i.menu_item_name).join(', ')}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-extrabold text-sm">{formatPrice(order.total, restaurant.settings.currency)}</p>
                        <p className="text-[10px] text-slate-400">{new Date(order.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                        {order.status === 'ready' && (
                          <div className="pt-1">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-2.5 py-1 text-xs rounded-lg cursor-pointer"
                              isLoading={processingOrderIds.includes(order.id)}
                              disabled={processingOrderIds.includes(order.id)}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setProcessingOrderIds(prev => [...prev, order.id]);
                                try {
                                  window.dispatchEvent(new Event('stop-waiter-sound'));
                                  const readyBatches = order.batches?.filter(b => b.status === 'ready') || [];
                                  for (const batch of readyBatches) {
                                    await db.updateBatchStatus(batch.id, 'served', profile?.full_name || 'Waiter');
                                  }
                                  const allOrders = await db.getOrders(restaurant.id);
                                  const filteredOrders = activeRole === 'waiter'
                                    ? allOrders.filter(o => ['ready', 'served', 'completed'].includes(o.status))
                                    : allOrders;
                                  setOrders(filteredOrders);
                                  window.dispatchEvent(new Event('storage'));
                                } catch (err: any) {
                                  alert(`Failed to serve order: ${err.message}`);
                                } finally {
                                  setProcessingOrderIds(prev => prev.filter(id => id !== order.id));
                                }
                              }}
                            >
                              Serve
                            </Button>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Side: Order Detail & Billing panel */}
          <div className="hidden md:flex flex-1 flex-col min-h-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
            {selectedOrder ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-950 dark:text-white text-lg">Order #{selectedOrder.id.slice(-5).toUpperCase()}</h3>
                      {selectedOrder.order_type === 'takeaway' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 uppercase animate-pulse">
                          🟣 Takeaway
                        </span>
                      )}
                      {getStatusBadge(selectedOrder.status)}
                      {selectedOrder.payment_status === 'paid' ? (
                        <Badge variant="success">Paid Verified</Badge>
                      ) : selectedOrder.payment_status === 'customer_marked_paid' ? (
                        <Badge variant="warning">Customer Marked Paid</Badge>
                      ) : (
                        <Badge variant="error">Payment Pending</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1.5 flex-wrap">
                      {selectedOrder.order_type === 'takeaway' ? (
                        <span className="text-purple-600 dark:text-purple-400 font-black">Pickup Customer (Arrives in {selectedOrder.customer_arrival_minutes} mins)</span>
                      ) : (
                        <span>{selectedOrder.table_name || 'N/A'}</span>
                      )}
                      <span>• {formatDate(selectedOrder.created_at)}</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1 cursor-pointer" onClick={handlePrintInvoice}>
                      <Printer className="h-4 w-4" /> Print Bill
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quick Action to Update Status:</span>
                    <div className="flex flex-wrap gap-2">
                      {activeRole !== 'waiter' && selectedOrder.status === 'new' && (
                        <Button 
                          size="sm" 
                          variant="primary" 
                          className="cursor-pointer" 
                          isLoading={processingOrderIds.includes(selectedOrder.id)}
                          disabled={processingOrderIds.includes(selectedOrder.id)}
                          onClick={() => updateOrderStatus('accepted')}
                        >
                          Accept Order
                        </Button>
                      )}
                      {activeRole !== 'waiter' && (selectedOrder.status === 'accepted' || selectedOrder.status === 'new') && (
                        <Button 
                          size="sm" 
                          className="bg-amber-500 hover:bg-amber-600 text-white cursor-pointer" 
                          isLoading={processingOrderIds.includes(selectedOrder.id)}
                          disabled={processingOrderIds.includes(selectedOrder.id)}
                          onClick={() => updateOrderStatus('preparing')}
                        >
                          Start Preparing
                        </Button>
                      )}
                      {activeRole !== 'waiter' && selectedOrder.status === 'preparing' && (
                        <Button 
                          size="sm" 
                          className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer" 
                          isLoading={processingOrderIds.includes(selectedOrder.id)}
                          disabled={processingOrderIds.includes(selectedOrder.id)}
                          onClick={() => updateOrderStatus('ready')}
                        >
                          Mark Ready for Pickup
                        </Button>
                      )}
                      {selectedOrder.status === 'ready' && (
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" 
                          isLoading={processingOrderIds.includes(selectedOrder.id)}
                          disabled={processingOrderIds.includes(selectedOrder.id)}
                          onClick={async () => {
                            setProcessingOrderIds(prev => [...prev, selectedOrder.id]);
                            try {
                              window.dispatchEvent(new Event('stop-waiter-sound'));
                              const readyBatches = selectedOrder.batches?.filter(b => b.status === 'ready') || [];
                              for (const batch of readyBatches) {
                                await db.updateBatchStatus(batch.id, 'served', profile?.full_name || 'Waiter');
                              }
                              const allOrders = await db.getOrders(restaurant.id);
                              setOrders(allOrders);
                              const updated = allOrders.find(o => o.id === selectedOrder.id);
                              if (updated) setSelectedOrder(updated);
                              window.dispatchEvent(new Event('storage'));
                            } catch (err: any) {
                              alert(`Failed to serve order: ${err.message}`);
                            } finally {
                              setProcessingOrderIds(prev => prev.filter(id => id !== selectedOrder.id));
                            }
                          }}
                        >
                          Serve Order
                        </Button>
                      )}
                      {selectedOrder.status === 'served' && (
                        <Button 
                          size="sm" 
                          className="bg-teal-600 hover:bg-teal-700 text-white cursor-pointer" 
                          isLoading={processingOrderIds.includes(selectedOrder.id)}
                          disabled={processingOrderIds.includes(selectedOrder.id)}
                          onClick={() => updateOrderStatus('completed')}
                        >
                          Complete Order
                        </Button>
                      )}
                      {selectedOrder.payment_status !== 'paid' && (
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" 
                          isLoading={processingOrderIds.includes(selectedOrder.id)}
                          disabled={processingOrderIds.includes(selectedOrder.id)}
                          onClick={async () => {
                            if (!confirm(`Verify receipt of ${formatPrice(selectedOrder.total, restaurant.settings.currency)} for Table ${selectedOrder.table_name || 'N/A'}?`)) return;
                            setProcessingOrderIds(prev => [...prev, selectedOrder.id]);
                            try {
                              await db.updateOrderPaymentStatus(
                                selectedOrder.id,
                                'paid',
                                profile?.full_name || 'Staff',
                                'UPI',
                                'Manual Verification'
                              );
                              const allOrders = await db.getOrders(restaurant.id);
                              setOrders(allOrders);
                              const updated = allOrders.find(o => o.id === selectedOrder.id);
                              if (updated) setSelectedOrder(updated);
                              window.dispatchEvent(new Event('storage'));
                              alert('Payment successfully verified!');
                            } catch (err: any) {
                              alert(`Failed to verify payment: ${err.message}`);
                            } finally {
                              setProcessingOrderIds(prev => prev.filter(id => id !== selectedOrder.id));
                            }
                          }}
                        >
                          Verify Payment
                        </Button>
                      )}
                      {activeRole !== 'waiter' && selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                        <Button 
                          size="sm" 
                          variant="danger" 
                          className="cursor-pointer" 
                          isLoading={processingOrderIds.includes(selectedOrder.id)}
                          disabled={processingOrderIds.includes(selectedOrder.id)}
                          onClick={() => updateOrderStatus('cancelled')}
                        >
                          Cancel Order
                        </Button>
                      )}
                      {(selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled') && (
                        <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 py-1">
                          <AlertCircle className="h-4 w-4" /> This order has been finalized and cannot be edited.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ordered Items</h4>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      {selectedOrder.items.map(item => (
                        <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{item.menu_item_name}</p>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">{item.quantity}x @ {formatPrice(item.price, restaurant.settings.currency)}</p>
                            {item.notes && (
                              <span className="inline-block mt-1 text-[10px] text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/30 font-semibold">
                                Note: {item.notes}
                              </span>
                            )}
                          </div>
                          <span className="font-extrabold text-slate-900 dark:text-white">{formatPrice(item.price * item.quantity, restaurant.settings.currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Activity Log */}
                  {((selectedOrder.batches || []).some(b => b.accepted_by || b.preparing_by || b.ready_by || b.served_by) || selectedOrder.completed_by || selectedOrder.cancelled_by) && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Order Activity Log</h4>
                      <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {selectedOrder.batches?.map((b) => (
                          <div key={b.id} className="space-y-1">
                            {selectedOrder.batches!.length > 1 && <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Batch #{b.batch_number}</p>}
                            {b.accepted_by && <p>• Accepted by: <span className="text-slate-800 dark:text-slate-200">{b.accepted_by}</span></p>}
                            {b.preparing_by && <p>• Cooking by: <span className="text-slate-800 dark:text-slate-200">{b.preparing_by}</span></p>}
                            {b.ready_by && <p>• Ready by: <span className="text-slate-800 dark:text-slate-200">{b.ready_by}</span></p>}
                            {b.served_by && <p>• Served by: <span className="text-slate-800 dark:text-slate-200">{b.served_by}</span></p>}
                          </div>
                        ))}
                        {selectedOrder.completed_by && (
                          <p className="border-t border-slate-100 dark:border-slate-800/50 pt-1.5">• Completed by: <span className="text-slate-800 dark:text-slate-200">{selectedOrder.completed_by}</span></p>
                        )}
                        {selectedOrder.cancelled_by && (
                          <div className="border-t border-slate-100 dark:border-slate-800/50 pt-1.5 space-y-0.5">
                            <p>• Cancelled by: <span className="text-rose-600 dark:text-rose-400">{selectedOrder.cancelled_by}</span></p>
                            {selectedOrder.cancellation_reason && (
                              <p className="text-[10px] text-slate-400 font-medium pl-2">Reason: "{selectedOrder.cancellation_reason}"</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedOrder.special_instructions && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Chef Special Instructions</h4>
                      <p className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 text-sm rounded-xl p-4 leading-relaxed font-semibold">
                        {selectedOrder.special_instructions}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 shrink-0">
                  <div className="space-y-2.5 max-w-sm ml-auto">
                    <div className="flex justify-between text-sm text-slate-500 font-semibold">
                      <span>Subtotal</span>
                      <span>{formatPrice(selectedOrder.subtotal, restaurant.settings.currency)}</span>
                    </div>
                     {restaurant.settings.gst_enabled !== false && selectedOrder.gst > 0 && (
                      <div className="flex justify-between text-sm text-slate-500 font-semibold">
                        <span>GST</span>
                        <span>{formatPrice(selectedOrder.gst, restaurant.settings.currency)}</span>
                      </div>
                    )}
                    {restaurant.settings.service_charge_enabled !== false && selectedOrder.service_charge > 0 && (
                      <div className="flex justify-between text-sm text-slate-500 font-semibold">
                        <span>Service Charge</span>
                        <span>{formatPrice(selectedOrder.service_charge, restaurant.settings.currency)}</span>
                      </div>
                    )}
                    {selectedOrder.custom_charges && selectedOrder.custom_charges.map((charge: any) => (
                      <div key={charge.id} className="flex justify-between text-sm text-slate-500 font-semibold">
                        <span>{charge.name}</span>
                        <span>
                          {formatPrice(
                            charge.type === 'percentage' 
                              ? selectedOrder.subtotal * (charge.value / 100)
                              : charge.value, 
                            restaurant.settings.currency
                          )}
                        </span>
                      </div>
                    ))}
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                    <div className="flex justify-between text-slate-900 dark:text-white font-black text-lg">
                      <span>Grand Total</span>
                      <span>{formatPrice(selectedOrder.total, restaurant.settings.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-12 text-slate-400 text-sm">
                <ShoppingBag className="h-10 w-10 text-slate-300 mb-2" />
                <span>Select an order from the list to manage and view bill invoices.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Requests Tab View */}
      {activeTab === 'requests' && (
        <Card className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
          <div className="flex-1 overflow-y-auto">
            {customerRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
                <span className="font-semibold text-slate-600 dark:text-slate-400">All customer requests resolved!</span>
                <span className="text-xs text-slate-400">Notifications from customers at tables will appear here in real time.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left">Dining Location</th>
                      <th scope="col" className="px-6 py-4 text-left">Call Request Type</th>
                      <th scope="col" className="px-6 py-4 text-left">Time Received</th>
                      <th scope="col" className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                    {customerRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/25 transition-colors">
                        <td className="px-6 py-4 font-extrabold text-slate-950 dark:text-white">
                          {req.table_name}
                        </td>
                        <td className="px-6 py-4">
                          {req.status === 'pending' ? (
                            <Badge variant="purple">🙋 Pending</Badge>
                          ) : req.status === 'accepted' ? (
                            <Badge variant="warning">🚶 Waiter On Way</Badge>
                          ) : (
                            <Badge variant="success">✅ Completed</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(req.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          {req.status === 'pending' && (
                            <button
                              disabled={processingRequestIds.includes(req.id)}
                              className="inline-flex items-center justify-center font-bold px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-50 cursor-pointer"
                              onClick={() => handleAcceptRequest(req.id)}
                            >
                              {processingRequestIds.includes(req.id) && (
                                <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                              )}
                              Accept Request
                            </button>
                          )}
                          {req.status !== 'completed' && (
                            <button
                              disabled={processingRequestIds.includes(req.id)}
                              className="inline-flex items-center justify-center font-bold px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-50 cursor-pointer ml-2"
                              onClick={() => handleResolveRequest(req.id)}
                            >
                              {processingRequestIds.includes(req.id) ? (
                                <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5 mr-1" />
                              )}
                              Mark Completed
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Toast Notification */}
      {toast && toast.visible && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-500 animate-pop animate-fade-in">
          <div className="bg-white/20 p-2 rounded-lg">
            <Bell className="h-5 w-5 text-white animate-bounce" />
          </div>
          <div>
            <p className="font-extrabold text-sm tracking-wide uppercase">New Order</p>
            <p className="text-xs text-emerald-100">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="ml-4 hover:bg-white/10 p-1 rounded-lg transition-colors text-white/80 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
