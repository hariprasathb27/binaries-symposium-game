'use client';

import React, { useState, useEffect } from 'react';
import { GameSettings } from '@/lib/types';
import ConfirmModal from '../common/ConfirmModal';
import { Clock, Sliders, RotateCcw, Save, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface GameSettingsManagerProps {
  onSettingsUpdated?: () => void;
}

export default function GameSettingsManager({ onSettingsUpdated }: GameSettingsManagerProps) {
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Custom Timer state
  const [timerPreset, setTimerPreset] = useState<string>('20');
  const [customTimer, setCustomTimer] = useState<number>(20);

  // Reset Confirmation Modal
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);
        const t = data.data.timer_duration;
        if ([10, 15, 20, 30].includes(t)) {
          setTimerPreset(String(t));
        } else {
          setTimerPreset('custom');
          setCustomTimer(t);
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSaving(true);
      setSuccessMsg(null);
      setErrorMsg(null);

      const resolvedTimer =
        timerPreset === 'custom' ? Number(customTimer) || 20 : parseInt(timerPreset, 10);

      const payload = {
        ...settings,
        timer_duration: resolvedTimer,
      };

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save settings');
      }

      setSuccessMsg('Game configuration saved successfully!');
      if (onSettingsUpdated) onSettingsUpdated();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetGame = async () => {
    try {
      soundManager.playClick();
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setShowResetModal(false);
        setSuccessMsg('Live game has been reset to Round 1, Question 1!');
        await fetchSettings();
        if (onSettingsUpdated) onSettingsUpdated();
      }
    } catch (err) {
      console.error('Game reset error:', err);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-12 text-center text-slate-400 font-mono text-xs">
        Loading System Settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/70 p-4 sm:p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <span>Game & Timer Settings</span>
          </h2>
          <p className="text-xs text-slate-400">
            Configure live timers, rounds, anti-cheat behaviors, and symposium instructions without touching code.
          </p>
        </div>

        {/* Reset Game Button */}
        <button
          onClick={() => setShowResetModal(true)}
          className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-bold border border-rose-500/40 shadow-lg shadow-rose-950/40 flex items-center space-x-1.5 transition-all"
        >
          <RotateCcw className="w-4 h-4 text-rose-400" />
          <span>Reset Live Game</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* TIMER CONFIGURATION */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Question Countdown Timer</h3>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Select Timer Duration
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { label: '10 Seconds', value: '10' },
                { label: '15 Seconds', value: '15' },
                { label: '20 Seconds (Default)', value: '20' },
                { label: '30 Seconds', value: '30' },
                { label: 'Custom Duration', value: 'custom' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTimerPreset(opt.value)}
                  className={`p-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    timerPreset === opt.value
                      ? 'border-cyan-400 bg-cyan-950 text-cyan-300 ring-2 ring-cyan-500/30'
                      : 'border-slate-800 bg-slate-850 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {timerPreset === 'custom' && (
              <div className="pt-2 max-w-xs">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Custom Timer Seconds:
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={customTimer}
                  onChange={(e) => setCustomTimer(parseInt(e.target.value, 10) || 20)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* ROUNDS & QUIZ DYNAMICS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
            Symposium Round Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Event Name
              </label>
              <input
                type="text"
                value={settings.event_name}
                onChange={(e) => setSettings({ ...settings, event_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Total Rounds
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={settings.total_rounds}
                onChange={(e) =>
                  setSettings({ ...settings, total_rounds: parseInt(e.target.value, 10) || 3 })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Current Active Round
              </label>
              <input
                type="number"
                min={1}
                max={settings.total_rounds}
                value={settings.current_round}
                onChange={(e) =>
                  setSettings({ ...settings, current_round: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Auto Next Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-850 border border-slate-800">
              <div>
                <span className="text-sm font-bold text-white block">Auto-Advance Questions</span>
                <span className="text-xs text-slate-400">
                  Automatically move to next question after response evaluation
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_next}
                onChange={(e) => setSettings({ ...settings, auto_next: e.target.checked })}
                className="w-5 h-5 rounded accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Answer Reveal Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-850 border border-slate-800">
              <div>
                <span className="text-sm font-bold text-white block">Instant Answer Reveal</span>
                <span className="text-xs text-slate-400">
                  Reveal correct/incorrect feedback immediately upon submit
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.answer_reveal}
                onChange={(e) => setSettings({ ...settings, answer_reveal: e.target.checked })}
                className="w-5 h-5 rounded accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* GAME INSTRUCTIONS EDITOR */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Symposium Instructions & Protocol</h3>
          </div>
          <p className="text-xs text-slate-400">
            Displayed to participants in the official rules dialog prior to and during the game.
          </p>
          <textarea
            rows={6}
            value={settings.instructions}
            onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-slate-200 font-mono leading-relaxed"
          />
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/20 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>

      {/* RESET GAME CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Reset Live Symposium Game?"
        message="Are you sure you want to reset the live game? This resets active question progress back to Round 1, Question 1. Existing question banks, scientists, components, and podium winners are safely preserved."
        confirmLabel="Yes, Reset Game"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleResetGame}
        onCancel={() => setShowResetModal(false)}
      />
    </div>
  );
}
