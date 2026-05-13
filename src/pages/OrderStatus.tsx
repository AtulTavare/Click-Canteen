import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, OrderItem } from '../lib/types';
import { Check, CheckCircle2, ChevronLeft, Loader2, Utensils } from 'lucide-react';
import { cn } from '../lib/utils';

const stepIndex = {
  'Placed': 0,
  'Preparing': 1,
  'Ready': 2,
  'Completed': 3
};

const statusMessages = {
  'Placed': "Your order has been received. Hang tight!",
  'Preparing': "The kitchen is working on your order!",
  'Ready': "Your order is ready! Come pick it up",
  'Completed': "Hope you enjoyed your meal!"
};

export default function OrderStatus() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    
    // Live subscriber for order state
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Order;
        setOrder(data);
        
        // Fetch items once (since they don't change)
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
    return <div className="p-8 text-center bg-gray-50 min-h-screen">Order not found.</div>;
  }

  const currentStep = stepIndex[order.status];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-4 py-3 flex items-center shadow-sm">
        <Link to="/menu" className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-50">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <span className="font-semibold text-lg ml-2">Order Status</span>
      </nav>

      <main className="max-w-xl mx-auto px-4 pt-8 pb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold font-mono tracking-tight text-gray-900">{order.orderNumber}</h1>
        <p className="text-lg font-medium text-gray-500 mt-2">{order.table}</p>
        
        <div className="mt-10 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
          {/* Stepper container */}
          <div className="flex items-center justify-between relative mt-4 mb-4 z-10 px-4">
            {/* Background line */}
            <div className="absolute left-[10%] right-[10%] top-4 h-1 bg-gray-100 -z-10" />
            
            {/* Progress line */}
            <div 
              className="absolute left-[10%] top-4 h-1 bg-primary-500 -z-10 transition-all duration-500 ease-in-out" 
              style={{ width: `${Math.min(100, currentStep * 40)}%` }} 
            />

            {[
              { label: 'Placed', icon: <Utensils className="w-4 h-4"/> },
              { label: 'Preparing', icon: <Loader2 className={cn("w-4 h-4", currentStep === 1 && "animate-spin")} /> },
              { label: 'Ready for Pickup', icon: <CheckCircle2 className="w-4 h-4"/> }
            ].map((step, idx) => {
              const isCompleted = currentStep > idx;
              const isCurrent = currentStep === idx;
              const isPending = currentStep < idx;
              
              return (
                <div key={idx} className="flex flex-col items-center gap-3 bg-white w-1/3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isCompleted && "bg-primary-500 border-primary-500 text-white",
                    isCurrent && "bg-white border-primary-500 text-primary-600 shadow-[0_0_0_4px_theme(colors.primary.100)]",
                    isPending && "bg-gray-50 border-gray-200 text-gray-400"
                  )}>
                    {isCompleted ? <Check className="w-5 h-5"/> : step.icon}
                  </div>
                  <span className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    isCurrent ? "text-primary-600" : isCompleted ? "text-gray-900" : "text-gray-400"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-xl font-bold mb-1 text-gray-900">
              {statusMessages[order.status]} 
              {order.status === 'Ready' && <span> — Order {order.orderNumber}</span>}
            </h3>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-left">
          <h4 className="font-bold text-gray-900 mb-4">Order Summary</h4>
          <div className="space-y-3">
            {orderItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                <div>
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-gray-500 ml-2 text-sm">x{item.quantity}</span>
                </div>
                <span className="font-medium">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center text-lg">
            <span className="font-bold text-gray-500">Total</span>
            <span className="font-bold text-gray-900">₹{order.totalAmount}</span>
          </div>
        </div>

        <Link 
          to="/menu"
          className="mt-8 inline-block w-full sm:w-auto px-8 py-4 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black transition-colors shadow-lg shadow-gray-200"
        >
          Back to Menu
        </Link>
      </main>
    </div>
  );
}
