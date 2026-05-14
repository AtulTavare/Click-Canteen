import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CanteenSettings } from '../lib/types';
import { Clock, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const DEFAULT_SETTINGS: CanteenSettings = {
  openTime: '09:00',
  closeTime: '17:00',
  activeDays: {
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  }
};

export default function CanteenTimingCard() {
  const [settings, setSettings] = useState<CanteenSettings | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [openTime, setOpenTime] = useState(DEFAULT_SETTINGS.openTime);
  const [closeTime, setCloseTime] = useState(DEFAULT_SETTINGS.closeTime);
  const [activeDays, setActiveDays] = useState(DEFAULT_SETTINGS.activeDays);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'canteen'), (snap) => {
       if (snap.exists()) {
           const data = snap.data() as CanteenSettings;
           setSettings(data);
           if (!isEditing) {
             setOpenTime(data.openTime || DEFAULT_SETTINGS.openTime);
             setCloseTime(data.closeTime || DEFAULT_SETTINGS.closeTime);
             setActiveDays(data.activeDays || DEFAULT_SETTINGS.activeDays);
           }
       } else {
           setSettings(DEFAULT_SETTINGS);
       }
       setLoading(false);
    });
    return () => unsub();
  }, [isEditing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'canteen'), {
        openTime,
        closeTime,
        activeDays
      });
      setIsEditing(false);
    } catch(err) {
      console.error("Failed to save times", err);
      alert('Failed to save settings.');
    }
    setSaving(false);
  };

  const handleCancel = () => {
    if (settings) {
      setOpenTime(settings.openTime);
      setCloseTime(settings.closeTime);
      setActiveDays(settings.activeDays);
    }
    setIsEditing(false);
  };

  const isCanteenOpen = () => {
    if (!settings) return false;
    const now = new Date();
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDayStr = dayMap[now.getDay()] as keyof typeof settings.activeDays;
    
    if (!settings.activeDays[currentDayStr]) return false;

    const [openH, openM] = settings.openTime.split(':').map(Number);
    const [closeH, closeM] = settings.closeTime.split(':').map(Number);
    
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    return currentMins >= openMins && currentMins <= closeMins;
  };

  if (loading) {
    return (
      <div className="col-span-1 border-slate-100 bg-white sm:col-span-12 p-6 rounded-3xl border shadow-sm flex items-center justify-center min-h-[150px]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  const daysList = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' },
  ];

  const toggleDay = (key: keyof typeof activeDays) => {
    setActiveDays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isOpenNow = isCanteenOpen();

  return (
    <div className="col-span-1 border-slate-100 bg-white sm:col-span-12 p-6 rounded-3xl border shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 tracking-tight">
            <Clock className="w-5 h-5 text-indigo-500" />
            Canteen Timing & Days
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">Control order acceptance availability globally.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className={cn(
             "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
             isOpenNow ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"
           )}>
              {isOpenNow ? 'Open Now' : 'Closed'}
           </div>
           {!isEditing ? (
             <button onClick={() => setIsEditing(true)} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl transition-all">
               Edit
             </button>
           ) : (
             <div className="flex gap-2">
               <button onClick={handleCancel} className="text-sm font-bold text-slate-600 hover:text-slate-700 bg-slate-100 px-4 py-2 rounded-xl transition-all">
                 Cancel
               </button>
               <button onClick={handleSave} disabled={saving} className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-all flex items-center">
                 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
               </button>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Time Settings */}
        <div>
           <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Operating Hours</p>
           <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                 <input 
                   title="Open Time"
                   type="time" 
                   value={openTime} 
                   onChange={(e) => setOpenTime(e.target.value)}
                   disabled={!isEditing}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-slate-800 disabled:opacity-60 disabled:bg-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                 />
              </div>
              <span className="font-bold text-slate-300">TO</span>
              <div className="flex-1 text-center">
                 <input 
                   title="Close Time"
                   type="time" 
                   value={closeTime} 
                   onChange={(e) => setCloseTime(e.target.value)}
                   disabled={!isEditing}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-slate-800 disabled:opacity-60 disabled:bg-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                 />
              </div>
           </div>
        </div>

        {/* Days Settings */}
        <div>
           <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Active Days</p>
           <div className="flex items-center gap-2 flex-wrap">
              {daysList.map(day => (
                 <button 
                   key={day.key}
                   disabled={!isEditing}
                   onClick={() => toggleDay(day.key as keyof typeof activeDays)}
                   className={cn(
                     "flex-1 min-w-[40px] px-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all",
                     activeDays[day.key as keyof typeof activeDays] 
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm" 
                        : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100",
                     !isEditing && "cursor-default opacity-80"
                   )}
                 >
                   {day.label}
                 </button>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
