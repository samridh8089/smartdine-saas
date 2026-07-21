'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, Restaurant, PricingPlan } from '@/lib/db';
import { getActiveUser, supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import MockBanner from '@/components/shared/MockBanner';
import { 
  ShieldAlert, Users, Database, DollarSign, LogOut, 
  Settings, Check, Edit2, AlertCircle, TrendingUp, Clock, Trash2
} from 'lucide-react';

export default function SuperAdminPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [adminStats, setAdminStats] = useState({
    totalRestaurants: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    mrr: 0,
    arr: 0,
    totalPaidCustomers: 0,
    trialUsers: 0,
    expiredLicenses: 0,
    activeLicenses: 0
  });
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [editingPlanPrices, setEditingPlanPrices] = useState<Record<string, { monthly: number, yearly: number }>>({});
  const [loading, setLoading] = useState(true);

  // Override Plan Modal
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedRest, setSelectedRest] = useState<Restaurant | null>(null);
  const [newPlan, setNewPlan] = useState<'starter' | 'pro' | 'premium'>('starter');
  const [newStatus, setNewStatus] = useState<Restaurant['subscription_status']>('active');

  useEffect(() => {
    async function checkAdminAuth() {
      const user = await getActiveUser();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'super_admin') {
        router.push('/dashboard');
        return;
      }
      
      await loadAdminData();
    }
    checkAdminAuth();
  }, [router]);

  async function loadAdminData() {
    try {
      const rests = await db.getRestaurants();
      const stats = await db.getSuperAdminStats();
      const plans = await db.getPricingPlans();
      setRestaurants(rests);
      setAdminStats(stats);
      setPricingPlans(plans);

      const pricesObj: Record<string, { monthly: number, yearly: number }> = {};
      plans.forEach(p => {
        pricesObj[p.id] = { monthly: p.price_monthly, yearly: p.price_yearly };
      });
      setEditingPlanPrices(pricesObj);
    } catch (err: any) {
      alert(`Error loading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleOpenOverrideModal = (rest: Restaurant) => {
    setSelectedRest(rest);
    setNewPlan(rest.subscription_plan);
    setNewStatus(rest.subscription_status);
    setOverrideModalOpen(true);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRest) return;

    try {
      await db.updateRestaurantPlan(selectedRest.id, newPlan, newStatus);
      setOverrideModalOpen(false);
      
      // Dispatch storage event to alert standard client of edits
      window.dispatchEvent(new Event('storage'));
      
      await loadAdminData();
      alert(`Success! Updated ${selectedRest.name} to ${newPlan.toUpperCase()} (${newStatus.toUpperCase()})`);
    } catch (err: any) {
      alert(`Failed to update subscription: ${err.message}`);
    }
  };

  const handlePriceChange = (planId: string, type: 'monthly' | 'yearly', val: number) => {
    setEditingPlanPrices(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [type]: val
      }
    }));
  };

  const handleSavePlanPrices = async (planId: string) => {
    const prices = editingPlanPrices[planId];
    if (!prices) return;
    try {
      await db.updatePricingPlan(planId, {
        price_monthly: prices.monthly,
        price_yearly: prices.yearly
      });
      alert(`Pricing for ${planId.toUpperCase()} updated successfully!`);
      await loadAdminData();
    } catch (err: any) {
      alert(`Error updating plan: ${err.message}`);
    }
  };

  const handleDeleteRestaurant = async (rest: Restaurant) => {
    const confirmDelete = window.confirm(
      `Are you absolutely sure you want to delete "${rest.name}"?\n\nThis will permanently delete all profiles, menus, tables, and orders related to this restaurant. This action CANNOT be undone.`
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      await db.deleteRestaurant(rest.id);
      alert(`Restaurant "${rest.name}" has been successfully deleted.`);
      await loadAdminData();
    } catch (err: any) {
      alert(`Failed to delete restaurant: ${err.message}`);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Opening Admin Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <MockBanner />
      
      {/* Admin Header */}
      <header className="bg-slate-900 text-white h-16 flex items-center justify-between px-6 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base md:text-lg">SmartDine QR SaaS</h1>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Super Admin Central Control</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Admin Body Content */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Global Platform Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Review SaaS revenue metrics, modify tenant subscriptions, and view analytics.</p>
        </div>

        {/* Global SaaS Revenue Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly Revenue</p>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mt-1">{formatPrice(adminStats.mrr)}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Annual Revenue</p>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mt-1">{formatPrice(adminStats.arr)}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid Customers</p>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mt-1">{adminStats.totalPaidCustomers}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Licenses</p>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mt-1">{adminStats.activeLicenses}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trial Users</p>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mt-1">{adminStats.trialUsers}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expired Licenses</p>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mt-1">{adminStats.expiredLicenses}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SaaS Pricing Plans Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">SaaS Pricing Plans (Live Edit)</h3>
            <span className="text-xs text-slate-400">Updates Landing page and Billing pages automatically</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => {
              const currentVals = editingPlanPrices[plan.id] || { monthly: plan.price_monthly, yearly: plan.price_yearly };
              return (
                <Card key={plan.id} className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-base text-slate-900 dark:text-white uppercase tracking-wide">{plan.name}</h4>
                      <Badge variant={plan.id === 'premium' ? 'purple' : plan.id === 'pro' ? 'info' : 'neutral'}>
                        {plan.id}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Monthly Price (₹)</label>
                        <input
                          type="number"
                          value={currentVals.monthly}
                          onChange={(e) => handlePriceChange(plan.id, 'monthly', Number(e.target.value))}
                          className="block w-full px-3 py-1.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Yearly Price (₹)</label>
                        <input
                          type="number"
                          value={currentVals.yearly}
                          onChange={(e) => handlePriceChange(plan.id, 'yearly', Number(e.target.value))}
                          className="block w-full px-3 py-1.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSavePlanPrices(plan.id)}
                      className="w-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                      size="sm"
                    >
                      Update {plan.name} Prices
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Tenants List Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tenant Restaurant Listings</h3>
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left">Restaurant Info</th>
                    <th scope="col" className="px-6 py-4 text-left">URL Slug</th>
                    <th scope="col" className="px-6 py-4 text-left">SaaS Plan</th>
                    <th scope="col" className="px-6 py-4 text-left">Status</th>
                    <th scope="col" className="px-6 py-4 text-left">Created At</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
                  {restaurants.map((rest) => (
                    <tr key={rest.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        {rest.logo_url ? (
                          <img src={rest.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover border border-slate-100 dark:border-slate-800" />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">{rest.name.charAt(0)}</div>
                        )}
                        <div>
                          <p className="font-extrabold text-slate-950 dark:text-white">{rest.name}</p>
                          <p className="text-[10px] text-slate-400">ID: {rest.id}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono font-bold">{rest.slug}</td>
                      <td className="px-6 py-4 uppercase">
                        <Badge variant={rest.subscription_plan === 'premium' ? 'purple' : rest.subscription_plan === 'pro' ? 'info' : 'neutral'}>
                          {rest.subscription_plan}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={rest.subscription_status === 'active' ? 'success' : 'warning'}>
                          {rest.subscription_status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 font-semibold">{new Date(rest.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1.5 text-xs dark:border-slate-800 dark:hover:bg-slate-800"
                            onClick={() => handleOpenOverrideModal(rest)}
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Modify License
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 hover:border-rose-300"
                            onClick={() => handleDeleteRestaurant(rest)}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

      </main>

      {/* --- Override subscription Modal --- */}
      <Dialog
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title={`Modify Subscription: ${selectedRest?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOverrideModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveOverride}>Update License</Button>
          </>
        }
      >
        <form onSubmit={handleSaveOverride} className="space-y-4">
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-indigo-800 dark:text-indigo-300 font-semibold">
            <AlertCircle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              Changing this tenant's license overrides their subscription limits instantly. Ensure safety compliance when modifying live restaurants.
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">SaaS Plan Level</label>
            <select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value as any)}
              className="block w-full px-3.5 py-2 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900"
            >
              <option value="starter">Starter Plan (limits: 5 tables / 15 menu items)</option>
              <option value="pro">Pro Plan (limits: 20 tables / 50 menu items)</option>
              <option value="premium">Premium Plan (Unlimited)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">License Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="block w-full px-3.5 py-2 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900"
            >
              <option value="active">Active (Paid Subscription)</option>
              <option value="trial">Trialing (Free Period)</option>
              <option value="past_due">Past Due (Payment Pending)</option>
              <option value="cancelled">Cancelled (Blocked)</option>
            </select>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
