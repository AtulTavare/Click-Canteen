import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Category } from '../lib/types';
import { X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ManagerMenuCategoryModal({ 
  category, 
  onClose, 
  onSave 
}: { 
  category: Category | null, 
  onClose: () => void, 
  onSave: () => void 
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [active, setActive] = useState(true);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description);
      setImageUrl(category.imageUrl);
      setDisplayOrder(category.displayOrder);
      setActive(category.active);
    }
  }, [category]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { name, description, imageUrl, displayOrder, active };
      if (category?.id) {
        await updateDoc(doc(db, 'categories', category.id), data);
      } else {
        await addDoc(collection(db, 'categories'), data);
      }
      onSave();
    } catch (err) {
      console.error(err);
      alert('Failed to save category');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">{category ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="cat-form" onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Image URL</label>
              <input type="url" required value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium" />
              {imageUrl && (
                <div className="mt-3 w-32 h-32 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} onLoad={(e) => (e.currentTarget.style.display = 'block')} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
               <div className="col-span-2">
                 <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Category Name</label>
                 <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-bold text-slate-800" />
               </div>
               <div className="col-span-1">
                 <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2" title="Lower number shows first">Sort Order</label>
                 <input type="number" required value={displayOrder} onChange={e => setDisplayOrder(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-bold text-slate-800" />
               </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Description</label>
              <textarea required rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium resize-none"></textarea>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50">
               <div>
                 <p className="font-bold text-slate-800 text-sm">Status</p>
                 <p className="text-xs text-slate-500 mt-0.5">{active ? 'Active (shows in menu)' : 'Inactive (hidden completely)'}</p>
               </div>
               <button type="button" onClick={() => setActive(!active)} className={cn("relative inline-flex h-7 w-12 items-center rounded-full transition-colors", active ? "bg-emerald-500" : "bg-slate-300")}>
                  <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white transition-transform", active ? "translate-x-6" : "translate-x-1")} />
               </button>
            </div>
          </form>
        </div>
        
        <div className="p-6 border-t border-slate-100 flex gap-3 bg-white">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
          <button form="cat-form" type="submit" disabled={loading} className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 border border-indigo-600 text-white hover:bg-indigo-700 transition-all flex justify-center shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Category'}
          </button>
        </div>
      </div>
    </div>
  );
}
