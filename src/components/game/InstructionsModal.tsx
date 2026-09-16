'use client';

import React from 'react';
import { X, BookOpen, CheckCircle, ShieldAlert, Award, Play } from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructionsText?: string;
}

export default function InstructionsModal({
  isOpen,
  onClose,
  instructionsText,
}: InstructionsModalProps) {
  if (!isOpen) return null;

  const defaultRules = [
    'Each quiz question is based on a celebrated Scientist and their breakthrough Inventions or Discoveries.',
    'Every question strictly provides exactly 5 answer options (A, B, C, D, E).',
    'Exactly ONE option is the correct answer. The remaining four are incorrect.',
    'You must select and submit your response before the countdown timer expires.',
    'Submitted responses are instantly locked and verified by the anti-cheat symposium backend.',
    'The symposium features multiple rounds of increasing excitement.',
    'Final scores and rankings will be officially presented on the 🏆 Winners Podium!',
  ];

  const rulesToDisplay = instructionsText
    ? instructionsText.split('\n').filter((l) => l.trim().length > 0)
    : defaultRules;

  const handleStart = () => {
    soundManager.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-3xl border border-cyan-500/40 bg-slate-900/95 p-6 sm:p-8 shadow-2xl shadow-cyan-950/60 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
              <span>BINARIES</span>
              <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                Official Rules
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Scientist Invention Symposium Quiz Protocol
            </p>
          </div>
        </div>

        {/* Rules List */}
        <div className="space-y-3 mb-6">
          {rulesToDisplay.map((rule, idx) => (
            <div
              key={idx}
              className="flex items-start space-x-3 p-3 rounded-xl bg-slate-800/40 border border-slate-750/50"
            >
              <div className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/20 text-xs font-bold font-mono">
                {idx + 1}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {rule.replace(/^\d+\.\s*/, '')}
              </p>
            </div>
          ))}
        </div>

        {/* Notice Badge */}
        <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs mb-6">
          <Award className="w-5 h-5 text-purple-400 shrink-0" />
          <span>
            Scoring: 100 points per correct answer. Speed and accuracy determine placement on the final podium!
          </span>
        </div>

        {/* Start Game Action */}
        <button
          onClick={handleStart}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-base shadow-lg shadow-cyan-500/30 flex items-center justify-center space-x-2 transition-all"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Understood, Let’s Play!</span>
        </button>
      </div>
    </div>
  );
}
