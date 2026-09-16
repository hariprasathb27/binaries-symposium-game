'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PublicQuestion, OptionKey, SubmitAnswerResponse, ComponentItem } from '@/lib/types';
import ScientistCard from './ScientistCard';
import QuestionCard from './QuestionCard';
import Timer from './Timer';
import InstructionsModal from './InstructionsModal';
import ComponentReferenceModal from './ComponentReferenceModal';
import {
  Send,
  ChevronRight,
  HelpCircle,
  Trophy,
  Flame,
  Award,
  RefreshCw,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface GameScreenProps {
  onNavigateToWinners: () => void;
}

export default function GameScreen({ onNavigateToWinners }: GameScreenProps) {
  // Game state
  const [currentQuestion, setCurrentQuestion] = useState<PublicQuestion | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Settings & Progress
  const [timerDuration, setTimerDuration] = useState<number>(20);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalRounds, setTotalRounds] = useState<number>(3);
  const [autoNext, setAutoNext] = useState<boolean>(false);
  const [gameStatus, setGameStatus] = useState<string>('active');

  // Question response state
  const [selectedOption, setSelectedOption] = useState<OptionKey | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<SubmitAnswerResponse | null>(null);

  // Participant Score & Streak
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [participantId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('binaries_participant_id');
      if (!id) {
        id = `team_${Math.random().toString(36).substring(2, 8)}`;
        localStorage.setItem('binaries_participant_id', id);
      }
      return id;
    }
    return 'participant_default';
  });

  // Modals
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [showComponentsModal, setShowComponentsModal] = useState<boolean>(false);
  const [componentsList, setComponentsList] = useState<ComponentItem[]>([]);
  const [instructionsText, setInstructionsText] = useState<string>('');

  const autoNextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch current question
  const fetchCurrentQuestion = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSelectedOption(null);
      setIsSubmitted(false);
      setIsTimeUp(false);
      setSubmissionResult(null);

      const res = await fetch('/api/game/current', { cache: 'no-store' });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || 'Failed to load question');
      }

      if (json.settings) {
        setTimerDuration(json.settings.timer_duration || 20);
        setCurrentRound(json.settings.current_round || 1);
        setTotalRounds(json.settings.total_rounds || 3);
        setAutoNext(Boolean(json.settings.auto_next));
        setGameStatus(json.settings.game_status || 'active');
      }

      setCurrentQuestion(json.data);
    } catch (err: any) {
      console.error('Fetch question error:', err);
      setError(err.message || 'Error connecting to symposium quiz server.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch supporting components & instructions
  useEffect(() => {
    fetchCurrentQuestion();

    // Fetch components
    fetch('/api/game/components')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setComponentsList(data.data);
        }
      })
      .catch(() => {});

    // Fetch instructions
    fetch('/api/game/state')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.settings?.instructions) {
          setInstructionsText(data.data.settings.instructions);
        }
      })
      .catch(() => {});
  }, [fetchCurrentQuestion]);

  // Handle Answer Selection
  const handleSelectOption = (key: OptionKey) => {
    if (isSubmitted || isTimeUp) return;
    setSelectedOption(key);
  };

  // Handle Answer Submit
  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !selectedOption || isSubmitted || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const submissionToken = `token_${currentQuestion.id}_${participantId}_${Date.now()}`;

      const res = await fetch('/api/game/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          selected_option: selectedOption,
          participant_id: participantId,
          submission_token: submissionToken,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Submission failed');
      }

      const result: SubmitAnswerResponse = json.data;
      setSubmissionResult(result);
      setIsSubmitted(true);

      if (result.is_correct) {
        soundManager.playCorrect();
        setScore((prev) => prev + 100);
        setStreak((prev) => prev + 1);
      } else {
        soundManager.playIncorrect();
        setStreak(0);
      }

      // Auto-next handling
      if (json.data.auto_next) {
        autoNextTimeoutRef.current = setTimeout(() => {
          handleNextQuestion();
        }, 3000);
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      alert(err.message || 'Could not submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Time Up
  const handleTimeUp = () => {
    setIsTimeUp(true);
    if (!isSubmitted) {
      // If an option was selected before timer expired, auto submit it!
      if (selectedOption) {
        handleSubmitAnswer();
      }
    }
  };

  // Handle Next Question
  const handleNextQuestion = async () => {
    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current);
    }
    soundManager.playClick();

    try {
      setLoading(true);
      const res = await fetch('/api/game/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();

      if (json.data?.game_status === 'completed') {
        setGameStatus('completed');
        soundManager.playFanfare();
        return;
      }

      await fetchCurrentQuestion();
    } catch (err) {
      console.error('Next question error:', err);
      await fetchCurrentQuestion();
    }
  };

  // Quiz Completed View
  if (gameStatus === 'completed') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-b from-slate-900/90 via-slate-900/95 to-slate-950/90 p-8 sm:p-12 shadow-2xl shadow-amber-500/20 backdrop-blur-xl">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-lg shadow-amber-500/30">
            <Trophy className="w-10 h-10 animate-bounce-subtle" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
            QUIZ COMPLETE!
          </h2>
          <p className="text-slate-300 text-base max-w-lg mx-auto mb-8">
            All symposium quiz rounds have concluded. Exceptional performance exploring history’s greatest scientific breakthroughs!
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
              <span className="text-xs font-mono uppercase text-slate-400">Total Score</span>
              <p className="text-3xl font-black font-mono text-cyan-400">{score}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
              <span className="text-xs font-mono uppercase text-slate-400">Highest Streak</span>
              <p className="text-3xl font-black font-mono text-amber-400">{streak} 🔥</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onNavigateToWinners}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all"
            >
              <Trophy className="w-5 h-5" />
              <span>View Winners Podium</span>
            </button>

            <button
              onClick={fetchCurrentQuestion}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 flex items-center justify-center space-x-2 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Game</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading && !currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl border-2 border-cyan-400 border-t-transparent animate-spin mb-4" />
        <p className="text-cyan-400 font-mono text-sm tracking-wider uppercase font-bold animate-pulse">
          Synchronizing Live Symposium Question...
        </p>
      </div>
    );
  }

  // Error State
  if (error || !currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="rounded-3xl border border-rose-500/30 bg-slate-900/90 p-8 backdrop-blur-xl">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Notice</h3>
          <p className="text-slate-300 text-sm mb-6">
            {error || 'No active question found for this round. Please check the Admin dashboard.'}
          </p>
          <button
            onClick={fetchCurrentQuestion}
            className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold shadow-lg transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const questionIndex = (currentQuestion.current_question_index ?? 0) + 1;
  const totalQuestionsInRound = currentQuestion.total_questions_in_round ?? 5;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      {/* Modals */}
      <InstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        instructionsText={instructionsText}
      />
      <ComponentReferenceModal
        isOpen={showComponentsModal}
        onClose={() => setShowComponentsModal(false)}
        components={componentsList}
      />

      {/* Top Header Stats & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 border border-slate-800/80 p-3.5 sm:p-4 rounded-2xl backdrop-blur-md">
        {/* Round & Question Indicator */}
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-xs sm:text-sm">
            ROUND {currentRound}
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-300">
            Question <span className="text-white font-mono font-bold">{questionIndex}</span> / {totalQuestionsInRound}
          </div>
        </div>

        {/* Score & Streak */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-200">
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <span>{score} PTS</span>
          </div>

          {streak > 0 && (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-500/30 text-xs font-mono font-bold text-amber-400">
              <Flame className="w-3.5 h-3.5" />
              <span>{streak}</span>
            </div>
          )}

          {/* Rules and Components Reference Buttons */}
          <button
            onClick={() => setShowInstructions(true)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Official Rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowComponentsModal(true)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 text-xs font-semibold transition-colors"
            title="Components Reference"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reference</span>
          </button>
        </div>
      </div>

      {/* Main Game Arena: Scientist Card + Timer + Question + 5 Options */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Top (Main Questions & Scientist) */}
        <div className="lg:col-span-9 space-y-6">
          {/* 1. SCIENTIST CARD (PROMINENT AT TOP) */}
          <ScientistCard scientist={currentQuestion.scientist} />

          {/* 2. QUESTION & 5 OPTIONS */}
          <QuestionCard
            questionText={currentQuestion.question_text}
            options={currentQuestion.options}
            selectedOption={selectedOption}
            onSelectOption={handleSelectOption}
            isSubmitted={isSubmitted}
            isCorrect={submissionResult?.is_correct}
            correctOption={submissionResult?.correct_option}
            disabled={isTimeUp || isSubmitting}
          />
        </div>

        {/* Right / Sidebar: Countdown Timer & Controls */}
        <div className="lg:col-span-3 space-y-5">
          {/* Timer Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col items-center justify-center text-center shadow-lg backdrop-blur-md">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
              Remaining Time
            </span>
            <Timer
              duration={timerDuration}
              onTimeUp={handleTimeUp}
              isPaused={isSubmitted}
              questionKey={currentQuestion.id}
            />
            {isTimeUp && !isSubmitted && (
              <p className="mt-3 text-xs font-bold text-rose-400 animate-pulse">
                Time expired! Locked.
              </p>
            )}
          </div>

          {/* Action Button: Submit or Next */}
          <div className="space-y-3">
            {!isSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={!selectedOption || isSubmitting || isTimeUp}
                className={`w-full py-4 px-5 rounded-2xl font-bold text-base flex items-center justify-center space-x-2 shadow-lg transition-all ${
                  selectedOption && !isTimeUp
                    ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25 cursor-pointer active:scale-98'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                }`}
              >
                <Send className="w-5 h-5" />
                <span>{isSubmitting ? 'Evaluating...' : 'Submit Answer'}</span>
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="w-full py-4 px-5 rounded-2xl font-bold text-base flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white shadow-lg shadow-indigo-500/25 cursor-pointer transition-all active:scale-98"
              >
                <span>Next Question</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Answer Feedback Banner */}
            {isSubmitted && submissionResult && (
              <div
                className={`p-4 rounded-2xl border text-sm font-medium ${
                  submissionResult.is_correct
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {submissionResult.is_correct ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <span className="font-bold text-base">
                    {submissionResult.is_correct ? 'Correct! (+100 PTS)' : 'Incorrect!'}
                  </span>
                </div>
                <p className="text-xs opacity-90">
                  Correct Answer was <span className="font-bold font-mono">Option {submissionResult.correct_option}</span>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
