import React from 'react';
import { AlertSeverity, AlertStatus, Role } from '../../types';

export const SeverityBadge: React.FC<{ severity: AlertSeverity }> = ({ severity }) => {
  const styles: Record<AlertSeverity, string> = {
    critical: 'bg-red-500/10 text-red-400 border-red-500/30',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    informational: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${styles[severity] || styles.informational}`}>
      {severity}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: AlertStatus }> = ({ status }) => {
  const styles: Record<AlertStatus, string> = {
    open: 'bg-red-500/10 text-red-400 border-red-500/30',
    acknowledged: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    investigating: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    false_positive: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  };

  const label = status.replace('_', ' ');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${styles[status] || styles.open}`}>
      {label}
    </span>
  );
};

export const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
  const styles: Record<Role, string> = {
    owner: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    admin: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    analyst: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    viewer: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize border ${styles[role] || styles.viewer}`}>
      {role}
    </span>
  );
};

