import React, { useState } from 'react';
import { UserButton } from '@clerk/clerk-react';
import { useAuth, isClerkEnabled } from '../../contexts/AuthContext';
import { RoleBadge } from '../common/Badge';
import {
  Shield,
  Building2,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Search,
  Check,
  Bell
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, currentOrg, organizations, switchOrganization, logout } = useAuth();
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Brand & Organization Selector */}
      <div className="flex items-center space-x-6">
        <Link to="/app" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:border-blue-400 transition shadow-lg shadow-blue-500/10">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              TrustLayer <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">AI</span>
            </span>
          </div>
        </Link>

        {/* Org Selector */}
        {currentOrg && (
          <div className="relative">
            <button
              onClick={() => setOrgMenuOpen(!orgMenuOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-sm font-medium text-slate-200 transition"
            >
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="max-w-[140px] truncate">{currentOrg.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {orgMenuOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50">
                <div className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Switch Organization
                </div>
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id);
                      setOrgMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-800 transition"
                  >
                    <span className="truncate">{org.name}</span>
                    {org.id === currentOrg.id && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Middle: Global Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events, alerts, rule codes, or policies..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-900/80 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/60 transition"
          />
        </div>
      </div>

      {/* Right: Notifications & User profile */}
      <div className="flex items-center space-x-4">
        <button
          title="Notifications"
          className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
        </button>

        {user && currentOrg && (
          isClerkEnabled ? (
            <div className="flex items-center space-x-3">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">{user.fullName}</div>
                <div className="text-[11px] text-slate-400 capitalize">{currentOrg.role}</div>
              </div>
              <UserButton
                afterSignOutUrl="/login"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 rounded-lg border border-slate-700 shadow-md",
                  }
                }}
              />
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 p-1 rounded-lg hover:bg-slate-900 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
                  {user.fullName.substring(0, 2).toUpperCase()}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">{user.fullName}</div>
                  <div className="text-[11px] text-slate-400 capitalize">{currentOrg.role}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-800/80">
                    <p className="text-xs font-semibold text-slate-200">{user.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <div className="mt-2">
                      <RoleBadge role={currentOrg.role} />
                    </div>
                  </div>
                  <Link
                    to="/app/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>Profile & Settings</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </header>
  );
};

