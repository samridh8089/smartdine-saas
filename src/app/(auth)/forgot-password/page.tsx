'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import MockBanner from '@/components/shared/MockBanner';
import { UtensilsCrossed, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : '';
    await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    setSent(true);
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
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            We will send you an email with instructions to set a new password.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 border border-slate-100 shadow-xl rounded-2xl sm:px-10">
            {sent ? (
              <div className="text-center py-4">
                <div className="flex justify-center mb-3">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Check your inbox</h3>
                <p className="mt-2 text-sm text-slate-500">
                  We have sent a password reset link to <strong>{email}</strong>.
                </p>
                <div className="mt-6">
                  <Link href="/login">
                    <Button variant="secondary" className="w-full">
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <Input
                  label="Email address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />

                <Button type="submit" className="w-full" isLoading={loading}>
                  Send reset link
                </Button>

                <div className="text-center text-xs">
                  <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors">
                    Return to sign in
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
