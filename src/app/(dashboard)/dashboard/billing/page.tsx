'use client';

import { useState, useEffect } from 'react';
import { useRestaurant } from '../../layout';
import { db, PLAN_LIMITS, Restaurant, PricingPlan } from '@/lib/db';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  CreditCard, Check, AlertTriangle, Clock, 
  Sparkles, Trash2, ShieldAlert
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function BillingPage() {
  const router = useRouter();
  const { restaurant, profile, refresh } = useRestaurant();
  const [tablesCount, setTablesCount] = useState(0);
  const [itemsCount, setItemsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Billing pricing interval state
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);

  // Deletion state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    async function loadBilling() {
      if (!restaurant) return;
      const restId = restaurant.id;

      // Load tables and items counts
      const tables = await db.getTables(restId);
      setTablesCount(tables.length);

      const items = await db.getMenuItems(restId);
      setItemsCount(items.length);

      // Load plans dynamically from database
      const plans = await db.getPricingPlans();
      setPricingPlans(plans);

      if (restaurant.billing_interval) {
        setBillingInterval(restaurant.billing_interval);
      }
      
      setLoading(false);
    }
    loadBilling();
  }, [restaurant]);

  const handleUpgradePlan = async (plan: 'starter' | 'pro' | 'premium') => {
    if (!restaurant || !profile) return;
    
    // Check if current usage exceeds new plan limits (e.g. if downgrading)
    const limit = PLAN_LIMITS[plan];
    if (tablesCount > limit.maxTables) {
      alert(`Cannot downgrade to ${plan.toUpperCase()}: You have ${tablesCount} tables, which exceeds the limit of ${limit.maxTables}. Delete tables before downgrading.`);
      return;
    }
    if (itemsCount > limit.maxItems) {
      alert(`Cannot downgrade to ${plan.toUpperCase()}: You have ${itemsCount} menu items, which exceeds the limit of ${limit.maxItems}. Delete menu items before downgrading.`);
      return;
    }

    try {
      // Perform upgrade
      await db.updateRestaurantPlan(restaurant.id, plan, 'active');
      // Update billing interval
      await db.updateRestaurant(restaurant.id, { billing_interval: billingInterval });

      await db.createAuditLog(
        restaurant.id,
        profile.id,
        profile.email,
        'update_subscription',
        `Upgraded SaaS plan to ${plan.toUpperCase()} (${billingInterval.toUpperCase()})`
      );

      await refresh();
      alert(`Success! Your subscription has been updated to the ${plan.toUpperCase()} plan.`);
    } catch (err: any) {
      alert(`Failed to update subscription: ${err.message}`);
    }
  };

  const handleDeleteRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !profile) return;

    if (deleteConfirmText.trim().toLowerCase() !== 'delete my restaurant') {
      alert('Confirmation text mismatch. Please type exactly: delete my restaurant');
      return;
    }

    if (!confirm('WARNING! This will permanently delete your restaurant, menus, tables, orders, and staff credentials. This action is IRREVERSIBLE. Are you absolutely sure?')) {
      return;
    }

    setDeleteLoading(true);
    try {
      await db.deleteRestaurant(restaurant.id);
      alert('Your restaurant account has been permanently deleted.');
      await supabase.auth.signOut();
      router.push('/');
    } catch (err: any) {
      alert('Deletion failed: ' + err.message);
      setDeleteLoading(false);
    }
  };

  if (loading || !restaurant) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const activePlan = restaurant.subscription_plan || 'starter';
  const currentLimit = PLAN_LIMITS[activePlan];

  // Helper description mapping for plans
  const planDescriptions: Record<string, string> = {
    starter: 'Ideal for small cafes or pop-up bistros testing QR ordering.',
    pro: 'Perfect for standard restaurants looking to optimize workflows.',
    premium: 'Best for large multi-room dining lounges and high volume outlets.'
  };

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Billing & SaaS Subscriptions</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your SaaS billing plans, usage limits, and trial status.</p>
      </div>

      {/* Current plan status & usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Subscription Status Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between py-4">
            <h3 className="font-bold text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wider">Subscription Status</h3>
            <Badge variant={restaurant.subscription_status === 'active' ? 'success' : 'warning'}>
              {restaurant.subscription_status === 'active' ? 'Active' : 'Trialing'}
            </Badge>
          </CardHeader>
          <CardContent className="py-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Current Plan</p>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white capitalize mt-1">
                {activePlan} ({restaurant.billing_interval || 'monthly'})
              </h4>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-3 rounded-xl">
              <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                {restaurant.subscription_status === 'active' 
                  ? 'Auto-renews next billing cycle' 
                  : `Free trial ends on ${new Date(restaurant.trial_ends_at || '').toLocaleDateString()}`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tables Usage Card */}
        <Card>
          <CardHeader className="py-4">
            <h3 className="font-bold text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tables Created</h3>
          </CardHeader>
          <CardContent className="py-6 space-y-3">
            <div className="flex justify-between items-baseline">
              <h4 className="text-3xl font-black text-slate-950 dark:text-white">{tablesCount}</h4>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-550">Limit: {currentLimit.maxTables === 9999 ? 'Unlimited' : currentLimit.maxTables}</span>
            </div>
            {/* Progress bar */}
            {currentLimit.maxTables !== 9999 && (
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    tablesCount >= currentLimit.maxTables ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min((tablesCount / currentLimit.maxTables) * 100, 100)}%` }}
                />
              </div>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase">
              Used {tablesCount} of {currentLimit.maxTables === 9999 ? '∞' : currentLimit.maxTables} slots
            </p>
          </CardContent>
        </Card>

        {/* Menu Items Usage Card */}
        <Card>
          <CardHeader className="py-4">
            <h3 className="font-bold text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wider">Menu Items Created</h3>
          </CardHeader>
          <CardContent className="py-6 space-y-3">
            <div className="flex justify-between items-baseline">
              <h4 className="text-3xl font-black text-slate-950 dark:text-white">{itemsCount}</h4>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-550">Limit: {currentLimit.maxItems === 9999 ? 'Unlimited' : currentLimit.maxItems}</span>
            </div>
            {/* Progress bar */}
            {currentLimit.maxItems !== 9999 && (
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    itemsCount >= currentLimit.maxItems ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min((itemsCount / currentLimit.maxItems) * 100, 100)}%` }}
                />
              </div>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-550 font-semibold uppercase">
              Used {itemsCount} of {currentLimit.maxItems === 9999 ? '∞' : currentLimit.maxItems} slots
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Pricing Matrix */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Upgrade Plans
          </h3>

          {/* Monthly / Yearly Switch Toggle */}
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingInterval === 'monthly'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingInterval === 'yearly'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Yearly Billing (10% Off)
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {pricingPlans.map(plan => {
            const isActive = activePlan === plan.id && billingInterval === (restaurant.billing_interval || 'monthly');
            const price = billingInterval === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const pricePeriod = billingInterval === 'yearly' ? '/year' : '/month';

            const limits = PLAN_LIMITS[plan.id];
            const limitsText = limits.maxTables === 9999 
              ? 'Unlimited tables & menu items' 
              : `Up to ${limits.maxTables} tables & ${limits.maxItems} menu items`;

            return (
              <Card 
                key={plan.id} 
                className={`flex flex-col justify-between transition-all duration-300 relative ${
                  isActive ? 'ring-2 ring-emerald-500 scale-102 shadow-lg shadow-emerald-500/5' : 'hover:shadow-md'
                }`}
              >
                {isActive && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white font-extrabold text-[10px] tracking-wider uppercase px-3 py-1 rounded-full border border-white dark:border-slate-800">
                    Active Plan
                  </span>
                )}
                
                <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-lg capitalize">{plan.name}</h4>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">{planDescriptions[plan.id]}</p>
                    </div>

                    <div className="flex items-baseline">
                      <span className="text-4xl font-black text-slate-950 dark:text-white">{formatPrice(price)}</span>
                      <span className="text-slate-400 text-xs font-semibold">{pricePeriod}</span>
                    </div>

                    <Badge variant="neutral" className="w-full justify-center bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold py-1">
                      {limitsText}
                    </Badge>

                    <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 pt-2">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 font-semibold">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                    {isActive ? (
                      <Button className="w-full cursor-default" variant="outline" disabled>
                        Current Subscription
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        variant={plan.id === 'pro' ? 'primary' : 'outline'}
                        onClick={() => handleUpgradePlan(plan.id as any)}
                      >
                        Choose {plan.name}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* DANGER ZONE: DELETE RESTAURANT */}
      <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
        <Card className="border-rose-100 dark:border-rose-950 bg-rose-50/20 dark:bg-rose-950/5">
          <CardHeader className="flex items-center gap-2 border-b border-rose-100/50 dark:border-rose-950/20 pb-3">
            <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            <h3 className="font-extrabold text-rose-700 dark:text-rose-400 text-base">Danger Zone</h3>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Delete Restaurant Profile</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                Permanently deletes the restaurant workspace, digital menus, categories, tables, client orders, and active staff logins. This action is permanent and cannot be undone.
              </p>
            </div>

            <form onSubmit={handleDeleteRestaurant} className="flex flex-col sm:flex-row gap-3 pt-2">
              <input
                type="text"
                placeholder='Type "delete my restaurant" to confirm'
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="flex-1 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 border border-rose-200 dark:border-rose-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white dark:bg-slate-900"
                required
              />
              <Button 
                type="submit" 
                className="bg-rose-600 hover:bg-rose-700 text-white shrink-0"
                isLoading={deleteLoading}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Permanent Delete Restaurant
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
