'use client';

import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getActiveUser, supabase } from '@/lib/supabase';
import { db, Profile, Restaurant } from '@/lib/db';
import MockBanner from '@/components/shared/MockBanner';
import buildInfo from '@/lib/build-info.json';

import { 
  UtensilsCrossed, LayoutDashboard, Menu as MenuIcon, 
  QrCode, ClipboardList, ChefHat, BarChart3, CreditCard, 
  LogOut, MenuSquare, X, ChevronRight, User, Settings,
  ShieldAlert, Sparkles, AlertTriangle
} from 'lucide-react';

// Create Restaurant Context
export const RestaurantContext = createContext<{
  restaurant: Restaurant | null;
  profile: Profile | null;
  activeRole: Profile['role'];
  dbRole: Profile['role'];
  refresh: () => Promise<void>;
  alarmMuted: boolean;
  setAlarmMuted: (muted: boolean) => void;
} | null>(null);

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) throw new Error('useRestaurant must be used within a RestaurantContext Provider');
  return context;
}

const ALLOWED_PATHS: Record<string, string[]> = {
  owner: ['/dashboard', '/dashboard/menu', '/dashboard/tables', '/dashboard/kds', '/dashboard/orders', '/dashboard/reports', '/dashboard/billing', '/dashboard/settings'],
  manager: ['/dashboard', '/dashboard/menu', '/dashboard/tables', '/dashboard/kds', '/dashboard/orders', '/dashboard/reports', '/dashboard/settings'],
  waiter: ['/dashboard/orders', '/dashboard/tables'],
  kitchen: ['/dashboard/kds'],
  cashier: ['/dashboard/orders', '/dashboard/tables']
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alarmMuted, setAlarmMuted] = useState(false);

  // Separate Portals Role View
  const [dbRole, setDbRole] = useState<Profile['role']>('owner');
  const [activeRole, setActiveRole] = useState<Profile['role']>('owner');

  const checkAuth = async () => {
    const user = await getActiveUser();
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role === 'super_admin') {
      router.push('/super-admin');
      return;
    }
    setProfile(user);
    setDbRole(user.role);
    // Initialize active role view to user's database role
    setActiveRole(user.role);

    if (user.restaurant_id) {
      const rest = await db.getRestaurantById(user.restaurant_id);
      if (rest) setRestaurant(rest);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();

    // Listen for storage events (logout, updates)
    const handleStorageChange = () => {
      checkAuth();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [router]);

  // ==========================================
  // GLOBAL NOTIFICATION & ALARM SYSTEM
  // ==========================================
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Helper to generate a small looping beep WAV file
  const createBeepWavDataUri = () => {
    const sampleRate = 8000;
    const duration = 1.0; // 1 second loop
    const numSamples = sampleRate * duration;
    const buffer = new Uint8Array(44 + numSamples);
    
    buffer[0] = 0x52; buffer[1] = 0x49; buffer[2] = 0x46; buffer[3] = 0x46; // RIFF
    const fileSize = 36 + numSamples;
    buffer[4] = fileSize & 0xff; buffer[5] = (fileSize >> 8) & 0xff; buffer[6] = (fileSize >> 16) & 0xff; buffer[7] = (fileSize >> 24) & 0xff;
    
    buffer[8] = 0x57; buffer[9] = 0x41; buffer[10] = 0x56; buffer[11] = 0x45; // WAVE
    buffer[12] = 0x66; buffer[13] = 0x6d; buffer[14] = 0x74; buffer[15] = 0x20; // fmt 
    buffer[16] = 16; buffer[17] = 0; buffer[18] = 0; buffer[19] = 0;
    buffer[20] = 1; buffer[21] = 0; // Mono PCM
    buffer[22] = 1; buffer[23] = 0; // 1 Channel
    buffer[24] = sampleRate & 0xff; buffer[25] = (sampleRate >> 8) & 0xff; buffer[26] = (sampleRate >> 16) & 0xff; buffer[27] = (sampleRate >> 24) & 0xff;
    
    const byteRate = sampleRate * 1;
    buffer[28] = byteRate & 0xff; buffer[29] = (byteRate >> 8) & 0xff; buffer[30] = (byteRate >> 16) & 0xff; buffer[31] = (byteRate >> 24) & 0xff;
    
    buffer[32] = 1; buffer[33] = 0;
    buffer[34] = 8; buffer[35] = 0; // 8-bit
    buffer[36] = 0x64; buffer[37] = 0x61; buffer[38] = 0x74; buffer[39] = 0x61; // data
    buffer[40] = numSamples & 0xff; buffer[41] = (numSamples >> 8) & 0xff; buffer[42] = (numSamples >> 16) & 0xff; buffer[43] = (numSamples >> 24) & 0xff;
    
    // Generate loud two-tone fire alarm style square wave
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      if (t < 0.25) {
        const sampleVal = Math.sin(2 * Math.PI * 880 * t);
        buffer[44 + i] = sampleVal >= 0 ? 255 : 0;
      } else if (t < 0.5) {
        const sampleVal = Math.sin(2 * Math.PI * 1046 * t);
        buffer[44 + i] = sampleVal >= 0 ? 255 : 0;
      } else {
        buffer[44 + i] = 128;
      }
    }
    
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  };

  const stopGlobalAlarm = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
  };

  const playContinuousBell = (role: string) => {
    if (alarmMuted) return;
    
    // Stop old, destroy instance, create new instance, play
    stopGlobalAlarm();
    
    const audioUrl = createBeepWavDataUri();
    
    try {
      const audio = new Audio(audioUrl);
      audio.loop = true;
      activeAudioRef.current = audio;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => console.warn('HTML5 Audio play blocked:', err));
      }
    } catch (e) {
      console.warn('Failed to play audio:', e);
    }
  };

  const triggerPushNotification = (title: string, body: string) => {
    const pushEnabled = localStorage.getItem('smartdine_push_enabled') === 'true';
    if (!pushEnabled) return;
    
    if ('Notification' in window && 'serviceWorker' in navigator) {
      if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body,
            icon: '/favicon.ico',
            vibrate: [200, 100, 200],
            data: { url: window.location.href }
          } as any);
        });
      }
    }
  };

  const checkActiveAlarmsGlobal = async (restId: string, role: string) => {
    if (alarmMuted) {
      stopGlobalAlarm();
      return;
    }
    try {
      const allOrders = await db.getOrders(restId);
      let alertNeeded = false;
      let notifTitle = '';
      let notifBody = '';
      
      if (role === 'kitchen') {
        const activeBatches = allOrders.reduce((acc: any[], order) => {
          if (order.batches) {
            order.batches.forEach(b => {
              if (b.status !== 'served') acc.push(b);
            });
          }
          return acc;
        }, []);
        alertNeeded = activeBatches.some((b: any) => b.status === 'new');
        if (alertNeeded) {
          notifTitle = 'New Kitchen Order';
          notifBody = 'A new order needs to be prepared.';
        }
      } else if (['waiter', 'owner', 'manager'].includes(role)) {
        const hasReady = allOrders.some(o => o.status === 'ready');
        const pendingRequests = await db.getCustomerRequests(restId);
        const hasPendingCall = pendingRequests.some((r: any) => r.status === 'pending');
        alertNeeded = hasReady || hasPendingCall;
        if (alertNeeded) {
          notifTitle = hasReady ? 'Order Ready' : 'Customer Call';
          notifBody = hasReady ? 'An order is ready to be served.' : 'A customer requested assistance.';
        }
      }

      if (alertNeeded) {
        if (!activeAudioRef.current) {
          playContinuousBell(role);
          if (document.visibilityState === 'hidden') {
            triggerPushNotification(notifTitle, notifBody);
          }
        }
      } else {
        stopGlobalAlarm();
      }
    } catch (e) {
      console.warn('Error checking global alarms:', e);
    }
  };

  // Register Service Worker for push
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('Service Worker registration failed:', err);
      });
    }
  }, []);

  // Background state recovery
  useEffect(() => {
    const handleActive = () => {
      if (document.visibilityState === 'visible') {
        if (activeAudioRef.current && activeAudioRef.current.paused) {
          activeAudioRef.current.play().catch(console.warn);
        }
        window.dispatchEvent(new Event('force-resync'));
        if (restaurant?.id) {
          checkActiveAlarmsGlobal(restaurant.id, activeRole);
        }
      }
    };
    
    window.addEventListener('visibilitychange', handleActive);
    window.addEventListener('focus', handleActive);
    window.addEventListener('online', handleActive);
    
    return () => {
      window.removeEventListener('visibilitychange', handleActive);
      window.removeEventListener('focus', handleActive);
      window.removeEventListener('online', handleActive);
    };
  }, [restaurant?.id, activeRole]);


  // Global Audio stop listeners triggered by actions
  useEffect(() => {
    const handleStopSound = () => stopGlobalAlarm();
    window.addEventListener('stop-kitchen-sound', handleStopSound);
    window.addEventListener('stop-waiter-sound', handleStopSound);
    return () => {
      window.removeEventListener('stop-kitchen-sound', handleStopSound);
      window.removeEventListener('stop-waiter-sound', handleStopSound);
    };
  }, []);

  // Global Realtime Alarm Listener
  useEffect(() => {
    if (!restaurant?.id) return;
    const restId = restaurant.id;

    console.log(`Global notification listener subscribed for restaurant: ${restId}, role: ${activeRole}`);
    checkActiveAlarmsGlobal(restId, activeRole);

    const channel = supabase
      .channel(`global_notifications_${restId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restId}`
        },
        async () => {
          console.log('Global notification listener detected order update');
          await checkActiveAlarmsGlobal(restId, activeRole);
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
        async () => {
          console.log('Global notification listener detected customer request update');
          await checkActiveAlarmsGlobal(restId, activeRole);
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
          console.log('Global notification listener detected batch update');
          const batch = payload.new as any;
          if (batch) {
            const { data } = await supabase
              .from('orders')
              .select('restaurant_id')
              .eq('id', batch.order_id)
              .single();
            if (data && data.restaurant_id === restId) {
              await checkActiveAlarmsGlobal(restId, activeRole);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopGlobalAlarm();
    };
  }, [restaurant?.id, activeRole]);

  // Redirect waiters and kitchen from /dashboard root route
  useEffect(() => {
    if (!loading && profile && pathname === '/dashboard') {
      if (dbRole === 'kitchen') {
        router.replace('/dashboard/kds');
      } else if (dbRole === 'waiter' || dbRole === 'cashier') {
        router.replace('/dashboard/orders');
      }
    }
  }, [loading, profile, dbRole, pathname, router]);

  // Realtime Supabase Subscription for Restaurant License/Plan updates
  useEffect(() => {
    if (!profile?.restaurant_id) return;

    const channel = supabase
      .channel(`db_layout_restaurant_${profile.restaurant_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'restaurants',
          filter: `id=eq.${profile.restaurant_id}`
        },
        (payload) => {
          console.log('Realtime Restaurant Update:', payload.new);
          setRestaurant(payload.new as Restaurant);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.restaurant_id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading SmartDine QR...</p>
        </div>
      </div>
    );
  }

  // Check path permissions based on actual database role (not mocked activeRole)
  const isPathAllowed = () => {
    const roleAllowedPaths = ALLOWED_PATHS[dbRole] || [];
    // Allow root /dashboard for everyone, it redirects waiters/kitchen to their page
    if (pathname === '/dashboard') return true;
    return roleAllowedPaths.some(p => pathname.startsWith(p));
  };

  const allowed = isPathAllowed();

  // Define sidebar menu items based on ACTIVE portal view (activeRole)
  const allMenuItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'manager'] },
    { name: 'Menu Management', href: '/dashboard/menu', icon: MenuSquare, roles: ['owner', 'manager'] },
    { name: 'Tables & QRs', href: '/dashboard/tables', icon: QrCode, roles: ['owner', 'manager', 'waiter', 'cashier'] },
    { name: 'Kitchen Display', href: '/dashboard/kds', icon: ChefHat, roles: ['owner', 'manager', 'kitchen'] },
    { name: 'Live Orders', href: '/dashboard/orders', icon: ClipboardList, roles: ['owner', 'manager', 'waiter', 'cashier', 'kitchen'] },
    { name: 'Reports & Analytics', href: '/dashboard/reports', icon: BarChart3, roles: ['owner', 'manager'] },
    { name: 'Billing & SaaS', href: '/dashboard/billing', icon: CreditCard, roles: ['owner'] },
    { name: 'Settings & Staff', href: '/dashboard/settings', icon: Settings, roles: ['owner', 'manager'] }
  ];

  const filteredMenuItems = allMenuItems.filter(item => item.roles.includes(activeRole));

  return (
    <RestaurantContext.Provider value={{ restaurant, profile, activeRole, dbRole, refresh: checkAuth, alarmMuted, setAlarmMuted }}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <MockBanner />

        <div className="flex flex-1 relative overflow-hidden">
          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={`
            fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col transform transition-transform duration-300 ease-in-out shrink-0 border-r border-slate-800
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            {/* Logo Section */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/10">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">SmartDine QR</span>
              </Link>
              <button 
                onClick={() => setSidebarOpen(false)} 
                className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Portal Switcher for Owners / Managers */}
            {(dbRole === 'owner' || dbRole === 'manager') && (
              <div className="px-4 pt-4 pb-2 border-b border-slate-800 bg-slate-950/20">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Active Portal View
                </label>
                <select
                  value={activeRole}
                  onChange={(e) => {
                    const newRole = e.target.value as any;
                    setActiveRole(newRole);
                    // Automatically redirect to primary portal route on switch
                    if (newRole === 'kitchen') router.push('/dashboard/kds');
                    else if (newRole === 'waiter') router.push('/dashboard/orders');
                    else router.push('/dashboard');
                  }}
                  className="block w-full px-2.5 py-1.5 text-xs text-slate-200 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  <option value="owner">Owner Portal</option>
                  <option value="waiter">Waiter Portal</option>
                  <option value="kitchen">Kitchen Portal</option>
                </select>
              </div>
            )}

            {/* Navigation Links */}
            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all group
                      ${isActive 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                    `}
                  >
                    <Icon className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* User Section / Logout */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 mb-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100/10 flex items-center justify-center text-emerald-500">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-slate-200">{profile?.full_name}</p>
                  <p className="text-[10px] text-slate-400 truncate capitalize">
                    {dbRole} {activeRole !== dbRole && `(as ${activeRole})`} • {restaurant?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign Out
              </button>
              <div className="mt-4 pt-2 border-t border-slate-800/60 text-center">
                <Link href="/debug/build-info" className="inline-flex flex-col items-center text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer font-mono gap-0.5">
                  <span>Build: {buildInfo.commit.slice(0, 7)}</span>
                  <span>{new Date(buildInfo.buildTime).toLocaleDateString()} {new Date(buildInfo.buildTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            {/* Dashboard Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 h-16 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30 transition-colors">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Open sidebar"
                >
                  <MenuIcon className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-3">
                  {restaurant?.logo_url ? (
                    <img 
                      src={restaurant.logo_url} 
                      alt={restaurant.name} 
                      className="h-8 w-8 rounded-lg object-cover border border-slate-100 dark:border-slate-800" 
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      {restaurant?.name?.charAt(0) || 'R'}
                    </div>
                  )}
                  <div>
                    <h1 className="text-sm font-semibold text-slate-950 dark:text-white leading-none">{restaurant?.name}</h1>
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live QR Ordering Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                

                {restaurant?.subscription_plan && (
                  <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 uppercase tracking-wider">
                    {restaurant.subscription_plan} Plan
                  </span>
                )}
                {restaurant && (
                  <Link 
                    href={`/menu/${restaurant.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    View Digital Menu
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </header>

            {/* Dashboard Content Container */}
            <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
              {allowed ? children : (
                <div className="min-h-[50vh] flex items-center justify-center p-6">
                  <div className="max-w-md text-center space-y-4">
                    <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/30 shadow-md">
                      <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Permission Denied</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Your current account role (<strong>{dbRole.toUpperCase()}</strong>) does not have permission to access the path <code>{pathname}</code>. Please contact your administrator.
                    </p>
                    <div className="pt-4">
                      <Link href={dbRole === 'kitchen' ? '/dashboard/kds' : '/dashboard/orders'}>
                        <button className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all">
                          Return to Portal
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </RestaurantContext.Provider>
  );
}
