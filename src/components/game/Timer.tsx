'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface TimerProps {
  duration: number; // total duration in seconds
  onTimeUp: () => void;
  isPaused?: boolean;
  questionKey?: string; // Reset timer whenever question changes
}

export default function Timer({
  duration,
  onTimeUp,
  isPaused = false,
  questionKey,
}: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(duration);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  // Reset timer whenever duration or question changes
  useEffect(() => {
    setTimeLeft(duration);
  }, [duration, questionKey]);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          soundManager.playTimeUp();
          onTimeUpRef.current();
          return 0;
        }

        // Sound triggers
        const nextTime = prev - 1;
        if (nextTime <= 4 && nextTime > 0) {
          soundManager.playUrgentTick();
        } else {
          soundManager.playTick();
        }

        return nextTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, timeLeft]);

  // Compute percentage for circular SVG ring
  const strokeDashoffset = 100 - (timeLeft / duration) * 100;

  // Color dynamics
  let colorClass = 'text-cyan-400 stroke-cyan-400';
  let bgGlow = 'rgba(6, 182, 212, 0.15)';
  let isUrgent = false;

  if (timeLeft === 0) {
    colorClass = 'text-rose-500 stroke-rose-500';
    bgGlow = 'rgba(244, 63, 94, 0.25)';
  } else if (timeLeft <= 3) {
    colorClass = 'text-red-500 stroke-red-500 animate-pulse';
    bgGlow = 'rgba(239, 68, 68, 0.25)';
    isUrgent = true;
  } else if (timeLeft <= 5) {
    colorClass = 'text-amber-400 stroke-amber-400';
    bgGlow = 'rgba(245, 158, 11, 0.2)';
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-full transition-all duration-300"
        style={{
          boxShadow: `0 0 25px ${bgGlow}`,
          background: 'radial-gradient(circle, rgba(15,23,42,0.95) 0%, rgba(7,11,23,0.85) 100%)',
        }}
      >
        {/* SVG Circular Progress Track */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="7"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="7"
            strokeDasharray="264"
            strokeDashoffset={(264 * strokeDashoffset) / 100}
            strokeLinecap="round"
            className={`${colorClass} transition-all duration-500`}
          />
        </svg>

        {/* Center Countdown Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {timeLeft === 0 ? (
            <div className="flex flex-col items-center animate-bounce-subtle">
              <span className="text-xs font-black tracking-widest text-rose-400">TIME</span>
              <span className="text-xs font-black tracking-widest text-rose-400">UP!</span>
            </div>
          ) : (
            <>
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${colorClass}`}>
                {timeLeft}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 -mt-1">
                SEC
              </span>
            </>
          )}
        </div>

        {isUrgent && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center animate-ping">
            <AlertTriangle className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  );
}
