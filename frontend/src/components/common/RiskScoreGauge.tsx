import React from 'react';

interface RiskScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskScoreGauge: React.FC<RiskScoreGaugeProps> = ({ score, size = 'md' }) => {
  let color = 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  let barColor = 'bg-slate-400';
  let label = 'Informational';

  if (score >= 90) {
    color = 'text-red-400 bg-red-500/10 border-red-500/30';
    barColor = 'bg-red-500';
    label = 'Critical';
  } else if (score >= 75) {
    color = 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    barColor = 'bg-orange-500';
    label = 'High';
  } else if (score >= 50) {
    color = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    barColor = 'bg-amber-500';
    label = 'Medium';
  } else if (score >= 25) {
    color = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    barColor = 'bg-blue-500';
    label = 'Low';
  }

  if (size === 'sm') {
    return (
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${color}`}>
          {score}
        </span>
        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full ${barColor}`} style={{ width: `${score}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border ${color} flex flex-col justify-between`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Risk Score</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-900/60">
          {label}
        </span>
      </div>
      <div className="flex items-baseline space-x-2 mb-3">
        <span className="text-3xl font-black font-mono tracking-tight">{score}</span>
        <span className="text-sm text-slate-500 font-mono">/ 100</span>
      </div>
      <div className="w-full h-2 bg-slate-900/80 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
};

