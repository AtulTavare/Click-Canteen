import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, OrderStatus, Item, PaymentMode } from '../lib/types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { Clock, CheckCircle2, ChevronRight, Package, Loader2, Utensils, Banknote, Plus, X } from 'lucide-react';

export default function ManagerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Complete Order Modal states
  const [completeOrderData, setCompleteOrderData] = useState<Order | null>(null);
  const [completeAmount, setCompleteAmount] = useState('');

  // New Order Modal states
  const [newOrderStep, setNewOrderStep] = useState(0); // 0 = hidden, 1 = build, 2 = payment
  const [newOrderName, setNewOrderName] = useState('');
  const [newOrderTable, setNewOrderTable] = useState('');
  const [newOrderSelection, setNewOrderSelection] = useState<any[]>([]);
  const [newOrderPaymentMode, setNewOrderPaymentMode] = useState<PaymentMode | null>(null);
  const [newOrderAmountReceived, setNewOrderAmountReceived] = useState('');
  const [itemSearch, setItemSearch] = useState('');


  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('timePlaced', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const allOrders: Order[] = [];
      snap.forEach(d => allOrders.push({ id: d.id, ...d.data() } as Order));
      setOrders(allOrders);
      setLoading(false);
    });
    
    // Also load menuItems
    const unsubItems = onSnapshot(collection(db, 'items'), (snap) => {
      const allItems: Item[] = [];
      snap.forEach(d => allItems.push({ id: d.id, ...d.data() } as Item));
      setMenuItems(allItems.filter(i => i.available));
    });

    return () => { unsub(); unsubItems(); }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 30000); // update every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const expireOrders = async () => {
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayStartMs = todayStart.getTime();

      for (const o of orders) {
        if (o.status === 'Completed' || o.status === 'Cancelled' || o.status === 'Expired') continue;
        
        let shouldExpire = false;

        // "Order for Later" (scheduled):
        if (o.scheduledTime) {
           if (now - o.scheduledTime > 30 * 60000) shouldExpire = true;
        } else {
           // "Order Now" (no scheduled time):
           if (now - o.timePlaced > 30 * 60000) shouldExpire = true;
        }

        // Live Kitchen only shows orders created today. Previous date -> auto expire
        if (o.timePlaced < todayStartMs) {
           shouldExpire = true;
        }

        if (shouldExpire) {
           try {
             await updateDoc(doc(db, 'orders', o.id), { status: 'Expired' });
           } catch(e) { }
        }
      }
    };
    
    // Check initially and then every minute
    const to = setTimeout(expireOrders, 1000);
    const interval = setInterval(expireOrders, 60000);
    return () => { clearTimeout(to); clearInterval(interval); };
  }, [orders]);

  const updateStatus = async (id: string, status: OrderStatus) => {
    await updateDoc(doc(db, 'orders', id), { status });
  };

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

  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todayStartMs = todayStart.getTime();

  // Groups
  const live = orders.filter(o => (o.status === 'Placed' || o.status === 'Preparing') && o.timePlaced >= todayStartMs);
  live.sort((a,b) => a.timePlaced - b.timePlaced); // oldest first
  
  const scheduled = orders.filter(o => o.status === 'Scheduled' && o.timePlaced >= todayStartMs);
  scheduled.sort((a,b) => (a.scheduledTime || 0) - (b.scheduledTime || 0));

  const pickup = orders.filter(o => o.status === 'Ready' && o.timePlaced >= todayStartMs);
  
  const history = orders.filter(o => 
    (o.status === 'Completed' || o.status === 'Expired' || o.status === 'Cancelled') && 
    o.timePlaced >= todayStartMs
  ).sort((a,b) => b.timePlaced - a.timePlaced);

  if (loading) {
     return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600"/></div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-10 max-w-5xl mx-auto pb-20">
      
      {/* Block 1: Live Kitchen */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
           <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
           Live Kitchen ({live.length})
        </h2>
        {live.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-400 font-medium">No live orders. Wait for the magic!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {live.map(o => (
              <div key={o.id} className="border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-white flex flex-col">
                 {o.status === 'Preparing' && <div className="absolute top-0 left-0 w-2 h-full bg-amber-400" />}
                 {o.status === 'Placed' && <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />}
                 
                 <div className="flex justify-between items-start mb-4 pl-3">
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-black text-xl text-slate-800">#{o.orderNumber}</span>
                          <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest", o.table.toLowerCase().includes('takeaway') ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700")}>
                            {o.table}
                          </span>
                       </div>
                       <p className="text-sm font-medium text-gray-500">{o.customerName || 'Anonymous'}</p>
                    </div>
                 </div>

                 {/* Items */}
                 <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-5 flex-1 pl-4 mx-3">
                    <ul className="space-y-2">
                    {o.items.map((item, idx) => (
                      <li key={idx} className="flex gap-3 text-sm">
                         <span className="font-bold text-slate-800 shrink-0">{item.quantity}x</span>
                         <span className="text-slate-600 font-medium leading-relaxed">{item.name}</span>
                      </li>
                    ))}
                    </ul>
                 </div>

                 {/* Footer */}
                 <div className="flex justify-between items-center pl-3">
                    <span className="font-mono text-xs font-bold text-gray-500 flex items-center gap-1.5">
                       <Clock className="w-4 h-4 text-gray-400"/>
                       {getElapsedTime(o.timePlaced)}
                    </span>
                    {o.status === 'Placed' && (
                       <button onClick={() => updateStatus(o.id, 'Preparing')} className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-4 py-2 rounded-xl transition-colors text-xs flex items-center gap-2">
                          <Utensils className="w-4 h-4"/> Start Prep
                       </button>
                    )}
                    {o.status === 'Preparing' && (
                       <button onClick={() => updateStatus(o.id, 'Ready')} className="bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20 text-white font-bold px-4 py-2 rounded-xl transition-all text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4"/> Mark Ready
                       </button>
                    )}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Block 2: Scheduled Orders */}
      <div>
        <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2 mb-4">
           <Clock className="w-5 h-5 text-indigo-500" />
           Scheduled Orders ({scheduled.length})
        </h2>
        {scheduled.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-sm font-medium">No future orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scheduled.map(o => (
              <div key={o.id} className="border border-indigo-100 bg-white rounded-3xl p-5 flex justify-between items-center shadow-sm">
                 <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-black text-indigo-900 text-lg">#{o.orderNumber}</span>
                      <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg">For {o.scheduledTime ? format(o.scheduledTime, 'h:mm a') : ''}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-600">{o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p>
                 </div>
                 <button onClick={() => updateStatus(o.id, 'Preparing')} className="text-sm font-bold bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20">
                    Prepare Now
                 </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Block 3: Ready for Pickup */}
      <div>
        <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-emerald-900 flex items-center gap-2">
               <Package className="w-5 h-5 text-emerald-500" />
               Ready For Pickup / Counter Billing ({pickup.length})
            </h2>
            <button 
               onClick={() => {
                   setNewOrderStep(1);
                   setNewOrderName('');
                   setNewOrderTable('');
                   setNewOrderSelection([]);
                   setNewOrderPaymentMode(null);
               }}
               className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2 shadow-sm">
                <Plus className="w-4 h-4"/> New Counter Order
            </button>
        </div>
        {pickup.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-sm font-medium">Counter is clear</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pickup.map(o => (
               <div key={o.id} className="border border-emerald-100 bg-white shadow-sm rounded-3xl p-5 flex justify-between items-center">
                  <div>
                     <div className="flex items-center gap-3">
                       <p className="font-black text-emerald-900 text-xl">#{o.orderNumber}</p>
                       <span className="text-sm font-bold text-emerald-700">{o.customerName || 'Anonymous'} • {o.table}</span>
                     </div>
                     <p className="text-xs font-bold mt-2 text-slate-400">
                       PAYMENT: <span className={o.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}>{o.paymentStatus}</span> ({o.paymentMode})
                     </p>
                  </div>
                  <div className="flex gap-2">
                    {/* If payment is pending and mode is counter, provide a quick Mark Paid button if you want, but for now just Handed Over */}
                    <button onClick={() => {
                        setCompleteOrderData(o);
                        setCompleteAmount(o.totalAmount.toString());
                    }} className="bg-emerald-50 text-emerald-700 font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-2 text-sm">
                       Complete <ChevronRight className="w-4 h-4"/>
                    </button>
                  </div>
               </div>
            ))}
          </div>
        )}
      </div>

      {/* Block 4: Completed or Expired Today */}
      <div>
        <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2 mb-4">
           <CheckCircle2 className="w-5 h-5 text-slate-400" />
           Order History — Today ({history.length})
        </h2>
        {history.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-sm font-medium">No order history today</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
             <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-slate-50 text-slate-500 font-bold tracking-wider text-[10px] uppercase">
                 <tr>
                   <th className="p-4">Order #</th>
                   <th className="p-4">Status</th>
                   <th className="p-4">Table</th>
                   <th className="p-4">Overview</th>
                   <th className="p-4">Amount</th>
                   <th className="p-4">Time</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {history.map(o => (
                   <tr key={o.id} className={cn("transition-colors", o.status === 'Expired' ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50/50')}>
                     <td className="p-4 font-mono font-bold text-slate-800">#{o.orderNumber}</td>
                     <td className="p-4">
                        <span className={cn(
                            "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded",
                            o.status === 'Completed' ? "bg-emerald-100 text-emerald-700" :
                            o.status === 'Expired' ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-700"
                        )}>
                            {o.status}
                        </span>
                     </td>
                     <td className="p-4 text-slate-600 font-bold">{o.table}</td>
                     <td className="p-4 text-slate-500 max-w-[200px] truncate">{o.items.map(i=>`${i.quantity}x ${i.name}`).join(', ')}</td>
                     <td className="p-4 text-slate-800 font-black">₹{o.totalAmount}</td>
                     <td className="p-4 text-slate-400 font-mono text-xs">{format(o.timePlaced, 'h:mm a')}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      {completeOrderData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-1">Complete Order #{completeOrderData.orderNumber}</h3>
            <p className="text-slate-500 text-sm font-medium mb-6">Customer: {completeOrderData.customerName || 'Anonymous'}</p>

            <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-2">
               {completeOrderData.items.map((i, idx) => (
                 <div key={idx} className="flex justify-between text-sm">
                   <span className="font-medium text-slate-700">{i.quantity}x {i.name}</span>
                 </div>
               ))}
               <div className="pt-2 border-t border-slate-200 mt-2 flex justify-between font-black text-lg">
                 <span>Total:</span>
                 <span>₹{completeOrderData.totalAmount}</span>
               </div>
            </div>

            {completeOrderData.paymentMode === 'Online' ? (
               <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 rounded-xl font-semibold text-center border border-emerald-100">
                  Payment already collected online — ₹{completeOrderData.totalAmount}
               </div>
            ) : (
               <div className="mb-6">
                 <label className="block text-sm font-bold text-slate-700 mb-2">Enter amount collected ₹</label>
                 <input 
                   type="number" 
                   value={completeAmount} 
                   onChange={e => setCompleteAmount(e.target.value)}
                   className="w-full text-2xl font-black bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 />
                 {parseFloat(completeAmount) < completeOrderData.totalAmount && (
                   <p className="text-red-500 text-xs font-bold mt-2">Amount is less than bill total of ₹{completeOrderData.totalAmount}</p>
                 )}
                 {parseFloat(completeAmount) > completeOrderData.totalAmount && (
                   <p className="text-amber-600 text-xs font-bold mt-2">Return change: ₹{parseFloat(completeAmount) - completeOrderData.totalAmount}</p>
                 )}
               </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => setCompleteOrderData(null)} 
                className="flex-1 py-3 bg-slate-100 font-bold text-slate-700 rounded-xl hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                   await updateDoc(doc(db, 'orders', completeOrderData.id), { 
                       status: 'Completed', 
                       paymentStatus: 'Paid' 
                   });
                   setCompleteOrderData(null);
                }}
                disabled={completeOrderData.paymentMode === 'Counter' && parseFloat(completeAmount) < completeOrderData.totalAmount}
                className="flex-1 py-3 bg-emerald-600 focus:ring-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completeOrderData.paymentMode === 'Online' ? 'Complete Order' : 'Confirm & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {newOrderStep > 0 && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh]">
               {newOrderStep === 1 && (
                 <>
                   <div className="flex justify-between items-center p-6 border-b border-gray-100">
                     <h3 className="text-xl font-bold">New Counter Order</h3>
                     <button onClick={() => setNewOrderStep(0)} className="text-gray-400 hover:text-gray-900"><X className="w-6 h-6"/></button>
                   </div>
                   <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                     <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Student Name *</label>
                           <input type="text" value={newOrderName} onChange={e => setNewOrderName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium" placeholder="Walk-in Customer" />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Table (Optional)</label>
                           <input type="text" value={newOrderTable} onChange={e => setNewOrderTable(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-medium" placeholder="e.g. Table 1" />
                        </div>
                     </div>

                     <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Add Items</label>
                        <select 
                           value=""
                           onChange={(e) => {
                               const itm = menuItems.find(i => i.id === e.target.value);
                               if (itm) {
                                   const exists = newOrderSelection.find(s => s.id === itm.id);
                                   if (exists) {
                                       setNewOrderSelection(newOrderSelection.map(s => s.id === itm.id ? {...s, quantity: s.quantity + 1} : s));
                                   } else {
                                       setNewOrderSelection([...newOrderSelection, { id: itm.id, name: itm.name, price: itm.price, quantity: 1 }]);
                                   }
                               }
                           }}
                           className="w-full bg-white border-2 border-indigo-100 text-indigo-900 rounded-xl px-4 py-3 font-bold cursor-pointer"
                        >
                           <option value="" disabled>Select item to add...</option>
                           {menuItems.map(i => <option key={i.id} value={i.id}>{i.name} - ₹{i.price}</option>)}
                        </select>
                     </div>

                     <div className="space-y-3">
                        {newOrderSelection.map((s, idx) => (
                           <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <div className="font-bold text-slate-800">{s.name}</div>
                             <div className="flex items-center gap-4">
                               <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                                  <button onClick={() => {
                                      if (s.quantity > 1) {
                                          setNewOrderSelection(newOrderSelection.map(x => x.id === s.id ? {...x, quantity: x.quantity - 1} : x));
                                      } else {
                                          setNewOrderSelection(newOrderSelection.filter(x => x.id !== s.id));
                                      }
                                  }} className="text-slate-400 hover:text-slate-900 text-lg font-bold w-6 h-6 flex items-center justify-center">-</button>
                                  <span className="font-black w-4 text-center">{s.quantity}</span>
                                  <button onClick={() => {
                                      setNewOrderSelection(newOrderSelection.map(x => x.id === s.id ? {...x, quantity: x.quantity + 1} : x));
                                  }} className="text-indigo-600 hover:text-indigo-800 text-lg font-bold w-6 h-6 flex items-center justify-center">+</button>
                               </div>
                               <button onClick={() => setNewOrderSelection(newOrderSelection.filter(x => x.id !== s.id))} className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg"><X className="w-5 h-5"/></button>
                             </div>
                           </div>
                        ))}
                     </div>
                   </div>
                   <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl flex justify-between items-center">
                     <div className="font-black text-xl">₹{newOrderSelection.reduce((a,c) => a + c.price * c.quantity, 0)}</div>
                     <button 
                        onClick={() => {
                            setNewOrderAmountReceived(newOrderSelection.reduce((a,c) => a + c.price * c.quantity, 0).toString());
                            setNewOrderStep(2);
                        }}
                        disabled={newOrderSelection.length === 0 || !newOrderName.trim()}
                        className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition"
                     >
                        Proceed to Payment
                     </button>
                   </div>
                 </>
               )}

               {newOrderStep === 2 && (
                 <>
                   <div className="flex justify-between items-center p-6 border-b border-gray-100">
                     <h3 className="text-xl font-bold">Collect Payment</h3>
                     <button onClick={() => setNewOrderStep(0)} className="text-gray-400 hover:text-gray-900"><X className="w-6 h-6"/></button>
                   </div>
                   <div className="p-6 overflow-y-auto flex-1">
                     <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 text-center">
                        <p className="text-slate-500 font-bold mb-1">To Pay</p>
                        <p className="text-4xl font-black text-indigo-900">₹{newOrderSelection.reduce((a,c) => a + c.price * c.quantity, 0)}</p>
                     </div>

                     <div className="grid grid-cols-2 gap-4 mb-6">
                        <button 
                          onClick={() => setNewOrderPaymentMode('Cash')}
                          className={cn("py-4 rounded-2xl font-bold border-2 transition-all text-lg flex flex-col items-center gap-2", newOrderPaymentMode === 'Cash' ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-500 hover:bg-slate-50")}
                        >
                          <Banknote className="w-6 h-6"/> Cash
                        </button>
                        <button 
                          onClick={() => setNewOrderPaymentMode('Online')}
                          className={cn("py-4 rounded-2xl font-bold border-2 transition-all text-lg flex flex-col items-center gap-2", newOrderPaymentMode === 'Online' ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-500 hover:bg-slate-50")}
                        >
                          <Package className="w-6 h-6"/> Online
                        </button>
                     </div>

                     {newOrderPaymentMode === 'Cash' && (
                       <div className="animate-in fade-in slide-in-from-bottom-2">
                         <label className="block text-sm font-bold text-slate-700 mb-2">Amount Received ₹</label>
                         <input 
                           type="number" 
                           value={newOrderAmountReceived} 
                           onChange={e => setNewOrderAmountReceived(e.target.value)}
                           className="w-full text-2xl font-black bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                         />
                         {parseFloat(newOrderAmountReceived) > newOrderSelection.reduce((a,c) => a + c.price * c.quantity, 0) && (
                           <p className="text-amber-600 text-sm font-bold mt-2 p-3 bg-amber-50 rounded-lg flex items-center gap-2 border border-amber-100">
                             Return change: ₹{parseFloat(newOrderAmountReceived) - newOrderSelection.reduce((a,c) => a + c.price * c.quantity, 0)}
                           </p>
                         )}
                       </div>
                     )}
                   </div>
                   <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl flex gap-3">
                     <button onClick={() => setNewOrderStep(1)} className="py-3 px-6 bg-slate-200 font-bold text-slate-700 rounded-xl hover:bg-slate-300 transition">Back</button>
                     <button 
                        onClick={async () => {
                            const total = newOrderSelection.reduce((a,c) => a + c.price * c.quantity, 0);
                            const tNum = Math.floor(Math.random() * 900) + 100;
                            const table = newOrderTable.trim() || 'Walk-In';
                            const orderNum = table === 'Walk-In' ? `WI-${tNum}` : `${table.split(' ')[0][0]}-${tNum}`;
                            
                            const payload = {
                                customerName: newOrderName,
                                table: table,
                                items: newOrderSelection,
                                totalAmount: total,
                                paymentMode: newOrderPaymentMode,
                                paymentStatus: 'Paid',
                                status: 'Placed',
                                amountReceived: parseFloat(newOrderAmountReceived) || total,
                                timePlaced: Date.now(),
                                orderNumber: orderNum
                            };
                            
                            try {
                                await addDoc(collection(db, 'orders'), payload);
                            } catch(e) {}

                            // The audio ping comes from ManagerOverview which runs its own onSnapshot. 
                            // But maybe we can try playing it here natively just in case they are looking at this tab? 
                            // Using a quick beep
                            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
                            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
                            gain.gain.setValueAtTime(0, ctx.currentTime);
                            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
                            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                            osc.connect(gain); gain.connect(ctx.destination);
                            osc.start(); osc.stop(ctx.currentTime + 0.3);

                            setNewOrderStep(0);
                        }}
                        disabled={!newOrderPaymentMode || (newOrderPaymentMode === 'Cash' && parseFloat(newOrderAmountReceived) < newOrderSelection.reduce((a,c) => a + c.price * c.quantity, 0))}
                        className="flex-1 bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition"
                     >
                        Confirm Order
                     </button>
                   </div>
                 </>
               )}
            </div>
         </div>
      )}

    </div>
  );
}
