'use client';

import React, { useState } from 'react';
import { Scientist } from '@/lib/types';
import { Globe, Calendar, Atom, Sparkles, User, Award } from 'lucide-react';

interface ScientistCardProps {
  scientist: Scientist;
}

export default function ScientistCard({ scientist }: ScientistCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/95 via-[#0a1124]/95 to-slate-950/95 shadow-2xl shadow-cyan-950/50 p-5 sm:p-7 md:p-8 backdrop-blur-xl text-center">
      {/* Decorative Science Grid Glows */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Header Tag Bar */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-5 relative z-10">
        <div className="flex items-center space-x-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300">
            <Atom className="w-4 h-4 animate-spin" style={{ animationDuration: '12s' }} />
          </span>
          <span className="text-xs font-black tracking-widest uppercase text-cyan-400">
            🔬 SCIENTIST CARD
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {scientist.country && (
            <div className="flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-800/90 px-3 py-1 rounded-full border border-slate-700/80 shadow-sm">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>{scientist.country}</span>
            </div>
          )}

          {scientist.year && (
            <div className="hidden sm:flex items-center space-x-1.5 text-xs font-mono text-cyan-300 bg-cyan-950/70 px-3 py-1 rounded-full border border-cyan-500/30 shadow-sm">
              <Calendar className="w-3 h-3 text-cyan-400" />
              <span>{scientist.year}</span>
            </div>
          )}
        </div>
      </div>

      {/* PROMINENT CENTERED SCIENTIST IMAGE (Desktop: ~320px, Tablet: ~256px-288px, Mobile: ~224px) */}
      <div className="flex justify-center my-2 sm:my-4 relative z-10">
        <div className="relative group">
          <div className="w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-2xl md:rounded-3xl overflow-hidden border-2 border-cyan-400/50 shadow-2xl shadow-cyan-500/30 bg-slate-900 flex items-center justify-center transition-all duration-300 group-hover:border-cyan-300 group-hover:shadow-cyan-400/40">
            {!imgError && scientist.image_url ? (
              <img
                src={scientist.image_url}
                alt={scientist.name || 'Scientist Portrait'}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                loading="eager"
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-tr from-cyan-950 to-slate-900 text-cyan-300">
                <User className="w-20 h-20 mb-2 opacity-70" />
                <span className="text-xs font-mono tracking-wider font-bold uppercase">
                  {scientist.name || 'Scientist'}
                </span>
              </div>
            )}
          </div>

          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl p-2 shadow-lg shadow-cyan-500/40">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Scientist Identity Details */}
      <div className="relative z-10 mt-3 space-y-2 max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white font-sans">
          {scientist.name}
        </h2>

        {scientist.field && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs sm:text-sm font-semibold text-cyan-300">
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <span>{scientist.field}</span>
          </div>
        )}

        {/* Mobile-only Year Badge */}
        {scientist.year && (
          <div className="sm:hidden block">
            <span className="inline-flex items-center text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded border border-slate-700">
              <Calendar className="w-3 h-3 mr-1 text-cyan-400" />
              {scientist.year}
            </span>
          </div>
        )}

        {/* Clue / Description box */}
        {scientist.description && (
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 sm:p-4 rounded-2xl border border-slate-800/90 shadow-inner mt-2">
            {scientist.description}
          </p>
        )}
      </div>
    </div>
  );
}
