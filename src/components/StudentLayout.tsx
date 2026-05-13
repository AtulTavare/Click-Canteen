import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import DockNav from './DockNav';
import { useAuth } from '../lib/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bell } from 'lucide-react';

export default function StudentLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const isSetupOrAuth = ['/login', '/manager'].some(p => location.pathname.startsWith(p));
  const isHomePage = location.pathname === '/';
  
  const [notification, setNotification] = useState<{title: string, message: string} | null>(null);
  const previousStatuses = useRef<Record<string, string>>({});

  // Listen to order status changes to show alert!
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.id),
      where('status', 'in', ['Placed', 'Preparing', 'Ready'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const docId = change.doc.id;
        
        if (change.type === 'modified') {
          const oldStatus = previousStatuses.current[docId];
          const newStatus = data.status;
          
          if (oldStatus === 'Placed' && newStatus === 'Preparing') {
            showNotification('Order Preparing! 🍳', `Your order #${data.orderNumber} is now being prepared.`);
          } else if (oldStatus === 'Preparing' && newStatus === 'Ready') {
            showNotification('Order Ready! 🎉', `Your order #${data.orderNumber} is ready for collection!`);
          }
        }
        
        previousStatuses.current[docId] = data.status;
      });
    });

    return () => unsubscribe();
  }, [user]);

  const showNotification = (title: string, message: string) => {
    setNotification({ title, message });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  if (isSetupOrAuth || isHomePage) {
    return <Outlet />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <Outlet />
      <DockNav />
      
      {/* Global Notification */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300 w-[90%] max-w-sm">
          <div className="bg-white border-l-4 border-primary-500 rounded-r-2xl rounded-l flex items-start p-4 shadow-xl shadow-primary-500/10">
            <div className="bg-primary-50 p-2 rounded-full mr-3 text-primary-600">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800 text-sm">{notification.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{notification.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
