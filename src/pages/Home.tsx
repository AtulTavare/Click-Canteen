import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Utensils, UtensilsCrossed, Clock, CheckCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Banner } from '../lib/types';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth';

export default function Home() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isHoveringBanner, setIsHoveringBanner] = useState(false);
  const [showMoodPopup, setShowMoodPopup] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.role === 'manager') navigate('/manager');
      else navigate('/menu');
    }
  }, [user, navigate]);

  useEffect(() => {
    async function loadBanners() {
      const q = query(collection(db, 'banners'), where('active', '==', true));
      const snap = await getDocs(q);
      const b: Banner[] = [];
      snap.forEach(doc => b.push({ id: doc.id, ...doc.data() } as Banner));
      setBanners(b);
    }
    loadBanners();
  }, []);

  useEffect(() => {
    if (!isHoveringBanner && banners.length > 1) {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [isHoveringBanner, banners.length]);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastSeen = localStorage.getItem('moodPopupSeen');
    if (lastSeen !== today) {
      const timer = setTimeout(() => setShowMoodPopup(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleMoodSelect = (msg: string) => {
    setShowMoodPopup(false);
    localStorage.setItem('moodPopupSeen', new Date().toDateString());
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center">
            <Utensils className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">CanteenGo</span>
        </div>
        <Link 
          to="/login" 
          className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-full px-4 py-2 hover:bg-gray-50 transition-colors"
        >
          Manager Login
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center pt-24 px-6 text-center">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 leading-tight max-w-3xl">
          Order food without <br className="hidden md:block"/> 
          <span className="text-primary-600">waiting in line.</span>
        </h1>
        <p className="mt-6 text-xl text-gray-500 max-w-xl">
          Skip the queue. Scan the QR at your table or order directly. Grab your meal when it's hot and ready.
        </p>
        <Link 
          to="/menu"
          className="mt-10 bg-primary-600 hover:bg-primary-700 text-white text-lg font-medium py-4 px-10 rounded-full shadow-lg shadow-primary-600/30 transition-transform active:scale-95"
        >
          Order Now
        </Link>

        {/* Feature Highlights */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-50">
            <UtensilsCrossed className="w-8 h-8 text-primary-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Order from your table</h3>
          </div>
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-50">
            <Clock className="w-8 h-8 text-primary-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Track your order live</h3>
          </div>
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gray-50">
            <CheckCircle className="w-8 h-8 text-primary-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Quick counter pickup</h3>
          </div>
        </div>

        {/* Banners */}
        {banners.length > 0 && (
          <div 
            className="mt-24 mb-12 w-full max-w-4xl relative rounded-3xl overflow-hidden shadow-2xl shadow-gray-200/50 group"
            onMouseEnter={() => setIsHoveringBanner(true)}
            onMouseLeave={() => setIsHoveringBanner(false)}
          >
            <div 
              className="flex transition-transform duration-700 ease-out h-[300px]"
              style={{ transform: `translateX(-${currentBanner * 100}%)`}}
            >
              {banners.map((b) => (
                <div key={b.id} className="min-w-full h-full relative">
                  <img src={b.imageUrl} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent flex flex-col justify-center px-12">
                    <h3 className="text-3xl font-bold text-white mb-2">{b.title}</h3>
                    <p className="text-lg text-gray-200 max-w-md">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentBanner(i)}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all",
                    currentBanner === i ? "bg-white w-8" : "bg-white/50 hover:bg-white/80"
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-400 text-sm border-t border-gray-100">
        <p>CanteenGo &copy; {new Date().getFullYear()} — Quick counter pickup without the queue.</p>
      </footer>

      {/* Mood Popup */}
      {showMoodPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 relative">
            <button 
              onClick={() => setShowMoodPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              &times;
            </button>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Hey! How's your day going? 😊</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: '😄', label: 'Awesome', msg: 'Love that energy! Treat yourself today 🎉' },
                { emoji: '😊', label: 'Nice', msg: 'Good to hear! Enjoy your meal 😊' },
                { emoji: '😎', label: 'Cool', msg: 'Staying cool! Grab something refreshing 😎' },
                { emoji: '😐', label: 'As Usual', msg: 'Consistency is key! Usual order? 😄' },
                { emoji: '🙂', label: 'Nothing Different', msg: 'A good meal might change that 🍱' },
                { emoji: '😴', label: 'Tired', msg: 'You deserve a break and a hot meal 💪' },
              ].map(mood => (
                <button
                  key={mood.label}
                  onClick={() => handleMoodSelect(mood.msg)}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-primary-50 hover:border-primary-200 transition-colors"
                >
                  <span className="text-3xl mb-2">{mood.emoji}</span>
                  <span className="text-sm font-medium text-gray-700">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-xl animate-in slide-in-from-bottom-5 fade-in duration-300">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
