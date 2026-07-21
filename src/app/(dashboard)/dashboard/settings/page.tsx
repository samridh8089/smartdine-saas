'use client';

import { useState, useEffect } from 'react';
import { useRestaurant } from '../../layout';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { db, Profile, AuditLog } from '@/lib/db';
import { storage } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/lib/utils';
import { 
  Settings, Users, History, Download, Upload, 
  Sparkles, Check, AlertCircle, Plus, Trash2, Eye, DollarSign, CreditCard, Volume2, Copy, RefreshCw
} from 'lucide-react';

export default function SettingsPage() {
  const { restaurant, profile, refresh } = useRestaurant();

  const [activeTab, setActiveTab] = useState<'profile' | 'staff' | 'backup' | 'logs' | 'charges' | 'payments' | 'notifications'>('profile');
  const [loading, setLoading] = useState(false);

  // Bell/Notification Sound settings state
  const [kitchenBellType, setKitchenBellType] = useState<string>(restaurant?.settings?.kitchen_bell_type || 'alarm');
  const [waiterBellType, setWaiterBellType] = useState<string>(restaurant?.settings?.waiter_bell_type || 'alarm');
  const [kitchenBellUrl, setKitchenBellUrl] = useState<string>(restaurant?.settings?.kitchen_bell_url || '');
  const [waiterBellUrl, setWaiterBellUrl] = useState<string>(restaurant?.settings?.waiter_bell_url || '');
  const [uploadingKitchen, setUploadingKitchen] = useState(false);
  const [uploadingWaiter, setUploadingWaiter] = useState(false);

  // Payments settings state
  const [paymentEnabled, setPaymentEnabled] = useState(restaurant?.settings?.payment_enabled === true);
  const [upiId, setUpiId] = useState(restaurant?.settings?.upi_id || '');
  const [upiName, setUpiName] = useState(restaurant?.settings?.upi_name || '');
  const [paymentQr, setPaymentQr] = useState(restaurant?.settings?.payment_qr || '');
  const [takeawayEnabled, setTakeawayEnabled] = useState(restaurant?.settings?.takeaway_enabled === true);

  // Profile Settings Form
  const [restName, setRestName] = useState(restaurant?.name || '');
  const [phone, setPhone] = useState(restaurant?.phone || '');
  const [address, setAddress] = useState(restaurant?.address || '');
  const [gst, setGst] = useState(restaurant?.gst_number || '');
  const [logoUrl, setLogoUrl] = useState(restaurant?.logo_url || '');
  const [coverUrl, setCoverUrl] = useState(restaurant?.cover_image_url || '');
  const [themeColor, setThemeColor] = useState(restaurant?.settings?.theme_color || 'emerald');

  // Taxes & Charges state
  const [gstEnabled, setGstEnabled] = useState(restaurant?.settings?.gst_enabled !== false);
  const [gstPercentage, setGstPercentage] = useState(restaurant?.settings?.gst_percentage ?? 5.0);
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(restaurant?.settings?.service_charge_enabled !== false);
  const [serviceChargePercentage, setServiceChargePercentage] = useState(restaurant?.settings?.service_charge_percentage ?? 5.0);
  const [customCharges, setCustomCharges] = useState<{ id: string; name: string; type: 'fixed' | 'percentage'; value: number; enabled: boolean }[]>(restaurant?.settings?.custom_charges || []);
  
  const [newChargeName, setNewChargeName] = useState('');
  const [newChargeType, setNewChargeType] = useState<'fixed' | 'percentage'>('fixed');
  const [newChargeValue, setNewChargeValue] = useState(0);

  // Staff Management State
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<'manager' | 'waiter' | 'kitchen' | 'cashier'>('waiter');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');

  // Import State
  const [importing, setImporting] = useState(false);

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (restaurant) {
      setRestName(restaurant.name);
      setPhone(restaurant.phone || '');
      setAddress(restaurant.address || '');
      setGst(restaurant.gst_number || '');
      setLogoUrl(restaurant.logo_url || '');
      setCoverUrl(restaurant.cover_image_url || '');
      setThemeColor(restaurant.settings?.theme_color || 'emerald');
      setGstEnabled(restaurant.settings?.gst_enabled !== false);
      setGstPercentage(restaurant.settings?.gst_percentage ?? 5.0);
      setServiceChargeEnabled(restaurant.settings?.service_charge_enabled !== false);
      setServiceChargePercentage(restaurant.settings?.service_charge_percentage ?? 5.0);
      setCustomCharges(restaurant.settings?.custom_charges || []);
      setPaymentEnabled(restaurant.settings?.payment_enabled === true);
      setUpiId(restaurant.settings?.upi_id || '');
      setUpiName(restaurant.settings?.upi_name || '');
      setPaymentQr(restaurant.settings?.payment_qr || '');
      setTakeawayEnabled(restaurant.settings?.takeaway_enabled === true);
      setKitchenBellType(restaurant.settings?.kitchen_bell_type || 'alarm');
      setWaiterBellType(restaurant.settings?.waiter_bell_type || 'alarm');
      setKitchenBellUrl(restaurant.settings?.kitchen_bell_url || '');
      setWaiterBellUrl(restaurant.settings?.waiter_bell_url || '');
      loadStaffAndLogs();
    }
  }, [restaurant]);

  const loadStaffAndLogs = async () => {
    if (!restaurant) return;
    const staff = await db.getStaffProfiles(restaurant.id);
    setStaffList(staff);
    const auditLogs = await db.getAuditLogs(restaurant.id);
    setLogs(auditLogs);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !profile) return;
    setLoading(true);

    try {
      await db.updateRestaurant(restaurant.id, {
        name: restName,
        phone,
        address,
        gst_number: gst,
        logo_url: logoUrl,
        cover_image_url: coverUrl,
        settings: {
          ...restaurant.settings,
          theme_color: themeColor
        }
      });

      await db.createAuditLog(
        restaurant.id,
        profile.id,
        profile.email,
        'update_settings',
        'Updated restaurant profile details and branding theme'
      );

      await refresh();
      alert('Restaurant settings updated successfully!');
    } catch (err: any) {
      alert('Failed to update settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomCharge = () => {
    if (!newChargeName.trim()) return;
    const newCharge = {
      id: Math.random().toString(36).substr(2, 9),
      name: newChargeName.trim(),
      type: newChargeType,
      value: Number(newChargeValue) || 0,
      enabled: true
    };
    setCustomCharges(prev => [...prev, newCharge]);
    setNewChargeName('');
    setNewChargeValue(0);
  };

  const handleRemoveCustomCharge = (id: string) => {
    setCustomCharges(prev => prev.filter(c => c.id !== id));
  };

  const handleToggleCustomCharge = (id: string) => {
    setCustomCharges(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const handleSaveCharges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !profile) return;
    setLoading(true);

    try {
      await db.updateRestaurant(restaurant.id, {
        settings: {
          ...restaurant.settings,
          gst_enabled: gstEnabled,
          gst_percentage: Number(gstPercentage) || 0,
          service_charge_enabled: serviceChargeEnabled,
          service_charge_percentage: Number(serviceChargePercentage) || 0,
          custom_charges: customCharges
        }
      });

      await db.createAuditLog(
        restaurant.id,
        profile.id,
        profile.email,
        'update_settings',
        'Updated restaurant tax rates, service charges, and custom billing fees'
      );

      await refresh();
      alert('Taxes and billing charges saved successfully!');
    } catch (err: any) {
      alert('Failed to save taxes and charges: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !profile) return;
    setLoading(true);

    try {
      await db.updateRestaurant(restaurant.id, {
        settings: {
          ...restaurant.settings,
          payment_enabled: paymentEnabled,
          upi_id: upiId,
          upi_name: upiName,
          payment_qr: paymentQr,
          takeaway_enabled: takeawayEnabled
        }
      });

      await db.createAuditLog(
        restaurant.id,
        profile.id,
        profile.email,
        'update_payment_settings',
        `Updated UPI payments settings (Enabled: ${paymentEnabled}, UPI ID: ${upiId})`
      );

      await refresh();
      alert('Payment settings saved successfully!');
    } catch (err: any) {
      alert('Failed to save payment settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotificationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !profile) return;
    setLoading(true);

    try {
      await db.updateRestaurant(restaurant.id, {
        settings: {
          ...restaurant.settings,
          kitchen_bell_type: kitchenBellType,
          waiter_bell_type: waiterBellType,
          kitchen_bell_url: kitchenBellUrl,
          waiter_bell_url: waiterBellUrl
        }
      });

      await db.createAuditLog(
        restaurant.id,
        profile.id,
        profile.email,
        'update_notification_settings',
        `Updated notification bell sounds (Kitchen: ${kitchenBellType}, Waiter: ${waiterBellType})`
      );

      await refresh();
      alert('Notification settings saved successfully!');
    } catch (err: any) {
      alert('Failed to save notification settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !profile) return;
    setStaffLoading(true);
    setStaffError('');

    // Pre-signup validations
    if (!staffName.trim()) {
      setStaffError('Staff Full Name is required.');
      setStaffLoading(false);
      return;
    }
    if (!staffEmail.trim() || !staffEmail.includes('@')) {
      setStaffError('Please enter a valid email address.');
      setStaffLoading(false);
      return;
    }
    if (staffPassword.length < 6) {
      setStaffError('Password must be at least 6 characters long.');
      setStaffLoading(false);
      return;
    }
    if (!['manager', 'waiter', 'kitchen', 'cashier'].includes(staffRole)) {
      setStaffError('Please select a valid staff role.');
      setStaffLoading(false);
      return;
    }

    try {
      await db.createStaffProfile(
        staffEmail,
        staffPassword,
        staffName,
        staffRole,
        restaurant.id
      );

      await db.createAuditLog(
        restaurant.id,
        profile.id,
        profile.email,
        'create_staff',
        `Created staff account for ${staffName} (${staffRole})`
      );

      setStaffEmail('');
      setStaffPassword('');
      setStaffName('');
      alert('Staff member registered successfully!');
      await loadStaffAndLogs();
    } catch (err: any) {
      let msg = err.message || 'Failed to create staff member';
      if (typeof msg === 'object') {
        msg = JSON.stringify(msg);
      }
      if (msg === '{}' || msg === 'Object' || !msg.trim()) {
        msg = 'Database constraint error: Check if the role is allowed. Please execute the SQL commands in supabase/migrations/20260625000000_schema_updates.sql in your Supabase SQL Editor to allow manager/waiter/kitchen roles in your database.';
      }
      setStaffError(msg);
    } finally {
      setStaffLoading(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this staff member? They will lose all access.')) return;
    try {
      setLoading(true);
      await db.deleteStaffProfile(staffId);
      await loadStaffAndLogs();
      alert('Staff account deleted successfully.');
    } catch (err: any) {
      alert(`Failed to delete staff: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (staffEmail: string) => {
    const newPass = prompt(`Enter new password for ${staffEmail}:`);
    if (!newPass) return;
    if (newPass.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    const staffMember = staffList.find(s => s.email === staffEmail);
    if (!staffMember) return;
    
    try {
      setLoading(true);
      await db.updateStaffPassword(staffEmail, staffMember.plain_password || '', newPass);
      await loadStaffAndLogs();
      alert('Password updated successfully!');
    } catch (err: any) {
      alert(`Failed to update password: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportMenu = async () => {
    if (!restaurant || !profile) return;
    try {
      const categories = await db.getCategories(restaurant.id);
      const menuItems = await db.getMenuItems(restaurant.id);
      
      const exportData = {
        categories,
        menuItems
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${restaurant.slug}-menu-backup.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await db.createAuditLog(
        restaurant.id,
        profile.id,
        profile.email,
        'export_menu',
        'Exported menu categories and items backup file'
      );
    } catch (err: any) {
      alert('Failed to export menu: ' + err.message);
    }
  };

  const handleImportMenu = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurant || !profile) return;

    if (!confirm('Importing menu template will append categories and items. Do you wish to continue?')) {
      return;
    }

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.categories || !data.menuItems) {
          throw new Error('Invalid JSON schema. Missing categories or menuItems.');
        }

        // Sequential imports
        for (const cat of data.categories) {
          const newCat = await db.createCategory(restaurant.id, cat.name);
          const itemsForCat = data.menuItems.filter((i: any) => i.category_id === cat.id);
          for (const item of itemsForCat) {
            await db.createMenuItem(restaurant.id, {
              category_id: newCat.id,
              name: item.name,
              description: item.description || '',
              price: item.price,
              image_url: item.image_url || '',
              is_available: item.is_available ?? true,
              is_veg: item.is_veg ?? true
            });
          }
        }

        await db.createAuditLog(
          restaurant.id,
          profile.id,
          profile.email,
          'import_menu',
          `Imported menu dataset: ${data.categories.length} categories and ${data.menuItems.length} menu items`
        );

        alert('Menu template imported successfully!');
        window.location.reload();
      } catch (err: any) {
        alert('Menu import failed: ' + err.message);
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {/* Settings Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings & Brand Control</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure profile settings, register staff, download menu templates, and review logs.</p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5"><Settings className="h-4 w-4" /> Restaurant Profile</span>
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'staff'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Staff Accounts</span>
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'backup'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5"><Download className="h-4 w-4" /> Backup & Restore</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5"><History className="h-4 w-4" /> Audit History Logs</span>
        </button>
        <button
          onClick={() => setActiveTab('charges')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'charges'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5"><DollarSign className="h-4 w-4" /> Taxes & Charges</span>
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'payments'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Payments Settings</span>
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'notifications'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5"><Volume2 className="h-4 w-4" /> Notification Sounds</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        
        {/* PROFILE BRANDING SETTINGS */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Restaurant Branding Details</h3>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Restaurant Name"
                      value={restName}
                      onChange={(e) => setRestName(e.target.value)}
                      required
                    />
                    <Input
                      label="Contact Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <Input
                    label="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="GST Identification Number (GSTIN)"
                      value={gst}
                      onChange={(e) => setGst(e.target.value)}
                      placeholder="e.g. 07AAAAA1111A1Z1"
                    />

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Branding Theme Color</label>
                      <select
                        value={themeColor}
                        onChange={(e) => setThemeColor(e.target.value)}
                        className="block w-full px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-800"
                      >
                        <option value="emerald">Emerald Green (Fresh, Organic)</option>
                        <option value="indigo">Indigo Blue (Premium, Modern)</option>
                        <option value="rose">Rose Red (Elegant, Grill)</option>
                        <option value="amber">Amber Gold (Comfort, Bakery)</option>
                        <option value="purple">Royal Purple (Luxury, Lounge)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ImageUpload
                      label="Restaurant Logo"
                      value={logoUrl}
                      onChange={(url) => setLogoUrl(url)}
                      restaurantId={restaurant?.id || ''}
                      pathPrefix="logo"
                    />
                    <ImageUpload
                      label="Cover Hero Image"
                      value={coverUrl}
                      onChange={(url) => setCoverUrl(url)}
                      restaurantId={restaurant?.id || ''}
                      pathPrefix="cover"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" isLoading={loading}>Save Brand Customizations</Button>
              </div>
            </div>

            {/* PREVIEW PANEL */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Live Branding Preview</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mock banner */}
                  <div className="w-full h-24 rounded-xl relative overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    {coverUrl ? (
                      <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1.5"><Eye className="h-4 w-4" /> Hero Banner</div>
                    )}
                    
                    {/* Floating Logo preview */}
                    <div className="absolute left-4 bottom-2 h-12 w-12 rounded-xl border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md flex items-center justify-center overflow-hidden">
                      {logoUrl ? (
                        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-extrabold text-sm text-slate-400">{restName.charAt(0) || 'R'}</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{restName || 'Restaurant Name'}</h4>
                    <p className="text-xs text-slate-400 mt-1">{phone || 'Phone Number'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{address || 'Restaurant Address'}</p>
                    {gst && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mt-2">GSTIN: {gst}</p>}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Theme Color:</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-4.5 w-4.5 rounded-full inline-block border border-white dark:border-slate-800 shadow-sm ${
                        themeColor === 'indigo' ? 'bg-indigo-600' :
                        themeColor === 'rose' ? 'bg-rose-600' :
                        themeColor === 'amber' ? 'bg-amber-500' :
                        themeColor === 'purple' ? 'bg-purple-600' : 'bg-emerald-600'
                      }`} />
                      <span className="text-xs capitalize font-semibold text-slate-600 dark:text-slate-400">{themeColor}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </form>
        )}

        {/* TAXES & CHARGES SETTINGS */}
        {activeTab === 'charges' && (
          <form onSubmit={handleSaveCharges} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              
              {/* GST (Goods & Services Tax) */}
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Goods & Services Tax (GST)</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Enable GST Charges</p>
                      <p className="text-xs text-slate-400">Add government GST to every order invoice.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={gstEnabled} 
                        onChange={(e) => setGstEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-650 peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                  {gstEnabled && (
                    <div className="pt-2">
                      <Input
                        label="GST Rate (Percentage)"
                        type="number"
                        step="0.01"
                        min="0"
                        value={gstPercentage}
                        onChange={(e) => setGstPercentage(Number(e.target.value))}
                        required
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Service Charge */}
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Service Charge</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Enable Service Charge</p>
                      <p className="text-xs text-slate-400">Apply a dining service charge to final bills.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={serviceChargeEnabled} 
                        onChange={(e) => setServiceChargeEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-650 peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                  {serviceChargeEnabled && (
                    <div className="pt-2">
                      <Input
                        label="Service Charge Rate (Percentage)"
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceChargePercentage}
                        onChange={(e) => setServiceChargePercentage(Number(e.target.value))}
                        required
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Custom Charges & Fees */}
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Custom Charges & Fees</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Add New Custom Charge</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <Input
                        label="Charge Name"
                        placeholder="e.g. Packaging Fee"
                        value={newChargeName}
                        onChange={(e) => setNewChargeName(e.target.value)}
                      />
                      <div>
                        <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1.5">Charge Type</label>
                        <select
                          value={newChargeType}
                          onChange={(e) => setNewChargeType(e.target.value as any)}
                          className="block w-full px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-800"
                        >
                          <option value="fixed">Fixed Amount (Flat Fee)</option>
                          <option value="percentage">Percentage (Percent of Subtotal)</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            label="Value"
                            type="number"
                            step="0.01"
                            min="0"
                            value={newChargeValue === 0 ? '' : newChargeValue}
                            onChange={(e) => setNewChargeValue(Number(e.target.value))}
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="primary" 
                          onClick={handleAddCustomCharge}
                          className="shrink-0 mb-0.5"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Active Charges List</span>
                    {customCharges.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No custom charges added yet. Click above to add packaging fees, delivery fees, dynamic tips, etc.</p>
                    ) : (
                      <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {customCharges.map(charge => (
                          <div key={charge.id} className="p-3.5 flex items-center justify-between gap-4 bg-white dark:bg-slate-900">
                            <div>
                              <p className="font-semibold text-sm text-slate-800 dark:text-slate-250">{charge.name}</p>
                              <p className="text-xs text-slate-400 capitalize">
                                {charge.type === 'percentage' ? `${charge.value}% of Subtotal` : `${formatPrice(charge.value, restaurant?.settings?.currency || 'INR')} Flat Fee`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={charge.enabled} 
                                  onChange={() => handleToggleCustomCharge(charge.id)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-650 peer-checked:bg-emerald-600"></div>
                              </label>
                              <button 
                                type="button"
                                onClick={() => handleRemoveCustomCharge(charge.id)}
                                className="text-rose-500 hover:text-rose-600 dark:text-rose-400 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition-all cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" isLoading={loading}>Save Taxes & Charges</Button>
              </div>

            </div>
            
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Billing Calculation Mock</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-450 uppercase">Subtotal Mock: {formatPrice(100, restaurant?.settings?.currency || 'INR')}</p>
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                    {gstEnabled && (
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>GST ({gstPercentage}%)</span>
                        <span>{formatPrice(100 * (gstPercentage / 100), restaurant?.settings?.currency || 'INR')}</span>
                      </div>
                    )}
                    {serviceChargeEnabled && (
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Service Charge ({serviceChargePercentage}%)</span>
                        <span>{formatPrice(100 * (serviceChargePercentage / 100), restaurant?.settings?.currency || 'INR')}</span>
                      </div>
                    )}
                    {customCharges.filter(c => c.enabled).map(charge => (
                      <div key={charge.id} className="flex justify-between text-xs text-slate-500">
                        <span>{charge.name}</span>
                        <span>{formatPrice(charge.type === 'percentage' ? 100 * (charge.value / 100) : charge.value, restaurant?.settings?.currency || 'INR')}</span>
                      </div>
                    ))}
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                    <div className="flex justify-between text-slate-800 dark:text-white font-extrabold text-sm">
                      <span>Total Mock</span>
                      <span>
                        {formatPrice(
                          100 + 
                          (gstEnabled ? 100 * (gstPercentage / 100) : 0) + 
                          (serviceChargeEnabled ? 100 * (serviceChargePercentage / 100) : 0) + 
                          customCharges.filter(c => c.enabled).reduce((sum, c) => sum + (c.type === 'percentage' ? 100 * (c.value / 100) : c.value), 0),
                          restaurant?.settings?.currency || 'INR'
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </form>
        )}

        {/* STAFF MANAGEMENT */}
        {activeTab === 'staff' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Staff */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Register Staff Login</h3>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateStaff} className="space-y-4">
                    {staffError && (
                      <div className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-2 rounded-lg text-xs font-semibold">
                        {staffError}
                      </div>
                    )}

                    <Input
                      label="Staff Full Name"
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      required
                    />

                    <Input
                      label="Email address"
                      type="email"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      placeholder="rahul@restaurant.com"
                      required
                    />

                    <Input
                      label="Access Password"
                      type="password"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                    />

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Staff Role Permissions</label>
                      <select
                        value={staffRole}
                        onChange={(e) => setStaffRole(e.target.value as any)}
                        className="block w-full px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-800"
                      >
                        <option value="manager">Manager (Menu, Tables, KDS, Orders)</option>
                        <option value="waiter">Waiter (Tables, Orders, Calls, requests)</option>
                        <option value="kitchen">Kitchen Staff (KDS, Kitchen settings)</option>
                        <option value="cashier">Cashier (Orders check, Table checkout)</option>
                      </select>
                    </div>

                    <Button type="submit" className="w-full mt-2" isLoading={staffLoading}>
                      <Plus className="h-4 w-4 mr-1" /> Create Staff Profile
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Staff list */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Registered Staff Profiles</h3>
                </CardHeader>
                <CardContent className="p-0">
                  {staffList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No staff accounts created yet. Use the registration panel to create waiter and kitchen logins.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs md:text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left">Staff Name</th>
                            <th scope="col" className="px-6 py-3 text-left">Email Address</th>
                            <th scope="col" className="px-6 py-3 text-left">Password</th>
                            <th scope="col" className="px-6 py-3 text-left">Assigned Role</th>
                            <th scope="col" className="px-6 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/40">
                          {staffList.map((st) => (
                            <tr key={st.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-6 py-3 font-extrabold text-slate-900 dark:text-white">{st.full_name}</td>
                              <td className="px-6 py-3 font-mono text-xs">{st.email}</td>
                              <td className="px-6 py-3 font-mono text-xs">
                                {st.plain_password ? (
                                  <div className="flex items-center gap-2">
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded select-all">{st.plain_password}</span>
                                    <button 
                                      type="button" 
                                      onClick={() => navigator.clipboard.writeText(st.plain_password || '')} 
                                      className="text-slate-400 hover:text-emerald-500 transition-colors"
                                      title="Copy Password"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Unknown</span>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                <Badge variant={
                                  st.role === 'manager' ? 'info' :
                                  st.role === 'kitchen' ? 'warning' :
                                  st.role === 'waiter' ? 'purple' : 'neutral'
                                }>
                                  {st.role}
                                </Badge>
                              </td>
                              <td className="px-6 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleResetPassword(st.email)}
                                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="Reset Password"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStaff(st.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                    title="Delete Staff"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* BACKUP & RESTORE */}
        {activeTab === 'backup' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Export */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                  <Download className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Export Menu Template</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Download your entire menu architecture, including all food categories, pricing rules, descriptions, tags, and images as a structured JSON file.
                  </p>
                </div>
                <div className="pt-2">
                  <Button variant="outline" onClick={handleExportMenu} className="w-full justify-center">
                    Download Menu JSON File
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Import */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Import Menu Template</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Upload a previously exported JSON backup file to load categories and dishes instantly. This will append new items to your menu layout.
                  </p>
                </div>
                <div className="pt-2 space-y-2">
                  <label className="w-full flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-4 rounded-xl cursor-pointer text-xs font-semibold text-slate-500 transition-colors">
                    <span className="flex items-center gap-1.5"><Upload className="h-4 w-4" /> {importing ? 'Importing Menu...' : 'Select Menu JSON File'}</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportMenu}
                      className="hidden"
                      disabled={importing}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* PAYMENTS CONFIGURATION PANEL */}
        {activeTab === 'payments' && (
          <form onSubmit={handleSavePaymentSettings} className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Lightweight UPI Payments Settings</h3>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white block">Enable Online Payment</span>
                    <span className="text-xs text-slate-400 mt-1 block">Toggle this switch to allow customers to initiate one-click UPI payments upon served orders.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={paymentEnabled} 
                      onChange={() => setPaymentEnabled(!paymentEnabled)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white block">Enable Takeaway Ordering</span>
                    <span className="text-xs text-slate-400 mt-1 block">Toggle this switch to generate a dedicated Takeaway QR and allow prepaid customer orders.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={takeawayEnabled} 
                      onChange={() => setTakeawayEnabled(!takeawayEnabled)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {paymentEnabled && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Restaurant UPI ID (pa)"
                        placeholder="e.g. a2zitems@paytm, businessname@okaxis"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        required
                      />
                      <Input
                        label="UPI Name (pn)"
                        placeholder="e.g. A2Z Items Restaurant"
                        value={upiName}
                        onChange={(e) => setUpiName(e.target.value)}
                        required
                      />
                    </div>
                    <ImageUpload
                      label="Payment QR Image"
                      value={paymentQr}
                      onChange={(url) => setPaymentQr(url)}
                      restaurantId={restaurant?.id || ''}
                      pathPrefix="upi_qr"
                    />
                    <div className="p-3 bg-amber-50/10 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 text-xs rounded-xl flex items-start gap-2.5 font-semibold">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        Payments are processed via UPI deep links directly on the customer's phone using a standard UPI app. No commissions or gateway fees are applied. Staff must manually verify collections inside the Live Orders portal.
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}

        {/* NOTIFICATION SOUNDS PANEL */}
        {activeTab === 'notifications' && (
          <form onSubmit={handleSaveNotificationSettings} className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Kitchen & Waiter Bell Settings</h3>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Background Notifications */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white block">Background Push Notifications</span>
                    <span className="text-xs text-slate-400 mt-1 block">Receive browser notifications when the app is minimized or hidden.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={localStorage.getItem('smartdine_push_enabled') === 'true'}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        localStorage.setItem('smartdine_push_enabled', enabled ? 'true' : 'false');
                        if (enabled && 'Notification' in window) {
                          Notification.requestPermission();
                        }
                        // trigger a re-render by updating an arbitrary state or just let the dom handle checkbox
                        setUploadingKitchen(prev => !prev);
                        setTimeout(() => setUploadingKitchen(prev => !prev), 10);
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Default Bell Status */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <Volume2 className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-emerald-900 dark:text-emerald-100 block">Default Loud Bell Active</span>
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 block">A high-visibility, continuous two-tone alarm is configured for Kitchen and Waiter portals. No further configuration is required.</span>
                    </div>
                  </div>
                  <Check className="h-5 w-5 text-emerald-500" />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" disabled={loading || uploadingKitchen || uploadingWaiter}>
                    {loading ? 'Saving...' : 'Save Notification Configuration'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}

        {/* AUDIT LOGS */}
        {activeTab === 'logs' && (
          <Card>
            <CardHeader>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Restaurant Activity Audit Trail</h3>
            </CardHeader>
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No activity logged yet. Modifications to menus, tables, and settings will appear here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs md:text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-400 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left">Staff User</th>
                        <th scope="col" className="px-6 py-3 text-left">Action Triggered</th>
                        <th scope="col" className="px-6 py-3 text-left">Details</th>
                        <th scope="col" className="px-6 py-3 text-left">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/40">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-3 font-extrabold text-slate-900 dark:text-white">
                            {log.user_email}
                          </td>
                          <td className="px-6 py-3 uppercase">
                            <Badge variant={
                              log.action.includes('delete') ? 'error' :
                              log.action.includes('create') ? 'success' : 'neutral'
                            }>
                              {log.action.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-6 py-3 text-slate-500 dark:text-slate-400 text-xs">{log.details}</td>
                          <td className="px-6 py-3 text-slate-400 text-xs font-semibold">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
