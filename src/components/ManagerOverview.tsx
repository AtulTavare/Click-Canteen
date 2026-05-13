import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../lib/types';
import { cn } from '../lib/utils';
import { Check, CheckCircle2, ChevronRight, Loader2, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ManagerOverview() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [revenue, setRevenue] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevOrderCountRef = useRef(0);

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
        if (o.status !== 'Completed') {
          activeOrderCount++;
        }
        if (o.paymentStatus === 'Paid') {
          todayRev += o.totalAmount;
        }
      });
      
      // Need items array fetched for Live Orders!
      // In firestore rules, we have orderItems in a subcollection. This is tricky to get synchronously with onSnapshot.
      // Better to fetch them asynchronously when needed, or store a denormalized summary of items in `Order` document directly for the dashboard.
      // I'll update the placeOrder logic to also attach an `itemsSummary` array to the Order document for quick rendering, skipping subcollection joins on list, to save reads.
      
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
  const pendingBills = orders.filter(o => o.paymentMode === 'Counter' && o.paymentStatus === 'Pending');
  const recentlyCompleted = orders.filter(o => o.status === 'Ready' || o.status === 'Completed').slice(0, 5);
  
  const aov = orders.length > 0 ? Math.round((revenue / orders.length) || 0) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Header */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Overview</h2>
          <p className="text-sm text-slate-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex space-x-4">
          <Link to="/manager/orders" className="hidden sm:inline-flex px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">
            View All Orders
          </Link>
          <Link to="/manager/analytics" className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg text-sm font-medium shadow-lg shadow-primary-600/20 transition-all active:scale-95">
            Full Analytics
          </Link>
        </div>
      </header>

      {/* Scroll-less Bento Dashboard */}
      <div className="flex-1 p-8 grid grid-cols-1 sm:grid-cols-12 grid-rows-1 sm:grid-rows-6 gap-6 overflow-y-auto sm:overflow-hidden min-h-[700px]">
        
        {/* Top Stats Row */}
        <div className="col-span-1 border-slate-100 bg-white sm:col-span-3 sm:row-span-1 p-5 rounded-2xl border shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Today's Revenue</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-slate-900">₹{revenue}</h3>
          </div>
        </div>
        <div className="col-span-1 border-slate-100 bg-white sm:col-span-3 sm:row-span-1 p-5 rounded-2xl border shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Orders</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-slate-900">{orders.length}</h3>
          </div>
        </div>
        <div className="col-span-1 border-slate-100 bg-white sm:col-span-3 sm:row-span-1 p-5 rounded-2xl border shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Avg Order Value</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-slate-900">₹{aov}</h3>
          </div>
        </div>
        <div className="col-span-1 border-slate-100 bg-white sm:col-span-3 sm:row-span-1 p-5 rounded-2xl border shadow-sm flex flex-col justify-between relative overflow-hidden">
          <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2 z-10 relative">Pending Orders</p>
          <div className="flex items-end justify-between z-10 relative">
            <h3 className="text-2xl font-bold text-primary-600">{liveOrders.length}</h3>
            {liveOrders.length > 0 && <span className="flex h-2 w-2 rounded-full bg-primary-500 animate-pulse mb-2"></span>}
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>
        </div>

        {/* Main Live Kitchen Panel (Left Column) */}
        <div className="col-span-1 sm:col-span-8 sm:row-span-5 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h4 className="text-lg font-bold flex items-center text-slate-800">
              Live Kitchen Orders
              <span className="ml-3 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded uppercase tracking-wider font-semibold">Real-time</span>
            </h4>
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse delay-75"></div>
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 hide-scrollbar content-start">
            {liveOrders.length === 0 ? (
               <div className="col-span-full h-full flex flex-col items-center justify-center text-slate-400 font-medium opacity-60">
                 <div className="text-4xl mb-3">🎉</div>
                 <p>All clear — no active orders</p>
               </div>
            ) : (
              liveOrders.map(o => (
                <div key={o.id} className={cn(
                  "rounded-2xl p-4 flex flex-col h-fit transition-all duration-300",
                  o.status === 'Placed' ? "border border-blue-100 bg-blue-50/50" : "border border-amber-200 bg-amber-50/50"
                )}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                        o.status === 'Placed' ? "text-blue-600 bg-blue-100" : "text-amber-700 bg-amber-200"
                      )}>
                        {o.status.toUpperCase()}
                      </span>
                      <h5 className="text-lg font-bold mt-1 text-slate-900 font-mono tracking-tight">{o.orderNumber}</h5>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{o.table} • {Math.round((Date.now() - o.timePlaced) / 60000)}m ago</p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded tracking-tight",
                      o.paymentMode === 'Counter' ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {o.paymentMode === 'Counter' ? 'COUNTER' : 'ONLINE'}
                    </span>
                  </div>
                  <ul className="space-y-1 mb-4 flex-1 text-slate-700">
                    {/* Assuming items is populated, if not fall back to items metadata if available */}
                    {o.items && o.items.length > 0 ? o.items.map((i, idx) => (
                      <li key={idx} className="text-sm flex justify-between">
                        <span className="font-medium">{i.quantity}x {i.name}</span>
                      </li>
                    )) : (
                      <li className="text-sm italic opacity-50">Items loading...</li>
                    )}
                  </ul>
                  
                  <div className="mt-auto pt-2">
                    {o.status === 'Placed' && (
                      <button onClick={() => changeStatus(o.id, 'Preparing')} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 active:scale-95 transition-all">
                        Start Preparing
                      </button>
                    )}
                    {o.status === 'Preparing' && (
                      <button onClick={() => changeStatus(o.id, 'Ready')} className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-600/20 active:scale-95 transition-all">
                        Mark Ready
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {/* Show recently completed orders in a muted state if Live Orders are sparse, else let them be hidden by overflow or just excluded. 
                Actually, let's include the recent 2 completed ones as "Ready/Completed" to match the visual if liveOrders < 4 */}
            {liveOrders.length < 4 && recentlyCompleted.slice(0, 4 - liveOrders.length).map((o) => (
              <div key={o.id} className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 flex flex-col h-fit opacity-60 grayscale-[0.5]">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider">
                      {o.status.toUpperCase()}
                    </span>
                    <h5 className="text-lg font-bold mt-1 text-slate-800 font-mono tracking-tight">{o.orderNumber}</h5>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{o.table} • {Math.round((Date.now() - o.timePlaced) / 60000)}m ago</p>
                  </div>
                  <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded tracking-tight",
                      o.paymentMode === 'Counter' ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {o.paymentMode === 'Counter' ? 'COUNTER' : 'ONLINE'}
                  </span>
                </div>
                <ul className="space-y-1 mb-4">
                    {o.items && o.items.length > 0 ? o.items.map((i, idx) => (
                      <li key={idx} className="text-sm flex justify-between text-slate-600">
                        <span className="font-medium">{i.quantity}x {i.name}</span>
                      </li>
                    )) : (
                      <li className="text-sm italic opacity-50">Items logged</li>
                    )}
                </ul>
                <div className="mt-auto pt-2">
                  <button className="w-full py-2 bg-slate-200 text-slate-500 rounded-xl text-sm font-bold cursor-not-allowed">
                    {o.status === 'Completed' ? 'Collected' : 'Waiting for Pickup'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column Stacks */}
        <div className="col-span-1 sm:col-span-4 sm:row-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col min-h-[250px]">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center tracking-tight">
            Pending Billing
            <span className="ml-auto text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold">
              {pendingBills.length} BILLS
            </span>
          </h4>
          <div className="space-y-3 flex-1 overflow-y-auto hide-scrollbar pr-1 content-start">
            {pendingBills.length === 0 ? (
               <div className="h-full flex items-center justify-center text-slate-400 font-medium text-sm opacity-70">
                 No pending bills
               </div>
            ) : (
              pendingBills.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-bold text-sm text-slate-900 font-mono tracking-tight">{o.orderNumber}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">{o.table}</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="font-bold text-sm text-slate-900">₹{o.totalAmount}</p>
                    <button onClick={() => markPaid(o.id)} className="text-[10px] font-bold text-primary-600 hover:text-primary-700 mt-1 uppercase tracking-wider p-1 -mr-1">
                      Mark Paid
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-1 sm:col-span-4 sm:row-span-2 bg-slate-900 rounded-3xl p-6 text-white flex flex-col min-h-[200px] shadow-lg shadow-slate-900/10">
          <h4 className="text-sm font-bold opacity-70 mb-4 tracking-wider uppercase text-slate-300">Recent Completed</h4>
          <div className="space-y-3 flex-1 overflow-hidden">
            {recentlyCompleted.length === 0 ? (
               <div className="h-full flex items-center justify-center text-slate-500 font-medium text-sm">
                 Waiting for completions
               </div>
            ) : (
              recentlyCompleted.slice(0, 3).map((o, index) => (
                <div key={o.id} className="flex items-center group">
                  <span className="w-6 text-[10px] opacity-40 font-bold font-mono tracking-widest">{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-sm flex-1 font-medium text-slate-200 group-hover:text-white transition-colors">{o.orderNumber} <span className="opacity-40 text-[10px] ml-1 uppercase">{o.table}</span></span>
                  <span className="text-sm font-bold text-emerald-400">₹{o.totalAmount}</span>
                </div>
              ))
            )}
          </div>
          <Link to="/manager/orders" className="mt-auto text-center text-[10px] text-primary-400 hover:text-primary-300 font-bold tracking-widest uppercase transition-colors p-2">
            View All Completed
          </Link>
        </div>

      </div>

      {/* Audio Interaction Simulation Tooltip (Status) */}
      <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center space-x-2 text-xs font-bold tracking-wide border border-slate-700 z-50">
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
        <span>Live Sync Active</span>
      </div>
    </div>
  );
}
