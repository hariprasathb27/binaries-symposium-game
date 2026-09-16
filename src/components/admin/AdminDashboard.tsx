'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  LogOut,
  HelpCircle,
  Users,
  Cpu,
  Trophy,
  Sliders,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import QuestionManager from './QuestionManager';
import ScientistManager from './ScientistManager';
import ComponentManager from './ComponentManager';
import WinnerManager from './WinnerManager';
import GameSettingsManager from './GameSettingsManager';
import { Scientist } from '@/lib/types';
import { soundManager } from '@/lib/sound';

interface AdminDashboardProps {
  isAdminLoggedIn: boolean;
  setIsAdminLoggedIn: (status: boolean) => void;
}

type AdminTab = 'questions' | 'scientists' | 'components' | 'winners' | 'settings';

export default function AdminDashboard({
  isAdminLoggedIn,
  setIsAdminLoggedIn,
}: AdminDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<AdminTab>('questions');
  const [scientists, setScientists] = useState<Scientist[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(1);

  // Login Form State - Starts completely empty (no hardcoded credentials or defaults)
  const [loginMethod, setLoginMethod] = useState<'password' | 'code'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);

  // Check login status on mount
  useEffect(() => {
    checkSession();
    if (isAdminLoggedIn) {
      fetchScientistsAndSettings();
    }
  }, [isAdminLoggedIn]);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated) {
        setIsAdminLoggedIn(true);
      }
    } catch {
      setIsAdminLoggedIn(false);
    }
  };

  const fetchScientistsAndSettings = async () => {
    try {
      const [resSci, resSet] = await Promise.all([
        fetch('/api/admin/scientists'),
        fetch('/api/game/state'),
      ]);
      const sciData = await resSci.json();
      const setData = await resSet.json();

      if (sciData.success && sciData.data) {
        setScientists(sciData.data);
      }
      if (setData.success && setData.data?.settings?.current_round) {
        setCurrentRound(setData.data.settings.current_round);
      }
    } catch (err) {
      console.error('Error fetching admin metadata:', err);
    }
  };

  const switchLoginMethod = (method: 'password' | 'code') => {
    setLoginMethod(method);
    setLoginError(null);
    setEmail('');
    setPassword('');
    setSecurityCode('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const payload =
        loginMethod === 'code'
          ? { securityCode: securityCode.trim() }
          : { email: email.trim(), password };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Invalid admin credentials');
      }

      soundManager.playClick();
      // Immediately clear sensitive credentials from component state
      setEmail('');
      setPassword('');
      setSecurityCode('');
      setIsAdminLoggedIn(true);
      await fetchScientistsAndSettings();
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      soundManager.playClick();
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAdminLoggedIn(false);
      setEmail('');
      setPassword('');
      setSecurityCode('');
      setLoginError(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // IF NOT AUTHENTICATED: RENDER SECURE LOGIN FORM (COMPLETELY EMPTY INPUTS)
  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="rounded-3xl border border-purple-500/30 bg-slate-900/95 p-6 sm:p-8 shadow-2xl shadow-purple-950/40 backdrop-blur-xl">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-white">Admin Authentication</h2>
            <p className="text-xs text-slate-400 mt-1">
              Authorized symposium organizers & quizmasters only
            </p>
          </div>

          {/* Toggle between Password and Security Code */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => switchLoginMethod('password')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                loginMethod === 'password'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => switchLoginMethod('code')}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                loginMethod === 'code'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Security Passcode
            </button>
          </div>

          {loginError && (
            <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
            {loginMethod === 'password' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    name="admin_email_field"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                    placeholder="Enter admin email address..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="admin_password_field"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Enter master password..."
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Symposium Security Passcode
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    name="admin_passcode_field"
                    required
                    value={securityCode}
                    onChange={(e) => setSecurityCode(e.target.value)}
                    autoComplete="off"
                    placeholder="Enter security passcode..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isLoggingIn ? 'Authenticating...' : 'Access Admin Suite'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // AUTHENTICATED: RENDER FULL ADMIN SUITE
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
      {/* Top Admin Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-purple-500/20 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black text-white">BINARIES Admin Console</h1>
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>SECURED</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Full control over Questions, Scientists, Components, Rounds & Winners
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Admin</span>
        </button>
      </div>

      {/* Admin Sub-Tabs Navigation */}
      <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-none">
        {[
          { id: 'questions', label: '❓ Questions', icon: HelpCircle },
          { id: 'scientists', label: '🔬 Scientists', icon: Users },
          { id: 'components', label: '⚡ Components', icon: Cpu },
          { id: 'winners', label: '🏆 Winners & Podium', icon: Trophy },
          { id: 'settings', label: '⚙️ Settings & Reset', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                soundManager.playClick();
                setActiveSubTab(tab.id as AdminTab);
              }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Contents */}
      {activeSubTab === 'questions' && (
        <QuestionManager scientists={scientists} currentRound={currentRound} />
      )}
      {activeSubTab === 'scientists' && (
        <ScientistManager onScientistsUpdated={fetchScientistsAndSettings} />
      )}
      {activeSubTab === 'components' && <ComponentManager />}
      {activeSubTab === 'winners' && <WinnerManager />}
      {activeSubTab === 'settings' && (
        <GameSettingsManager onSettingsUpdated={fetchScientistsAndSettings} />
      )}
    </div>
  );
}
