'use client';

import React, { useState, useEffect } from 'react';
import { ComponentItem } from '@/lib/types';
import ConfirmModal from '../common/ConfirmModal';
import { Plus, Trash2, Edit2, Shuffle, Cpu, Layers } from 'lucide-react';
import { soundManager } from '@/lib/sound';

export default function ComponentManager() {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ComponentItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
    description: '',
    category: 'Integrated Circuit',
  });
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/components');
      const data = await res.json();
      if (data.success && data.data) {
        setComponents(data.data);
      }
    } catch (err) {
      console.error('Error fetching components:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingComponent(null);
    setFormData({
      name: '',
      image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
      description: '',
      category: 'Integrated Circuit',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: ComponentItem) => {
    setEditingComponent(c);
    setFormData({
      name: c.name,
      image_url: c.image_url,
      description: c.description,
      category: c.category,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.description.trim()) {
      setError('Component name and description are required.');
      return;
    }

    try {
      const url = '/api/admin/components';
      const method = editingComponent ? 'PUT' : 'POST';
      const payload = editingComponent ? { id: editingComponent.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save component');
      }

      setIsModalOpen(false);
      await fetchComponents();
    } catch (err: any) {
      setError(err.message || 'Error saving component');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/admin/components?id=${deletingId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDeletingId(null);
        await fetchComponents();
      }
    } catch (err) {
      console.error('Delete component error:', err);
    }
  };

  const handleShuffle = async () => {
    try {
      soundManager.playShuffle();
      const res = await fetch('/api/admin/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'shuffle' }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setComponents(data.data);
      }
    } catch (err) {
      console.error('Shuffle error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/70 p-4 sm:p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Component Management</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              {components.length} Components
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Hardware components used for quiz content and symposium reference library. (No separate memory round).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleShuffle}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-all"
          >
            <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
            <span>🔀 Shuffle Existing</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>➕ Add & Shuffle</span>
          </button>
        </div>
      </div>

      {/* Components List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 font-mono text-xs">
          Loading Components...
        </div>
      ) : components.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">No components found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {components.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 hover:border-cyan-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/20">
                    {c.category}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
                      title="Edit Component"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(c.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete Component"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mb-1.5">{c.name}</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">{c.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT COMPONENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingComponent ? 'Edit Component' : 'Add Supporting Component'}
            </h3>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Component Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., NE555 Precision Timer IC"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white"
                >
                  <option value="Integrated Circuit">Integrated Circuit</option>
                  <option value="Processor">Processor</option>
                  <option value="Optoelectronics">Optoelectronics</option>
                  <option value="Analog IC">Analog IC</option>
                  <option value="Digital Logic">Digital Logic</option>
                  <option value="Sensor">Sensor</option>
                  <option value="Passive">Passive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Function *
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Technical description of this component..."
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
                  {editingComponent ? 'Save Changes' : 'Save & Shuffle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        title="Delete Component"
        message="Are you sure you want to delete this component?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
