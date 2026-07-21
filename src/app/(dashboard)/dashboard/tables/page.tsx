'use client';

import { useState, useEffect } from 'react';
import { db, Table, PLAN_LIMITS } from '@/lib/db';
import { getActiveUser } from '@/lib/supabase';
import { generateQRDataURL } from '@/lib/qr';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import Link from 'next/link';
import { 
  Plus, QrCode, Download, ExternalLink, Trash2, 
  AlertTriangle, Printer, HelpCircle
} from 'lucide-react';

export default function TablesPage() {
  const [restaurantId, setRestaurantId] = useState('');
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [activePlan, setActivePlan] = useState<'starter' | 'pro' | 'premium'>('starter');
  const [loading, setLoading] = useState(true);

  // QR URLs map, keyed by tableId, storing base64 QR code image data
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [takeawayQR, setTakeawayQR] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [tableName, setTableName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadTables() {
      const user = await getActiveUser();
      if (!user || !user.restaurant_id) return;
      const restId = user.restaurant_id;
      setRestaurantId(restId);

      const rest = await db.getRestaurantById(restId);
      if (rest) {
        setRestaurantSlug(rest.slug);
        setActivePlan(rest.subscription_plan);
      }

      const tbls = await db.getTables(restId);
      setTables(tbls);
      setLoading(false);
    }
    loadTables();
  }, []);

  // Compute and load base64 QR codes whenever tables change
  useEffect(() => {
    async function generateQRs() {
      if (!restaurantSlug) return;
      
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      
      // Generate Takeaway QR Code
      const takeawayUrl = `${origin}/menu/${restaurantSlug}/takeaway`;
      const takeDataUrl = await generateQRDataURL(takeawayUrl);
      setTakeawayQR(takeDataUrl);

      if (tables.length === 0) return;
      
      const newQRs: Record<string, string> = {};
      for (const table of tables) {
        // Customer QR link structure: /menu/[slug]/table/[id]
        const targetUrl = `${origin}/menu/${restaurantSlug}/table/${table.id}`;
        const dataUrl = await generateQRDataURL(targetUrl);
        newQRs[table.id] = dataUrl;
      }
      setQrCodes(newQRs);
    }
    generateQRs();
  }, [tables, restaurantSlug]);

  const refreshTables = async () => {
    if (!restaurantId) return;
    const tbls = await db.getTables(restaurantId);
    setTables(tbls);
  };

  const handleOpenModal = () => {
    setErrorMsg('');
    // Auto-suggest next table name (e.g. "Table 4" if we have 3 tables)
    const count = tables.length;
    setTableName(`Table ${count + 1}`);
    setModalOpen(true);
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!tableName.trim()) return;

    try {
      await db.createTable(restaurantId, tableName);
      setModalOpen(false);
      await refreshTables();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create table');
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (confirm('Are you sure you want to delete this table? The QR code will no longer work.')) {
      try {
        await db.deleteTable(id);
        await refreshTables();
      } catch (err: any) {
        alert(err.message || 'Failed to delete table');
      }
    }
  };

  const downloadQR = (table: Table) => {
    const qrData = qrCodes[table.id];
    if (!qrData) return;

    const link = document.createElement('a');
    link.href = qrData;
    link.download = `${tableNameToFilename(table.name)}-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tableNameToFilename = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  };

  const printTableQR = (table: Table) => {
    const qrData = qrCodes[table.id];
    if (!qrData) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const customerUrl = `${origin}/menu/${restaurantSlug}/table/${table.id}`;

    // Create a printable window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - ${table.name}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              text-align: center;
              padding: 40px;
              color: #0f172a;
            }
            .container {
              border: 4px double #e2e8f0;
              border-radius: 24px;
              padding: 40px;
              max-width: 450px;
              margin: 0 auto;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
            }
            .logo {
              font-size: 24px;
              font-weight: 800;
              color: #059669;
              margin-bottom: 5px;
            }
            .sub {
              font-size: 14px;
              color: #64748b;
              margin-bottom: 30px;
              font-weight: 500;
            }
            .qr-img {
              width: 300px;
              height: 300px;
              margin-bottom: 20px;
            }
            .table-number {
              font-size: 32px;
              font-weight: 900;
              margin: 10px 0;
            }
            .instructions {
              font-size: 16px;
              font-weight: 600;
              color: #059669;
              background-color: #ecfdf5;
              padding: 10px 20px;
              border-radius: 9999px;
              display: inline-block;
              margin-top: 15px;
            }
            .footer-link {
              margin-top: 20px;
              font-size: 10px;
              color: #94a3b8;
            }
            @media print {
              body { padding: 0; }
              .container { border: none; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">SmartDine QR</div>
            <div class="sub">SCAN & ORDER INSTANTLY</div>
            <img class="qr-img" src="${qrData}" alt="QR Code" />
            <div class="table-number">${table.name}</div>
            <div class="instructions">Scan to View Menu & Place Order</div>
            <div class="footer-link">${customerUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="h-10 w-32 bg-slate-200 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-72 bg-slate-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const planLimit = PLAN_LIMITS[activePlan];
  const tablesUsed = tables.length;

  return (
    <div className="space-y-8">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Table Management</h2>
          <p className="text-slate-500 text-sm mt-1">Generate QR codes for tables and monitor order flows by location.</p>
        </div>
        <Button size="sm" onClick={handleOpenModal}>
          <Plus className="h-4 w-4 mr-1" /> Add Table
        </Button>
      </div>

      {/* Subscription limits banner */}
      {tablesUsed >= planLimit.maxTables * 0.8 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-center gap-3 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <strong>Plan usage alert:</strong> You are using {tablesUsed}/{planLimit.maxTables} tables. 
            Upgrade your plan under <Link href="/dashboard/billing" className="font-bold underline">Billing</Link> to create more tables.
          </div>
        </div>
      )}

      {/* Takeaway QR Section */}
      <div className="bg-white border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                Takeaway ordering QR
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-400 uppercase border border-purple-200 dark:border-purple-900/30">
                  Takeaway
                </span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Scans directly to menu in takeaway mode without physical table mapping.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative p-3 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950/20 flex items-center justify-center w-40 h-40 shadow-inner shrink-0">
            {takeawayQR ? (
              <img 
                src={takeawayQR} 
                alt="Takeaway QR Code" 
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="h-8 w-8 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <div className="flex-1 space-y-4 w-full">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Takeaway Order Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${restaurantSlug}/takeaway`}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 select-all focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${restaurantSlug}/takeaway`;
                    navigator.clipboard.writeText(url);
                    alert('Takeaway link copied to clipboard!');
                  }}
                >
                  Copy Link
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = takeawayQR;
                  link.download = `takeaway-qr.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                <Download className="h-4 w-4 text-slate-400" />
                <span>Download QR</span>
              </button>

              <button
                onClick={() => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : '';
                  const takeawayUrl = `${origin}/menu/${restaurantSlug}/takeaway`;
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Print QR - Takeaway</title>
                        <style>
                          body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; color: #0f172a; }
                          .container { border: 4px double #e2e8f0; border-radius: 24px; padding: 40px; max-width: 450px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
                          .logo { font-size: 24px; font-weight: 800; color: #7c3aed; margin-bottom: 5px; }
                          .sub { font-size: 14px; color: #64748b; margin-bottom: 30px; font-weight: 500; }
                          .qr-img { width: 300px; height: 300px; margin-bottom: 20px; }
                          .table-number { font-size: 32px; font-weight: 900; margin: 10px 0; color: #7c3aed; }
                          .instructions { font-size: 16px; font-weight: 600; color: #7c3aed; background-color: #f5f3ff; padding: 10px 20px; border-radius: 9999px; display: inline-block; margin-top: 15px; }
                          .footer-link { margin-top: 20px; font-size: 10px; color: #94a3b8; }
                          @media print { body { padding: 0; } .container { border: none; box-shadow: none; } }
                        </style>
                      </head>
                      <body>
                        <div class="container">
                          <div class="logo">SmartDine QR</div>
                          <div class="sub">SCAN & ORDER TAKEAWAY</div>
                          <img class="qr-img" src="${takeawayQR}" alt="Takeaway QR Code" />
                          <div class="table-number">TAKEAWAY ORDER</div>
                          <div class="instructions">Scan to Order & Pay Instantly</div>
                          <div class="footer-link">${takeawayUrl}</div>
                        </div>
                        <script>
                          window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                          }
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                <Printer className="h-4 w-4 text-slate-400" />
                <span>Print QR</span>
              </button>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Order takeaway directly from our menu: ' + (typeof window !== 'undefined' ? window.location.origin : '') + '/menu/' + restaurantSlug + '/takeaway')}`}
                target="_blank"
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                <span>WhatsApp</span>
              </a>

              <button
                onClick={() => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${restaurantSlug}/takeaway`;
                  navigator.clipboard.writeText(url);
                  alert('Instagram sharing link copied! Paste it in your Instagram Bio or Stories.');
                }}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                <span>Instagram</span>
              </button>

              <a
                href={`sms:?&body=${encodeURIComponent('Order takeaway directly from our menu here: ' + (typeof window !== 'undefined' ? window.location.origin : '') + '/menu/' + restaurantSlug + '/takeaway')}`}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              >
                <span>SMS Share</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
          <QrCode className="h-10 w-10 text-slate-300" />
          <span>No tables created yet. Click "Add Table" above to create your first QR ordering table!</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const customerUrl = `/menu/${restaurantSlug}/table/${table.id}`;
            const qrData = qrCodes[table.id];

            return (
              <Card key={table.id} className="hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  {/* Table Header */}
                  <div className="w-full flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-lg">{table.name}</span>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="p-1.5 border border-rose-50 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete table"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* QR Code Container */}
                  <div className="relative p-3 border border-slate-100 rounded-2xl bg-slate-50 flex items-center justify-center w-48 h-48 shadow-inner group">
                    {qrData ? (
                      <img 
                        src={qrData} 
                        alt={`QR Code for ${table.name}`} 
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="h-10 w-10 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>

                  {/* QR Link */}
                  <div className="w-full truncate text-[11px] font-semibold text-slate-400 select-all p-2 bg-slate-50 border border-slate-100 rounded-lg">
                    {origin + customerUrl}
                  </div>

                  {/* QR Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 w-full pt-2 border-t border-slate-100">
                    <button
                      onClick={() => downloadQR(table)}
                      className="inline-flex flex-col items-center gap-1.5 py-2 px-1 border border-slate-100 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors text-xs font-semibold"
                    >
                      <Download className="h-4 w-4 text-slate-400" />
                      <span>Download</span>
                    </button>
                    
                    <button
                      onClick={() => printTableQR(table)}
                      className="inline-flex flex-col items-center gap-1.5 py-2 px-1 border border-slate-100 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors text-xs font-semibold"
                    >
                      <Printer className="h-4 w-4 text-slate-400" />
                      <span>Print QR</span>
                    </button>

                    <Link
                      href={customerUrl}
                      target="_blank"
                      className="inline-flex flex-col items-center gap-1.5 py-2 px-1 border border-slate-100 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-semibold"
                    >
                      <ExternalLink className="h-4 w-4 text-emerald-500" />
                      <span>Test Menu</span>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* --- Create Table Modal --- */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Table"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTable}>Create Table</Button>
          </>
        }
      >
        <form onSubmit={handleCreateTable} className="space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <Input
            label="Table Name / Number"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="e.g. Table 1, Outdoor 4, Cabin B"
            required
            autoFocus
          />
        </form>
      </Dialog>
    </div>
  );
}
