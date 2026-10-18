import React from 'react';

interface TrustMeterProps {
  score: number;
  label?: string;
  isInsufficient?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
}

export function TrustMeter({
  score,
  label = 'AUTHENTICITY CONFIDENCE',
  isInsufficient = false,
  size = 'md',
  showBreakdown = false,
}: TrustMeterProps) {
  // Clamped score
  const safeScore = Math.min(100, Math.max(0, Math.round(score)));

  // Color selection
  let toneColor = '#10b981'; // Green (80 - 100)
  let statusText = 'Authentic Confidence High';
  let badgeTone = 'green';

  if (isInsufficient) {
    toneColor = '#94a3b8'; // Slate
    statusText = 'Insufficient Data';
    badgeTone = 'gray';
  } else if (safeScore < 50) {
    toneColor = '#ef4444'; // Red (0 - 49)
    statusText = 'Elevated Suspicion';
    badgeTone = 'red';
  } else if (safeScore < 80) {
    toneColor = '#f59e0b'; // Amber (50 - 79)
    statusText = 'Caution / Needs Review';
    badgeTone = 'amber';
  }

  const dimensions =
    size === 'sm' ? { width: 110, stroke: 7, text: 'text-2xl' } :
    size === 'lg' ? { width: 170, stroke: 11, text: 'text-4xl' } :
    { width: 140, stroke: 9, text: 'text-3xl' };

  const radius = (dimensions.width - dimensions.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  return (
    <div className={`flex flex-col items-center flex-shrink-0 ${showBreakdown ? 'w-full max-w-[260px]' : ''}`}>
      <div className="relative flex items-center justify-center" style={{ width: dimensions.width, height: dimensions.width }}>
        <svg
          width={dimensions.width}
          height={dimensions.width}
          className="transform -rotate-90"
          aria-label={`Trust Meter: ${safeScore} out of 100`}
        >
          {/* Background Track */}
          <circle
            cx={dimensions.width / 2}
            cy={dimensions.width / 2}
            r={radius}
            stroke="#1e293b"
            strokeWidth={dimensions.stroke}
            fill="transparent"
          />
          {/* Active Gradient Arc */}
          <circle
            cx={dimensions.width / 2}
            cy={dimensions.width / 2}
            r={radius}
            stroke={toneColor}
            strokeWidth={dimensions.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={isInsufficient ? circumference * 0.6 : strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease',
              filter: `drop-shadow(0 0 6px ${toneColor}66)`,
            }}
          />
        </svg>

        {/* Inner Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={`font-mono font-bold tracking-tight ${dimensions.text}`}
            style={{ color: toneColor }}
          >
            {isInsufficient ? '—' : safeScore}
          </span>
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
            {isInsufficient ? 'N/A' : '/ 100'}
          </span>
        </div>
      </div>

      <div className="mt-2 text-center">
        <div className="text-[10px] font-mono font-semibold tracking-wider text-slate-300 uppercase">
          {label}
        </div>
        <div className="mt-1 flex items-center justify-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: toneColor, boxShadow: `0 0 8px ${toneColor}` }}
          />
          <span className="text-[10px] font-medium text-slate-300">
            {statusText}
          </span>
        </div>
      </div>

      {showBreakdown && (
        <div className="w-full mt-3 space-y-2 pt-2.5 border-t border-slate-800 text-xs">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>Video Signals (25%)</span>
            <span className="text-slate-200">{isInsufficient ? '—' : `${Math.round(safeScore * 0.95)}%`}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: isInsufficient ? '20%' : `${safeScore * 0.95}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>Audio Spectral (25%)</span>
            <span className="text-slate-200">{isInsufficient ? '—' : `${Math.round(safeScore * 0.88)}%`}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-400 h-full rounded-full transition-all duration-500"
              style={{ width: isInsufficient ? '20%' : `${safeScore * 0.88}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>Context / Heuristics (30%)</span>
            <span className="text-slate-200">{isInsufficient ? '—' : `${safeScore}%`}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: isInsufficient ? '20%' : `${safeScore}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>Identity Baseline (20%)</span>
            <span className="text-slate-400">Unenrolled</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-slate-600 h-full rounded-full" style={{ width: '0%' }} />
          </div>
        </div>
      )}
    </div>
  );
}
