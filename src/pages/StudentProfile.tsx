import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogOut, User, Mail, Shield, Bell } from 'lucide-react';
import { cn } from '../lib/utils';

export default function StudentProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex items-center shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">Profile</h1>
      </header>

      <main className="max-w-md mx-auto p-4 pt-6 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-4xl font-bold uppercase shadow-inner mb-4">
            {user?.name?.[0] || 'U'}
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{user?.name}</h2>
          <p className="text-sm font-medium text-primary-600 mt-1 uppercase tracking-widest bg-primary-50 px-3 py-1 rounded-full inline-block">
            {user?.role}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex items-center gap-4">
            <div className="bg-slate-50 p-3 rounded-2xl text-slate-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
              <p className="font-semibold text-slate-700">{user?.email}</p>
            </div>
          </div>
          
          <div className="p-4 border-b border-slate-50 flex items-center gap-4">
            <div className="bg-slate-50 p-3 rounded-2xl text-slate-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</p>
              <p className="font-semibold text-slate-700">{user?.name}</p>
            </div>
          </div>
          
          <div className="p-4 flex items-center gap-4 opacity-50 border-b border-slate-50">
            <div className="bg-slate-50 p-3 rounded-2xl text-slate-400">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notifications</p>
              <p className="font-semibold text-slate-700">Push Enabled</p>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/orders')}
            className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
          >
            <div className="bg-primary-50 p-3 rounded-2xl text-primary-600">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">History</p>
              <p className="font-semibold text-slate-700">View Past Orders</p>
            </div>
          </button>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-2xl transition-colors active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          Sign Out Securely
        </button>
      </main>
    </div>
  );
}
