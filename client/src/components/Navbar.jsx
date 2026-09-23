import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  UtensilsCrossed,
  ShoppingBag,
  Clock,
  LayoutDashboard,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export const Navbar = ({ onOpenAuthModal }) => {
  const { user, isStaff, isAuthenticated, logout, loginAsDemo } = useAuth();
  const { totalCount, setIsCartOpen } = useCart();
  const location = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleDemoSwitch = async (role) => {
    setSwitching(true);
    try {
      await loginAsDemo(role);
      setIsUserMenuOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/85 border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo & Tagline */}
        <Link to="/" className="flex items-center gap-3.5 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform duration-300">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight font-display bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
                CaféFlow
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300">
                PS62
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Your Food. Your Time. Your Way.
            </p>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80">
          <Link
            to="/"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              location.pathname === '/'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            Menu
          </Link>

          {isAuthenticated && (
            <Link
              to="/my-orders"
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                location.pathname === '/my-orders'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-4 h-4" />
              My Orders
            </Link>
          )}

          {isStaff && (
            <Link
              to="/staff"
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                location.pathname.startsWith('/staff')
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Staff Command
            </Link>
          )}
        </nav>

        {/* Right Action Items */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Switcher Pill: Customer, Staff */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-2 py-1 rounded-xl">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 pl-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Demo:
            </span>
            <button
              onClick={() => handleDemoSwitch('customer')}
              disabled={switching}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                isAuthenticated && !isStaff
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Demo Customer (customer@cafeflow.com)"
            >
              Customer
            </button>
            <button
              onClick={() => handleDemoSwitch('staff')}
              disabled={switching}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                isStaff
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Cafeteria Staff (staff@cafeflow.com)"
            >
              Staff
            </button>
          </div>

          {/* Cart Drawer Trigger Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white transition-all duration-200 flex items-center gap-2 shadow-sm"
            aria-label="Open Cart"
          >
            <ShoppingBag className="w-5 h-5 text-brand-400" />
            <span className="text-xs font-bold hidden sm:inline text-slate-300">Tray</span>
            {totalCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-brand-500 to-amber-500 text-white text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/40 animate-pulse">
                {totalCount}
              </span>
            )}
          </button>

          {/* User Profile or Login Trigger */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-sm font-medium transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-200 truncate max-w-[110px]">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize">{user.role}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300">
                      Account: {user.role}
                    </span>
                  </div>

                  <Link
                    to="/my-orders"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                  >
                    <Clock className="w-4 h-4 text-brand-400" />
                    My Pre-Orders
                  </Link>

                  {isStaff && (
                    <Link
                      to="/staff"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-amber-400" />
                      Staff Command Center
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full mt-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-500/25 transition-all flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
