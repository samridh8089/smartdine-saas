'use client';

import { useState, useEffect } from 'react';
import { db, Order } from '@/lib/db';
import { getActiveUser } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  TrendingUp, BarChart3, ShoppingCart, Calendar, 
  Sparkles, DollarSign, ArrowUpRight, Award, CreditCard, Clock, AlertCircle,
  ShoppingBag, ClipboardList
} from 'lucide-react';

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);

  // Stats
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    orderCount: 0,
    averageOrderValue: 0,
    topItems: [] as { name: string; quantity: number; revenue: number }[],
    chartData: [] as { label: string; value: number }[],
    totalCollected: 0,
    pendingVerificationCount: 0,
    pendingPaymentCount: 0,
    takeawayCount: 0,
    takeawayRevenue: 0,
    takeawayAvgValue: 0,
    dineinCount: 0,
    dineinRevenue: 0
  });

  useEffect(() => {
    async function loadReports() {
      const user = await getActiveUser();
      if (!user || !user.restaurant_id) return;
      const restId = user.restaurant_id;

      const allOrders = await db.getOrders(restId);
      setOrders(allOrders);
      computeStats(allOrders, timeRange);
      setLoading(false);
    }
    loadReports();
  }, [timeRange]);

  const computeStats = (allOrders: Order[], range: typeof timeRange) => {
    const now = Date.now();
    let rangeOrders = allOrders;

    if (range === 'daily') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      rangeOrders = allOrders.filter(o => new Date(o.created_at).getTime() >= todayStart.getTime());
    } else if (range === 'weekly') {
      const pastWeek = now - 7 * 24 * 60 * 60 * 1000;
      rangeOrders = allOrders.filter(o => new Date(o.created_at).getTime() >= pastWeek);
    } else if (range === 'monthly') {
      const pastMonth = now - 30 * 24 * 60 * 60 * 1000;
      rangeOrders = allOrders.filter(o => new Date(o.created_at).getTime() >= pastMonth);
    }

    const completedOrders = rangeOrders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = completedOrders.length;
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Takeaway vs Dine-in stats
    const takeawayOrders = completedOrders.filter(o => o.order_type === 'takeaway');
    const takeawayRevenue = takeawayOrders.reduce((sum, o) => sum + o.total, 0);
    const takeawayCount = takeawayOrders.length;
    const takeawayAvgValue = takeawayCount > 0 ? takeawayRevenue / takeawayCount : 0;

    const dineinOrders = completedOrders.filter(o => o.order_type !== 'takeaway');
    const dineinRevenue = dineinOrders.reduce((sum, o) => sum + o.total, 0);
    const dineinCount = dineinOrders.length;

    // Payments calculations
    const totalCollected = rangeOrders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + o.total, 0);

    const pendingVerificationCount = rangeOrders
      .filter(o => o.payment_status === 'customer_marked_paid')
      .length;

    const pendingPaymentCount = rangeOrders
      .filter(o => o.payment_status === 'pending' && o.status !== 'cancelled')
      .length;

    // Top selling items
    const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    completedOrders.forEach(o => {
      o.items.forEach(item => {
        if (!itemMap[item.menu_item_id]) {
          itemMap[item.menu_item_id] = { name: item.menu_item_name, quantity: 0, revenue: 0 };
        }
        itemMap[item.menu_item_id].quantity += item.quantity;
        itemMap[item.menu_item_id].revenue += item.price * item.quantity;
      });
    });

    const topItems = Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Chart Data representation (Daily hourly, Weekly daily, Monthly weekly)
    let chartData: { label: string; value: number }[] = [];

    if (range === 'daily') {
      // Hourly segments for today
      const today = new Date().toDateString();
      const todayOrders = completedOrders.filter(o => new Date(o.created_at).toDateString() === today);
      
      const hourlyRev: Record<number, number> = { 9: 0, 11: 0, 13: 0, 15: 0, 17: 0, 19: 0, 21: 0, 23: 0 };
      todayOrders.forEach(o => {
        const hour = new Date(o.created_at).getHours();
        // snap to nearest lower bracket
        const segment = Object.keys(hourlyRev)
          .map(Number)
          .sort((a,b) => b - a)
          .find(h => hour >= h) || 9;
        hourlyRev[segment] = (hourlyRev[segment] || 0) + o.total;
      });

      chartData = Object.entries(hourlyRev).map(([hour, val]) => ({
        label: `${hour}:00`,
        value: val
      }));
    } else if (range === 'weekly') {
      // 7 Days of the week
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dailyRev: Record<string, number> = {
        Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0
      };
      
      completedOrders.forEach(o => {
        const dayName = days[new Date(o.created_at).getDay()];
        dailyRev[dayName] = (dailyRev[dayName] || 0) + o.total;
      });

      chartData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
        label: day,
        value: dailyRev[day] || 0
      }));
    } else if (range === 'monthly') {
      // 4 Weeks of the month
      const weeklyRev = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0 };

      completedOrders.forEach(o => {
        const date = new Date(o.created_at).getDate();
        if (date <= 7) weeklyRev['Week 1'] += o.total;
        else if (date <= 14) weeklyRev['Week 2'] += o.total;
        else if (date <= 21) weeklyRev['Week 3'] += o.total;
        else weeklyRev['Week 4'] += o.total;
      });

      chartData = Object.entries(weeklyRev).map(([week, val]) => ({
        label: week,
        value: val
      }));
    }

    setAnalytics({
      totalRevenue,
      orderCount,
      averageOrderValue,
      topItems,
      chartData,
      totalCollected,
      pendingVerificationCount,
      pendingPaymentCount,
      takeawayCount,
      takeawayRevenue,
      takeawayAvgValue,
      dineinCount,
      dineinRevenue
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-3 gap-6">
          <div className="h-32 bg-slate-200 rounded-xl" />
          <div className="h-32 bg-slate-200 rounded-xl" />
          <div className="h-32 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  // Get max value from chartData to scale bars correctly
  const maxChartVal = Math.max(...analytics.chartData.map(d => d.value), 100);

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reports & Analytics</h2>
          <p className="text-slate-500 text-sm mt-1">Review revenue, order count metrics, and product performance.</p>
        </div>

        {/* Time Filter Tabs */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0">
          <button
            onClick={() => setTimeRange('daily')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              timeRange === 'daily' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setTimeRange('weekly')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              timeRange === 'weekly' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeRange('monthly')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              timeRange === 'monthly' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales Revenue</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{formatPrice(analytics.totalRevenue)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Orders</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{analytics.orderCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Order Ticket</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{formatPrice(analytics.averageOrderValue)}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Collections Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow border-t-2 border-t-emerald-555">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">UPI Payments Collected</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{formatPrice(analytics.totalCollected)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-t-2 border-t-amber-500">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Verification</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{analytics.pendingVerificationCount} orders</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-t-2 border-t-rose-500">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unpaid Active Orders</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{analytics.pendingPaymentCount} orders</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Takeaway vs Dine-in Distribution Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow border-t-2 border-t-purple-600 bg-purple-50/10">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Takeaway Revenue</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{formatPrice(analytics.takeawayRevenue)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-t-2 border-t-purple-500 bg-purple-50/10">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Takeaway Orders</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{analytics.takeawayCount} orders</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-t-2 border-t-purple-400 bg-purple-50/10">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-bold">Takeaway Avg Ticket</p>
              <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{formatPrice(analytics.takeawayAvgValue)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="py-4 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ordering Split</p>
            <div className="space-y-1.5 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-500">Dine-In:</span>
                <span className="text-slate-800">{analytics.dineinCount} orders ({formatPrice(analytics.dineinRevenue)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600 font-bold">Takeaway:</span>
                <span className="text-purple-800 font-black">{analytics.takeawayCount} orders ({formatPrice(analytics.takeawayRevenue)})</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex mt-2">
                <div 
                  className="bg-emerald-500 h-full" 
                  style={{ width: `${analytics.orderCount > 0 ? (analytics.dineinCount / analytics.orderCount) * 100 : 50}%` }}
                />
                <div 
                  className="bg-purple-600 h-full" 
                  style={{ width: `${analytics.orderCount > 0 ? (analytics.takeawayCount / analytics.orderCount) * 100 : 50}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Chart & Top items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SVG Revenue Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                Revenue Analytics ({timeRange.toUpperCase()})
              </h3>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-end justify-between gap-2 h-72 pt-6 px-4">
              {analytics.chartData.map((data) => {
                const heightPercent = (data.value / maxChartVal) * 80 + 5; // Scale height between 5% and 85%
                return (
                  <div key={data.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    {/* Tooltip value */}
                    <span className="text-[10px] font-black text-slate-950 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white px-1.5 py-0.5 rounded shadow-sm">
                      {formatPrice(data.value)}
                    </span>
                    {/* Dynamic Bar */}
                    <div 
                      className="w-full max-w-[40px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-700 shadow-md group-hover:brightness-110"
                      style={{ height: `${heightPercent}%` }}
                    />
                    {/* Label */}
                    <span className="text-[10px] md:text-xs font-semibold text-slate-500 truncate max-w-[60px]">{data.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Best Sellers */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500 animate-spin-slow" />
              Menu Leaderboard
            </h3>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            {analytics.topItems.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No selling data available.
              </div>
            ) : (
              analytics.topItems.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between gap-4 text-sm pb-3 border-b border-slate-100 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                        {index + 1}
                      </span>
                      {item.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5 ml-7">Revenue: {formatPrice(item.revenue)}</p>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0 bg-slate-100 px-2.5 py-1 rounded-lg text-xs">
                    {item.quantity} sold
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
