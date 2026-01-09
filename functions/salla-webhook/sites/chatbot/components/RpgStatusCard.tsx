import React, { useState } from 'react';
import { RpgState } from '../types';

interface RpgStatusCardProps {
  state: RpgState;
  onEdit: () => void;
  onNarrate: () => void;
  onResume: () => void;
  isNarrating: boolean;
}

const StatBar: React.FC<{ label: string; value: number; max: number; tone: 'primary' | 'emerald' }> = ({ label, value, max, tone }) => {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const toneClasses = tone === 'primary' ? 'bg-primary' : 'bg-emerald-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[0.65rem] uppercase tracking-[0.25em] text-white/60">
        <span>{label}</span>
        <span className="text-white/80">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10">
        <div className={`h-full rounded-full ${toneClasses}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

export const RpgStatusCard: React.FC<RpgStatusCardProps> = ({ state, onEdit, onNarrate, onResume, isNarrating }) => {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <section className="mb-3 rounded-2xl border border-white/10 bg-black/10 p-3 text-white/90 shadow-[0_0_20px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.5rem] uppercase tracking-[0.35em] text-primary">RPG session</p>
          <h3 className="text-base font-semibold text-white">{state.playerName}</h3>
          {state.title && <p className="text-xs text-white/60">{state.title}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:bg-white/10"
          >
            {collapsed ? 'Show stats' : 'Hide stats'}
          </button>
          <button
            onClick={onEdit}
            className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:bg-white/10"
          >
            Edit sheet
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-[0.7rem] sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-[0.55rem] uppercase tracking-[0.3em] text-white/50">Level</p>
          <p className="text-xl font-bold text-white">{state.level}</p>
          <p className="text-[0.7rem] text-white/60">XP {state.xp}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <StatBar label="HP" value={state.hp} max={state.maxHp} tone="primary" />
        </div>
        {typeof state.stamina === 'number' && typeof state.maxStamina === 'number' && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <StatBar label="Stamina" value={state.stamina} max={state.maxStamina} tone="emerald" />
          </div>
        )}
      </div>
      {!collapsed && (
        <>
          {state.resources?.length ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="mb-1 text-[0.5rem] uppercase tracking-[0.3em] text-white/50">Resources</p>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                {state.resources.map((resource) => (
                  <div key={resource.id} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <p className="text-[0.55rem] uppercase tracking-[0.3em] text-white/40">{resource.label}</p>
                    <p className="text-base font-semibold text-white">{resource.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {state.notes && (
            <div className="mt-3 rounded-xl border border-white/5 bg-black/10 px-3 py-2 text-xs text-white/70">
              <p className="text-[0.5rem] uppercase tracking-[0.3em] text-white/40">Notes</p>
              <p className="whitespace-pre-wrap text-sm text-white/80">{state.notes}</p>
            </div>
          )}
        </>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <button
          onClick={isNarrating ? onResume : onNarrate}
          className={`rounded-full px-4 py-2 font-semibold uppercase tracking-[0.25em] transition ${
            isNarrating
              ? 'border border-emerald-400/40 text-emerald-200 hover:bg-emerald-400/10'
              : 'border border-primary/50 text-primary hover:bg-primary/10'
          }`}
        >
          {isNarrating ? 'Resume character voice' : 'Narrate this scene'}
        </button>
      </div>
    </section>
  );
};
