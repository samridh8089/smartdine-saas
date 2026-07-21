'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import MockBanner from '@/components/shared/MockBanner';
import { UtensilsCrossed } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email,
      password // mock accepts any password for existing emails
    });

    if (err) {
      setError(err.message || 'Invalid credentials');
      setLoading(false);
      return;
    }

    const user = data.user;
    if (user?.role === 'super_admin') {
      router.push('/super-admin');
    } else {
      router.push('/dashboard');
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MockBanner />
      
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
            Sign in to SmartDine QR
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Or{' '}
            <Link href="/signup" className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors">
              create a new restaurant account
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 border border-slate-100 shadow-xl rounded-2xl sm:px-10">
            {error && (
              <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleLogin}>
              <Input
                label="Email address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-500"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" className="w-full" isLoading={loading}>
                Sign In
              </Button>
            </form>


          </div>
        </div>
      </div>
    </div>
  );
}
