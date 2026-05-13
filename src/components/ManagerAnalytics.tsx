import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../lib/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

export default function ManagerAnalytics() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const snap = await getDocs(query(collection(db, 'orders')));
      const all: Order[] = [];
      snap.forEach(d => all.push({ id: d.id, ...d.data() } as Order));
      setOrders(all);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
     return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600"/></div>;
  }

  // Aggregate by hour for today (simplification for dashboard)
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const todaysOrders = orders.filter(o => o.timePlaced >= today.getTime());
  
  const hourlyData = Array.from({length: 12}).map((_, i) => ({
    hour: `${i+8}h`, // 8 AM to 8 PM approx
    revenue: 0
  }));

  todaysOrders.forEach(o => {
    const d = new Date(o.timePlaced);
    const h = d.getHours();
    if (h >= 8 && h < 20) {
      hourlyData[h - 8].revenue += o.totalAmount;
    }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics</h1>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Today's Revenue by Hour</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">Total All-Time Revenue</span>
                <span className="font-bold text-gray-900">₹{orders.reduce((a,c) => a + c.totalAmount, 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">Total All-Time Orders</span>
                <span className="font-bold text-gray-900">{orders.length}</span>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
}
