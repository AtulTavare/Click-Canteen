import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Package, Clock, Utensils, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { Order } from '../lib/types';

export default function StudentOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

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
    return <div className="min-h-screen flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Orders...</div>;
  }

  const activeOrders = orders.filter(o => ['Scheduled', 'Placed', 'Preparing', 'Ready'].includes(o.status));
  const pastOrders = orders.filter(o => ['Completed', 'Cancelled'].includes(o.status));
  
  const displayedOrders = activeTab === 'active' ? activeOrders : pastOrders;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 top-0">
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-10 flex flex-col shadow-sm pt-20 -mt-16">
        <h1 className="text-3xl font-black tracking-tight text-slate-800 mb-6">My Orders</h1>
        
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full max-w-md mx-auto">
          <button 
            onClick={() => setActiveTab('active')}
            className={cn(
              "flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all",
              activeTab === 'active' ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Active
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={cn(
              "flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all",
              activeTab === 'past' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Past
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pt-6 space-y-4">
        {displayedOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm mx-2">
            <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">No {activeTab} orders</h3>
            <p className="text-sm text-slate-500 font-medium px-8 mt-2">
              {activeTab === 'active' ? "You don't have any ongoing orders right now. Time to eat!" : "You haven't ordered anything yet."}
            </p>
            {activeTab === 'active' && (
              <button 
                onClick={() => navigate('/menu')}
                className="mt-6 bg-primary-50 text-primary-600 px-8 py-3 rounded-full font-black active:scale-95 transition-all text-sm uppercase tracking-wider border border-primary-100"
              >
                Browse Menu
              </button>
            )}
          </div>
        ) : (
          displayedOrders.map(order => (
            <div 
              key={order.id} 
              onClick={() => navigate(`/status/${order.id}`)}
              className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm hover:border-primary-200 transition-colors cursor-pointer active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    {order.status === 'Scheduled' ? <Calendar className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {new Date(order.timePlaced).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <h4 className="font-mono font-black text-xl text-slate-800 mt-1">{order.orderNumber}</h4>
                </div>
                
                <span className={cn(
                  "text-[10px] font-black px-3 py-1.5 rounded-full tracking-wider uppercase shadow-sm border",
                  order.status === 'Completed' ? "bg-slate-50 text-slate-500 border-slate-200" :
                  order.status === 'Cancelled' ? "bg-red-50 text-red-600 border-red-100" :
                  order.status === 'Ready' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                  order.status === 'Scheduled' ? "bg-purple-50 text-purple-600 border-purple-200" :
                  "bg-primary-50 text-primary-600 border-primary-100"
                )}>
                  {order.status}
                </span>
              </div>
              
              <div className="space-y-1 mb-4 mt-2">
                 <p className="text-sm font-bold text-slate-600 truncate">
                   {order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                 </p>
              </div>

              {order.status === 'Scheduled' && order.scheduledTime && (
                <div className="bg-purple-50 p-3 rounded-xl mb-4 border border-purple-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-widest">Pickup scheduled for</span>
                  <span className="text-sm font-black text-purple-900">{new Date(order.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              )}

              <div className="flex justify-between items-center mt-3 pt-4 border-t border-dashed border-slate-200">
                <div className="text-xs font-bold text-slate-400 tracking-widest uppercase">
                  Total Amount
                </div>
                <div className="font-black text-slate-900 text-lg">
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
