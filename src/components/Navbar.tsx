'use client';

import React from 'react';
import { Gamepad2, Settings, Trophy, Volume2, VolumeX, Sparkles, Radio } from 'lucide-react';
import { soundManager } from '@/lib/sound';

export type ActiveTab = 'game' | 'admin' | 'winners';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isAdminLoggedIn: boolean;
  roundInfo?: { round: number; question: number; total: number };
}

export default function Navbar({
  activeTab,
  setActiveTab,
  isAdminLoggedIn,
  roundInfo,
}: NavbarProps) {
  const [isMuted, setIsMuted] = React.useState(false);

  React.useEffect(() => {
    setIsMuted(soundManager.getIsMuted());
  }, []);

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      soundManager.playClick();
    }
  };

  const handleTabChange = (tab: ActiveTab) => {
    soundManager.playClick();
    setActiveTab(tab);
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 w-full border-b border-cyan-500/20 bg-[#070b17]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo / Brand */}
          <div
            onClick={() => handleTabChange('game')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform">
              <span className="font-mono font-black text-xl text-white tracking-tighter">01</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-300">
                  BINARIES
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Symposium
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Scientist Invention Quiz Platform
              </p>
            </div>
          </div>

          {/* Desktop Tab Navigation */}
          <nav className="hidden md:flex items-center space-x-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => handleTabChange('game')}
              className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'game'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>🎮 Game</span>
            </button>

            <button
              onClick={() => handleTabChange('admin')}
              className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>⚙️ Admin</span>
              {isAdminLoggedIn && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => handleTabChange('winners')}
              className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'winners'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/25 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>🏆 Winners</span>
            </button>
          </nav>

          {/* Action Icons */}
          <div className="flex items-center space-x-3">
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>LIVE</span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              title={isMuted ? 'Unmute Game Audio' : 'Mute Game Audio'}
              className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
              aria-label="Toggle Sound"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070b17]/95 backdrop-blur-lg border-t border-slate-800 px-3 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => handleTabChange('game')}
          className={`flex flex-col items-center py-1 px-4 rounded-xl transition-all ${
            activeTab === 'game' ? 'text-cyan-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Gamepad2 className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">Game</span>
        </button>

        <button
          onClick={() => handleTabChange('admin')}
          className={`flex flex-col items-center py-1 px-4 rounded-xl transition-all relative ${
            activeTab === 'admin' ? 'text-purple-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">Admin</span>
          {isAdminLoggedIn && (
            <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => handleTabChange('winners')}
          className={`flex flex-col items-center py-1 px-4 rounded-xl transition-all ${
            activeTab === 'winners' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Trophy className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">Winners</span>
        </button>
      </div>
    </>
  );
}
