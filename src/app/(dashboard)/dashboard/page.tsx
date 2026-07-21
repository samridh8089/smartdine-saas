'use client';

import { useState, useEffect } from 'react';
import { db, Order, MenuItem } from '@/lib/db';
import { getActiveUser } from '@/lib/supabase';
import { formatPrice, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { 
  DollarSign, ClipboardList, Users, TrendingUp, 
  ArrowRight, Clock, CheckCircle2, AlertCircle, ShoppingBag
} from 'lucide-react';

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    revenue: 0,
    activeTables: 0,
    topItems: [] as { name: string; count: number; revenue: number }[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const user = await getActiveUser();
      if (!user || !user.restaurant_id) return;
      
      const restId = user.restaurant_id;
      const allOrders = await db.getOrders(restId);
      setOrders(allOrders);

      // Compute statistics for "today"
      const today = new Date().toDateString();
      const todayOrders = allOrders.filter(o => new Date(o.created_at).toDateString() === today);
      
      const revenue = todayOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.total, 0);

      // Active tables count (tables that have orders with status != completed, cancelled, served)
      const activeTableIds = new Set(
        allOrders
          .filter(o => !['completed', 'cancelled', 'served'].includes(o.status))
          .map(o => o.table_id)
      );

      // Calculate Top Selling Items
      const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
      allOrders
        .filter(o => o.status === 'completed')
        .forEach(o => {
          o.items.forEach(item => {
            if (!itemCounts[item.menu_item_id]) {
              itemCounts[item.menu_item_id] = { name: item.menu_item_name, count: 0, revenue: 0 };
            }
            itemCounts[item.menu_item_id].count += item.quantity;
            itemCounts[item.menu_item_id].revenue += item.price * item.quantity;
          });
        });

      const topItems = Object.values(itemCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalOrders: todayOrders.length,
        revenue,
        activeTables: activeTableIds.size,
        topItems
      });
      setLoading(false);
    }

    loadData();

    const handleStorage = () => {
      loadData();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 lg:col-span-2 bg-slate-200 rounded-xl" />
          <div className="h-96 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome & Time */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Overview Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">Here is a snapshot of your restaurant today.</p>
        </div>
        <div className="bg-white border border-slate-100 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold text-slate-500 flex items-center gap-2 shadow-sm">
          <Clock className="h-4 w-4 text-emerald-600" />
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Revenue Today</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{formatPrice(stats.revenue)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders Today</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{stats.totalOrders}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Tables</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{stats.activeTables}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Conversion rate</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">100%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Orders */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Recent Orders</h3>
            <Link href="/dashboard/orders" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View All Orders
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <Card>
            <div className="divide-y divide-slate-100 overflow-x-auto">
              {orders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                  <ShoppingBag className="h-8 w-8" />
                  No orders placed yet. Scan a QR code to place an order!
                </div>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm md:text-base">Order #{order.id.slice(-5).toUpperCase()}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">
                        {order.table_name || 'N/A'} • {order.items.reduce((s, i) => s + i.quantity, 0)} items • {formatDate(order.created_at)}
                      </p>
                      <p className="text-xs text-slate-500 max-w-md truncate">
                        {order.items.map(i => `${i.quantity}x ${i.menu_item_name}`).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                      <span className="font-extrabold text-slate-900">{formatPrice(order.total)}</span>
                      <Link href={`/dashboard/orders?id=${order.id}`}>
                        <Button variant="outline" size="sm">Manage</Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Top Selling Items */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Top Selling Items</h3>
          <Card>
            <CardContent className="py-6">
              {stats.topItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Complete orders to see top selling items.
                </div>
              ) : (
                <div className="space-y-6">
                  {stats.topItems.map((item, index) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-800 flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                            {index + 1}
                          </span>
                          {item.name}
                        </span>
                        <span className="font-bold text-slate-900">{item.count} sold</span>
                      </div>
                      {/* Bar Visualization */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${(item.count / stats.topItems[0].count) * 100}%` 
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Revenue Generated</span>
                        <span>{formatPrice(item.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
