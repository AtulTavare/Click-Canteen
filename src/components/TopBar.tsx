import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from './StudentLayout'; // we will export context

export default function TopBar() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);

  const togglePanel = () => {
    if (!panelOpen) markAllRead();
    setPanelOpen(!panelOpen);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">CanteenGo</h1>
        <button 
          onClick={togglePanel}
          className="relative p-2 -mr-2 text-slate-600 hover:text-primary-600 transition-colors"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </button>
      </header>

      {/* Notifications Panel overlay */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex flex-col pointer-events-none">
          <div className="flex-1" onClick={() => setPanelOpen(false)} />
          <div className="w-full bg-white shadow-2xl rounded-b-3xl absolute top-0 pt-16 pb-6 pointer-events-auto border-b border-slate-100 animate-in slide-in-from-top-10 duration-300">
            <div className="px-6 flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Notifications</h2>
              <button onClick={() => setPanelOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto px-6 space-y-3">
              {notifications.length === 0 ? (
                <p className="text-slate-400 text-sm py-4 text-center">No notifications yet.</p>
              ) : (
                notifications.map((notif, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-2xl flex gap-3">
                    <div className="bg-primary-50 text-primary-600 p-2 rounded-xl h-10 w-10 flex shrink-0 items-center justify-center">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{notif.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 mt-2">{new Date(notif.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
