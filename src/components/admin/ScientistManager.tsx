'use client';

import React, { useState, useEffect } from 'react';
import { Scientist } from '@/lib/types';
import ConfirmModal from '../common/ConfirmModal';
import { Plus, Trash2, Edit2, User, Globe, Calendar, Atom, Search } from 'lucide-react';

interface ScientistManagerProps {
  onScientistsUpdated?: () => void;
}

export default function ScientistManager({ onScientistsUpdated }: ScientistManagerProps) {
  const [scientists, setScientists] = useState<Scientist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScientist, setEditingScientist] = useState<Scientist | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    description: '',
    field: '',
    country: '',
    year: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Deletion Modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchScientists();
  }, []);

  const fetchScientists = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/scientists');
      const data = await res.json();
      if (data.success && data.data) {
        setScientists(data.data);
      }
    } catch (err) {
      console.error('Error fetching scientists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingScientist(null);
    setFormData({
      name: '',
      image_url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
      description: '',
      field: 'Physics & Electrical Engineering',
      country: '',
      year: '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Scientist) => {
    setEditingScientist(s);
    setFormData({
      name: s.name,
      image_url: s.image_url,
      description: s.description,
      field: s.field,
      country: s.country,
      year: s.year,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.description.trim()) {
      setError('Scientist name and description are required.');
      return;
    }

    try {
      const url = '/api/admin/scientists';
      const method = editingScientist ? 'PUT' : 'POST';
      const payload = editingScientist ? { id: editingScientist.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save scientist');
      }

      setIsModalOpen(false);
      await fetchScientists();
      if (onScientistsUpdated) onScientistsUpdated();
    } catch (err: any) {
      setError(err.message || 'Error saving scientist');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/admin/scientists?id=${deletingId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDeletingId(null);
        await fetchScientists();
        if (onScientistsUpdated) onScientistsUpdated();
      }
    } catch (err) {
      console.error('Delete scientist error:', err);
    }
  };

  const filteredScientists = scientists.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.field.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/70 p-4 sm:p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Scientist Management</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              {scientists.length} Scientists
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Scientist cards shown in the live quiz automatically reflect these credentials.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Scientist</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search scientists by name or scientific discipline..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/60"
        />
      </div>

      {/* Scientists Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 font-mono text-xs">
          Loading Scientists...
        </div>
      ) : filteredScientists.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">No scientists found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScientists.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 hover:border-cyan-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-cyan-500/30 bg-slate-800 shrink-0">
                    <img
                      src={s.image_url}
                      alt={s.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
                      title="Edit Scientist"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(s.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete Scientist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mb-0.5">{s.name}</h3>
                <p className="text-xs font-semibold text-cyan-400 mb-2">{s.field}</p>
                <p className="text-xs text-slate-300 line-clamp-3 mb-3">{s.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>{s.country}</span>
                <span>{s.year}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT SCIENTIST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingScientist ? 'Edit Scientist' : 'Add New Scientist'}
            </h3>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Scientist Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Nikola Tesla"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Image URL / Portrait *
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Field of Study
                  </label>
                  <input
                    type="text"
                    value={formData.field}
                    onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                    placeholder="e.g., Electrical Engineering"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Country of Origin
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g., Serbia / USA"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Lifespan / Era
                </label>
                <input
                  type="text"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="e.g., 1856 – 1943"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Scientist Description / Clues *
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief synopsis of achievements and background..."
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
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg"
                >
                  {editingScientist ? 'Save Changes' : 'Add Scientist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        title="Delete Scientist"
        message="Are you sure you want to delete this scientist? Any associated quiz questions may be affected."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
