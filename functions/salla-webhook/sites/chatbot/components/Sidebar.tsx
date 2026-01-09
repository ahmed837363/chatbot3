import React, { useRef, useState } from 'react';
import { Character, PresenceStatus, Settings, SidebarTab, WorldInfo, ChatSession, Relationship } from '../types';
import { getEmotionEmoji, getEmotionColor, getRelationshipDescription } from '../services/apiService';

type Setter<T> = T | ((prev: T) => T);

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  characters: Character[];
  onNewCharacter: () => void;
  onEditCharacter: (character: Character) => void;
  worldInfo: WorldInfo;
  setWorldInfo: (value: Setter<WorldInfo>) => void;
  settings: Settings;
  setSettings: (value: Setter<Settings>) => void;
  onClearChat: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  isVeoKeySelected: boolean;
  onSelectVeoKey: () => void;
  onUserPortraitChange: (dataUrl: string) => void;
  activePartyIds: string[];
  onTogglePartyMember: (id: string) => void;
  onSelectAllParty: () => void;
  onStartRpgSession: () => void;
  canStartRpgSession: boolean;
  onSetCharacterPresence?: (id: string, status: PresenceStatus) => void;
  onAddCharacterToStory: (id: string) => void;
  onRemoveCharacterFromStory: (id: string) => void;
}

const tabs: { id: SidebarTab; label: string }[] = [
  { id: 'chars', label: 'Characters' },
  { id: 'world', label: 'World' },
  { id: 'setup', label: 'Setup' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  characters,
  onNewCharacter,
  onEditCharacter,
  worldInfo,
  setWorldInfo,
  settings,
  setSettings,
  onClearChat,
  isVeoKeySelected,
  onSelectVeoKey,
  onUserPortraitChange,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  activePartyIds,
  onTogglePartyMember,
  onSelectAllParty,
  onExportBackup,
  onImportBackup,
  onStartRpgSession,
  canStartRpgSession,
  onSetCharacterPresence,
  onAddCharacterToStory,
  onRemoveCharacterFromStory,
}) => {
  const storyCharacters = characters.filter((c) => c.inStory ?? true);
  const libraryCharacters = characters.filter((c) => !(c.inStory ?? true));

  const handlePortraitUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onUserPortraitChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const handleBackupImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onImportBackup(file);
    event.target.value = '';
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-full max-w-xs md:max-w-sm transform border-r border-white/5 bg-surface/95 shadow-2xl transition-transform duration-300 overflow-y-auto md:static md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-0'}`}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/60">Gemini RP</p>
          <h1 className="text-xl font-semibold text-white">Story Controls</h1>
        </div>
        <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 md:hidden">
          ✕
        </button>
      </div>
      <div className="space-y-2 border-b border-white/5 px-5 py-4 text-sm text-white/80">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/60">
          <span>Active chat</span>
          <span className="text-white/80">{sessions.length} {sessions.length === 1 ? 'story' : 'stories'}</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white"
            value={activeSessionId ?? sessions[0]?.id ?? ''}
            onChange={(e) => e.target.value && onSelectSession(e.target.value)}
          >
            {sessions.map((session) => (
              <option key={session.id} value={session.id} className="bg-secondary text-white">
                {session.title}
              </option>
            ))}
          </select>
          <button
            onClick={onNewChat}
            className="rounded-2xl bg-primary/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/50"
          >
            Start new chat
          </button>
        </div>
        <button
          onClick={onStartRpgSession}
          disabled={!canStartRpgSession}
          className="rounded-2xl border border-primary/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
        >
          {canStartRpgSession ? 'Start RPG chat' : 'RPG page open'}
        </button>
      </div>
      <nav className="flex gap-1 border-b border-white/5 px-4 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id ? 'bg-primary/20 text-white shadow-glow' : 'text-white/60 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="max-h-[calc(100vh-140px)] overflow-y-auto px-5 py-4 pb-16">
        {activeTab === 'chars' && (
          <div className="space-y-4">
            <button
              onClick={onNewCharacter}
              className="w-full rounded-2xl border border-dashed border-white/20 p-4 text-left text-white/70 transition hover:border-primary hover:text-white"
            >
              + New character
            </button>
            {characters.length === 0 && <p className="text-sm text-white/50">No characters yet. Create one to begin roleplay.</p>}
            {storyCharacters.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/80">
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wider text-white/60">
                  <span>Story talk roster</span>
                  <button
                    onClick={onSelectAllParty}
                    className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-primary hover:text-primary/80"
                  >
                    Select all
                  </button>
                </div>
                <p className="mb-1 text-xs text-white/50">
                  Toggle which characters are active in this story. The ones that glow here appear in the
                  "Who can talk" menu and join group chatter bursts.
                </p>
                <p className="mb-3 text-[0.65rem] uppercase tracking-[0.35em] text-white/40">Tap name to include/exclude. Tap status to change presence.</p>
                <div className="flex flex-wrap gap-2">
                  {storyCharacters.map((character) => {
                    const isActive = activePartyIds.includes(character.id);
                    const presence = character.presence ?? 'present';
                    const presenceColor = presence === 'present' ? 'bg-emerald-400' : presence === 'away' ? 'bg-red-400' : 'bg-gray-400';
                    const presenceLabel = presence === 'present' ? 'Here' : presence === 'away' ? 'Away' : 'Out';
                    return (
                      <div
                        key={character.id}
                        className={`flex items-center gap-1 rounded-2xl border px-3 py-2 text-sm transition ${
                          isActive ? 'border-primary/60 bg-primary/10 text-white' : 'border-white/10 bg-white/5 text-white/60'
                        }`}
                      >
                        <button
                          onClick={() => onTogglePartyMember(character.id)}
                          className="text-xs font-semibold uppercase tracking-wider hover:text-white"
                        >
                          {character.name}
                        </button>
                        {isActive && <span className="text-[0.6rem] text-primary">ON</span>}
                        {onSetCharacterPresence && (
                          <button
                            onClick={() => {
                              const next = presence === 'present' ? 'away' : presence === 'away' ? 'inactive' : 'present';
                              onSetCharacterPresence(character.id, next);
                            }}
                            className="ml-1 hover:opacity-80"
                            title={`Status: ${presenceLabel}. Click to cycle.`}
                          >
                            <span className={`inline-block h-2 w-2 rounded-full ${presenceColor}`}></span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {libraryCharacters.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/80">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-white/60">
                  <span>Library (not in story)</span>
                  <span className="text-white/40">Token saver</span>
                </div>
                <p className="mb-3 text-xs text-white/50">These characters stay out of prompts until you add them. Bring them in when you need them.</p>
                <div className="space-y-2">
                  {libraryCharacters.map((character) => (
                    <div key={character.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{character.name}</p>
                        <p className="text-xs text-white/50 truncate max-w-[12rem]">{character.description || 'No description yet.'}</p>
                      </div>
                      <button
                        onClick={() => onAddCharacterToStory(character.id)}
                        className="rounded-full border border-primary/50 px-3 py-1 text-[0.75rem] font-semibold text-primary transition hover:bg-primary/10"
                      >
                        Add to story
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {storyCharacters.map((character) => {
              const presence = character.presence ?? 'present';
              const presenceColor = presence === 'present' ? 'bg-emerald-400' : presence === 'away' ? 'bg-red-400' : 'bg-gray-400';
              const locationText = character.location || (presence === 'present' ? 'With you' : 'Unknown');
              const emotion = character.currentEmotion;
              const emotionEmoji = emotion ? getEmotionEmoji(emotion.primary) : null;
              const emotionColor = emotion ? getEmotionColor(emotion.primary) : null;
              const playerRel = character.relationships?.find(r => r.targetId === 'player');
              
              return (
              <div key={character.id} className="rounded-2xl bg-white/5 overflow-hidden">
                <div
                  onClick={() => onEditCharacter(character)}
                  className="flex w-full cursor-pointer items-center gap-3 p-4 text-left transition hover:bg-white/10"
                >
                  <div className="relative">
                  {character.portraitUrl ? (
                    <img src={character.portraitUrl} alt={character.name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg text-white">
                      {character.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                    <span className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#04010c] ${presenceColor}`}></span>
                    {emotionEmoji && (
                      <span 
                        className="absolute -top-1 -right-1 text-sm"
                        title={`Feeling ${emotion?.primary}${emotion?.reason ? `: ${emotion.reason}` : ''}`}
                      >
                        {emotionEmoji}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{character.name}</p>
                      {emotion && (
                        <span 
                          className="text-[0.6rem] px-1.5 py-0.5 rounded-full capitalize"
                          style={{ backgroundColor: `${emotionColor}30`, color: emotionColor }}
                        >
                          {emotion.primary}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/60 truncate">
                      {character.description || 'No description yet.'}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">📍 {locationText}</p>
                  </div>
                </div>
                <div className="flex justify-end border-t border-white/5 px-4 py-2">
                  <button
                    onClick={() => onRemoveCharacterFromStory(character.id)}
                    className="rounded-full border border-white/10 px-3 py-1 text-[0.7rem] text-white/60 transition hover:border-red-400/60 hover:text-red-200"
                  >
                    Remove from story
                  </button>
                </div>
                
                {/* Relationship + development temporarily hidden */}
              </div>
            );
            })}
          </div>
        )}
        {activeTab === 'world' && (
          <div className="space-y-4">
            <label className="space-y-2 text-sm text-white/80">
              <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/60">
                <span>Current location</span>
                <button
                  type="button"
                  onClick={() => setWorldInfo((prev) => ({ ...prev, locationAuto: true, currentLocation: '' }))}
                  className={`text-[0.6rem] font-semibold ${worldInfo.locationAuto ?? true ? 'text-white/30' : 'text-primary hover:text-primary/80'}`}
                  disabled={worldInfo.locationAuto ?? true}
                >
                  Resume auto
                </button>
              </div>
              <input
                type="text"
                className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white focus:border-primary focus:outline-none"
                value={worldInfo.currentLocation ?? ''}
                onChange={(e) =>
                  setWorldInfo((prev) => ({ ...prev, currentLocation: e.target.value, locationAuto: false }))
                }
                placeholder="Describe the room or area everyone is in"
              />
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/40">
                {(worldInfo.locationAuto ?? true)
                  ? 'Auto-updating from narrator memory'
                  : 'Manual override active'}
              </p>
            </label>
            <label className="space-y-2 text-sm text-white/80">
              <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/60">
                <span>Current time</span>
                <button
                  type="button"
                  onClick={() => setWorldInfo((prev) => ({ ...prev, timeAuto: true, currentTime: '' }))}
                  className={`text-[0.6rem] font-semibold ${worldInfo.timeAuto ?? true ? 'text-white/30' : 'text-primary hover:text-primary/80'}`}
                  disabled={worldInfo.timeAuto ?? true}
                >
                  Resume auto
                </button>
              </div>
              <input
                type="text"
                className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white focus:border-primary focus:outline-none"
                value={worldInfo.currentTime ?? ''}
                onChange={(e) => setWorldInfo((prev) => ({ ...prev, currentTime: e.target.value, timeAuto: false }))}
                placeholder="Sunset, midnight watch, early dawn..."
              />
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/40">
                {(worldInfo.timeAuto ?? true)
                  ? 'Auto-updating from narrator memory'
                  : 'Manual override active'}
              </p>
            </label>
            <label className="space-y-2 text-sm text-white/80">
              <span>Scenario</span>
              <textarea
                className="w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-white focus:border-primary focus:outline-none"
                rows={5}
                value={worldInfo.scenario}
                onChange={(e) => setWorldInfo((prev) => ({ ...prev, scenario: e.target.value }))}
                placeholder="Setting, tone, overarching plot..."
              />
            </label>
            <label className="space-y-2 text-sm text-white/80">
              <span>Story tracker</span>
              <textarea
                className="w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-white focus:border-primary focus:outline-none"
                rows={6}
                value={worldInfo.storyTracker}
                onChange={(e) => setWorldInfo((prev) => ({ ...prev, storyTracker: e.target.value }))}
                placeholder="Important events, unresolved threads, NPC motivations..."
              />
            </label>
          </div>
        )}
        {activeTab === 'setup' && (
          <div className="space-y-5">
            <div className="space-y-2 rounded-2xl border border-white/10 p-4 text-sm text-white/80">
              <p className="font-semibold text-white">Your profile</p>
              <p className="text-white/60">Used as the protagonist description so characters can react to you consistently.</p>
              <label className="mt-3 block space-y-2 text-sm text-white/80">
                <span>Your name</span>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white focus:border-primary focus:outline-none"
                  value={settings.userProfile?.name ?? ''}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      userProfile: {
                        name: e.target.value,
                        details: prev.userProfile?.details ?? '',
                      },
                    }))
                  }
                  placeholder="Ahmed"
                />
              </label>
              <label className="block space-y-2 text-sm text-white/80">
                <span>About you</span>
                <textarea
                  className="w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-white focus:border-primary focus:outline-none"
                  rows={4}
                  value={settings.userProfile?.details ?? ''}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      userProfile: {
                        name: prev.userProfile?.name ?? '',
                        details: e.target.value,
                      },
                    }))
                  }
                  placeholder="Age, vibe, job, appearance, personality, what you want in this story..."
                />
              </label>
            </div>
            <label className="space-y-2 text-sm text-white/80">
              <span>Model</span>
              {settings.llmProvider === 'lmstudio' ? (
                <input
                  type="text"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white focus:border-primary focus:outline-none"
                  value={settings.modelName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, modelName: e.target.value }))}
                  placeholder="L3-8b-stheno-v3.2"
                />
              ) : (
                <select
                  className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white"
                  value={settings.modelName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, modelName: e.target.value }))}
                >
                  {(settings.llmProvider === 'groq'
                    ? ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gpt-oss-120b', 'gpt-oss-20b', 'moonshotai/kimi-k2-instruct-0905', 'qwen/qwen3-32b']
                    : ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash-exp', 'gemini-1.5-pro']
                  ).map((model) => (
                    <option key={model} value={model} className="bg-secondary">
                      {model}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <div className="space-y-2 text-sm text-white/80">
              <p>Memory</p>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 p-3">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={settings.enableSmarterMemory}
                  onChange={(e) => setSettings((prev) => ({ ...prev, enableSmarterMemory: e.target.checked }))}
                />
                <span>Enable smarter memory (auto-summarize)</span>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 p-3">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={settings.autoNarration}
                  onChange={(e) => setSettings((prev) => ({ ...prev, autoNarration: e.target.checked }))}
                />
                <span>Auto narration after character replies</span>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 p-3">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={!!settings.enableGroupChatter}
                  onChange={(e) => setSettings((prev) => ({ ...prev, enableGroupChatter: e.target.checked }))}
                />
                <span>Group chatter (all characters reply)</span>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 p-3">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={!!settings.tokenSaverMode}
                  onChange={(e) => setSettings((prev) => ({ ...prev, tokenSaverMode: e.target.checked }))}
                />
                <div className="flex flex-col">
                  <span>Token-saver prompts</span>
                  <span className="text-[0.65rem] text-white/50">Trims world blocks and history to reduce cost.</span>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 p-3">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={settings.enableRag !== false}
                  onChange={(e) => setSettings((prev) => ({ ...prev, enableRag: e.target.checked }))}
                />
                <div className="flex flex-col">
                  <span>🧠 RAG Memory</span>
                  <span className="text-[0.65rem] text-white/50">Retrieves character facts for better accuracy.</span>
                </div>
              </label>
              <label className="block space-y-2 rounded-2xl border border-white/10 p-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/60">
                  <span>Character talk limit</span>
                  <span className="text-white">{settings.characterSentenceLimit ?? 10} sentences</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={settings.characterSentenceLimit ?? 10}
                  onChange={(e) => setSettings((prev) => ({ ...prev, characterSentenceLimit: parseInt(e.target.value, 10) }))}
                  className="w-full accent-primary"
                />
              </label>
            </div>
            <div className="space-y-2 text-sm text-white/80">
              <p>Web search</p>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 p-3">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={!!settings.enableWebSearch}
                  onChange={(e) => setSettings((prev) => ({ ...prev, enableWebSearch: e.target.checked }))}
                />
                <div className="flex flex-col">
                  <span>Enable web search (Brave)</span>
                  <span className="text-[0.65rem] text-white/50">Adds current web facts to both narrator and character prompts.</span>
                </div>
              </label>
              <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-white/60">
                <span>Brave API key (optional)</span>
                <input
                  type="password"
                  placeholder="Paste your Brave Search key"
                  value={settings.braveApiKey ?? ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, braveApiKey: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none"
                />
                <p className="text-[0.65rem] text-white/40">If blank, the backend can use BRAVE_SEARCH_API_KEY from its environment.</p>
              </label>
            </div>
            <div className="space-y-2 text-sm text-white/80">
              <p>User portrait</p>
              <div className="flex items-center gap-3">
                <input type="file" accept="image/*" onChange={handlePortraitUpload} className="text-xs" />
                {settings.userPortraitUrl && (
                  <img src={settings.userPortraitUrl} alt="User portrait" className="h-16 w-16 rounded-xl object-cover" />
                )}
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 p-4 text-sm text-white/80">
              <p className="font-semibold text-white">Image generation</p>
              <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-white/60">
                <span>Text model provider</span>
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white focus:border-primary focus:outline-none"
                  value={settings.llmProvider || 'gemini'}
                  onChange={(e) => setSettings((prev) => ({ ...prev, llmProvider: e.target.value as any }))}
                >
                  <option value="gemini" className="bg-secondary">Gemini</option>
                  <option value="groq" className="bg-secondary">Groq</option>
                  <option value="lmstudio" className="bg-secondary">LM Studio (local)</option>
                </select>
              </label>
              {settings.llmProvider === 'lmstudio' && (
                <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-white/60">
                  <span>LM Studio base URL</span>
                  <input
                    type="text"
                    placeholder="http://127.0.0.1:1234/v1"
                    value={settings.lmStudioBaseUrl ?? ''}
                    onChange={(e) => setSettings((prev) => ({ ...prev, lmStudioBaseUrl: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none"
                  />
                  <p className="text-[0.65rem] text-white/40">LM Studio must be running with an OpenAI-compatible server enabled.</p>
                </label>
              )}
              <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-white/60">
                <span>Gemini image model</span>
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white focus:border-primary focus:outline-none"
                  value={settings.imageModelName || 'gemini-2.5-flash-image'}
                  onChange={(e) => setSettings((prev) => ({ ...prev, imageModelName: e.target.value }))}
                >
                  {[
                    'gemini-2.5-flash-image',
                    'gemini-2.5-flash-001',
                    'gemini-2.5-pro-001',
                    'gemini-2.0-flash',
                    'gemini-2.0-flash-exp',
                    'imagen-3.0-generate-001',
                    'imagen-3.0-fast-001',
                  ].map((model) => (
                    <option key={model} value={model} className="bg-secondary">
                      {model}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-white/60">
                <span>Gemini API key</span>
                <input
                  type="password"
                  placeholder="Paste your Gemini key"
                  value={settings.geminiApiKey ?? ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, geminiApiKey: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none"
                />
                <p className="text-[0.65rem] text-white/40">Keeps using your env key if left empty. Paste another key to switch accounts/quotas.</p>
              </label>
              <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-white/60">
                <span>Groq API key</span>
                <input
                  type="password"
                  placeholder="Paste your Groq key"
                  value={settings.groqApiKey ?? ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, groqApiKey: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none"
                />
                <p className="text-[0.65rem] text-white/40">Use with Groq provider (fast, generous free tier). Leave blank to fallback to env.</p>
              </label>
              <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-white/60">
                <span>Image Relay URL</span>
                <input
                  type="text"
                  placeholder="https://your-backend.com"
                  value={settings.imageRelayUrl ?? ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, imageRelayUrl: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none"
                />
                <p className="text-[0.65rem] text-white/40">Backend relay for image generation (avoids CORS, hides API keys). See /backend folder.</p>
              </label>
              <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-white/60">
                <span>Stability API key</span>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={settings.stabilityApiKey ?? ''}
                  onChange={(e) => setSettings((prev) => ({ ...prev, stabilityApiKey: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white placeholder-white/30 focus:border-primary focus:outline-none"
                />
              </label>
              <p className="text-xs text-white/50">Local SD is tried first. Then Image Relay. Then Stability direct. Gemini is the final fallback.</p>
            </div>
            <div className="rounded-2xl border border-white/10 p-4 text-sm text-white/80">
              <p className="font-semibold text-white">Veo video access</p>
              <p className="text-white/60">Status: {isVeoKeySelected ? 'Key selected' : 'No key selected'}</p>
              <button
                className="mt-3 w-full rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
                onClick={onSelectVeoKey}
              >
                {isVeoKeySelected ? 'Change key' : 'Select key'}
              </button>
            </div>
            <div className="space-y-2 rounded-2xl border border-white/10 p-4 text-sm text-white/80">
              <p className="font-semibold text-white">Story backup</p>
              <p className="text-white/60">Download a backup file before closing the server or import one later.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={onExportBackup}
                  className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Download backup
                </button>
                <label className="rounded-2xl border border-primary/30 px-4 py-2 text-center text-sm font-semibold text-primary transition hover:bg-primary/10">
                  Restore backup
                  <input
                    ref={backupInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={handleBackupImport}
                  />
                </label>
              </div>
            </div>
            <button
              onClick={onClearChat}
              className="w-full rounded-2xl border border-red-400/30 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-400/10"
            >
              Clear chat history
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
