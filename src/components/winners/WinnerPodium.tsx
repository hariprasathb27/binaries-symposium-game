'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Medal, Crown, Sparkles, Clock, Award, Users } from 'lucide-react';
import { Winner } from '@/lib/types';
import { soundManager } from '@/lib/sound';

export default function WinnerPodium() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWinners();
    triggerCelebrationConfetti();
    soundManager.playFanfare();
  }, []);

  const fetchWinners = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/game/winners');
      const data = await res.json();
      if (data.success && data.data) {
        setWinners(data.data);
      }
    } catch (err) {
      console.error('Error loading winners:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerCelebrationConfetti = () => {
    // Left burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6, x: 0.2 },
      colors: ['#ffd700', '#00f0ff', '#ffffff', '#38bdf8'],
    });
    // Right burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6, x: 0.8 },
      colors: ['#ffd700', '#00f0ff', '#ffffff', '#38bdf8'],
    });
  };

  const firstPlace = winners.find((w) => w.position === 1);
  const secondPlace = winners.find((w) => w.position === 2);
  const thirdPlace = winners.find((w) => w.position === 3);
  const otherPlaces = winners.filter((w) => w.position > 3);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 pb-28 space-y-12">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-black tracking-widest uppercase shadow-lg shadow-amber-500/10">
          <Sparkles className="w-4 h-4" />
          <span>OFFICIAL SYMPOSIUM RESULTS</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
          BINARIES CHAMPIONS
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
          Honoring the sharpest scientific minds and top-performing invention scholars of the symposium.
        </p>
        <div className="pt-2">
          <button
            onClick={triggerCelebrationConfetti}
            className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 inline-flex items-center space-x-2 transition-all shadow-md"
          >
            <span>🎉 Celebrate Again</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-mono">Summoning Champions Podium...</p>
        </div>
      ) : (
        <>
          {/* THE 3-TIER CELEBRATION PODIUM */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8 max-w-4xl mx-auto">
            {/* 2ND PLACE (SILVER - LEFT) */}
            <div className="order-2 md:order-1 flex flex-col items-center">
              <div className="w-full rounded-2xl border border-slate-400/40 bg-gradient-to-b from-slate-800/90 via-slate-900/90 to-slate-950/95 p-6 text-center shadow-xl shadow-slate-700/20 backdrop-blur-xl relative">
                <div className="w-14 h-14 mx-auto -mt-12 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 flex items-center justify-center font-black text-2xl shadow-lg border-2 border-white">
                  🥈
                </div>
                <span className="text-xs font-mono font-black uppercase text-slate-300 tracking-wider mt-3 block">
                  2ND PLACE
                </span>
                <h3 className="text-xl font-black text-white mt-1 mb-0.5">
                  {secondPlace?.team_name || 'Team Pending'}
                </h3>
                <p className="text-xs text-slate-400 mb-4 font-medium">
                  {secondPlace?.participant_name || 'Participants'}
                </p>

                <div className="flex items-center justify-center space-x-3 pt-3 border-t border-slate-700/60 text-xs font-mono">
                  <span className="text-slate-300 font-bold">{secondPlace?.score || 0} PTS</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{secondPlace?.completion_time || '00:00'}</span>
                </div>
              </div>
              <div className="w-full h-16 bg-gradient-to-b from-slate-700 to-slate-800 rounded-b-xl border-x border-b border-slate-600 hidden md:flex items-center justify-center font-mono font-black text-slate-400 text-xl">
                2
              </div>
            </div>

            {/* 1ST PLACE (GOLD - CENTER - ELEVATED) */}
            <div className="order-1 md:order-2 flex flex-col items-center md:-translate-y-4">
              <div className="w-full rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-amber-950/40 via-slate-900/95 to-slate-950/95 p-7 text-center shadow-2xl shadow-amber-500/30 backdrop-blur-2xl relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                  <Crown className="w-10 h-10 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-bounce-subtle" />
                </div>
                <div className="w-18 h-18 mx-auto mt-3 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 text-slate-950 flex items-center justify-center font-black text-3xl shadow-xl border-2 border-amber-200">
                  🥇
                </div>
                <span className="text-xs font-mono font-black uppercase text-amber-400 tracking-widest mt-3 block">
                  1ST PLACE CHAMPION
                </span>
                <h3 className="text-2xl font-black text-white mt-1 mb-1">
                  {firstPlace?.team_name || 'Team Pending'}
                </h3>
                <p className="text-sm text-amber-200/90 mb-4 font-semibold">
                  {firstPlace?.participant_name || 'Participants'}
                </p>

                <div className="flex items-center justify-center space-x-4 pt-4 border-t border-amber-500/30 text-sm font-mono">
                  <span className="text-amber-300 font-black text-base">{firstPlace?.score || 0} PTS</span>
                  <span className="text-amber-500/60">•</span>
                  <span className="text-slate-300">{firstPlace?.completion_time || '00:00'}</span>
                </div>
              </div>
              <div className="w-full h-24 bg-gradient-to-b from-amber-600 to-yellow-800 rounded-b-xl border-x border-b border-amber-500 hidden md:flex items-center justify-center font-mono font-black text-slate-950 text-2xl shadow-lg">
                1
              </div>
            </div>

            {/* 3RD PLACE (BRONZE - RIGHT) */}
            <div className="order-3 flex flex-col items-center">
              <div className="w-full rounded-2xl border border-amber-800/50 bg-gradient-to-b from-slate-900/90 via-slate-900/90 to-slate-950/95 p-6 text-center shadow-xl shadow-amber-950/20 backdrop-blur-xl relative">
                <div className="w-14 h-14 mx-auto -mt-12 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 flex items-center justify-center font-black text-2xl shadow-lg border-2 border-amber-500/40">
                  🥉
                </div>
                <span className="text-xs font-mono font-black uppercase text-amber-600 tracking-wider mt-3 block">
                  3RD PLACE
                </span>
                <h3 className="text-xl font-black text-white mt-1 mb-0.5">
                  {thirdPlace?.team_name || 'Team Pending'}
                </h3>
                <p className="text-xs text-slate-400 mb-4 font-medium">
                  {thirdPlace?.participant_name || 'Participants'}
                </p>

                <div className="flex items-center justify-center space-x-3 pt-3 border-t border-slate-700/60 text-xs font-mono">
                  <span className="text-slate-300 font-bold">{thirdPlace?.score || 0} PTS</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{thirdPlace?.completion_time || '00:00'}</span>
                </div>
              </div>
              <div className="w-full h-12 bg-gradient-to-b from-amber-900/80 to-slate-900 rounded-b-xl border-x border-b border-amber-800/40 hidden md:flex items-center justify-center font-mono font-black text-amber-600 text-xl">
                3
              </div>
            </div>
          </div>

          {/* ADDITIONAL LEADERBOARD (4th+) */}
          {otherPlaces.length > 0 && (
            <div className="max-w-3xl mx-auto mt-12 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center space-x-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Symposium Honorable Mentions</span>
              </h4>
              <div className="divide-y divide-slate-800">
                {otherPlaces.map((winner) => (
                  <div key={winner.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-bold flex items-center justify-center">
                        #{winner.position}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">{winner.team_name}</p>
                        <p className="text-xs text-slate-400">{winner.participant_name}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <p className="font-bold text-cyan-400">{winner.score} PTS</p>
                      <p className="text-slate-500">{winner.completion_time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
