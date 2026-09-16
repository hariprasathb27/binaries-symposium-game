'use client';

import React, { useState } from 'react';
import { Scientist } from '@/lib/types';
import { Globe, Calendar, Atom, Sparkles, User } from 'lucide-react';

interface ScientistCardProps {
  scientist: Scientist;
}

export default function ScientistCard({ scientist }: ScientistCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/90 via-[#0a1124]/90 to-slate-950/95 shadow-xl shadow-cyan-950/40 p-5 sm:p-6 backdrop-blur-xl">
      {/* Decorative Science Grid Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Header Tag */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300">
            <Atom className="w-4 h-4 animate-spin" style={{ animationDuration: '10s' }} />
          </span>
          <span className="text-xs font-black tracking-widest uppercase text-cyan-400">
            🔬 SCIENTIST CARD
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/60">
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>{scientist.country || 'Global Pioneer'}</span>
        </div>
      </div>

      {/* Scientist Profile Content */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Portrait / Image Frame */}
        <div className="relative group shrink-0">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-cyan-400/40 shadow-lg shadow-cyan-500/20 bg-slate-800 flex items-center justify-center">
            {!imgError && scientist.image_url ? (
              <img
                src={scientist.image_url}
                alt={scientist.name}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="eager"
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-tr from-cyan-900/60 to-slate-800 text-cyan-300">
                <User className="w-12 h-12 mb-1" />
                <span className="text-[10px] font-mono tracking-tight font-bold uppercase">Scientist</span>
              </div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg p-1.5 shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Scientist Details */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-1.5">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
              {scientist.name}
            </h2>
            {scientist.year && (
              <span className="inline-flex items-center justify-center text-xs font-mono font-medium text-cyan-300/80 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-500/30">
                <Calendar className="w-3 h-3 mr-1" />
                {scientist.year}
              </span>
            )}
          </div>

          <div className="text-sm font-semibold text-cyan-300 mb-2.5">
            {scientist.field || 'Inventions & Discoveries'}
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
            {scientist.description}
          </p>
        </div>
      </div>
    </div>
  );
}
