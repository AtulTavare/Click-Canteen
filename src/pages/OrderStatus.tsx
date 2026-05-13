import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, OrderItem } from '../lib/types';
import { Check, CheckCircle2, ChevronLeft, Loader2, Utensils, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const stepIndex: Record<string, number> = {
  'Scheduled': -1,
  'Placed': 0,
  'Preparing': 1,
  'Ready': 2,
  'Completed': 3,
  'Cancelled': -2
};

export default function OrderStatus() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Order;
        setOrder(data);
        
        if (orderItems.length === 0) {
          const itemsSnap = await getDocs(collection(db, `orders/${orderId}/orderItems`));
          const items: OrderItem[] = [];
          itemsSnap.forEach(d => items.push({ id: d.id, ...d.data() } as OrderItem));
          setOrderItems(items);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-primary-600"/></div>;
  }

  if (!order) {
    return <div className="p-8 text-center bg-gray-50 min-h-screen text-slate-500 font-medium">Order not found.</div>;
  }

  const handleCancelOrder = async () => {
    if (confirm('Are you sure you want to cancel this scheduled order?')) {
      try {
        await updateDoc(doc(db, 'orders', order.id), { status: 'Cancelled' });
      } catch (err) {
        console.error(err);
        alert('Failed to cancel order.');
      }
    }
  };

  const currentStep = stepIndex[order.status];
  const isScheduled = order.status === 'Scheduled';
  const isCancelled = order.status === 'Cancelled';

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <nav className="bg-white px-4 py-3 border-b border-slate-100 flex items-center sticky top-0 z-40 shadow-sm">
        <Link to="/orders" className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-full bg-slate-50 active:scale-95 transition-transform">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <span className="font-black text-lg ml-3 text-slate-800 tracking-tight">Track Order</span>
      </nav>

      <main className="px-4 pt-6 max-w-md mx-auto">
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 text-center mb-6">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
            {order.table} • {order.customerName}
          </p>
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-6">{order.orderNumber}</h1>

          {isCancelled ? (
            <div className="bg-red-50 text-red-600 p-6 rounded-3xl mt-4">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black">Order Cancelled</h2>
              <p className="font-medium mt-1 text-sm text-red-500">This order was cancelled.</p>
            </div>
          ) : isScheduled ? (
            <div className="bg-purple-50 text-purple-700 p-6 rounded-3xl mt-4">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black">Order Scheduled</h2>
              <p className="font-bold mt-1 text-purple-600">
                For {order.scheduledTime ? new Date(order.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
              </p>
              <p className="text-xs mt-2 font-medium bg-purple-100/50 p-2 rounded-xl">
                Will activate 10 minutes prior to pickup time.
              </p>
              <button 
                onClick={handleCancelOrder}
                className="mt-6 w-full text-sm font-bold bg-white text-purple-700 py-3 rounded-xl border border-purple-200 active:scale-95 transition-transform"
              >
                Cancel Order
              </button>
            </div>
          ) : (
            <div className="mt-8 relative overflow-hidden">
              <div className="flex items-center justify-between relative mt-2 mb-2 z-10 px-2">
                <div className="absolute left-[10%] right-[10%] top-5 h-1.5 bg-slate-100 -z-10 rounded-full" />
                
                <div 
                  className="absolute left-[10%] top-5 h-1.5 bg-emerald-500 -z-10 transition-all duration-700 ease-spring rounded-full" 
                  style={{ width: `${Math.min(100, currentStep * 40)}%` }} 
                />

                {[
                  { label: 'Placed', icon: <Utensils className="w-5 h-5"/> },
                  { label: 'Cooking', icon: <Loader2 className={cn("w-5 h-5", currentStep === 1 && "animate-spin")} /> },
                  { label: 'Ready', icon: <CheckCircle2 className="w-5 h-5"/> }
                ].map((step, idx) => {
                  const isCompleted = currentStep > idx;
                  const isCurrent = currentStep === idx;
                  const isPending = currentStep < idx;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center gap-3 bg-white w-1/3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-[3px] transition-all duration-500 z-10 bg-white",
                        isCompleted ? "border-emerald-500 text-emerald-500" : 
                        isCurrent ? "border-emerald-500 text-white bg-emerald-500 shadow-[0_0_0_6px_theme(colors.emerald.50)]" : 
                        "border-slate-200 text-slate-300"
                      )}>
                        {isCompleted ? <Check className="w-6 h-6"/> : step.icon}
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest leading-tight",
                        isCurrent ? "text-emerald-600" : isCompleted ? "text-slate-800" : "text-slate-400"
                      )}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 pt-6 border-t border-slate-100">
                {currentStep === 0 && <h3 className="text-xl font-black text-slate-800">Order Received ✨</h3>}
                {currentStep === 1 && <h3 className="text-xl font-black text-slate-800">Chef is preparing your food 🍳</h3>}
                {currentStep === 2 && <h3 className="text-xl font-black text-emerald-600 animate-pulse">Order is Ready! 🎉</h3>}
                {currentStep === 3 && <h3 className="text-xl font-black text-slate-800">Hope you enjoyed the meal! 😋</h3>}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs mb-4">Order Summary</h4>
          <div className="space-y-4 mb-4">
            {orderItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-6 h-6 bg-slate-50 text-slate-500 font-bold rounded flex items-center justify-center text-xs shrink-0 self-start mt-0.5 border border-slate-100">
                    {item.quantity}
                  </div>
                  <span className="font-bold text-slate-800">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 mt-1">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-center text-lg">
            <span className="font-black text-slate-500 uppercase text-sm tracking-widest">Total</span>
            <span className="font-black text-slate-900 text-xl">₹{order.totalAmount}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
