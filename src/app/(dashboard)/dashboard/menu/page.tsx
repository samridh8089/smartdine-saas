'use client';

import { useState, useEffect } from 'react';
import { db, Category, MenuItem, PLAN_LIMITS } from '@/lib/db';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { getActiveUser } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import Link from 'next/link';
import { 
  Plus, Edit2, Trash2, Check, X, Tag, ListFilter, 
  HelpCircle, Eye, EyeOff, AlertTriangle, Coffee
} from 'lucide-react';

export default function MenuManagementPage() {
  const [restaurantId, setRestaurantId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [activePlan, setActivePlan] = useState<'starter' | 'pro' | 'premium'>('starter');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemIsVeg, setItemIsVeg] = useState(true);
  const [itemIsAvailable, setItemIsAvailable] = useState(true);
  const [itemCategoryId, setItemCategoryId] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadMenu() {
      const user = await getActiveUser();
      if (!user || !user.restaurant_id) return;
      const restId = user.restaurant_id;
      setRestaurantId(restId);

      const rest = await db.getRestaurantById(restId);
      if (rest) {
        setActivePlan(rest.subscription_plan);
      }

      const cats = await db.getCategories(restId);
      setCategories(cats);

      const items = await db.getMenuItems(restId);
      setMenuItems(items);

      setLoading(false);
    }
    loadMenu();
  }, []);

  const refreshMenu = async () => {
    if (!restaurantId) return;
    const cats = await db.getCategories(restaurantId);
    const items = await db.getMenuItems(restaurantId);
    setCategories(cats);
    setMenuItems(items);
  };

  // --- Category Handlers ---
  const handleOpenCatModal = (cat: Category | null = null) => {
    setEditingCategory(cat);
    setCategoryName(cat ? cat.name : '');
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      if (editingCategory) {
        await db.updateCategory(editingCategory.id, categoryName);
      } else {
        await db.createCategory(restaurantId, categoryName);
      }
      
      setCatModalOpen(false);
      await refreshMenu();
    } catch (err: any) {
      alert(`Failed to save category: ${err.message}`);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Are you sure? Deleting this category will delete all items under it.')) {
      try {
        await db.deleteCategory(id);
        if (selectedCategoryId === id) setSelectedCategoryId('all');
        await refreshMenu();
      } catch (err: any) {
        alert(`Failed to delete category: ${err.message}`);
      }
    }
  };

  // --- Item Handlers ---
  const handleOpenItemModal = (item: MenuItem | null = null) => {
    setEditingItem(item);
    setErrorMsg('');

    if (item) {
      setItemName(item.name);
      setItemDescription(item.description);
      setItemPrice(item.price.toString());
      setItemImageUrl(item.image_url || '');
      setItemIsVeg(item.is_veg);
      setItemIsAvailable(item.is_available);
      setItemCategoryId(item.category_id);
    } else {
      setItemName('');
      setItemDescription('');
      setItemPrice('');
      setItemImageUrl('');
      setItemIsVeg(true);
      setItemIsAvailable(true);
      setItemCategoryId(categories[0]?.id || '');
    }
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const parsedPrice = parseFloat(itemPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg('Price must be a valid number greater than or equal to 0');
      return;
    }

    let catId = itemCategoryId;
    if (!catId && categories.length > 0) {
      catId = categories[0].id;
    }

    if (!catId) {
      setErrorMsg('Please select or create a category first.');
      return;
    }

    const payload = {
      category_id: catId,
      name: itemName,
      description: itemDescription,
      price: parsedPrice,
      image_url: itemImageUrl || undefined,
      is_available: itemIsAvailable,
      is_veg: itemIsVeg
    };

    try {
      if (editingItem) {
        await db.updateMenuItem(editingItem.id, payload);
      } else {
        await db.createMenuItem(restaurantId, payload);
      }
      setItemModalOpen(false);
      await refreshMenu();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
      try {
        await db.deleteMenuItem(id);
        await refreshMenu();
      } catch (err: any) {
        alert(`Failed to delete menu item: ${err.message}`);
      }
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      await db.updateMenuItem(id, { is_available: !currentStatus });
      await refreshMenu();
    } catch (err: any) {
      alert(`Failed to toggle availability: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="h-10 w-32 bg-slate-200 rounded" />
        </div>
        <div className="grid grid-cols-4 gap-6">
          <div className="h-64 bg-slate-200 rounded-xl" />
          <div className="col-span-3 h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const filteredItems = selectedCategoryId === 'all'
    ? menuItems
    : menuItems.filter(item => item.category_id === selectedCategoryId);

  const planLimit = PLAN_LIMITS[activePlan];
  const itemsUsed = menuItems.length;

  return (
    <div className="space-y-8">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Menu Management</h2>
          <p className="text-slate-500 text-sm mt-1">Organize your dishes, categories, pricing, and availability.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => handleOpenCatModal()}>
            <Plus className="h-4 w-4 mr-1" /> Category
          </Button>
          <Button size="sm" onClick={() => handleOpenItemModal()}>
            <Plus className="h-4 w-4 mr-1" /> Menu Item
          </Button>
        </div>
      </div>

      {/* Subscription limits banner */}
      {itemsUsed >= planLimit.maxItems * 0.8 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-center gap-3 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <strong>Plan usage alert:</strong> You have created {itemsUsed}/{planLimit.maxItems} menu items. 
            Upgrade to a higher plan under <Link href="/dashboard/billing" className="font-bold underline">Billing</Link> to lift limits.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Categories Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Categories</h3>
            <span className="text-xs font-semibold text-slate-500">{categories.length} total</span>
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold text-left transition-colors ${
                selectedCategoryId === 'all' 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-100'
              }`}
            >
              <span>All Items</span>
              <Badge variant="neutral" className={selectedCategoryId === 'all' ? 'bg-slate-800 border-slate-700 text-slate-300' : ''}>
                {menuItems.length}
              </Badge>
            </button>

            {categories.map((cat) => {
              const catCount = menuItems.filter(item => item.category_id === cat.id).length;
              return (
                <div key={cat.id} className="group relative flex items-center">
                  <button
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`flex-1 flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold text-left transition-colors truncate ${
                      selectedCategoryId === cat.id 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-100'
                    }`}
                  >
                    <span className="truncate pr-8">{cat.name}</span>
                    <Badge 
                      variant="neutral" 
                      className={selectedCategoryId === cat.id ? 'bg-emerald-700 border-emerald-500 text-emerald-100' : ''}
                    >
                      {catCount}
                    </Badge>
                  </button>
                  <div className="absolute right-10 hidden group-hover:flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenCatModal(cat); }}
                      className={`p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm`}
                      title="Edit category"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                      className={`p-1.5 rounded bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 shadow-sm`}
                      title="Delete category"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              {selectedCategoryId === 'all' ? 'All Dishes' : categories.find(c => c.id === selectedCategoryId)?.name}
            </h3>
            <span className="text-xs font-semibold text-slate-500">{filteredItems.length} items listed</span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
              <Coffee className="h-10 w-10 text-slate-300" />
              <span>No dishes found in this category. Click "Menu Item" above to add some delicious food!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredItems.map((item) => (
                <Card key={item.id} className={`flex flex-col ${!item.is_available ? 'opacity-70 bg-slate-50/50' : ''}`}>
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="h-44 w-full object-cover shrink-0 border-b border-slate-100"
                    />
                  ) : (
                    <div className="h-44 bg-slate-50 flex items-center justify-center text-slate-300 shrink-0 border-b border-slate-100">
                      No Image Available
                    </div>
                  )}
                  <CardContent className="flex-1 flex flex-col justify-between p-5 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-extrabold text-slate-900 text-base line-clamp-1">{item.name}</h4>
                        <span className="font-extrabold text-slate-950 shrink-0">{formatPrice(item.price)}</span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed min-h-[2rem]">
                        {item.description || 'No description provided.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <Badge variant={item.is_veg ? 'veg' : 'non-veg'}>
                          {item.is_veg ? 'Veg' : 'Non-Veg'}
                        </Badge>
                        <Badge variant={item.is_available ? 'success' : 'error'}>
                          {item.is_available ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                      <button 
                        onClick={() => toggleAvailability(item.id, item.is_available)}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded transition-colors ${
                          item.is_available 
                            ? 'text-slate-500 hover:text-slate-700 bg-slate-100' 
                            : 'text-emerald-600 hover:text-emerald-700 bg-emerald-50'
                        }`}
                      >
                        {item.is_available ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" /> Mark Out of Stock
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" /> Mark In Stock
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenItemModal(item)}
                          className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
                          title="Edit dish"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 border border-rose-100 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete dish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* --- Category Modal --- */}
      <Dialog
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCatModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory}>Save Category</Button>
          </>
        }
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <Input
            label="Category Name"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="e.g. Appetizers, Mains, Drinks"
            required
            autoFocus
          />
        </form>
      </Dialog>

      {/* --- Menu Item Modal --- */}
      <Dialog
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setItemModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveItem}>Save Menu Item</Button>
          </>
        }
      >
        <form onSubmit={handleSaveItem} className="space-y-5">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Dish Name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Garlic Bread, Pasta Carbonara"
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Category
              </label>
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className="block w-full px-3.5 py-2 text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                required
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Price (₹)"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
              placeholder="e.g. 299"
              type="text"
              required
            />

            <ImageUpload
              label="Item Image"
              value={itemImageUrl}
              onChange={(url) => setItemImageUrl(url)}
              restaurantId={restaurantId}
              pathPrefix={`menu_items/item`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              className="block w-full px-3.5 py-2 text-sm text-slate-900 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white min-h-[80px]"
              placeholder="Describe the dish ingredients, preparation, allergens..."
            />
          </div>

          <div className="flex gap-8 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isVeg"
                checked={itemIsVeg}
                onChange={(e) => setItemIsVeg(e.target.checked)}
                className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="isVeg" className="text-sm font-semibold text-slate-700">
                Vegetarian
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAvailable"
                checked={itemIsAvailable}
                onChange={(e) => setItemIsAvailable(e.target.checked)}
                className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="isAvailable" className="text-sm font-semibold text-slate-700">
                In Stock (Available for ordering)
              </label>
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
