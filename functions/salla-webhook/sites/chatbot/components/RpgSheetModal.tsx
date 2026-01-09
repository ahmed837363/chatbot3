import React, { useMemo, useState } from 'react';
import { RpgResource, RpgState } from '../types';

interface RpgSheetModalProps {
  state: RpgState;
  onSave: (next: RpgState) => void;
  onCancel: () => void;
}

const emptyResource = (): RpgResource => ({
  id: `res_${Date.now()}_${Math.random()}`,
  label: 'Resource',
  value: '0',
});

export const RpgSheetModal: React.FC<RpgSheetModalProps> = ({ state, onSave, onCancel }) => {
  const [form, setForm] = useState<RpgState>({
    ...state,
    resources: state.resources ? [...state.resources] : [],
  });

  const handleNumberChange = (key: keyof RpgState, value: number) => {
    setForm((prev) => ({ ...prev, [key]: Number.isNaN(value) ? prev[key] : value }));
  };

  const handleResourceChange = (id: string, key: keyof RpgResource, value: string) => {
    setForm((prev) => ({
      ...prev,
      resources: (prev.resources || []).map((resource) =>
        resource.id === id ? { ...resource, [key]: value } : resource,
      ),
    }));
  };

  const addResource = () => {
    setForm((prev) => ({ ...prev, resources: [...(prev.resources || []), emptyResource()] }));
  };

  const removeResource = (id: string) => {
    setForm((prev) => ({
      ...prev,
      resources: (prev.resources || []).filter((resource) => resource.id !== id),
    }));
  };

  const hasResources = useMemo(() => (form.resources || []).length > 0, [form.resources]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-surface/95 p-6 text-white shadow-glow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Edit RPG Sheet</h2>
          <button onClick={onCancel} className="text-white/60 transition hover:text-white">✕</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-white/70">Player name</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white focus:border-primary focus:outline-none"
              value={form.playerName}
              onChange={(e) => setForm((prev) => ({ ...prev, playerName: e.target.value }))}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-white/70">Title</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white focus:border-primary focus:outline-none"
              value={form.title || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-white/70">Level</span>
            <input
              type="number"
              className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white focus:border-primary focus:outline-none"
              value={form.level}
              onChange={(e) => handleNumberChange('level', parseInt(e.target.value, 10))}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-white/70">XP</span>
            <input
              type="number"
              className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white focus:border-primary focus:outline-none"
              value={form.xp}
              onChange={(e) => handleNumberChange('xp', parseInt(e.target.value, 10))}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-white/70">HP</span>
            <input
              type="number"
              className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white focus:border-primary focus:outline-none"
              value={form.hp}
              onChange={(e) => handleNumberChange('hp', parseInt(e.target.value, 10))}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-white/70">Max HP</span>
            <input
              type="number"
              className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white focus:border-primary focus:outline-none"
              value={form.maxHp}
              onChange={(e) => handleNumberChange('maxHp', parseInt(e.target.value, 10))}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-white/70">Stamina</span>
            <input
              type="number"
              className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white focus:border-primary focus:outline-none"
              value={form.stamina ?? 0}
              onChange={(e) => handleNumberChange('stamina', parseInt(e.target.value, 10))}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-white/70">Max stamina</span>
            <input
              type="number"
              className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white focus:border-primary focus:outline-none"
              value={form.maxStamina ?? 0}
              onChange={(e) => handleNumberChange('maxStamina', parseInt(e.target.value, 10))}
            />
          </label>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">Resources</p>
              <p className="text-xs text-white/50">Add or remove currencies, meters, or quest trackers.</p>
            </div>
            <button onClick={addResource} className="rounded-full bg-primary/30 px-3 py-2 text-xs font-semibold text-white hover:bg-primary/50">
              + Add resource
            </button>
          </div>
          {hasResources ? (
            <div className="space-y-3">
              {(form.resources || []).map((resource) => (
                <div key={resource.id} className="grid gap-2 rounded-2xl border border-white/10 p-3 sm:grid-cols-2">
                  <input
                    className="rounded-xl border border-white/10 bg-black/20 p-2 text-sm text-white"
                    value={resource.label}
                    onChange={(e) => handleResourceChange(resource.id, 'label', e.target.value)}
                    placeholder="Name"
                  />
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-xl border border-white/10 bg-black/20 p-2 text-sm text-white"
                      value={resource.value}
                      onChange={(e) => handleResourceChange(resource.id, 'value', e.target.value)}
                      placeholder="Value"
                    />
                    <button
                      onClick={() => removeResource(resource.id)}
                      className="rounded-xl border border-red-400/30 px-3 text-xs text-red-200 hover:bg-red-400/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/50">No resources yet. Add gold, mana, reputation, etc.</p>
          )}
        </div>
        <label className="mt-4 block space-y-2 text-sm">
          <span className="text-white/70">Notes & inventory</span>
          <textarea
            className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white focus:border-primary focus:outline-none"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Quest hooks, NPC debts, gear..."
          />
        </label>
        <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 p-3 text-sm text-white/80">
          <input
            type="checkbox"
            className="accent-primary"
            checked={form.narratorUnlocked}
            onChange={(e) => setForm((prev) => ({ ...prev, narratorUnlocked: e.target.checked }))}
          />
          <span>Allow narrator override button</span>
        </label>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => onSave({ ...form, resources: form.resources || [] })}
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:shadow-glow"
          >
            Save sheet
          </button>
          <button
            onClick={onCancel}
            className="rounded-full border border-white/20 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
