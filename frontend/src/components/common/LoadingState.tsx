import React from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading security data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
      <p className="text-sm text-slate-400 font-medium tracking-wide">{message}</p>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full space-y-3 animate-pulse">
      <div className="h-10 bg-slate-800/60 rounded-lg w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-900/60 border border-slate-800/40 rounded-lg w-full" />
      ))}
    </div>
  );
};

export const ErrorCard: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = 'Data Loading Failed',
  message = 'Failed to load telemetry or report data from the backend service.',
  onRetry,
}) => {
  return (
    <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto my-12">
      <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-base font-bold text-white mb-1">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          type="button"
          className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-red-600/20 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};
