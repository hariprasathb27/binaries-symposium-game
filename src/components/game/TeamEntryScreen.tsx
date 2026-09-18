'use client';

import React, { useState, useEffect } from 'react';
import { Users, User, Play, Sparkles, Atom, Clock, HelpCircle, Cpu, ShieldCheck } from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface TeamEntryScreenProps {
  onStartGame: (teamName: string, participantName: string) => void;
  totalRounds?: number;
  questionsPerRound?: number;
  timerDuration?: number;
  onShowRules?: () => void;
  onShowReference?: () => void;
}

export default function TeamEntryScreen({
  onStartGame,
  totalRounds = 3,
  questionsPerRound = 5,
  timerDuration = 20,
  onShowRules,
  onShowReference,
}: TeamEntryScreenProps) {
  const [teamName, setTeamName] = useState<string>('');
  const [participantName, setParticipantName] = useState<string>('');
  const [touched, setTouched] = useState<boolean>(false);

  const [activeTimerDuration, setActiveTimerDuration] = useState<number>(timerDuration);
  const [activeTotalRounds, setActiveTotalRounds] = useState<number>(totalRounds);
  const [activeQuestionsPerRound, setActiveQuestionsPerRound] = useState<number>(questionsPerRound);

  useEffect(() => {
    setActiveTimerDuration(timerDuration);
  }, [timerDuration]);

  useEffect(() => {
    setActiveTotalRounds(totalRounds);
  }, [totalRounds]);

  useEffect(() => {
    setActiveQuestionsPerRound(questionsPerRound);
  }, [questionsPerRound]);

  // Fetch live game settings on mount to ensure fresh timer and rounds display
  useEffect(() => {
    fetch('/api/game/state', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.settings) {
          const s = data.data.settings;
          if (s.timer_duration) setActiveTimerDuration(Number(s.timer_duration));
          if (s.total_rounds) setActiveTotalRounds(Number(s.total_rounds));
          if (s.questions_per_round) setActiveQuestionsPerRound(Number(s.questions_per_round));
        }
      })
      .catch(() => {});
  }, []);

  // Explicitly wipe all game-related sessionStorage keys on mount to guarantee a 100% clean slate for every new team
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('binaries_game_started');
      sessionStorage.removeItem('binaries_participant_team');
      sessionStorage.removeItem('binaries_participant_name');
      sessionStorage.removeItem('binaries_current_score');
      sessionStorage.removeItem('binaries_timer_duration');
      sessionStorage.removeItem('binaries_game_status');

      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('binaries_') && !key.includes('admin')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  }, []);

  const trimmedTeam = teamName.trim();
  const isTeamValid = trimmedTeam.length >= 2 && trimmedTeam.length <= 50;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isTeamValid) return;

    soundManager.playClick();
    onStartGame(trimmedTeam, participantName.trim());
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
      {/* Outer Card Container */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/95 via-[#0a1124]/95 to-slate-950/95 p-6 sm:p-10 shadow-2xl shadow-cyan-950/60 backdrop-blur-2xl">
        {/* Background Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-400/40 text-cyan-400 mb-4 shadow-lg shadow-cyan-500/20">
            <Atom className="w-9 h-9 animate-spin" style={{ animationDuration: '16s' }} />
          </div>

          <div className="inline-block px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-bold uppercase tracking-widest mb-2">
            Symposium Quiz Game
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-sans">
            BINARIES
          </h1>

          <p className="text-sm sm:text-base font-semibold text-cyan-400 mt-1">
            SCIENTIST & INVENTION QUIZ
          </p>

          <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
            Test your knowledge of history’s greatest scientists, breakthrough patents, and revolutionary discoveries.
          </p>
        </div>

        {/* Team Entry Form */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="border-t border-slate-800/90 pt-5">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 text-center mb-4">
              ENTER YOUR TEAM
            </h2>

            {/* Team Name Input (Required) */}
            <div className="space-y-1.5">
              <label
                htmlFor="team-name-input"
                className="flex items-center justify-between text-xs font-bold text-slate-200"
              >
                <span className="flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Team Name</span>
                  <span className="text-rose-400">*</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {trimmedTeam.length}/50
                </span>
              </label>

              <div className="relative">
                <input
                  id="team-name-input"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="e.g., Quantum Titans"
                  maxLength={50}
                  autoComplete="off"
                  autoFocus
                  className={`w-full px-4 py-3.5 rounded-xl bg-slate-950/80 border text-white placeholder-slate-500 text-sm font-medium focus:outline-none transition-all ${
                    touched && !isTeamValid
                      ? 'border-rose-500/80 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                  }`}
                />
              </div>

              {touched && !isTeamValid && (
                <p className="text-[11px] text-rose-400 font-medium pl-1">
                  Team Name is required (2 to 50 characters).
                </p>
              )}
            </div>

            {/* Participant Name Input (Optional) */}
            <div className="space-y-1.5 mt-4">
              <label
                htmlFor="participant-name-input"
                className="flex items-center justify-between text-xs font-bold text-slate-200"
              >
                <span className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Participant Name</span>
                  <span className="text-slate-500 font-normal">(Optional)</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {participantName.trim().length}/80
                </span>
              </label>

              <div className="relative">
                <input
                  id="participant-name-input"
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="e.g., Alex Rivera & Sarah Chen"
                  maxLength={80}
                  autoComplete="off"
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* START GAME Action Button */}
          <button
            type="submit"
            disabled={!isTeamValid}
            className={`w-full py-4 px-6 rounded-2xl font-black text-base flex items-center justify-center space-x-2.5 shadow-xl transition-all ${
              isTeamValid
                ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25 cursor-pointer active:scale-98 hover:shadow-cyan-500/40'
                : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START GAME</span>
          </button>

          {/* Game Dynamics Information */}
          <div className="pt-2 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-cyan-300 font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">
                {activeTotalRounds} Rounds
              </span>
              <span className="text-slate-500">•</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">
                {activeQuestionsPerRound} Questions / Round
              </span>
              <span className="text-slate-500">•</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">
                {activeTimerDuration} Seconds
              </span>
            </div>

            <div className="mt-4 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>5 Options per Question • Server-Side Verification • Anti-Cheat Enforced</span>
            </div>
          </div>
        </form>

        {/* Modal Triggers */}
        {(onShowRules || onShowReference) && (
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-4 text-xs">
            {onShowRules && (
              <button
                type="button"
                onClick={onShowRules}
                className="flex items-center space-x-1.5 text-slate-400 hover:text-cyan-300 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Official Rules</span>
              </button>
            )}

            {onShowReference && (
              <button
                type="button"
                onClick={onShowReference}
                className="flex items-center space-x-1.5 text-slate-400 hover:text-cyan-300 transition-colors"
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Component Reference</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
