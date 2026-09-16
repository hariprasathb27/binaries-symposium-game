'use client';

import React, { useState } from 'react';
import Navbar, { ActiveTab } from '@/components/Navbar';
import GameScreen from '@/components/game/GameScreen';
import AdminDashboard from '@/components/admin/AdminDashboard';
import WinnerPodium from '@/components/winners/WinnerPodium';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('game');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div>
        {/* Navigation Bar (Desktop top + Mobile bottom) */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAdminLoggedIn={isAdminLoggedIn}
        />

        {/* Main Content Area */}
        <main className="w-full">
          {activeTab === 'game' && (
            <GameScreen onNavigateToWinners={() => setActiveTab('winners')} />
          )}

          {activeTab === 'admin' && (
            <AdminDashboard
              isAdminLoggedIn={isAdminLoggedIn}
              setIsAdminLoggedIn={setIsAdminLoggedIn}
            />
          )}

          {activeTab === 'winners' && <WinnerPodium />}
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950/60 py-4 px-4 text-center text-xs text-slate-500 hidden md:block">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>BINARIES • College Symposium Scientist Invention Quiz Platform</span>
          <span className="font-mono text-[11px] text-slate-400">
            Engineered with Live Anti-Cheat & 5-Option Verification
          </span>
        </div>
      </footer>
    </div>
  );
}
