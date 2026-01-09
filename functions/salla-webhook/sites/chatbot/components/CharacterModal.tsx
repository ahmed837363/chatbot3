import React, { useState } from 'react';
import { Character } from '../types';

interface CharacterModalProps {
  character: Character;
  onSave: (character: Character) => void;
  onCancel: () => void;
  onEvolve: (character: Character) => Promise<{ description: string; instructions: string }>;
  onDelete?: (id: string) => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({ character, onSave, onCancel, onEvolve, onDelete }) => {
  const [form, setForm] = useState<Character>({ ...character, id: character.id || `char_${Date.now()}` });
  const [isEvolving, setIsEvolving] = useState(false);

  const canSave = form.name.trim().length > 0 && form.description.trim().length > 0;

  const handleChange = (key: keyof Character, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePortraitUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleChange('portraitUrl', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleEvolve = async () => {
    setIsEvolving(true);
    try {
      const updates = await onEvolve(form);
      setForm((prev) => ({ ...prev, ...updates }));
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsEvolving(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete || !form.id) return;
    if (window.confirm(`Delete ${form.name || 'this character'}? This cannot be undone.`)) {
      onDelete(form.id);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-surface/95 p-6 shadow-glow">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">{character.id ? 'Edit character' : 'Create character'}</h2>
          <button onClick={onCancel} className="text-gray-400 transition hover:text-white">✕</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-gray-300">Name</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-white focus:border-primary focus:outline-none"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-gray-300">Portrait URL (optional)</span>
            <input
              className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-white focus:border-primary focus:outline-none"
              value={form.portraitUrl || ''}
              onChange={(e) => handleChange('portraitUrl', e.target.value)}
              placeholder="https://"
            />
            <input
              type="file"
              accept="image/*"
              className="mt-2 w-full text-xs text-white/70"
              onChange={handlePortraitUpload}
            />
            {form.portraitUrl && form.portraitUrl.startsWith('data:image') && (
              <img src={form.portraitUrl} alt={form.name} className="mt-2 h-24 w-24 rounded-xl object-cover" />
            )}
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-gray-300">Description</span>
            <textarea
              className="h-40 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-white focus:border-primary focus:outline-none"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="text-gray-300">Behavior instructions</span>
            <textarea
              className="h-40 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-white focus:border-primary focus:outline-none"
              value={form.instructions}
              onChange={(e) => handleChange('instructions', e.target.value)}
              placeholder="Tone, pacing, restrictions..."
            />
          </label>
        </div>
        <div className="mt-4">
          <label className="space-y-2 text-sm">
            <span className="text-gray-300">Lore & secrets (hidden)</span>
            <textarea
              className="h-32 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-white focus:border-primary focus:outline-none"
              value={form.lore || ''}
              onChange={(e) => handleChange('lore', e.target.value)}
              placeholder="Add private backstory, secret motives, or twists the player character remembers but others might not know."
            />
            <p className="text-xs text-white/40">This stays in the prompt but is never shown to other characters directly.</p>
          </label>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-white transition hover:shadow-glow disabled:cursor-not-allowed disabled:bg-white/20"
            disabled={!canSave}
            onClick={() => onSave(form)}
          >
            Save
          </button>
          <button
            className="rounded-lg border border-white/20 px-6 py-3 text-white transition hover:bg-white/5"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex items-center gap-2 rounded-lg border border-primary/50 px-6 py-3 text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleEvolve}
            disabled={isEvolving}
          >
            {isEvolving ? 'Evolving…' : 'Evolve with AI'}
          </button>
          {character.id && onDelete && (
            <button
              className="rounded-lg border border-red-400/40 px-6 py-3 text-red-200 transition hover:bg-red-400/10"
              onClick={handleDelete}
            >
              Delete character
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
