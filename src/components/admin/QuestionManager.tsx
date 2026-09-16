'use client';

import React, { useState, useEffect } from 'react';
import { Question, Scientist, OptionKey } from '@/lib/types';
import ConfirmModal from '../common/ConfirmModal';
import {
  Plus,
  Trash2,
  Edit2,
  Shuffle,
  HelpCircle,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
} from 'lucide-react';
import { soundManager } from '@/lib/sound';

interface QuestionManagerProps {
  scientists: Scientist[];
  currentRound: number;
}

export default function QuestionManager({ scientists, currentRound }: QuestionManagerProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState({
    scientist_id: '',
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    option_e: '',
    correct_option: 'A' as OptionKey,
    round_number: 1,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Deletion Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Shuffle Feedback
  const [isShuffling, setIsShuffling] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [selectedRoundFilter]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const url =
        selectedRoundFilter === 'all'
          ? '/api/admin/questions'
          : `/api/admin/questions?round=${selectedRoundFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.data) {
        setQuestions(data.data);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setFormData({
      scientist_id: scientists[0]?.id || '',
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      option_e: '',
      correct_option: 'A',
      round_number: currentRound || 1,
      difficulty: 'medium',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    setEditingQuestion(q);
    setFormData({
      scientist_id: q.scientist_id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e,
      correct_option: q.correct_option,
      round_number: q.round_number,
      difficulty: q.difficulty,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.scientist_id) {
      setFormError('Please select a scientist.');
      return;
    }
    if (!formData.question_text.trim()) {
      setFormError('Question text is required.');
      return;
    }
    if (
      !formData.option_a.trim() ||
      !formData.option_b.trim() ||
      !formData.option_c.trim() ||
      !formData.option_d.trim() ||
      !formData.option_e.trim()
    ) {
      setFormError('Exactly 5 options (A, B, C, D, E) must be provided.');
      return;
    }

    try {
      const url = '/api/admin/questions';
      const method = editingQuestion ? 'PUT' : 'POST';
      const payload = editingQuestion ? { id: editingQuestion.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save question');
      }

      setIsModalOpen(false);
      await fetchQuestions();
    } catch (err: any) {
      setFormError(err.message || 'Error saving question');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/admin/questions?id=${deletingId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDeletingId(null);
        await fetchQuestions();
      }
    } catch (err) {
      console.error('Delete question error:', err);
    }
  };

  const handleShuffle = async (mode: 'all' | 'round') => {
    try {
      setIsShuffling(true);
      soundManager.playShuffle();
      const res = await fetch('/api/admin/shuffle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          roundNumber: mode === 'round' ? currentRound : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchQuestions();
      }
    } catch (err) {
      console.error('Shuffle error:', err);
    } finally {
      setTimeout(() => setIsShuffling(false), 500);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchSearch =
      q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.scientist?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Action Header & Shuffling */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/70 p-4 sm:p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Question Management</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              {questions.length} Questions
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Every question requires 1 Scientist, exactly 5 Options, and 1 Correct Answer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Shuffle Buttons */}
          <button
            onClick={() => handleShuffle('round')}
            disabled={isShuffling}
            className={`px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-all ${
              isShuffling ? 'opacity-50 animate-pulse' : ''
            }`}
          >
            <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
            <span>🔀 Shuffle Round {currentRound}</span>
          </button>

          <button
            onClick={() => handleShuffle('all')}
            disabled={isShuffling}
            className={`px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-all ${
              isShuffling ? 'opacity-50 animate-pulse' : ''
            }`}
          >
            <Shuffle className="w-3.5 h-3.5 text-purple-400" />
            <span>🔀 Shuffle All</span>
          </button>

          {/* Add Question Button */}
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by question or scientist name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedRoundFilter}
            onChange={(e) =>
              setSelectedRoundFilter(
                e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10)
              )
            }
            className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/60"
          >
            <option value="all">All Quiz Rounds</option>
            <option value={1}>Round 1</option>
            <option value={2}>Round 2</option>
            <option value={3}>Round 3</option>
          </select>
        </div>
      </div>

      {/* Question List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 font-mono text-xs">
          Loading Questions...
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 p-8">
          <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No questions found matching your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredQuestions.map((q, idx) => (
            <div
              key={q.id}
              className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-5 hover:border-cyan-500/30 transition-all ${
                isShuffling ? 'scale-[0.99] opacity-80' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="w-7 h-7 rounded-lg bg-cyan-950 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center border border-cyan-500/30">
                    #{idx + 1}
                  </span>
                  <div>
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 mr-2">
                      Round {q.round_number}
                    </span>
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                      {q.difficulty}
                    </span>
                  </div>
                </div>

                {/* Edit & Delete Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEdit(q)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
                    title="Edit Question"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(q.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition-colors"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scientist & Question */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-cyan-400 mb-0.5">
                  🔬 Scientist: {q.scientist?.name || 'Unassigned'}
                </p>
                <h4 className="text-base font-bold text-white leading-snug">
                  {q.question_text}
                </h4>
              </div>

              {/* 5 Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-800/80">
                {(['A', 'B', 'C', 'D', 'E'] as OptionKey[]).map((key) => {
                  const text = (q as any)[`option_${key.toLowerCase()}`];
                  const isCorrect = q.correct_option === key;
                  return (
                    <div
                      key={key}
                      className={`text-xs p-2.5 rounded-xl border flex items-center space-x-2 ${
                        isCorrect
                          ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200 font-bold'
                          : 'border-slate-800/80 bg-slate-950/40 text-slate-400'
                      }`}
                    >
                      <span className="font-mono font-bold shrink-0">{key}.</span>
                      <span className="truncate">{text}</span>
                      {isCorrect && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-auto" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingQuestion ? 'Edit Question' : 'Add New Question (5 Options Required)'}
            </h3>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Scientist Select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Scientist *
                  </label>
                  <select
                    value={formData.scientist_id}
                    onChange={(e) => setFormData({ ...formData, scientist_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  >
                    <option value="">-- Choose Scientist --</option>
                    {scientists.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.field})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Round & Difficulty */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Round *</label>
                    <select
                      value={formData.round_number}
                      onChange={(e) =>
                        setFormData({ ...formData, round_number: parseInt(e.target.value, 10) })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                    >
                      <option value={1}>Round 1</option>
                      <option value={2}>Round 2</option>
                      <option value={3}>Round 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) =>
                        setFormData({ ...formData, difficulty: e.target.value as any })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Question Text *
                </label>
                <textarea
                  rows={2}
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  placeholder="e.g., Which breakthrough electrical invention did Nikola Tesla patent in 1888?"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>

              {/* 5 Options Inputs */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-cyan-400">
                  Exactly 5 Answer Options (Mark ONE as Correct)
                </label>
                {(['A', 'B', 'C', 'D', 'E'] as OptionKey[]).map((key) => {
                  const fieldName = `option_${key.toLowerCase()}` as keyof typeof formData;
                  const isCorrect = formData.correct_option === key;
                  return (
                    <div key={key} className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, correct_option: key })}
                        className={`w-9 h-9 rounded-xl font-mono font-bold text-sm shrink-0 border transition-all ${
                          isCorrect
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                        }`}
                        title="Mark as correct option"
                      >
                        {key}
                      </button>
                      <input
                        type="text"
                        placeholder={`Option ${key} text`}
                        value={formData[fieldName] as string}
                        onChange={(e) =>
                          setFormData({ ...formData, [fieldName]: e.target.value })
                        }
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                      />
                      {isCorrect && (
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider shrink-0">
                          Correct ✅
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg"
                >
                  {editingQuestion ? 'Save Changes' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        title="Delete Question"
        message="Are you sure you want to delete this question? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
