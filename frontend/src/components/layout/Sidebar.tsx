import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  EyeOff,
  Sliders,
  Sparkles,
  History,
  BarChart3,
  Users,
  Settings,
  PlusCircle
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { label: 'Overview', to: '/app', icon: LayoutDashboard, exact: true },
    { label: 'Security Events', to: '/app/events', icon: Activity },
    { label: 'Alert Center', to: '/app/alerts', icon: AlertTriangle },
    { label: 'Privacy Scanner', to: '/app/privacy', icon: EyeOff },
    { label: 'Security Policies', to: '/app/policies', icon: Sliders },
    { label: 'Trust Center', to: '/app/trust', icon: Sparkles },
    { label: 'Audit Logs', to: '/app/audit', icon: History },
    { label: 'Reports', to: '/app/reports', icon: BarChart3 },
    { label: 'Team', to: '/app/members', icon: Users },
    { label: 'Settings', to: '/app/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/40 flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-6">
        {/* Quick Ingest Action */}
        <NavLink
          to="/app/events/ingest"
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition shadow-lg shadow-blue-600/20 group"
        >
          <PlusCircle className="w-4 h-4 text-blue-200 group-hover:rotate-90 transition-transform duration-200" />
          <span>Ingest Events</span>
        </NavLink>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/25 font-semibold shadow-inner'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* AI Trust Badge */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
        <div className="flex items-center space-x-2 text-cyan-400 font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>TrustLayer Verified</span>
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          Privacy-first intelligence. Raw secrets redacted prior to model transit.
        </p>
      </div>
    </aside>
  );
};

