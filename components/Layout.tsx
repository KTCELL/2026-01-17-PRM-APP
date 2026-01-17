
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Search, Inbox, Mic } from 'lucide-react';
import QuickCapture from './QuickCapture';

export default function Layout() {
  const location = useLocation();

  const NavItem = ({ to, icon: Icon, label }: any) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
          isActive ? 'text-indigo-400 bg-indigo-950/30' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Icon size={24} />
        <span className="text-[10px] font-medium mt-1">{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 h-14 flex items-center justify-between">
        <div className="font-bold text-lg tracking-tight flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"/>
            Cortex
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Floating Action Button (Quick Capture) */}
      <QuickCapture />

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 h-20 pb-6 px-6 flex justify-between items-center z-40">
        <NavItem to="/" icon={LayoutDashboard} label="Home" />
        <NavItem to="/search" icon={Search} label="Search" />
        <NavItem to="/debrief" icon={Inbox} label="Review" />
      </nav>
    </div>
  );
}
