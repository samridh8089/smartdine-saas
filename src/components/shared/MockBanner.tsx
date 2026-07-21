'use client';

import { useState, useEffect } from 'react';
import { Database, AlertCircle, X, Check } from 'lucide-react';
import { IS_MOCK_MODE } from '@/lib/supabase';

export default function MockBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only if we are in mock mode
    if (IS_MOCK_MODE) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-600 px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between transition-all duration-300">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-amber-500 shrink-0" />
        <span>
          <strong>Demo Mode:</strong> Running with a browser-local database. Connect Supabase credentials in your env files to use a production backend.
        </span>
      </div>
      <button 
        onClick={() => setVisible(false)} 
        className="text-amber-500 hover:text-amber-700 p-1 rounded-full transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
