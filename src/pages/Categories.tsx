import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Item, Category } from '../lib/types';
import { useNavigate } from 'react-router-dom';

export default function Categories() {
  const [categories, setCategories] = useState<(Category & { count: number })[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      // Fetch items
      const q = query(collection(db, 'items'), where('available', '==', true));
      const snap = await getDocs(q);
      const items: Item[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() } as Item));
      
      const counts: Record<string, number> = {};
      items.forEach(item => {
        counts[item.category] = (counts[item.category] || 0) + 1;
      });

      // Fetch active categories
      const cQ = query(collection(db, 'categories'), where('active', '==', true));
      const cSnap = await getDocs(cQ);
      const cats: Category[] = [];
      cSnap.forEach(d => cats.push({ id: d.id, ...d.data() } as Category));
      
      cats.sort((a,b) => a.displayOrder - b.displayOrder);
      
      const enrichedCats = cats.map(c => ({
        ...c,
        count: counts[c.name] || 0
      }));

      setCategories(enrichedCats);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex items-center shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">Categories</h1>
      </header>

      <main className="max-w-md mx-auto p-4 pt-6 space-y-4">
        {categories.map((cat) => {
          return (
            <div 
              key={cat.id} 
              onClick={() => navigate(`/menu?category=${encodeURIComponent(cat.name)}`)}
              className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 cursor-pointer hover:border-indigo-200 transition-colors active:scale-[0.98] duration-200"
            >
              <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden bg-slate-100 shrink-0">
                <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">{cat.name}</h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">{cat.count} Items Available</p>
              </div>
            </div>
          );
        })}
        {categories.length === 0 && (
          <p className="text-center text-slate-400 py-10 opacity-60 font-medium">Loading categories...</p>
        )}
      </main>
    </div>
  );
}
