import React, { useState, useEffect } from 'react';
import { Clock, Zap, Flame, AlertCircle } from 'lucide-react';

export interface DiscountCountdownProps {
  targetDate?: string | null;
  variant?: 'badge' | 'card' | 'full' | 'inline';
  label?: string;
  showExpiredMessage?: boolean;
  className?: string;
  urgentThresholdHours?: number; // default 24
}

interface TimeRemaining {
  days: number;
  hours: number;
  mins: number;
  secs: number;
  totalMs: number;
  isExpired: boolean;
  isValid: boolean;
}

function calculateTimeRemaining(targetDateStr?: string | null): TimeRemaining {
  if (!targetDateStr) {
    return { days: 0, hours: 0, mins: 0, secs: 0, totalMs: 0, isExpired: true, isValid: false };
  }

  const target = new Date(targetDateStr).getTime();
  if (isNaN(target)) {
    return { days: 0, hours: 0, mins: 0, secs: 0, totalMs: 0, isExpired: true, isValid: false };
  }

  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, mins: 0, secs: 0, totalMs: 0, isExpired: true, isValid: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / 1000 / 60) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  return { days, hours, mins, secs, totalMs: diff, isExpired: false, isValid: true };
}

export const DiscountCountdown: React.FC<DiscountCountdownProps> = ({
  targetDate,
  variant = 'full',
  label = 'Offer Ends In',
  showExpiredMessage = false,
  className = '',
  urgentThresholdHours = 24,
}) => {
  const [time, setTime] = useState<TimeRemaining>(() => calculateTimeRemaining(targetDate));

  useEffect(() => {
    // Initial check
    setTime(calculateTimeRemaining(targetDate));

    if (!targetDate) return;

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(targetDate);
      setTime(remaining);
      if (remaining.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!time.isValid) {
    return null;
  }

  if (time.isExpired) {
    if (!showExpiredMessage) return null;
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-400 text-xs font-semibold ${className}`}>
        <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
        <span>Offer Expired</span>
      </div>
    );
  }

  const isUrgent = time.totalMs < urgentThresholdHours * 60 * 60 * 1000;
  const pad = (n: number) => String(n).padStart(2, '0');

  // Compact Inline Badge (used inside product cards, pills, or headers)
  if (variant === 'badge' || variant === 'inline') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-black tracking-tight border transition-colors ${
          isUrgent
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse'
            : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
        } ${className}`}
        title={`Offer expires: ${new Date(targetDate || '').toLocaleString()}`}
      >
        {isUrgent ? (
          <Flame className="w-3 h-3 text-rose-500 shrink-0" />
        ) : (
          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
        )}
        <span className="font-sans font-bold text-[10px] uppercase opacity-80">{label}:</span>
        <span className="tabular-nums">
          {time.days > 0 ? `${time.days}d ` : ''}
          {pad(time.hours)}h:{pad(time.mins)}m:{pad(time.secs)}s
        </span>
      </div>
    );
  }

  // Card Variant (sleek 4-box layout suited for product cards or quick modals)
  if (variant === 'card') {
    return (
      <div className={`p-2.5 rounded-xl border bg-slate-900/90 text-white shadow-md border-amber-500/30 ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-400">
            <Zap className="w-3 h-3 fill-amber-400" />
            <span>{label}</span>
          </div>
          {isUrgent && (
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-600/80 text-white animate-pulse">
              Urgent
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1 text-center font-mono">
          <div className="bg-slate-800/90 rounded-md py-1 px-0.5 border border-slate-700/50">
            <span className="block text-xs font-black text-amber-400 leading-none">{pad(time.days)}</span>
            <span className="block text-[8px] text-slate-400 uppercase font-sans mt-0.5">Days</span>
          </div>
          <div className="bg-slate-800/90 rounded-md py-1 px-0.5 border border-slate-700/50">
            <span className="block text-xs font-black text-white leading-none">{pad(time.hours)}</span>
            <span className="block text-[8px] text-slate-400 uppercase font-sans mt-0.5">Hours</span>
          </div>
          <div className="bg-slate-800/90 rounded-md py-1 px-0.5 border border-slate-700/50">
            <span className="block text-xs font-black text-white leading-none">{pad(time.mins)}</span>
            <span className="block text-[8px] text-slate-400 uppercase font-sans mt-0.5">Mins</span>
          </div>
          <div className="bg-slate-800/90 rounded-md py-1 px-0.5 border border-slate-700/50">
            <span className="block text-xs font-black text-rose-400 leading-none">{pad(time.secs)}</span>
            <span className="block text-[8px] text-slate-400 uppercase font-sans mt-0.5">Secs</span>
          </div>
        </div>
      </div>
    );
  }

  // Full Variant (prominent luxury timer layout for Product Detail Page and Detail Modal)
  return (
    <div
      className={`rounded-2xl p-3.5 sm:p-4 border transition-all ${
        isUrgent
          ? 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-950/20'
          : 'bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-indigo-500/30 shadow-lg shadow-indigo-950/20'
      } text-white ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          {isUrgent ? (
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 animate-bounce">
              <Flame className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className={isUrgent ? 'text-rose-400' : 'text-amber-400'}>{label}</span>
              {isUrgent && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-rose-600 text-white">
                  Ending Soon
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Discount price expires on {new Date(targetDate || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center font-mono">
        <div className="bg-slate-950/70 rounded-xl p-2 border border-slate-800/80 shadow-inner">
          <span className="block text-lg sm:text-2xl font-black text-amber-400 leading-tight">
            {pad(time.days)}
          </span>
          <span className="block text-[9px] sm:text-[10px] text-slate-400 uppercase font-sans font-bold mt-0.5">
            Days
          </span>
        </div>
        <div className="bg-slate-950/70 rounded-xl p-2 border border-slate-800/80 shadow-inner">
          <span className="block text-lg sm:text-2xl font-black text-white leading-tight">
            {pad(time.hours)}
          </span>
          <span className="block text-[9px] sm:text-[10px] text-slate-400 uppercase font-sans font-bold mt-0.5">
            Hours
          </span>
        </div>
        <div className="bg-slate-950/70 rounded-xl p-2 border border-slate-800/80 shadow-inner">
          <span className="block text-lg sm:text-2xl font-black text-white leading-tight">
            {pad(time.mins)}
          </span>
          <span className="block text-[9px] sm:text-[10px] text-slate-400 uppercase font-sans font-bold mt-0.5">
            Minutes
          </span>
        </div>
        <div className="bg-slate-950/70 rounded-xl p-2 border border-slate-800/80 shadow-inner">
          <span className={`block text-lg sm:text-2xl font-black leading-tight ${isUrgent ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
            {pad(time.secs)}
          </span>
          <span className="block text-[9px] sm:text-[10px] text-slate-400 uppercase font-sans font-bold mt-0.5">
            Seconds
          </span>
        </div>
      </div>
    </div>
  );
};
