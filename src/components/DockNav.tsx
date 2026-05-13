import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Grid, Clock, User, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export default function DockNav() {
  const location = useLocation();

  const links = [
    { name: 'Menu', path: '/menu', icon: <Home className="w-6 h-6" /> },
    { name: 'Categories', path: '/categories', icon: <Grid className="w-6 h-6" /> },
    { name: 'Orders', path: '/orders', icon: <Clock className="w-6 h-6" /> },
    { name: 'Profile', path: '/profile', icon: <User className="w-6 h-6" /> },
    { name: 'About', path: '/about', icon: <Info className="w-6 h-6" /> }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2 bg-gradient-to-t from-slate-100 to-transparent pointer-events-none md:flex md:justify-center">
      <nav className="bg-white/90 backdrop-blur-md shadow-lg shadow-slate-200/50 border border-slate-100 rounded-3xl p-2 flex justify-between items-center pointer-events-auto md:w-[400px]">
        {links.map((link) => {
          const isActive = location.pathname.startsWith(link.path);
          return (
            <NavLink
              key={link.name}
              to={link.path}
              className={cn(
                "flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 relative",
                isActive ? "text-primary-600 scale-110" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              {isActive && (
                <span className="absolute inset-0 bg-primary-50 rounded-2xl -z-10 animate-in zoom-in fade-in duration-300"></span>
              )}
              {React.cloneElement(link.icon, { 
                className: cn("w-5 h-5 mb-0.5 transition-transform duration-300", isActive && "stroke-[2.5px]") 
              })}
              <span className={cn(
                "text-[10px] font-bold tracking-tight transition-all duration-300",
                isActive ? "opacity-100" : "opacity-0 translate-y-1 md:opacity-100 md:translate-y-0 md:font-medium"
              )}>
                {link.name}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
