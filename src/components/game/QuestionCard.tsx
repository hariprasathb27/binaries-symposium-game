'use client';

import React, { useEffect } from 'react';
import { PublicQuestionOption, OptionKey } from '@/lib/types';
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface QuestionCardProps {
  questionText: string;
  options: PublicQuestionOption[];
  selectedOption: OptionKey | null;
  onSelectOption: (optionKey: OptionKey) => void;
  isSubmitted: boolean;
  isCorrect?: boolean | null;
  correctOption?: OptionKey | null;
  disabled: boolean;
}

export default function QuestionCard({
  questionText,
  options,
  selectedOption,
  onSelectOption,
  isSubmitted,
  isCorrect,
  correctOption,
  disabled,
}: QuestionCardProps) {
  // Support keyboard shortcuts (A-E or 1-5)
  useEffect(() => {
    if (disabled || isSubmitted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const optionMap: Record<string, OptionKey> = {
        A: 'A',
        B: 'B',
        C: 'C',
        D: 'D',
        E: 'E',
        '1': 'A',
        '2': 'B',
        '3': 'C',
        '4': 'D',
        '5': 'E',
      };

      if (optionMap[key]) {
        soundManager.playClick();
        onSelectOption(optionMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, isSubmitted, onSelectOption]);

  const handleOptionClick = (key: OptionKey) => {
    if (disabled || isSubmitted) return;
    soundManager.playClick();
    onSelectOption(key);
  };

  return (
    <div className="space-y-6">
      {/* Question Text Box */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 border border-slate-700/80 p-5 sm:p-7 shadow-lg backdrop-blur-md">
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Invention / Discovery Question</span>
        </div>
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-relaxed">
          {questionText}
        </h3>
      </div>

      {/* 5 Answer Options */}
      <div className="grid grid-cols-1 gap-3 sm:gap-3.5">
        {options.map((option) => {
          const isSelected = selectedOption === option.key;
          const isRevealedCorrect = isSubmitted && correctOption === option.key;
          const isRevealedWrong = isSubmitted && isSelected && !isCorrect;

          // Compute style classes based on submission state
          let cardStyle =
            'border-slate-800 bg-slate-900/70 hover:border-cyan-500/50 hover:bg-slate-850 text-slate-200';
          let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';

          if (isSelected && !isSubmitted) {
            cardStyle =
              'border-cyan-400 bg-cyan-950/50 text-white shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/40';
            badgeStyle = 'bg-cyan-500 text-white border-cyan-400 font-bold';
          } else if (isRevealedCorrect) {
            cardStyle =
              'border-emerald-500 bg-emerald-950/60 text-emerald-100 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/50';
            badgeStyle = 'bg-emerald-500 text-white border-emerald-400 font-bold';
          } else if (isRevealedWrong) {
            cardStyle =
              'border-rose-500 bg-rose-950/60 text-rose-100 shadow-lg shadow-rose-500/20 ring-2 ring-rose-500/50';
            badgeStyle = 'bg-rose-500 text-white border-rose-400 font-bold';
          } else if (isSubmitted) {
            cardStyle = 'border-slate-800/40 bg-slate-900/40 text-slate-500 opacity-60';
            badgeStyle = 'bg-slate-800/40 text-slate-500 border-slate-800/40';
          }

          return (
            <button
              key={option.key}
              onClick={() => handleOptionClick(option.key)}
              disabled={disabled || isSubmitted}
              className={`option-card group relative w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between ${cardStyle} ${
                disabled && !isSubmitted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              }`}
            >
              <div className="flex items-center space-x-4 flex-1">
                {/* Option Key Badge (A, B, C, D, E) */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-base border transition-colors shrink-0 ${badgeStyle}`}
                >
                  {option.key}
                </div>

                {/* Option Text */}
                <span className="text-sm sm:text-base font-medium leading-snug">
                  {option.text}
                </span>
              </div>

              {/* Status Icons */}
              <div className="shrink-0 ml-3">
                {isRevealedCorrect && (
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <CheckCircle2 className="w-6 h-6 animate-bounce-subtle" />
                    <span className="text-xs font-bold uppercase hidden sm:inline">Correct</span>
                  </div>
                )}
                {isRevealedWrong && (
                  <div className="flex items-center space-x-1.5 text-rose-400">
                    <XCircle className="w-6 h-6" />
                    <span className="text-xs font-bold uppercase hidden sm:inline">Incorrect</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
