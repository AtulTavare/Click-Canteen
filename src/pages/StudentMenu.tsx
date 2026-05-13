import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, runTransaction, Timestamp, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Item, Banner, OrderItem, PaymentMode } from '../lib/types';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { ShoppingBag, Minus, Plus, Utensils, CreditCard, Banknote, X, Loader2, User as UserIcon } from 'lucide-react';

export default function StudentMenu() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URL(window.location.href).searchParams;
  const tableParam = searchParams.get('table');
  const tableName = tableParam ? `Table ${tableParam}` : 'Walk-in';
  const categoryParam = searchParams.get('category');

  const [items, setItems] = useState<Item[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'All');
  
  const [checkoutName, setCheckoutName] = useState('');

  useEffect(() => {
    if (user?.name) setCheckoutName(user.name);
  }, [user]);

  const [cart, setCart] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('canteen_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('canteen_cart', JSON.stringify(cart));
  }, [cart]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
  const [isSimulatedPaymentPaid, setIsSimulatedPaymentPaid] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [fullLoading, setFullLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const itemSnap = await getDocs(collection(db, 'items'));
        const i: Item[] = [];
        itemSnap.forEach(doc => i.push({ id: doc.id, ...doc.data() } as Item));
        setItems(i);

        const bannerSnap = await getDocs(query(collection(db, 'banners'), where('active', '==', true)));
        const b: Banner[] = [];
        bannerSnap.forEach(doc => b.push({ id: doc.id, ...doc.data() } as Banner));
        setBanners(b);
      } catch (err) {
        console.error(err);
      } finally {
        setFullLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [banners.length]);

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category)))];
  
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return items;
    return items.filter(i => i.category === selectedCategory);
  }, [items, selectedCategory]);

  const handleUpdateCart = (item: Item, delta: number) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === item.id);
      if (existing) {
        const nextQty = existing.quantity + delta;
        if (nextQty <= 0) return prev.filter(p => p.id !== item.id);
        return prev.map(p => p.id === item.id ? { ...p, quantity: nextQty } : p);
      } else {
        if (delta > 0) {
          return [...prev, { id: item.id, name: item.name, quantity: 1, price: item.price }];
        }
        return prev;
      }
    });
  };

  const getQuantity = (id: string) => cart.find(i => i.id === id)?.quantity || 0;
  
  const cartTotal = useMemo(() => cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0), [cart]);

  const placeOrder = async () => {
    if (!paymentMode) return;
    if (!user) {
      alert('Please log in or sign up to confirm your order.');
      navigate(`/login?redirect=/menu`);
      return;
    }
    if (!checkoutName.trim()) {
      alert('Please enter your name for the order.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      // Create order Number sequence
      const today = new Date().toDateString();
      const counterRef = doc(db, 'counters', 'dailyOrders');
      
      let nextNumber = 1;
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists() || counterDoc.data().date !== today) {
          transaction.set(counterRef, { date: today, count: 1 });
          nextNumber = 1;
        } else {
          nextNumber = counterDoc.data().count + 1;
          transaction.update(counterRef, { count: nextNumber });
        }
      });

      const prefix = tableParam ? `T${tableParam}` : 'WI';
      const orderNumber = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;

      const orderRef = doc(collection(db, 'orders'));
      const batch = writeBatch(db);

      batch.set(orderRef, {
        orderNumber,
        table: tableName,
        customerId: user.id,
        customerName: checkoutName,
        totalAmount: cartTotal,
        paymentMode,
        paymentStatus: paymentMode === 'Online' && isSimulatedPaymentPaid ? 'Paid' : 'Pending',
        status: 'Placed',
        timePlaced: Date.now(),
        items: cart.map(c => ({ id: c.id, name: c.name, quantity: c.quantity, price: c.price })) // Denormalized array for dashboard
      });

      // Add order items to subcollection
      cart.forEach(item => {
        const itemRef = doc(collection(db, `orders/${orderRef.id}/orderItems`));
        batch.set(itemRef, {
          itemId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        });
      });

      await batch.commit();

      setCart([]);
      localStorage.removeItem('canteen_cart');
      setIsPlacingOrder(false);
      navigate(`/status/${orderRef.id}`);
      
    } catch (err: any) {
      console.error(err);
      alert('Failed to place order: ' + err.message);
      setIsPlacingOrder(false);
    }
  };

  if (fullLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-primary-600"/></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center">
            <Utensils className="w-5 h-5" />
          </div>
          <span className="font-bold tracking-tight">CanteenGo</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 px-3 py-1 rounded-full text-sm font-semibold text-gray-700">
            {tableName}
          </div>
          {user ? (
            <button onClick={() => navigate('/profile')} className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center cursor-pointer hover:bg-primary-100 transition-colors">
              <UserIcon className="w-5 h-5" />
            </button>
          ) : (
             <button onClick={() => navigate('/login?redirect=/menu')} className="text-sm font-bold text-primary-600">
               Log in
             </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pt-6">
        {/* Banners */}
        {banners.length > 0 && (
          <div className="mb-8 w-full relative rounded-2xl overflow-hidden shadow-lg h-48 bg-gray-200">
            <div 
              className="flex transition-transform duration-700 ease-out h-full"
              style={{ transform: `translateX(-${currentBanner * 100}%)`}}
            >
              {banners.map((b) => (
                <div key={b.id} className="min-w-full h-full relative">
                  <img src={b.imageUrl} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex flex-col justify-center px-8">
                    <h3 className="text-xl font-bold text-white mb-1">{b.title}</h3>
                    <p className="text-sm text-gray-200">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {banners.map((_, i) => (
                <div key={i} className={cn("w-2 h-2 rounded-full", currentBanner === i ? "bg-white w-4" : "bg-white/50")} />
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 -mx-4 px-4 pb-2">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={cn(
                "whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all shadow-sm",
                selectedCategory === c ? "bg-primary-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map(item => {
            const qty = getQuantity(item.id);
            return (
              <div 
                key={item.id} 
                className={cn(
                  "bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-4 transition-opacity",
                  !item.available && "opacity-60 grayscale"
                )}
              >
                <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h4 className="font-semibold text-gray-900 leading-tight">{item.name}</h4>
                    <p className="text-xs text-primary-600 font-medium mb-1">{item.category}</p>
                    <p className="text-sm font-bold text-gray-900">₹{item.price}</p>
                  </div>
                  
                  {!item.available ? (
                    <div className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded w-fit mt-2">Unavailable</div>
                  ) : qty > 0 ? (
                    <div className="flex items-center gap-3 mt-2 bg-gray-50 rounded-lg p-1 w-fit border border-gray-200">
                      <button onClick={() => handleUpdateCart(item, -1)} className="p-1 rounded-md bg-white shadow-sm text-gray-600 hover:text-primary-600"><Minus className="w-4 h-4"/></button>
                      <span className="font-semibold text-gray-900 w-4 text-center">{qty}</span>
                      <button onClick={() => handleUpdateCart(item, 1)} className="p-1 rounded-md bg-primary-600 text-white shadow-sm hover:bg-primary-700"><Plus className="w-4 h-4"/></button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleUpdateCart(item, 1)}
                      className="mt-2 text-sm font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 ml-auto px-4 py-1.5 rounded-lg transition-colors border border-primary-100"
                    >
                      ADD +
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Sticky Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-3xl mx-auto z-40">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-semibold">{cart.reduce((a,c)=>a+c.quantity,0)} Items</p>
                <p className="text-xs text-gray-300">View Cart</p>
              </div>
            </div>
            <div className="text-xl font-bold">
              ₹{cartTotal}
            </div>
          </button>
        </div>
      )}

      {/* Cart Sidebar / Bottom Sheet */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-sm bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right-full">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
              <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              {cart.map(c => {
                const itemConfig = items.find(i => i.id === c.id);
                return (
                  <div key={c.id} className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="font-semibold text-gray-900">{c.name}</h4>
                      <p className="text-gray-500 text-sm">₹{c.price}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
                      <button onClick={() => handleUpdateCart(itemConfig!, -1)} className="p-1 rounded-md bg-white shadow-sm text-gray-600"><Minus className="w-4 h-4"/></button>
                      <span className="font-semibold text-gray-900 w-4 text-center">{c.quantity}</span>
                      <button onClick={() => handleUpdateCart(itemConfig!, 1)} className="p-1 rounded-md bg-primary-600 text-white shadow-sm"><Plus className="w-4 h-4"/></button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-5 bg-gray-50 border-t border-gray-100">
              <div className="flex justify-between text-lg font-bold mb-4">
                <span>Total</span>
                <span>₹{cartTotal}</span>
              </div>
              <button 
                onClick={() => setIsCheckoutModalOpen(true)}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-600/20"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button onClick={() => setIsCheckoutModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            <h2 className="text-2xl font-bold mb-6">Checkout</h2>
            
            <div className="bg-gray-50 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Total Items</span>
                <span className="font-semibold">{cart.reduce((a,c)=>a+c.quantity,0)}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-bold text-gray-900">Amount to Pay</span>
                <span className="font-bold text-primary-600">₹{cartTotal}</span>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Order For (Name)</label>
              <input 
                type="text" 
                value={checkoutName}
                onChange={(e) => setCheckoutName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                required
              />
            </div>

            <h3 className="font-semibold text-gray-900 mb-3">Select Payment Mode</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                onClick={() => setPaymentMode('Counter')}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all",
                  paymentMode === 'Counter' ? "border-primary-600 bg-primary-50" : "border-gray-100 hover:border-gray-200"
                )}
              >
                <Banknote className={cn("w-8 h-8 mb-2", paymentMode === 'Counter' ? "text-primary-600" : "text-gray-400")} />
                <span className={cn("font-medium", paymentMode === 'Counter' ? "text-primary-700" : "text-gray-600")}>Pay at Counter</span>
              </button>
              
              <button 
                onClick={() => setPaymentMode('Online')}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all",
                  paymentMode === 'Online' ? "border-primary-600 bg-primary-50" : "border-gray-100 hover:border-gray-200"
                )}
              >
                <CreditCard className={cn("w-8 h-8 mb-2", paymentMode === 'Online' ? "text-primary-600" : "text-gray-400")} />
                <span className={cn("font-medium", paymentMode === 'Online' ? "text-primary-700" : "text-gray-600")}>Pay Online</span>
              </button>
            </div>

            {paymentMode === 'Online' && !isSimulatedPaymentPaid && (
              <div className="mb-6">
                <button 
                  onClick={() => setIsSimulatedPaymentPaid(true)}
                  className="w-full bg-blue-100 text-blue-700 border border-blue-200 py-3 rounded-xl font-medium"
                >
                  Simulate Online Payment (Click to Pay)
                </button>
              </div>
            )}
            {paymentMode === 'Online' && isSimulatedPaymentPaid && (
              <div className="mb-6 bg-green-50 text-green-700 border border-green-200 py-3 px-4 rounded-xl flex items-center justify-center font-medium">
                Payment Successful! ✅
              </div>
            )}

            <button 
              disabled={!paymentMode || (paymentMode === 'Online' && !isSimulatedPaymentPaid) || isPlacingOrder}
              onClick={placeOrder}
              className="w-full bg-gray-900 disabled:opacity-50 hover:bg-black text-white font-bold text-lg py-4 rounded-xl shadow-xl transition-all"
            >
              {isPlacingOrder ? 'Processing...' : 'Confirm Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
