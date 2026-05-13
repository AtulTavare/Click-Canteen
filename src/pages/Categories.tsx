import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Item } from '../lib/types';
import { Utensils, Coffee, Pizza, Croissant } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Categories() {
  const [categories, setCategories] = useState<{name: string, count: number, icon: any}[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const q = query(collection(db, 'items'), where('available', '==', true));
      const snap = await getDocs(q);
      const items: Item[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() } as Item));
      
      const counts: Record<string, number> = {};
      items.forEach(item => {
        counts[item.category] = (counts[item.category] || 0) + 1;
      });

      const iconMap: Record<string, any> = {
        'Meals': <Utensils className="w-8 h-8" />,
        'Snacks': <Pizza className="w-8 h-8" />,
        'Drinks': <Coffee className="w-8 h-8" />,
        'Beverages': <Coffee className="w-8 h-8" />,
      };
      
      const catsData = Object.keys(counts).map(c => ({
        name: c,
        count: counts[c],
        icon: iconMap[c] || <Utensils className="w-8 h-8" />
      }));

      setCategories(catsData);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex items-center shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">Categories</h1>
      </header>

      <main className="max-w-md mx-auto p-4 pt-6 space-y-4">
        {categories.map((cat, idx) => {
          const colors = ['text-blue-600 bg-blue-50', 'text-amber-600 bg-amber-50', 'text-emerald-600 bg-emerald-50', 'text-purple-600 bg-purple-50'];
          const colorClass = colors[idx % colors.length];

          return (
            <div 
              key={cat.name} 
              onClick={() => navigate(`/menu?category=${encodeURIComponent(cat.name)}`)}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 cursor-pointer hover:border-primary-200 transition-colors active:scale-95 duration-200"
            >
              <div className={`p-4 rounded-2xl ${colorClass}`}>
                {cat.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">{cat.name}</h3>
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
