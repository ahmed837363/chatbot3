import React from 'react';
import { Character } from '../types';

interface CharacterLibraryPageProps {
  characters: Character[];
  inChatIds: string[];
  onAddToChat: (id: string) => void;
  onEditCharacter: (character: Character) => void;
  onNewCharacter: () => void;
  onBack: () => void;
}

export const CharacterLibraryPage: React.FC<CharacterLibraryPageProps> = ({
  characters,
  inChatIds,
  onAddToChat,
  onEditCharacter,
  onNewCharacter,
  onBack,
}) => {
  const sorted = [...characters].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex h-screen w-full flex-col bg-gradient-to-b from-[#05030a] via-[#0b0a19] to-[#07050d] text-white">
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-full border border-white/20 px-3 py-1 text-sm text-white/80 transition hover:bg-white/10"
          >
            Back to chat
          </button>
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.25em] text-primary">Character library</p>
            <h2 className="text-lg font-semibold">Create and manage your cast</h2>
          </div>
        </div>
        <button
          onClick={onNewCharacter}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:shadow-glow"
        >
          + New character
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {characters.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-white/70">
            <p className="text-base font-semibold">No characters yet.</p>
            <p className="text-sm text-white/50">Create a character and add them to your chat when you're ready.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((character) => {
              const inChat = inChatIds.includes(character.id);
              return (
                <div key={character.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3">
                    {character.portraitUrl ? (
                      <img src={character.portraitUrl} alt={character.name} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-semibold">
                        {character.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{character.name}</p>
                      <p className="text-xs text-white/60 truncate">{character.description || 'No description yet.'}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-white/70 overflow-hidden text-ellipsis">
                    {character.instructions || 'No behavior instructions set.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => onEditCharacter(character)}
                      className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onAddToChat(character.id)}
                      disabled={inChat}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        inChat
                          ? 'cursor-not-allowed border border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
                          : 'border border-primary/50 text-primary hover:bg-primary/10'
                      }`}
                    >
                      {inChat ? 'In this chat' : 'Add to chat'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
