import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../lib/types';
import { cn } from '../lib/utils';
import { Check, CheckCircle2, ChevronRight, Loader2, Play, TrendingUp, CalendarClock, ShoppingBag, ChefHat, Banknote, Package, Clock, ArrowRight, Activity, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import CanteenTimingCard from './CanteenTimingCard';

export default function ManagerOverview() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevOrderCountRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  const getElapsedTime = (ms: number) => {
    const diff = Math.floor((currentTime - ms) / 60000); // mins
    if (diff < 1) return 'Just now';
    if (diff > 60) {
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h}h ${m}m ago`;
    }
    return `${diff}m ago`;
  };

  useEffect(() => {
    // We can pre-load a simple ping sound using a data URI to avoid assets
    const audioContent = "data:audio/wav;base64,UklGRtQGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YcAGAACA... (shortened)";
    // A simple beep sound using JS AudioContext is better
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playPing = () => {
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    };

    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);

    const q = query(
      collection(db, 'orders'),
      where('timePlaced', '>=', startOfToday.getTime())
    );

    const unsub = onSnapshot(q, (snap) => {
      const liveOrders: Order[] = [];
      let todayRev = 0;
      let activeOrderCount = 0;

      snap.forEach(d => {
        const o = { id: d.id, ...d.data() } as Order;
        liveOrders.push(o);
        if (o.status === 'Placed' || o.status === 'Preparing') {
          activeOrderCount++;
        }
        if (o.paymentStatus === 'Paid') {
          todayRev += o.totalAmount;
        }
      });
      
      liveOrders.sort((a,b) => b.timePlaced - a.timePlaced);
      setOrders(liveOrders);
      setRevenue(todayRev);

      if (activeOrderCount > prevOrderCountRef.current && prevOrderCountRef.current !== 0) {
        playPing(); // New order arrived
      }
      prevOrderCountRef.current = activeOrderCount;
    });

    return () => { unsub(); ctx.close(); };
  }, []);

  useEffect(() => {
    const expireOrders = async () => {
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayMs = todayStart.getTime();

      for (const o of orders) {
        if (o.status === 'Completed' || o.status === 'Cancelled' || o.status === 'Expired') continue;
        
        let shouldExpire = false;

        if (o.scheduledTime) {
           if (now - o.scheduledTime > 30 * 60000) shouldExpire = true;
        } else {
           if (now - o.timePlaced > 30 * 60000) shouldExpire = true;
        }

        if (o.timePlaced < todayMs) {
           shouldExpire = true;
        }

        if (shouldExpire) {
           try {
             await updateDoc(doc(db, 'orders', o.id), { status: 'Expired' });
           } catch(e) { }
        }
      }
    };
    
    const to = setTimeout(expireOrders, 1000);
    const interval = setInterval(expireOrders, 60000);
    return () => { clearTimeout(to); clearInterval(interval); };
  }, [orders]);

  const changeStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (err) {
      console.error(err);
    }
  };

  const markPaid = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { paymentStatus: 'Paid' });
    } catch (err) {
      console.error(err);
    }
  };

  const liveOrders = orders.filter(o => o.status === 'Placed' || o.status === 'Preparing');
  const scheduledOrders = orders.filter(o => o.status === 'Scheduled');
  const pendingBills = orders.filter(o => o.paymentMode === 'Counter' && o.paymentStatus === 'Pending');
  const recentlyCompleted = orders.filter(o => o.status === 'Ready' || o.status === 'Completed').slice(0, 5);
  
  const aov = orders.length > 0 ? Math.round((revenue / orders.length) || 0) : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Overview Dashboard</h2>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex space-x-3">
          <Link to="/manager/orders" className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" /> All Orders
          </Link>
          <Link to="/manager/analytics" className="px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 transition-all active:scale-95 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Analytics
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Full width Timing Card wrapper */}
        <div className="col-span-12">
          <CanteenTimingCard />
        </div>

        {/* --- Top Stats Row --- */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-10 transition-opacity">
            <Banknote className="w-16 h-16 text-emerald-500 -mr-4 -mt-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Today's Revenue</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tight">₹{revenue}</h3>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2.5 py-1 rounded-lg">
            <TrendingUp className="w-3 h-3 mr-1" /> Live Sync
          </div>
        </div>

        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-10 transition-opacity">
            <Clock className="w-16 h-16 text-purple-500 -mr-4 -mt-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Scheduled</p>
            <h3 className="text-4xl font-black text-purple-600 tracking-tight">{scheduledOrders.length}</h3>
          </div>
          <div className="mt-4 text-xs font-bold text-slate-500 bg-slate-50 w-fit px-2.5 py-1 rounded-lg">
            Upcoming later
          </div>
        </div>

        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-5 transition-opacity">
            <ShoppingBag className="w-16 h-16 text-slate-900 -mr-4 -mt-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tight">{orders.length}</h3>
          </div>
          <div className="mt-4 text-xs font-bold text-slate-500 bg-slate-50 w-fit px-2.5 py-1 rounded-lg">
            Today
          </div>
        </div>

        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-10 transition-opacity">
            <ChefHat className="w-16 h-16 text-blue-500 -mr-4 -mt-4" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Live Kitchen</p>
            <div className="flex items-center gap-3">
              <h3 className="text-4xl font-black text-blue-600 tracking-tight">{liveOrders.length}</h3>
              {liveOrders.length > 0 && <span className="flex h-3 w-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.6)]"></span>}
            </div>
          </div>
          <div className="mt-4 text-xs font-bold text-blue-600 bg-blue-50 w-fit px-2.5 py-1 rounded-lg relative z-10">
            Pending Action
          </div>
        </div>

        {/* --- Central Dashboard Panels --- */}

        {/* Main Live Kitchen Panel (Left Column) */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 lg:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
            <div>
              <h4 className="text-2xl font-black flex items-center gap-3 text-slate-900 tracking-tight">
                <Activity className="w-6 h-6 text-red-500" />
                Kitchen Display System
              </h4>
              <p className="text-sm font-medium text-slate-500 mt-1">Orders currently preparing or placed</p>
            </div>
            <div className="hidden sm:flex space-x-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-sm shadow-blue-500/50"></div>
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse delay-75 shadow-sm shadow-amber-500/50"></div>
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse delay-150 shadow-sm shadow-emerald-500/50"></div>
            </div>
          </div>
          
          <div className="flex-1">
            {liveOrders.length === 0 ? (
               <div className="h-64 flex flex-col items-center justify-center text-slate-400 font-medium bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                 <div className="text-4xl mb-4">🎉</div>
                 <p className="text-lg text-slate-500 font-bold">Kitchen is clear!</p>
                 <p className="text-sm mt-1">Waiting for new orders...</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 {liveOrders.map(o => (
                   <div key={o.id} className={cn(
                     "rounded-3xl p-5 flex flex-col transition-all duration-300 relative overflow-hidden",
                     o.status === 'Placed' 
                        ? "border-2 border-blue-100 bg-gradient-to-b from-blue-50/80 to-white shadow-sm hover:shadow-blue-100/50" 
                        : "border-2 border-amber-200 bg-gradient-to-b from-amber-50/80 to-white shadow-md hover:shadow-amber-200/50"
                   )}>
                     
                     <div className="flex justify-between items-start mb-5">
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest",
                              o.status === 'Placed' ? "text-blue-700 bg-blue-100" : "text-amber-800 bg-amber-200"
                            )}>
                              {o.status}
                            </span>
                            <span className={cn(
                              "text-[10px] font-black px-2 py-1 rounded-md tracking-widest flex items-center gap-1",
                              o.paymentMode === 'Counter' ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                              {o.paymentMode === 'Counter' ? <Banknote className="w-3 h-3"/> : <CheckCircle2 className="w-3 h-3"/>}
                              {o.paymentMode === 'Counter' ? 'CASH' : 'PAID'}
                            </span>
                         </div>
                         <h5 className="text-2xl font-black mt-2 text-slate-900 font-mono tracking-tighter">#{o.orderNumber}</h5>
                         <p className="text-xs text-slate-500 font-bold tracking-wide mt-1 flex items-center gap-1.5 border border-slate-200 bg-white w-fit px-2 py-0.5 rounded-md shadow-sm">
                            {o.table} 
                            <span className="text-slate-300">•</span> 
                            <span className="text-slate-600">{getElapsedTime(o.timePlaced)}</span>
                         </p>
                       </div>
                     </div>

                     <div className="bg-white rounded-2xl p-4 mb-6 flex-1 shadow-sm border border-slate-100">
                        <ul className="space-y-3">
                          {o.items && o.items.length > 0 ? o.items.map((i, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-3 text-slate-700">
                              <span className="font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">{i.quantity}x</span>
                              <span className="font-bold leading-tight pt-0.5">{i.name}</span>
                            </li>
                          )) : (
                            <li className="text-sm italic text-slate-400">Items loading...</li>
                          )}
                        </ul>
                     </div>
                     
                     <div className="mt-auto">
                       {o.status === 'Placed' && (
                         <button onClick={() => changeStatus(o.id, 'Preparing')} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                           <ChefHat className="w-4 h-4"/> Start Preparing
                         </button>
                       )}
                       {o.status === 'Preparing' && (
                         <button onClick={() => changeStatus(o.id, 'Ready')} className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                           <CheckCircle2 className="w-4 h-4"/> Mark Ready
                         </button>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>

        {/* Right Column Stack */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          
          {/* Pending Billing */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 lg:p-8 flex-1 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-indigo-500" />
                Pending Bills
              </h4>
              <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-black tracking-widest">
                {pendingBills.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {pendingBills.length === 0 ? (
                 <div className="py-12 flex items-center justify-center text-slate-400 font-medium text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                   No pending counter bills
                 </div>
              ) : (
                pendingBills.map(o => (
                  <div key={o.id} className="flex flex-col p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-black text-lg text-slate-900 font-mono tracking-tight leading-none">#{o.orderNumber}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1.5">{o.table}</p>
                      </div>
                      <p className="font-black text-xl text-indigo-900 bg-indigo-50 px-3 py-1 rounded-lg">₹{o.totalAmount}</p>
                    </div>
                    <button onClick={() => markPaid(o.id)} className="w-full mt-2 py-2.5 bg-indigo-100/50 hover:bg-indigo-600 hover:text-white text-indigo-700 text-xs font-black rounded-xl uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                      <Check className="w-3.5 h-3.5" /> Mark as Paid
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Completed */}
          <div className="bg-slate-900 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-slate-900/10 flex flex-col">
            <h4 className="text-sm font-black opacity-80 mb-6 tracking-widest uppercase text-slate-300 flex items-center gap-2">
              <Package className="w-4 h-4" /> Recent Completions
            </h4>
            <div className="space-y-4 flex-1">
              {recentlyCompleted.length === 0 ? (
                 <div className="py-8 flex items-center justify-center text-slate-500 font-medium text-sm border-t border-slate-800">
                   Waiting for completions
                 </div>
              ) : (
                recentlyCompleted.slice(0, 4).map((o, index) => (
                  <div key={o.id} className="flex items-center group border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                    <span className="w-6 text-xs text-slate-600 font-black font-mono">{String(index + 1).padStart(2, '0')}</span>
                    <div className="flex-1">
                      <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors block leading-none">#{o.orderNumber}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1 block">{o.table}</span>
                    </div>
                    <span className="text-sm font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">₹{o.totalAmount}</span>
                  </div>
                ))
              )}
            </div>
            <Link to="/manager/orders" className="mt-6 w-full text-center text-xs text-slate-400 hover:text-white font-black tracking-widest uppercase transition-colors p-3 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center gap-2">
              View History <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </div>

      {/* Audio Interaction Tooltip */}
      <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl shadow-indigo-500/20 flex items-center space-x-3 text-xs font-bold tracking-widest uppercase border border-slate-800 z-50">
        <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></span>
        <span>System Active</span>
      </div>
    </div>
  );
}
