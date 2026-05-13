import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Home from './pages/Home';
import Login from './pages/Login';
import Menu from './pages/StudentMenu';
import OrderStatus from './pages/OrderStatus';
import StudentProfile from './pages/StudentProfile';
import ManagerDashboard from './pages/ManagerDashboard';
import { Loader2 } from 'lucide-react';
import StudentLayout from './components/StudentLayout';
import Categories from './pages/Categories';
import StudentOrders from './pages/StudentOrders';
import About from './pages/About';

function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: 'student' | 'manager' }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'manager' ? '/manager' : '/menu'} replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          
          <Route element={<StudentLayout />}>
            <Route path="/menu" element={<Menu />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/orders" element={
              <ProtectedRoute role="student">
                <StudentOrders />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute role="student">
                <StudentProfile />
              </ProtectedRoute>
            } />
            <Route path="/about" element={<About />} />
            <Route path="/status/:orderId" element={
              <ProtectedRoute role="student">
                <OrderStatus />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="/manager/*" element={
            <ProtectedRoute role="manager">
              <ManagerDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
