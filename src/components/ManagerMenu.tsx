import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Item, Banner, Table } from '../lib/types';
import { Plus, Edit2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';

export default function ManagerMenu() {
  const [activeTab, setActiveTab] = useState<'items' | 'qr' | 'banners'>('items');
  
  const [items, setItems] = useState<Item[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const i: Item[] = [];
    const t: Table[] = [];
    const b: Banner[] = [];
    
    const [iSnap, tSnap, bSnap] = await Promise.all([
      getDocs(collection(db, 'items')),
      getDocs(collection(db, 'tables')),
      getDocs(collection(db, 'banners'))
    ]);
    
    iSnap.forEach(d => i.push({ id: d.id, ...d.data() } as Item));
    tSnap.forEach(d => t.push({ id: d.id, ...d.data() } as Table));
    bSnap.forEach(d => b.push({ id: d.id, ...d.data() } as Banner));
    
    setItems(i);
    setTables(t);
    setBanners(b);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const toggleItemActive = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'items', id), { available: !current });
    loadData();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Menu Management</h1>
      
      <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100 max-w-fit">
        <button 
          onClick={() => setActiveTab('items')}
          className={cn("px-6 py-2 rounded-lg text-sm font-semibold transition-colors", activeTab === 'items' ? "bg-primary-50 text-primary-700" : "text-gray-500 hover:text-gray-900")}
        >
          All Items
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
                <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 flex gap-4">
                  <img src={item.imageUrl} alt={item.name} className="w-24 h-24 rounded-2xl object-cover bg-gray-50" />
                  <div className="flex flex-col flex-1 pb-1 justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                         <h3 className="font-bold text-gray-900 leading-tight">{item.name}</h3>
                         <button onClick={() => toggleItemActive(item.id, item.available)} className={item.available ? "text-green-500" : "text-red-500"}>
                           {item.available ? <CheckCircle2 className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
                         </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-gray-900">₹{item.price}</span>
                      <button className="text-primary-600 p-2 hover:bg-primary-50 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                </div>
              ))}
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
                <div key={b.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="h-32 bg-gray-200 relative">
                    <img src={b.imageUrl} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/40 p-4 flex flex-col justify-end">
                      <h3 className="text-white font-bold">{b.title}</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 line-clamp-2">{b.description}</p>
                    <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
                      <span>Clicks: {b.clickCount}</span>
                      <span className={cn("px-2 py-1 rounded-full font-semibold", b.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
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
    </div>
  );
}
