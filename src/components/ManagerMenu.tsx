import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Item, Banner, Table, Category } from '../lib/types';
import { Plus, Edit2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';

import ManagerMenuItemModal from './ManagerMenuItemModal';
import ManagerMenuCategoryModal from './ManagerMenuCategoryModal';
import ManagerMenuBannerModal from './ManagerMenuBannerModal';

export default function ManagerMenu() {
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'qr' | 'banners'>('items');
  
  const [items, setItems] = useState<Item[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showBannerModal, setShowBannerModal] = useState(false);

  const loadData = () => {
    // using onSnapshot for items, categories, banners to auto sync
    setLoading(true);
    
    getDocs(collection(db, 'tables')).then(async tSnap => {
      const t: Table[] = [];
      const seen = new Set<string>();
      
      const duplicatesToRemove: string[] = [];
      
      tSnap.forEach(d => {
        const tbk = d.data() as Table;
        if (!seen.has(tbk.name)) {
          seen.add(tbk.name);
          t.push({ id: d.id, ...tbk });
        } else {
          duplicatesToRemove.push(d.id);
        }
      });
      
      // Sort table by number if possible (e.g. "Table 1" -> 1)
      t.sort((a,b) => {
         const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
         const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
         return numA - numB;
      });
      
      setTables(t);

      // Clean up duplicates if any
      if (duplicatesToRemove.length > 0) {
        for (const id of duplicatesToRemove) {
          try {
            await deleteDoc(doc(db, 'tables', id));
          } catch(e) {}
        }
      }
    });

    const u1 = onSnapshot(collection(db, 'items'), (snap) => {
      const i: Item[] = [];
      snap.forEach(d => i.push({ id: d.id, ...d.data() } as Item));
      setItems(i);
      setLoading(false);
    });

    const u2 = onSnapshot(collection(db, 'categories'), async (snap) => {
      const c: Category[] = [];
      snap.forEach(d => c.push({ id: d.id, ...d.data() } as Category));
      
      if (c.length === 0) {
         // Auto-seed default categories so the UI isn't empty on first run for older databases
         const defaultCats = [
           { name: 'Meals', description: 'Full course meals', displayOrder: 1, active: true },
           { name: 'Snacks', description: 'Quick bites', displayOrder: 2, active: true },
           { name: 'Drinks', description: 'Hot and cold drinks', displayOrder: 3, active: true },
           { name: 'Beverages', description: 'Packaged beverages', displayOrder: 4, active: true },
         ];
         for (const cat of defaultCats) {
             const ref = doc(collection(db, 'categories'));
             try {
                addDoc(collection(db, 'categories'), { ...cat, imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80' });
             } catch(e) {}
         }
      }

      setCategories(c.sort((a,b) => a.displayOrder - b.displayOrder));
    });

    const u3 = onSnapshot(collection(db, 'banners'), (snap) => {
      const b: Banner[] = [];
      snap.forEach(d => b.push({ id: d.id, ...d.data() } as Banner));
      setBanners(b);
    });

    return () => { u1(); u2(); u3(); };
  };

  useEffect(() => { 
    const unsub = loadData(); 
    return () => { if(unsub) unsub(); }
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Menu Management</h1>
        {activeTab === 'items' && (
           <button onClick={() => { setEditingItem(null); setShowItemModal(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4"/> Add New Item
           </button>
        )}
        {activeTab === 'categories' && (
           <button onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4"/> Add New Category
           </button>
        )}
        {activeTab === 'qr' && (
           <button onClick={async () => {
                const newName = prompt('Enter Table Name (e.g. Table 6)');
                if (!newName) return;
                
                if (tables.find(t => t.name.toLowerCase() === newName.toLowerCase())) {
                    alert(`${newName} already exists`);
                    return;
                }
                const newTable = { name: newName, active: true };
                await addDoc(collection(db, 'tables'), newTable);
                loadData(); // reload tables
           }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4"/> Add New Table
           </button>
        )}
        {activeTab === 'banners' && (
           <button onClick={() => { setEditingBanner(null); setShowBannerModal(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4"/> Add New Banner
           </button>
        )}
      </div>
      
      <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100 max-w-fit">
        <button 
          onClick={() => setActiveTab('items')}
          className={cn("px-6 py-2 rounded-lg text-sm font-semibold transition-colors", activeTab === 'items' ? "bg-primary-50 text-primary-700" : "text-gray-500 hover:text-gray-900")}
        >
          All Items
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={cn("px-6 py-2 rounded-lg text-sm font-semibold transition-colors", activeTab === 'categories' ? "bg-primary-50 text-primary-700" : "text-gray-500 hover:text-gray-900")}
        >
          Categories
        </button>
        <button 
          onClick={() => setActiveTab('qr')}
          className={cn("px-6 py-2 rounded-lg text-sm font-semibold transition-colors", activeTab === 'qr' ? "bg-primary-50 text-primary-700" : "text-gray-500 hover:text-gray-900")}
        >
          Manage QR
        </button>
        <button 
          onClick={() => setActiveTab('banners')}
          className={cn("px-6 py-2 rounded-lg text-sm font-semibold transition-colors", activeTab === 'banners' ? "bg-primary-50 text-primary-700" : "text-gray-500 hover:text-gray-900")}
        >
          Banner Offers
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600"/></div>
      ) : (
        <div className="mt-6">
          {activeTab === 'items' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <div key={item.id} className={cn("bg-white rounded-3xl shadow-sm border border-gray-100 p-4 flex gap-4", !item.available && "opacity-60")}>
                  <img src={item.imageUrl} alt={item.name} className="w-24 h-24 rounded-2xl object-cover bg-gray-50" />
                  <div className="flex flex-col flex-1 pb-1 justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                         <h3 className="font-bold text-gray-900 leading-tight">{item.name}</h3>
                         <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded", item.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                           {item.available ? 'Available' : 'Hidden'}
                         </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-gray-900">₹{item.price}</span>
                      <button onClick={() => { setEditingItem(item); setShowItemModal(true); }} className="text-primary-600 p-2 hover:bg-primary-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(cat => {
                const count = items.filter(i => i.category === cat.name).length;
                return (
                  <div key={cat.id} className={cn("bg-white rounded-3xl shadow-sm border border-gray-100 p-4 flex gap-4", !cat.active && "opacity-60")}>
                    <img src={cat.imageUrl} alt={cat.name} className="w-20 h-20 rounded-2xl object-cover bg-gray-50" />
                    <div className="flex flex-col flex-1 justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                           <h3 className="font-bold text-gray-900 leading-tight">{cat.name}</h3>
                           <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded", cat.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                             {cat.active ? 'Active' : 'Inactive'}
                           </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium line-clamp-1">{cat.description}</p>
                        <p className="text-xs font-bold text-indigo-500 mt-1">{count} ITEMS</p>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={() => { setEditingCategory(cat); setShowCategoryModal(true); }} className="text-primary-600 p-2 hover:bg-primary-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tables.map(t => {
                const url = `${window.location.origin}/menu?table=${t.name.replace('Table ', '')}`;
                return (
                  <div key={t.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t.name}</h3>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4 inline-block">
                      <QRCodeSVG value={url} size={150} />
                    </div>
                    <p className="text-xs text-gray-400 font-mono break-all mb-4 px-2">{url}</p>
                    <div className="mt-auto flex gap-2 w-full">
                      <button 
                        onClick={() => navigator.clipboard.writeText(url)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-xl flex-1 text-sm transition-colors"
                      >
                        Copy URL
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'banners' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {banners.map(b => (
                <div key={b.id} className={cn("bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden", !b.active && "opacity-60")}>
                  <div className="h-32 bg-gray-200 relative">
                    <img src={b.imageUrl} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/40 p-4 flex flex-col justify-end">
                      <h3 className="text-white font-bold">{b.title}</h3>
                    </div>
                    <button onClick={() => { setEditingBanner(b); setShowBannerModal(true); }} className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 p-2 rounded-xl backdrop-blur-md transition-colors">
                      <Edit2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 line-clamp-2">{b.description}</p>
                    <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
                      <span className="font-bold">VALID TILL: {new Date(b.validTill).toLocaleDateString()}</span>
                      <span className={cn("px-2 py-0.5 rounded uppercase font-bold tracking-wider", b.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                        {b.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
             </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showItemModal && (
        <ManagerMenuItemModal 
          item={editingItem} 
          onClose={() => setShowItemModal(false)} 
          onSave={() => setShowItemModal(false)} 
        />
      )}
      {showCategoryModal && (
        <ManagerMenuCategoryModal 
          category={editingCategory}
          onClose={() => setShowCategoryModal(false)} 
          onSave={() => setShowCategoryModal(false)} 
        />
      )}
      {showBannerModal && (
        <ManagerMenuBannerModal 
          banner={editingBanner} 
          onClose={() => setShowBannerModal(false)} 
          onSave={() => setShowBannerModal(false)} 
        />
      )}
    </div>
  );
}
