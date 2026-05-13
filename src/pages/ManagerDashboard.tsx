import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, BarChart3, Menu as MenuIcon, Users, LogOut, BellRing } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import ManagerOverview from '../components/ManagerOverview';
import ManagerOrders from '../components/ManagerOrders';
import ManagerAnalytics from '../components/ManagerAnalytics';
import ManagerMenu from '../components/ManagerMenu';
import ManagerAccounts from '../components/ManagerAccounts';

export default function ManagerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Global listener for new pending orders to show badge
    const q = query(
      collection(db, 'orders'), 
      where('status', 'in', ['Placed', 'Preparing'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setPendingCount(snap.docs.length);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const navItems = [
    { name: 'Overview', path: '/manager', icon: <LayoutDashboard className="w-5 h-5"/>, exact: true },
    { name: 'Orders', path: '/manager/orders', icon: <ReceiptText className="w-5 h-5"/> },
    { name: 'Analytics', path: '/manager/analytics', icon: <BarChart3 className="w-5 h-5"/> },
    { name: 'Menu', path: '/manager/menu', icon: <MenuIcon className="w-5 h-5"/> },
    { name: 'Accounts', path: '/manager/accounts', icon: <Users className="w-5 h-5"/> },
  ];

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 shrink-0 h-full flex flex-col z-20 hidden md:flex">
        <div className="p-8 flex items-center gap-3 border-b-0">
          <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center font-bold">
            C
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">CanteenGo</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            return (
              <Link 
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors",
                  isActive ? "bg-primary-50 text-primary-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                )}
              >
                <div className="flex items-center gap-3">
                  {React.cloneElement(item.icon as React.ReactElement, { className: "w-5 h-5 opacity-80" })}
                  {item.name}
                </div>
                {item.name === 'Overview' && pendingCount > 0 && (
                  <span className="flex h-2 w-2 rounded-full bg-primary-500 animate-pulse"></span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-6 border-t border-slate-100 mt-auto">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl transition-colors font-medium"
          >
            <LogOut className="w-5 h-5 opacity-80" />
            <div className="text-left flex-1">
              <p className="text-sm font-semibold">Logout</p>
              <p className="text-xs text-slate-500">Goodbye!</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-slate-200 p-4 shrink-0 flex items-center justify-between">
          <span className="font-bold text-xl tracking-tight">Manager</span>
          <button onClick={handleLogout} className="p-2 text-slate-500 bg-slate-50 rounded-full"><LogOut className="w-5 h-5"/></button>
        </div>

        <div className="flex-1 overflow-y-auto w-full">
          <Routes>
            <Route path="/" element={<ManagerOverview />} />
            <Route path="/orders" element={<ManagerOrders />} />
            <Route path="/analytics" element={<ManagerAnalytics />} />
            <Route path="/menu/*" element={<ManagerMenu />} />
            <Route path="/accounts" element={<ManagerAccounts />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
