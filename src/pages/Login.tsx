import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Utensils, AlertCircle } from 'lucide-react';
import { seedDatabase } from '../lib/seed';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Parse redirect query param
  const searchParams = new URLSearchParams(window.location.search);
  const redirectParams = searchParams.get('redirect');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let uid = '';
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        uid = cred.user.uid;
        await setDoc(doc(db, 'users', uid), {
          email,
          name,
          role: 'student',
          createdAt: Date.now()
        });
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        uid = cred.user.uid;
      }

      // Check role
      const userDoc = await getDoc(doc(db, 'users', uid));
      const role = userDoc.exists() ? userDoc.data()?.role : 'student';

      if (role === 'manager') {
        navigate('/manager');
      } else {
        if (redirectParams) {
          navigate(redirectParams);
        } else {
          navigate('/menu');
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password Auth is not enabled in Firebase. Please enable it in the console.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Are you sure you have an account?');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Please sign in instead.');
      } else {
        setError(err.message || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
            <Utensils className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome back'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isSignUp ? 'Sign up for a student account' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-start text-sm border border-red-100">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50 focus:bg-white transition-colors"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50 focus:bg-white transition-colors"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="student@demo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50 focus:bg-white transition-colors"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-md shadow-orange-600/20 active:scale-95"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="mt-8 flex flex-col gap-4 text-sm text-center">
          <p className="text-slate-500">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              type="button" 
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="font-bold text-orange-600 hover:text-orange-700 transition-colors"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>

          <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-400">
             <button onClick={() => seedDatabase()} className="hover:text-amber-600 cursor-pointer font-semibold uppercase tracking-wider font-mono">
               Load Seed Data
             </button>
             <span>Demo: manager@demo.com / demo123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
