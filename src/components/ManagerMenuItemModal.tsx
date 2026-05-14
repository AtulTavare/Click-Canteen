import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Item, Category } from '../lib/types';
import { X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ManagerMenuItemModal({ 
  item, 
  onClose, 
  onSave 
}: { 
  item: Item | null, 
  onClose: () => void, 
  onSave: () => void 
}) {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [price, setPrice] = useState(item?.price || 0);
  const [imageUrl, setImageUrl] = useState(item?.imageUrl || '');
  const [category, setCategory] = useState(item?.category || '');
  const [available, setAvailable] = useState(item ? item.available : true);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // fetch categories
    getDocs(collection(db, 'categories')).then(snap => {
      const cats: Category[] = [];
      snap.forEach(d => cats.push({ id: d.id, ...d.data() } as Category));
      const sorted = cats.filter(c => c.active).sort((a,b) => a.displayOrder - b.displayOrder);
      setCategories(sorted);
      
      if (!item && sorted.length > 0) {
        setCategory(sorted[0].name);
      }
    });
  }, [item]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        name,
        description,
        price,
        imageUrl,
        category,
        available
      };
      
      if (item?.id) {
        await updateDoc(doc(db, 'items', item.id), data);
      } else {
        await addDoc(collection(db, 'items'), { ...data, orderCount: 0 });
      }
      onSave();
    } catch (err) {
      console.error(err);
      alert('Failed to save item');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">{item ? 'Edit Item' : 'New Item'}</h2>
          <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="item-form" onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Image URL</label>
              <input type="url" required value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium" />
              {imageUrl && (
                <div className="mt-3 w-32 h-32 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} onLoad={(e) => (e.currentTarget.style.display = 'block')} />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Item Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-bold text-slate-800" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Category</label>
                <select required value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium appearance-none">
                  <option value="" disabled>Select...</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Price (₹)</label>
                <input type="number" required min="0" value={price} onChange={e => setPrice(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-bold text-slate-800" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Description</label>
              <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium resize-none"></textarea>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50">
               <div>
                 <p className="font-bold text-slate-800 text-sm">Availability</p>
                 <p className="text-xs text-slate-500 mt-0.5">{available ? 'Item is visible and can be ordered' : 'Item is hidden from the menu'}</p>
               </div>
               <button type="button" onClick={() => setAvailable(!available)} className={cn("relative inline-flex h-7 w-12 items-center rounded-full transition-colors", available ? "bg-emerald-500" : "bg-slate-300")}>
                  <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white transition-transform", available ? "translate-x-6" : "translate-x-1")} />
               </button>
            </div>
          </form>
        </div>
        
        <div className="p-6 border-t border-slate-100 flex gap-3 bg-white">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
          <button form="item-form" type="submit" disabled={loading} className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 border border-indigo-600 text-white hover:bg-indigo-700 transition-all flex justify-center shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
