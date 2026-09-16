'use client';

import React, { useState, useEffect } from 'react';
import { Winner } from '@/lib/types';
import ConfirmModal from '../common/ConfirmModal';
import { Plus, Trash2, Edit2, Trophy, ArrowUpDown, Award } from 'lucide-react';

export default function WinnerManager() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWinner, setEditingWinner] = useState<Winner | null>(null);
  const [formData, setFormData] = useState({
    position: 1,
    team_name: '',
    participant_name: '',
    score: 900,
    completion_time: '02:30',
  });
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWinners();
  }, []);

  const fetchWinners = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/winners');
      const data = await res.json();
      if (data.success && data.data) {
        setWinners(data.data);
      }
    } catch (err) {
      console.error('Error fetching winners:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingWinner(null);
    const nextPos = winners.length + 1;
    setFormData({
      position: nextPos,
      team_name: '',
      participant_name: '',
      score: 800,
      completion_time: '03:00',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (w: Winner) => {
    setEditingWinner(w);
    setFormData({
      position: w.position,
      team_name: w.team_name,
      participant_name: w.participant_name,
      score: w.score,
      completion_time: w.completion_time,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.team_name.trim() || !formData.participant_name.trim()) {
      setError('Team name and participant names are required.');
      return;
    }

    try {
      const url = '/api/admin/winners';
      const method = editingWinner ? 'PUT' : 'POST';
      const payload = editingWinner ? { id: editingWinner.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save winner');
      }

      setIsModalOpen(false);
      await fetchWinners();
    } catch (err: any) {
      setError(err.message || 'Error saving winner');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/admin/winners?id=${deletingId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDeletingId(null);
        await fetchWinners();
      }
    } catch (err) {
      console.error('Delete winner error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/70 p-4 sm:p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Winner & Podium Management</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30">
              {winners.length} Ranked
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Controls the 1st, 2nd, and 3rd place champions shown on the 🏆 Winners Podium screen.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Podium Winner</span>
        </button>
      </div>

      {/* Winner List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 font-mono text-xs">
          Loading Winners...
        </div>
      ) : winners.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">No winners recorded yet.</div>
      ) : (
        <div className="space-y-3">
          {winners.map((w) => {
            const isFirst = w.position === 1;
            const isSecond = w.position === 2;
            const isThird = w.position === 3;

            let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
            if (isFirst) badgeColor = 'bg-amber-500 text-slate-950 border-amber-400 font-black';
            else if (isSecond) badgeColor = 'bg-slate-300 text-slate-900 border-white font-bold';
            else if (isThird) badgeColor = 'bg-amber-700 text-white border-amber-600 font-bold';

            return (
              <div
                key={w.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-base border shrink-0 ${badgeColor}`}
                  >
                    {w.position === 1 ? '🥇' : w.position === 2 ? '🥈' : w.position === 3 ? '🥉' : `#${w.position}`}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{w.team_name}</span>
                      <span className="text-xs font-mono font-normal text-cyan-400">
                        ({w.score} PTS)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      {w.participant_name} • Time: <span className="font-mono text-slate-300">{w.completion_time}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(w)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                    title="Edit Winner"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(w.id)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete Winner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT WINNER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingWinner ? 'Edit Winner Record' : 'Add Winner to Podium'}
            </h3>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Rank Position *
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  >
                    <option value={1}>1st Place (Gold)</option>
                    <option value={2}>2nd Place (Silver)</option>
                    <option value={3}>3rd Place (Bronze)</option>
                    <option value={4}>4th Place</option>
                    <option value={5}>5th Place</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Score (PTS)
                  </label>
                  <input
                    type="number"
                    value={formData.score}
                    onChange={(e) =>
                      setFormData({ ...formData, score: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={formData.team_name}
                  onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                  placeholder="e.g., Binary Titans"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Participant Name(s) *
                </label>
                <input
                  type="text"
                  value={formData.participant_name}
                  onChange={(e) => setFormData({ ...formData, participant_name: e.target.value })}
                  placeholder="e.g., Alex Rivera & Sarah Chen"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Completion Time (MM:SS)
                </label>
                <input
                  type="text"
                  value={formData.completion_time}
                  onChange={(e) => setFormData({ ...formData, completion_time: e.target.value })}
                  placeholder="02:45"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg"
                >
                  {editingWinner ? 'Save Changes' : 'Add Winner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        title="Delete Winner Record"
        message="Are you sure you want to remove this winner from the symposium rankings?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
