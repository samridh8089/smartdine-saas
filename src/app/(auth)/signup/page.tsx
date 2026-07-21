'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import MockBanner from '@/components/shared/MockBanner';
import { UtensilsCrossed, Sparkles } from 'lucide-react';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Selected Plan from URL params
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'premium'>('starter');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const plan = searchParams.get('plan');
    const interval = searchParams.get('interval');
    if (plan && ['starter', 'pro', 'premium'].includes(plan)) {
      setSelectedPlan(plan as any);
    }
    if (interval && ['monthly', 'yearly'].includes(interval)) {
      setBillingInterval(interval as any);
    }
  }, [searchParams]);

  const handleRestaurantNameChange = (val: string) => {
    setRestaurantName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setSlug(autoSlug);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          fullName,
          phone,
          restaurantName,
          slug,
          subscriptionPlan: selectedPlan,
          billingInterval
        }
      }
    });

    if (err) {
      setError(err.message || 'Failed to create account');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <form className="space-y-5" onSubmit={handleSignup}>
      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {/* Show pre-selected plan badge */}
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3.5 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-400">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Selected Plan: <span className="capitalize">{selectedPlan}</span> ({billingInterval})</span>
        </div>
        <Link href="/#pricing" className="underline hover:text-emerald-900 dark:hover:text-emerald-300">Change</Link>
      </div>

      <Input
        label="Full Name"
        type="text"
        required
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="John Doe"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <Input
          label="Phone Number"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. +91 99999 88888"
        />
      </div>

      <Input
        label="Password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />

      <Input
        label="Restaurant Name"
        type="text"
        required
        value={restaurantName}
        onChange={(e) => handleRestaurantNameChange(e.target.value)}
        placeholder="The Bistro Cafe"
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Menu URL Slug
        </label>
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 overflow-hidden bg-slate-50 dark:bg-slate-900">
          <span className="inline-flex items-center px-3 text-slate-400 dark:text-slate-500 text-xs md:text-sm select-none border-r border-slate-200 dark:border-slate-800">
            smartdine.com/menu/
          </span>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            className="block flex-1 min-w-0 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-none outline-none"
            placeholder="bistro-cafe"
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-emerald-500" />
          This is the URL your customers will scan to access the digital menu.
        </p>
      </div>

      <Button type="submit" className="w-full cursor-pointer" isLoading={loading}>
        Create Restaurant Account
      </Button>
    </form>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <MockBanner />
      
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Start your free 14-day trial
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
            Or{' '}
            <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors">
              sign in to your existing account
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto w-full sm:max-w-md">
          <div className="bg-white dark:bg-slate-900 py-8 px-4 border border-slate-100 dark:border-slate-800 shadow-xl rounded-2xl sm:px-10">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <SignupForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
