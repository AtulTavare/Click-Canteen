import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Package, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { Order } from '../lib/types';

export default function StudentOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    async function loadOrders() {
      try {
        const q = query(
          collection(db, 'orders'),
          where('customerId', '==', user.id)
        );
        const snap = await getDocs(q);
        const o: Order[] = [];
        snap.forEach(doc => o.push({ id: doc.id, ...doc.data() } as Order));
        
        o.sort((a, b) => b.timePlaced - a.timePlaced);
        setOrders(o);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 font-medium tracking-wide">Loading Orders...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex items-center shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">My Orders</h1>
      </header>

      <main className="max-w-md mx-auto p-4 pt-6 space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm mx-2">
            <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">No Orders Yet</h3>
            <p className="text-sm text-slate-500 font-medium px-8 mt-2">You haven't placed any orders. Start exploring our menu!</p>
            <button 
              onClick={() => navigate('/menu')}
              className="mt-6 bg-primary-50 text-primary-600 px-6 py-2.5 rounded-full font-bold active:scale-95 transition-all text-sm uppercase tracking-wider"
            >
              View Menu
            </button>
          </div>
        ) : (
          orders.map(order => (
            <div 
              key={order.id} 
              onClick={() => navigate(`/status/${order.id}`)}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-primary-200 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(order.timePlaced).toLocaleString()}
                  </span>
                  <h4 className="font-mono font-bold text-lg text-slate-800 mt-1.5">{order.orderNumber}</h4>
                </div>
                <span className={cn(
                  "text-[10px] font-bold px-2.5 py-1 rounded tracking-tight uppercase shadow-sm",
                  order.status === 'Completed' ? "bg-slate-100 text-slate-600" :
                  order.status === 'Ready' ? "bg-emerald-100 text-emerald-700 font-extrabold" :
                  "bg-blue-100 text-blue-700"
                )}>
                  {order.status}
                </span>
              </div>
              
              <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-50">
                <div className="text-sm text-slate-500 font-medium">
                  {order.items?.reduce((acc: number, val: any) => acc + val.quantity, 0) || 0} items
                </div>
                <div className="font-bold text-slate-900 border border-slate-100 px-3 py-1 rounded-lg bg-slate-50">
                  ₹{order.totalAmount}
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
