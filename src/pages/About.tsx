import React from 'react';
import { Info, Code, Heart, Coffee, Shield } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex items-center shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">About CanteenGo</h1>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">By Students, For Students.</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            CanteenGo was built to solve the everyday hassle of long queues and waiting times at the college canteen. 
            We wanted a seamless, fast, and digital way to grab our meals so we can focus on what matters.
          </p>
        </div>

        <div className="space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl shrink-0">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Modern Tech Stack</h3>
              <p className="text-xs text-slate-500 mt-1">Built with React, Firebase, and Tailwind CSS for real-time order tracking and instantaneous updates.</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="bg-amber-50 text-amber-600 p-2 rounded-xl shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Save Time</h3>
              <p className="text-xs text-slate-500 mt-1">Scan the table QR code, order right from your seat, and only go to the counter when your food is ready.</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Secure & Reliable</h3>
              <p className="text-xs text-slate-500 mt-1">Your data is safe, authentication is robust, and our infrastructure scales to handle rush hours.</p>
            </div>
          </div>
        </div>

        <div className="text-center pt-8 opacity-60">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Version 1.0.0</p>
          <p className="text-xs text-slate-400 mt-1">© 2026 CanteenGo Team</p>
        </div>
      </main>
    </div>
  );
}
