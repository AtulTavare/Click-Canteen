import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, runTransaction, writeBatch, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Item, Banner, OrderItem, PaymentMode, CanteenSettings, Category } from '../lib/types';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { ShoppingBag, Minus, Plus, Utensils, CreditCard, Banknote, X, Loader2, ArrowRight, Clock } from 'lucide-react';
import AnalogClockPicker from '../components/AnalogClockPicker';

export default function StudentMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchParams = new URL(window.location.href).searchParams;
  const tableParam = searchParams.get('table');
  const tableName = tableParam ? `Table ${tableParam}` : 'Walk-in';
  const categoryParam = searchParams.get('category');

  const [items, setItems] = useState<Item[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [canteenSettings, setCanteenSettings] = useState<CanteenSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'All');
  
  const [checkoutName, setCheckoutName] = useState('');
  const [orderType, setOrderType] = useState<'now' | 'scheduled'>('now');
  const [scheduledTimeStr, setScheduledTimeStr] = useState<string>('');

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
        const catSnap = await getDocs(query(collection(db, 'categories'), where('active', '==', true)));
        const c: Category[] = [];
        catSnap.forEach(doc => c.push({ id: doc.id, ...doc.data() } as Category));
        c.sort((a,b) => a.displayOrder - b.displayOrder);
        setCategories(c);
        
        const activeCategoryNames = c.map(cat => cat.name);

        const itemSnap = await getDocs(query(collection(db, 'items'), where('available', '==', true)));
        const i: Item[] = [];
        itemSnap.forEach(doc => {
           const item = { id: doc.id, ...doc.data() } as Item;
           if (activeCategoryNames.includes(item.category)) {
             i.push(item);
           }
        });
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

    // Listen to canteen settings
    const unsub = onSnapshot(doc(db, 'settings', 'canteen'), (snap) => {
      if (snap.exists()) {
        setCanteenSettings(snap.data() as CanteenSettings);
      } else {
        // Fallback default
        setCanteenSettings({
          openTime: '09:00',
          closeTime: '17:00',
          activeDays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false }
        });
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [banners.length]);

  const categoryTabs = ['All', ...categories.map(c => c.name)];
  
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
    
    let scheduledTimestamp = undefined;
    if (orderType === 'scheduled') {
      if (!scheduledTimeStr) {
        alert('Please select a time for your scheduled order.');
        return;
      }
      const [hours, minutes] = scheduledTimeStr.split(':').map(Number);
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);
      
      const minTime = new Date(Date.now() + 29 * 60000); // ~30 mins future
      if (scheduledDate < minTime) {
        alert('Scheduled time must be at least 30 minutes from now.');
        return;
      }
      scheduledTimestamp = scheduledDate.getTime();
    }

    setIsPlacingOrder(true);
    try {
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
        status: orderType === 'now' ? 'Placed' : 'Scheduled',
        timePlaced: Date.now(),
        orderType,
        scheduledTime: scheduledTimestamp || null,
        items: cart.map(c => ({ id: c.id, name: c.name, quantity: c.quantity, price: c.price })) 
      });

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

  const getCanteenState = () => {
    if (!canteenSettings) return { isOpen: true }; // default while loading
    const now = new Date();
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDayStr = dayMap[now.getDay()] as keyof typeof canteenSettings.activeDays;
    
    const isOpenToday = canteenSettings.activeDays[currentDayStr];
    
    // Convert open and close to minutes
    const [openH, openM] = canteenSettings.openTime.split(':').map(Number);
    const [closeH, closeM] = canteenSettings.closeTime.split(':').map(Number);
    
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    const tOpen = new Date();
    tOpen.setHours(openH, openM, 0, 0);
    const timeStr = tOpen.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (!isOpenToday) {
      // Find next open day
      let checkIdx = (now.getDay() + 1) % 7;
      let nextDayName = '';
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      for (let i=0; i<7; i++) {
        const dStr = dayMap[checkIdx] as keyof typeof canteenSettings.activeDays;
        if (canteenSettings.activeDays[dStr]) {
          nextDayName = dayNames[checkIdx];
          break;
        }
        checkIdx = (checkIdx + 1) % 7;
      }
      return { 
        isOpen: false, 
        message: `Canteen is closed today. See you on ${nextDayName} at ${timeStr} 👋` 
      };
    }

    if (currentMins < openMins) {
      return { 
        isOpen: false, 
        message: `Canteen is closed right now. Opens today at ${timeStr} ☕`
      };
    }

    if (currentMins > closeMins) {
      return { 
        isOpen: false, 
        message: `Canteen is closed for today. See you tomorrow at ${timeStr} 🌙`
      };
    }

    return { isOpen: true };
  };

  const canteenState = getCanteenState();

  if (fullLoading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-primary-600"/></div>;
  }

  // Calculate safe bottom padding so content isn't hidden beneath the checkout bar + dock nav
  const bottomPaddingClass = cart.length > 0 ? "pb-40" : "pb-6"; // DockNav is absolute at bottom, handled by StudentLayout pb-32

  return (
    <div className="bg-gray-50 min-h-screen">
      {!canteenState.isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col justify-center items-center text-center p-6 px-10">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-xl border border-slate-700">
             <Clock className="w-10 h-10 text-primary-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Canteen Closed</h2>
          <p className="text-slate-300 text-lg font-medium max-w-[280px] leading-relaxed">
            {canteenState.message}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 mb-4">
         <div className="bg-primary-50 px-3 py-1.5 rounded-full text-xs font-black tracking-widest uppercase text-primary-600 shadow-sm border border-primary-100">
           {tableName}
         </div>
      </div>

      <main className={cn("max-w-md mx-auto px-4", bottomPaddingClass)}>
        {/* Banners */}
        {banners.length > 0 && (
          <div className="mb-6 w-full relative rounded-3xl overflow-hidden shadow-sm h-40 bg-gray-200">
            <div 
              className="flex transition-transform duration-700 ease-out h-full"
              style={{ transform: `translateX(-${currentBanner * 100}%)`}}
            >
              {banners.map((b) => (
                <div key={b.id} className="min-w-full h-full relative">
                  <img src={b.imageUrl} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center px-6">
                    <h3 className="text-xl font-bold text-white mb-1 shadow-sm">{b.title}</h3>
                    <p className="text-xs text-gray-200 font-medium">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {banners.map((_, i) => (
                <div key={i} className={cn("w-1.5 h-1.5 rounded-full", currentBanner === i ? "bg-white w-3" : "bg-white/50")} />
              ))}
            </div>
          </div>
        )}

        {/* Horizontal Category Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2.5 mb-6 -mx-4 px-4 pb-2 snap-x">
          {categoryTabs.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={cn(
                "snap-start shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-colors shadow-sm",
                selectedCategory === c ? "bg-slate-800 text-white" : "bg-white border border-gray-200 text-slate-600"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Mobile List View */}
        <div className="flex flex-col gap-4">
          {filteredItems.map(item => {
            const qty = getQuantity(item.id);
            return (
              <div 
                key={item.id} 
                className={cn(
                  "bg-white p-3 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 transition-opacity",
                  !item.available && "opacity-60 grayscale"
                )}
              >
                <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-slate-50 relative">
                  <img src={item.imageUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 truncate">{item.name}</h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{item.description}</p>
                  <p className="text-sm font-black text-slate-900 mt-1">₹{item.price}</p>
                </div>
                
                <div className="shrink-0 flex items-center pr-1">
                  {!item.available ? (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded uppercase">Sold Out</span>
                  ) : qty > 0 ? (
                    <div className="flex items-center gap-3 bg-primary-50 rounded-2xl p-1 border border-primary-100">
                      <button onClick={() => handleUpdateCart(item, -1)} className="p-1.5 rounded-xl bg-white shadow-sm text-slate-600 active:scale-90 transition-transform"><Minus className="w-3.5 h-3.5"/></button>
                      <span className="font-bold text-primary-700 w-3 text-center text-sm">{qty}</span>
                      <button onClick={() => handleUpdateCart(item, 1)} className="p-1.5 rounded-xl bg-primary-600 text-white shadow-sm active:scale-90 transition-transform"><Plus className="w-3.5 h-3.5"/></button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleUpdateCart(item, 1)}
                      className="text-xs font-bold text-primary-600 bg-primary-50 px-4 py-2 rounded-2xl active:scale-95 transition-transform"
                    >
                      ADD
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Sticky Cart Bar (Above DockNav) */}
      {cart.length > 0 && (
        <div className="fixed bottom-[88px] left-0 right-0 px-4 z-[45] md:max-w-md md:left-1/2 md:-translate-x-1/2 transform transition-transform">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-slate-900 text-white p-4 rounded-[2rem] shadow-2xl flex items-center justify-between active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div className="text-left flex flex-col">
                <span className="font-bold text-sm">{cart.reduce((a,c)=>a+c.quantity,0)} Items added</span>
                <span className="text-xs text-white/70 font-semibold tracking-wide uppercase">View Cart <ArrowRight className="w-3 h-3 inline ml-1 -mt-0.5" /></span>
              </div>
            </div>
            <div className="text-xl font-black bg-white/10 px-4 py-2 rounded-full">
              ₹{cartTotal}
            </div>
          </button>
        </div>
      )}

      {/* Cart Bottom Sheet */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full md:max-w-md md:mx-auto bg-white rounded-t-[2.5rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom-[100%] duration-300 max-h-[85vh]">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            <div className="px-6 pb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-800">Your Cart</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 hide-scrollbar mb-4">
              {cart.map(c => {
                const itemConfig = items.find(i => i.id === c.id);
                return (
                  <div key={c.id} className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{c.name}</span>
                      <span className="text-slate-500 font-semibold text-sm">₹{c.price}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-1.5 border border-slate-100">
                      <button onClick={() => handleUpdateCart(itemConfig!, -1)} className="p-1.5 rounded-xl bg-white shadow-sm text-slate-600 active:scale-95"><Minus className="w-4 h-4"/></button>
                      <span className="font-bold text-slate-900 w-4 text-center">{c.quantity}</span>
                      <button onClick={() => handleUpdateCart(itemConfig!, 1)} className="p-1.5 rounded-xl bg-slate-800 text-white shadow-sm active:scale-95"><Plus className="w-4 h-4"/></button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 bg-white border-t border-slate-100 pb-8">
              <div className="flex justify-between items-end mb-6">
                <span className="font-bold text-slate-500 uppercase tracking-widest text-xs">Total Amount</span>
                <span className="text-3xl font-black text-slate-900">₹{cartTotal}</span>
              </div>
              <button 
                onClick={() => { setIsCartOpen(false); setIsCheckoutModalOpen(true); }}
                className="w-full bg-primary-600 text-white font-bold py-4 rounded-full shadow-lg shadow-primary-600/30 active:scale-95 transition-transform text-lg"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Bottom Sheet */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCheckoutModalOpen(false)} />
          <div className="relative w-full md:max-w-md md:mx-auto bg-white rounded-t-[2.5rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom-[100%] duration-300 h-[90vh]">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 pb-8 hide-scrollbar">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-slate-800">Checkout</h2>
                <button onClick={() => setIsCheckoutModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="bg-slate-50 rounded-3xl p-5 mb-6 border border-slate-100">
                <div className="flex justify-between items-center mb-1 text-sm font-bold text-slate-500 uppercase tracking-wider">
                  <span>Payable Amount</span>
                  <span>{cart.reduce((a,c)=>a+c.quantity,0)} Items</span>
                </div>
                <div className="text-3xl font-black text-slate-900">₹{cartTotal}</div>
              </div>
              
              <div className="mb-8">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 ml-1">Order For (Name)</label>
                <input 
                  type="text" 
                  value={checkoutName}
                  onChange={(e) => setCheckoutName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all font-semibold"
                  required
                />
              </div>

              {/* Schedule Options */}
              <div className="mb-8">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 ml-1">When do you want your order?</label>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-1.5 rounded-[1.5rem] border border-slate-100">
                  <button 
                    onClick={() => setOrderType('now')}
                    className={cn(
                      "py-3 px-2 rounded-2xl font-bold transition-all text-sm",
                      orderType === 'now' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    🕐 Order Now
                  </button>
                  <button 
                    onClick={() => setOrderType('scheduled')}
                    className={cn(
                      "py-3 px-2 rounded-2xl font-bold transition-all text-sm",
                      orderType === 'scheduled' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    📅 For Later
                  </button>
                </div>
                
                {orderType === 'scheduled' && (
                  <div className="mt-4 bg-purple-50 rounded-3xl p-5 border border-purple-100 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-purple-900 uppercase tracking-widest mb-4 ml-1">Select Pickup Time</label>
                    
                    <AnalogClockPicker 
                      value={scheduledTimeStr} 
                      onChange={setScheduledTimeStr} 
                    />

                    <p className="text-xs font-bold text-purple-600 mt-5 flex items-start gap-2 bg-purple-100/50 p-3 rounded-2xl">
                      <span className="bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded uppercase tracking-wider text-[9px] mt-0.5 shrink-0">Info</span>
                      Your order activates and gets sent to the kitchen 10 mins before this selected time.
                    </p>
                  </div>
                )}
              </div>

              <div className="mb-8">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 ml-1">Payment Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setPaymentMode('Counter')}
                    className={cn(
                      "flex flex-col items-center justify-center p-5 rounded-3xl border-2 transition-all duration-200",
                      paymentMode === 'Counter' ? "border-primary-600 bg-primary-50" : "border-slate-100 hover:border-slate-200 bg-white"
                    )}
                  >
                    <Banknote className={cn("w-8 h-8 mb-3 transition-colors", paymentMode === 'Counter' ? "text-primary-600" : "text-slate-300")} />
                    <span className={cn("font-bold text-sm", paymentMode === 'Counter' ? "text-primary-800" : "text-slate-600")}>At Counter</span>
                  </button>
                  
                  <button 
                    onClick={() => setPaymentMode('Online')}
                    className={cn(
                      "flex flex-col items-center justify-center p-5 rounded-3xl border-2 transition-all duration-200",
                      paymentMode === 'Online' ? "border-primary-600 bg-primary-50" : "border-slate-100 hover:border-slate-200 bg-white"
                    )}
                  >
                    <CreditCard className={cn("w-8 h-8 mb-3 transition-colors", paymentMode === 'Online' ? "text-primary-600" : "text-slate-300")} />
                    <span className={cn("font-bold text-sm", paymentMode === 'Online' ? "text-primary-800" : "text-slate-600")}>Pay Online</span>
                  </button>
                </div>
              </div>

              {paymentMode === 'Online' && !isSimulatedPaymentPaid && (
                <div className="mb-6 animate-in fade-in">
                  <button 
                    onClick={() => setIsSimulatedPaymentPaid(true)}
                    className="w-full bg-blue-100 text-blue-700 py-4 rounded-2xl font-bold tracking-wide active:scale-95 transition-transform"
                  >
                    Test Online Payment
                  </button>
                </div>
              )}
              {paymentMode === 'Online' && isSimulatedPaymentPaid && (
                <div className="mb-6 bg-emerald-50 text-emerald-700 py-4 px-4 rounded-2xl flex items-center justify-center font-bold border border-emerald-100 animate-in zoom-in-95">
                  Payment Successful! ✅
                </div>
              )}

              <button 
                disabled={!paymentMode || (paymentMode === 'Online' && !isSimulatedPaymentPaid) || isPlacingOrder}
                onClick={placeOrder}
                className="w-full bg-slate-900 disabled:opacity-50 disabled:active:scale-100 hover:bg-black text-white font-bold text-xl py-5 rounded-full shadow-2xl active:scale-95 transition-all"
              >
                {isPlacingOrder ? 'Processing...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
