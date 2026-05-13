import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import DockNav from './DockNav';
import TopBar from './TopBar';
import { useAuth } from '../lib/auth';
import { collection, query, where, onSnapshot, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bell } from 'lucide-react';

interface NotificationInfo {
  title: string;
  message: string;
  time: number;
}

interface NotificationContextType {
  notifications: NotificationInfo[];
  unreadCount: number;
  markAllRead: () => void;
  showNotification: (title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  showNotification: () => {}
});

export const useNotifications = () => useContext(NotificationContext);

export default function StudentLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const isSetupOrAuth = ['/login', '/manager'].some(p => location.pathname.startsWith(p));
  const isHomePage = location.pathname === '/';
  
  const [toastNotification, setToastNotification] = useState<{title: string, message: string} | null>(null);
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousStatuses = useRef<Record<string, string>>({});

  const showNotification = (title: string, message: string) => {
    setNotifications(prev => [{title, message, time: Date.now()}, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    setToastNotification({ title, message });
    setTimeout(() => {
      setToastNotification(null);
    }, 5000);
  };

  const markAllRead = () => setUnreadCount(0);

  // Listen to order status changes, including scheduled
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.id),
      where('status', 'in', ['Scheduled', 'Placed', 'Preparing', 'Ready'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const docId = change.doc.id;
        
        if (change.type === 'modified') {
          const oldStatus = previousStatuses.current[docId];
          const newStatus = data.status;
          
          if (oldStatus === 'Scheduled' && newStatus === 'Placed') {
            const timeStr = new Date(data.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            showNotification('Order Activated ✅', `Your scheduled order ${data.orderNumber} is now in the queue! Pickup at ${timeStr}`);
          } else if (oldStatus === 'Placed' && newStatus === 'Preparing') {
            showNotification('Order Preparing! 🍳', `Your order ${data.orderNumber} is now being prepared.`);
          } else if (oldStatus === 'Preparing' && newStatus === 'Ready') {
            showNotification('Order Ready! 🎉', `Your order ${data.orderNumber} is ready for pickup! Come to the counter now 🔔`);
          }
        }
        
        previousStatuses.current[docId] = data.status;
      });
    });

    return () => unsubscribe();
  }, [user]);

  // Scheduled order auto-activation
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const q = query(
        collection(db, 'orders'),
        where('customerId', '==', user.id),
        where('status', '==', 'Scheduled')
      );
      try {
        const snap = await getDocs(q);
        const now = Date.now();
        snap.forEach(async (d) => {
          const data = d.data();
          if (data.scheduledTime && now >= data.scheduledTime - 10 * 60 * 1000) {
            await updateDoc(doc(db, 'orders', d.id), { status: 'Placed' });
          }
        });
      } catch (err) {
        console.error('Error auto-activating orders', err);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user]);

  if (isSetupOrAuth || isHomePage) {
    return <Outlet />;
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, showNotification }}>
      <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 pb-32 pt-16">
        <TopBar />
        <Outlet />
        <DockNav />
        
        {/* Global Toast Notification */}
        {toastNotification && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 fade-in duration-300 w-[90%] max-w-sm">
            <div className="bg-white border-l-4 border-primary-500 rounded-r-2xl rounded-l flex items-start p-4 shadow-xl shadow-primary-500/10">
              <div className="bg-primary-50 p-2 rounded-full mr-3 text-primary-600">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 text-sm">{toastNotification.title}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{toastNotification.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </NotificationContext.Provider>
  );
}
