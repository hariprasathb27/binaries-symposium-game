'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PublicQuestion, OptionKey, SubmitAnswerResponse, ComponentItem } from '@/lib/types';
import ScientistCard from './ScientistCard';
import QuestionCard from './QuestionCard';
import Timer from './Timer';
import TeamEntryScreen from './TeamEntryScreen';
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
  Users,
  LogOut,
} from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface GameScreenProps {
  onNavigateToWinners: () => void;
}

export default function GameScreen({ onNavigateToWinners }: GameScreenProps) {
  // Participant & Team Session State
  const [isGameStarted, setIsGameStarted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('binaries_game_started') === 'true';
    }
    return false;
  });

  const [teamName, setTeamName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('binaries_participant_team') || '';
    }
    return '';
  });

  const [participantName, setParticipantName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('binaries_participant_name') || '';
    }
    return '';
  });

  // Game state
  const [currentQuestion, setCurrentQuestion] = useState<PublicQuestion | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Settings & Progress (Defaults, synced from server)
  const [timerDuration, setTimerDuration] = useState<number>(20);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalRounds, setTotalRounds] = useState<number>(3);
  const [questionsPerRound, setQuestionsPerRound] = useState<number>(5);
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

  // Modals
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [showComponentsModal, setShowComponentsModal] = useState<boolean>(false);
  const [componentsList, setComponentsList] = useState<ComponentItem[]>([]);
  const [instructionsText, setInstructionsText] = useState<string>('');

  const autoNextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Comprehensive reset of all game session states and timers for a clean team transition
  const clearSessionAndState = useCallback(() => {
    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current);
      autoNextTimeoutRef.current = null;
    }

    setScore(0);
    setStreak(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setIsSubmitting(false);
    setIsTimeUp(false);
    setSubmissionResult(null);
    setCurrentQuestion(null);
    setGameStatus('active');
    setError(null);

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

  // Clean up any pending auto-next timeout on unmount
  useEffect(() => {
    return () => {
      if (autoNextTimeoutRef.current) {
        clearTimeout(autoNextTimeoutRef.current);
      }
    };
  }, []);

  // Helper to derive participant/team session key
  const getParticipantId = useCallback((overrideTeam?: string) => {
    const t = overrideTeam !== undefined ? overrideTeam : teamName;
    return t ? `team_${t.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}` : 'participant_anonymous';
  }, [teamName]);

  // Fetch current question (strictly only called AFTER game has started)
  const fetchCurrentQuestion = useCallback(async (overrideParticipantId?: string, overrideTeam?: string) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedOption(null);
      setIsSubmitted(false);
      setIsSubmitting(false);
      setIsTimeUp(false);
      setSubmissionResult(null);

      const pId = overrideParticipantId || getParticipantId(overrideTeam);
      const tName = overrideTeam !== undefined ? overrideTeam : teamName;
      const url = `/api/game/current?participant_id=${encodeURIComponent(pId)}&team_name=${encodeURIComponent(tName)}`;

      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || 'Failed to load question');
      }

      if (json.settings) {
        setTimerDuration(json.settings.timer_duration || 20);
        setCurrentRound(json.settings.current_round || 1);
        setTotalRounds(json.settings.total_rounds || 3);
        setAutoNext(Boolean(json.settings.auto_next));

        // Critical safeguard: Only mark gameStatus as completed if there is truly no question data returned
        if (!json.data && json.settings.game_status === 'completed') {
          setGameStatus('completed');
        } else {
          setGameStatus('active');
        }
      }

      setCurrentQuestion(json.data);
    } catch (err: any) {
      console.error('Fetch question error:', err);
      setError(err.message || 'Error connecting to symposium quiz server.');
    } finally {
      setLoading(false);
    }
  }, [getParticipantId, teamName]);

  // Fetch game settings and supporting metadata on mount (does NOT start timer or load question)
  useEffect(() => {
    // 1. Fetch game settings for metadata & welcome screen
    fetch('/api/game/state', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.settings) {
          const s = data.data.settings;
          setTimerDuration(s.timer_duration || 20);
          setCurrentRound(s.current_round || 1);
          setTotalRounds(s.total_rounds || 3);
          setQuestionsPerRound(s.questions_per_round || 5);
          setAutoNext(Boolean(s.auto_next));
          if (s.instructions) {
            setInstructionsText(s.instructions);
          }
        }
      })
      .catch(() => {});

    // 2. Fetch components for reference sheet
    fetch('/api/game/components', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setComponentsList(data.data);
        }
      })
      .catch(() => {});

    // 3. If the participant already started a session in this browser tab, restore the question
    if (isGameStarted) {
      fetchCurrentQuestion();
    }
  }, [isGameStarted, fetchCurrentQuestion]);

  // Handle Start Game from Team Entry Screen
  const handleStartGame = async (newTeam: string, newParticipant: string) => {
    // 1. Wipe any leftover timeouts
    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current);
      autoNextTimeoutRef.current = null;
    }

    // 2. Reset all per-team states to guarantee a clean slate
    setScore(0);
    setStreak(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setIsSubmitting(false);
    setIsTimeUp(false);
    setSubmissionResult(null);
    setCurrentQuestion(null);
    setError(null);
    setGameStatus('active');

    // 3. Set new team credentials
    setTeamName(newTeam);
    setParticipantName(newParticipant);
    setIsGameStarted(true);

    const participantId = `team_${newTeam.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}`;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('binaries_game_started', 'true');
      sessionStorage.setItem('binaries_participant_team', newTeam);
      sessionStorage.setItem('binaries_participant_name', newParticipant);
      sessionStorage.setItem('binaries_current_score', '0');
    }

    soundManager.playClick();

    // 4. Explicitly initialize fresh team session on server (guaranteeing Round 1, Question 0)
    try {
      await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          team_name: newTeam,
          participant_name: newParticipant,
        }),
      });
    } catch (e) {
      console.error('Error starting team session:', e);
    }

    fetchCurrentQuestion(participantId, newTeam);
  };

  // Handle Leaving / Resetting Team Session
  const handleExitSession = () => {
    if (window.confirm('Are you sure you want to change team or leave the current quiz session?')) {
      clearSessionAndState();
      setIsGameStarted(false);
      setTeamName('');
      setParticipantName('');
    }
  };

  // Handle Answer Selection
  const handleSelectOption = (key: OptionKey) => {
    if (!isGameStarted || isSubmitted || isTimeUp || isSubmitting) return;
    setSelectedOption(key);
  };

  // Handle Answer Submit
  const handleSubmitAnswer = async () => {
    // Strict safeguard: Must have game started, an active question, a selected option, and not already submitted/submitting
    if (!isGameStarted || !currentQuestion || !selectedOption || isSubmitted || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const participantId = teamName
        ? `team_${teamName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        : 'participant_anonymous';
      const submissionToken = `token_${currentQuestion.id}_${participantId}_${Date.now()}`;

      const res = await fetch('/api/game/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          selected_option: selectedOption,
          participant_id: participantId,
          submission_token: submissionToken,
          team_name: teamName,
          participant_name: participantName,
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
    // Strict safeguard: only process if game is active, loaded, and not already submitted or submitting
    if (!isGameStarted || loading || !currentQuestion || isSubmitted || isSubmitting) {
      return;
    }

    setIsTimeUp(true);

    // Only auto-submit if the participant actually selected an option before time expired!
    // Never auto-submit an empty selection or trigger a false zero-score submission.
    if (selectedOption && !isSubmitted && !isSubmitting) {
      handleSubmitAnswer();
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
      const participantId = getParticipantId();
      const res = await fetch('/api/game/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          team_name: teamName,
        }),
      });
      const json = await res.json();

      if (json.data?.game_status === 'completed' || json.data?.session?.status === 'completed') {
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

  // -------------------------------------------------------------
  // FLOW 1: TEAM ENTRY SCREEN (Before Start Game)
  // -------------------------------------------------------------
  if (!isGameStarted) {
    return (
      <div className="w-full pb-20">
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

        <TeamEntryScreen
          onStartGame={handleStartGame}
          totalRounds={totalRounds}
          questionsPerRound={questionsPerRound}
          timerDuration={timerDuration}
          onShowRules={() => setShowInstructions(true)}
          onShowReference={() => setShowComponentsModal(true)}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // FLOW 2: QUIZ COMPLETED VIEW
  // -------------------------------------------------------------
  if (gameStatus === 'completed') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-b from-slate-900/90 via-slate-900/95 to-slate-950/90 p-8 sm:p-12 shadow-2xl shadow-amber-500/20 backdrop-blur-xl">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-lg shadow-amber-500/30">
            <Trophy className="w-10 h-10 animate-bounce-subtle" />
          </div>

          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-cyan-300 mb-3">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Team: {teamName || 'Symposium Participants'}</span>
            {participantName && <span className="text-slate-400">({participantName})</span>}
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
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Trophy className="w-5 h-5" />
              <span>View Winners Podium</span>
            </button>

            <button
              onClick={() => {
                clearSessionAndState();
                setIsGameStarted(false);
                setTeamName('');
                setParticipantName('');
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>New Team Quiz</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading && !currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-3xl border-3 border-cyan-400 border-t-transparent animate-spin mb-4 shadow-lg shadow-cyan-500/20" />
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => fetchCurrentQuestion()}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold shadow-lg transition-all cursor-pointer"
            >
              Retry Connection
            </button>
            <button
              onClick={handleExitSession}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-all cursor-pointer"
            >
              Return to Team Entry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const questionIndex = (currentQuestion.current_question_index ?? 0) + 1;
  const totalQuestionsInRound = currentQuestion.total_questions_in_round ?? questionsPerRound;

  // -------------------------------------------------------------
  // FLOW 3: ACTIVE QUIZ SCREEN
  // Centered Quiz Layout: Timer -> Scientist Card (Large) -> Question -> 5 Options -> Submit
  // -------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
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

      {/* Top Header Bar: Team Info + Round Progress + Score + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800/90 p-3 sm:p-4 rounded-2xl backdrop-blur-md shadow-md">
        {/* Team & Round Indicator */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-bold text-slate-200">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-cyan-300">{teamName}</span>
          </div>

          <div className="px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-xs sm:text-sm">
            ROUND {currentRound}
          </div>

          <div className="text-xs sm:text-sm font-semibold text-slate-300">
            Question <span className="text-white font-mono font-bold">{questionIndex}</span> / {totalQuestionsInRound}
          </div>
        </div>

        {/* Score, Streak & Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
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
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 text-xs font-semibold transition-colors"
            title="Components Reference"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Reference</span>
          </button>

          {/* Change Team Button */}
          <button
            onClick={handleExitSession}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
            title="Change Team / Exit"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1. CENTERED COUNTDOWN TIMER (VISUALLY PROMINENT FOR SYMPOSIUM PROJECTORS) */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-2">
          REMAINING TIME
        </div>
        <Timer
          key={`timer_${teamName}_${currentQuestion.id}_${currentRound}_${currentQuestion.current_question_index ?? 0}`}
          duration={timerDuration || 20}
          onTimeUp={handleTimeUp}
          isPaused={isSubmitted || isSubmitting || loading || !isGameStarted}
          questionKey={`${teamName}_${currentQuestion.id}`}
        />
        {isTimeUp && !isSubmitted && (
          <p className="mt-2 text-xs font-bold text-rose-400 animate-pulse">
            Time expired! Option locked.
          </p>
        )}
      </div>

      {/* 2. SCIENTIST CARD (PROMINENT LARGE CENTERED IMAGE APPROX 320PX) */}
      <ScientistCard scientist={currentQuestion.scientist} />

      {/* 3. INVENTION QUESTION & EXACTLY 5 ANSWER OPTIONS */}
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

      {/* 4. SUBMIT / NEXT ACTION BUTTON & FEEDBACK BANNER */}
      <div className="space-y-4 pt-2">
        {!isSubmitted ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={!selectedOption || isSubmitting || isTimeUp}
            className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center space-x-2.5 shadow-xl transition-all ${
              selectedOption && !isTimeUp
                ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/30 cursor-pointer active:scale-98'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <Send className="w-5 h-5" />
            <span>{isSubmitting ? 'Evaluating Live Server Answer...' : 'SUBMIT ANSWER'}</span>
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            className="w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:to-pink-400 text-white shadow-xl shadow-indigo-500/30 cursor-pointer transition-all active:scale-98"
          >
            <span>NEXT QUESTION</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Answer Feedback Banner (reveals correct option strictly after server evaluation) */}
        {isSubmitted && submissionResult && (
          <div
            className={`p-5 rounded-2xl border text-sm sm:text-base font-medium transition-all shadow-lg ${
              submissionResult.is_correct
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200 shadow-emerald-500/10'
                : 'bg-rose-950/70 border-rose-500/50 text-rose-200 shadow-rose-500/10'
            }`}
          >
            <div className="flex items-center space-x-2.5 mb-1.5">
              {submissionResult.is_correct ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
              )}
              <span className="font-bold text-lg">
                {submissionResult.is_correct ? 'Correct! (+100 PTS)' : 'Incorrect!'}
              </span>
            </div>
            <p className="text-xs sm:text-sm opacity-90 pl-8">
              Correct Answer was <span className="font-bold font-mono text-white underline decoration-cyan-400">Option {submissionResult.correct_option}</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
