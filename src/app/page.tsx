'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  UtensilsCrossed, QrCode, ClipboardList, ChefHat, BarChart3, 
  CreditCard, Smartphone, Check, Sparkles, ShieldCheck, Menu, X
} from 'lucide-react';

import { db, PricingPlan } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);

  useEffect(() => {
    async function loadPricing() {
      const plans = await db.getPricingPlans();
      setPricingPlans(plans);
    }
    loadPricing();
  }, []);

  const planDescriptions: Record<string, string> = {
    starter: 'Ideal for small cafes or pop-up bistros testing QR ordering.',
    pro: 'Perfect for standard restaurants looking to optimize workflows.',
    premium: 'Best for large multi-room dining lounges and high volume outlets.'
  };

  const planLimits: Record<string, string> = {
    starter: 'Up to 5 tables & 15 menu items',
    pro: 'Up to 20 tables & 50 menu items',
    premium: 'Unlimited tables & menu items'
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-sans transition-colors duration-300">
      
      {/* Header / Navbar - Fixed mobile layout */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 py-4 px-6 md:px-12 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-sm transition-colors">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/10">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">SmartDine QR</span>
        </Link>

        {/* Desktop menu actions */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Pricing</a>
          <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/signup">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-emerald-600/10 transition-all cursor-pointer">
              Start Free Trial
            </button>
          </Link>
        </div>

        {/* Mobile Header Buttons - Fixed alignments */}
        <div className="flex md:hidden items-center gap-2">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navbar overlay */}
        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col p-6 space-y-4 shadow-xl z-20 md:hidden animate-pop">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-600 dark:text-slate-300">Features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-600 dark:text-slate-300">Pricing</a>
            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-slate-600 dark:text-slate-300">
              Sign In
            </Link>
            <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md">
                Start Free Trial
              </button>
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="px-6 md:px-12 py-16 md:py-24 text-center max-w-4xl mx-auto space-y-6 md:space-y-8 animate-fade-in">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 uppercase tracking-wider">
          <Sparkles className="h-3 w-3 text-emerald-500 animate-pulse" />
          The Future of Dine-in Ordering
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
          Modernize Your Dining Room with <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">QR Menu Ordering</span>
        </h1>
        <p className="text-xs sm:text-sm md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Increase table turnover, eliminate orders error, and reduce staff pressure. SmartDine QR is a multi-tenant ordering platform designed specifically for fast-casual restaurants, bars, and bistros.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full max-w-md mx-auto sm:max-w-none">
          <Link href="/signup" className="w-full sm:w-auto">
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-2xl text-xs sm:text-sm md:text-base font-extrabold shadow-lg shadow-emerald-600/10 transition-all hover:scale-102 cursor-pointer">
              Create Restaurant Account
            </button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <button className="w-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-8 py-3.5 rounded-2xl text-xs sm:text-sm md:text-base font-extrabold shadow-sm transition-all hover:scale-102 cursor-pointer">
              Explore Demo Presets
            </button>
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="px-6 md:px-12 py-16 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Core Modules Inside SmartDine</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold uppercase">Everything you need to automate order processes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shadow-inner">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Table QR Code Engine</h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Generate unlimited table assets. Dynamic canvas generator automatically creates QR codes pointing to restaurant tables. Print individually or download as PNGs.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shadow-inner">
                <Smartphone className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Instant Customer Cart</h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Mobile-first ordering menu. Customers add food items, include custom notes, write special instructions to the chef, and check order estimations instantly without app downloads.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shadow-inner">
                <ChefHat className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Kitchen Display System (KDS)</h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Dedicated card-board screen for cooks. Color-coded ticket lanes and live audio bell alerts ensure new orders are processed immediately. Track step timelines from preparation to serving.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center shadow-inner">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Billing & Invoice System</h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Automatic receipts calculations. Subtotal, configurable GST, optional service charges automatically added. Includes thermal-receipt styling window for easy physical printouts.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center shadow-inner">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Reports & Analytics</h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Review daily, weekly, and monthly sales. Visual SVG bar charts trace transactions. Spot your top selling dishes on the Leaderboard and configure settings for peak efficiency.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center shadow-inner">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Multi-Tenant SaaS Limits</h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Subscription tiers (Starter, Pro, Premium) limit items and tables. Super Admin control panel tracks active tenants, platform MRR statistics, and enables manual license overrides.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Comparison Matrix Section */}
      <section id="pricing" className="px-6 md:px-12 py-20 max-w-6xl mx-auto space-y-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Flexible SaaS Subscription Plans</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold uppercase">Zero order commission. Pay a simple flat recurring subscription.</p>
          </div>

          {/* Pricing Toggle */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingInterval === 'monthly'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingInterval === 'yearly'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Yearly Billing (10% Off)
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {pricingPlans.map(plan => {
            const price = billingInterval === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const pricePeriod = billingInterval === 'yearly' ? '/year' : '/month';
            const featuresList = Array.isArray(plan.features) ? plan.features : [];

            return (
              <Card key={plan.id} className="flex flex-col justify-between hover:shadow-lg dark:border-slate-800 transition-all duration-300 hover:scale-101 animate-fade-in">
                <CardContent className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-xl capitalize">{plan.name} Plan</h3>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">{planDescriptions[plan.id]}</p>
                    </div>

                    <div className="flex items-baseline">
                      <span className="text-4xl font-black text-slate-950 dark:text-white">{formatPrice(price)}</span>
                      <span className="text-slate-400 text-xs font-semibold">{pricePeriod}</span>
                    </div>

                    <Badge variant="neutral" className="w-full justify-center bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold py-1">
                      {planLimits[plan.id]}
                    </Badge>

                    <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 pt-2">
                      {featuresList.map(f => (
                        <li key={f} className="flex items-center gap-2 font-semibold">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                    <Link href={`/signup?plan=${plan.id}&interval=${billingInterval}`}>
                      <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-emerald-600/10 transition-all cursor-pointer hover:scale-102">
                        Get Started
                      </button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 md:px-12 border-t border-slate-800 text-center shrink-0">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex justify-center">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
          </div>
          <p className="text-slate-200 text-sm font-extrabold">SmartDine QR SaaS Ordering System</p>
          <p className="text-xs text-slate-500">© 2026 SmartDine Inc. All rights reserved. Powered by Next.js & Supabase.</p>
        </div>
      </footer>

    </div>
  );
}
