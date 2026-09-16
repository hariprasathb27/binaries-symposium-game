'use client';

import React from 'react';
import { X, Cpu, Tag, ExternalLink } from 'lucide-react';
import { ComponentItem } from '@/lib/types';

interface ComponentReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: ComponentItem[];
}

export default function ComponentReferenceModal({
  isOpen,
  onClose,
  components,
}: ComponentReferenceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-3xl border border-cyan-500/40 bg-slate-900/95 p-6 sm:p-8 shadow-2xl shadow-cyan-950/60 max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Component Reference Library
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Supporting Hardware & Electronic Inventions
            </p>
          </div>
        </div>

        {components.length === 0 ? (
          <p className="text-center text-slate-400 py-8">No components available in reference library.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {components.map((comp) => (
              <div
                key={comp.id}
                className="rounded-2xl border border-slate-800 bg-slate-850/80 p-4 hover:border-cyan-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/20">
                      {comp.category}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mb-1.5">{comp.name}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{comp.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
