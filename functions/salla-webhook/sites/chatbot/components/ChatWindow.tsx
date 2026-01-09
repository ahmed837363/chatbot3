import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Character, Message, MessagePart, Role, RpgState } from '../types';
import { RpgStatusCard } from './RpgStatusCard';
import { getEmotionEmoji } from '../services/apiService';

interface ChatWindowProps {
  chatHistory: Message[];
  characters: Character[];
  onSendMessage: (message: string, as: string) => Promise<void | Message> | void;
  onContinue: () => void;
  onProgressStory: () => void;
  onStopGeneration: () => void;
  onForceUnlock: () => void;
  onEditMessage: (id: string, newContent: string, part?: MessagePart) => void;
  onDeleteMessage: (id: string) => void;
  onRegenerateMessage?: (id: string) => void;
  onFeedback?: (id: string, feedback: 'positive' | 'negative' | null) => void;
  onPromoteNpc?: (name: string, dialogueSample: string) => void;
  onOpenSidebar: () => void;
  isSending: boolean;
  isContinuing: boolean;
  narrationMode?: 'continue' | 'progress' | null;
  onMakeImage: () => void;
  onMakeVideo: () => void;
  onCopyImagePrompt: () => void;
  onCopyFullMangaPrompt: () => void;
  onTogglePromptStyle: () => void;
  isGeneratingPrompt: boolean;
  promptStyle: 'anime' | 'light-novel';
  isGeneratingMedia: boolean;
  activePartyIds: string[];
  onTriggerGroupChat: () => Promise<void> | void;
  rpgState?: RpgState | null;
  onOpenRpgSheet?: () => void;
  onEnterRpgView?: () => void;
  onEnterLibraryView?: () => void;
  onExitRpgView?: () => void;
  isInRpgView?: boolean;
  showEmbeddedRpgCard?: boolean;
}

const roleStyles: Record<Role, string> = {
  [Role.USER]: 'bg-white/10 border-white/20 backdrop-blur',
  [Role.CHARACTER]: 'bg-primary/15 border-primary/40 backdrop-blur',
  [Role.NARRATOR]: 'bg-indigo-900/30 border-indigo-500/30 italic backdrop-blur',
  [Role.SYSTEM]: 'bg-rose-900/40 border-rose-400/40 backdrop-blur',
};

const roleLabels: Record<Role, string> = {
  [Role.USER]: 'You',
  [Role.CHARACTER]: 'Character',
  [Role.NARRATOR]: 'Narrator',
  [Role.SYSTEM]: 'System',
};

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chatHistory,
  characters,
  onSendMessage,
  onContinue,
  onProgressStory,
  onStopGeneration,
  onForceUnlock,
  onEditMessage,
  onDeleteMessage,
  onRegenerateMessage,
  onFeedback,
  onPromoteNpc,
  onOpenSidebar,
  isSending,
  isContinuing,
  narrationMode = null,
  onMakeImage,
  onMakeVideo,
  onCopyImagePrompt,
  onCopyFullMangaPrompt,
  onTogglePromptStyle,
  isGeneratingPrompt,
  promptStyle,
  isGeneratingMedia,
  activePartyIds,
  onTriggerGroupChat,
  rpgState,
  onOpenRpgSheet,
  onEnterRpgView,
  onEnterLibraryView,
  onExitRpgView,
  isInRpgView = false,
  showEmbeddedRpgCard = true,
}) => {
  const [messageDraft, setMessageDraft] = useState('');
  const [speakingAs, setSpeakingAs] = useState<'user' | 'narrator' | string>('user');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isRpgPeekOpen, setIsRpgPeekOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const showFullHeader = isInRpgView;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatHistory.length]);

  // Handle feedback on AI messages
  const handleFeedback = useCallback((messageId: string, feedback: 'positive' | 'negative') => {
    if (!onFeedback) return;
    const message = chatHistory.find(m => m.id === messageId);
    // Toggle off if same feedback clicked again
    if (message?.feedback === feedback) {
      onFeedback(messageId, null);
    } else {
      onFeedback(messageId, feedback);
    }
  }, [onFeedback, chatHistory]);

  const activeCharacterName = useMemo(() => {
    if (speakingAs === 'user') {
      return rpgState?.playerName || 'You';
    }
    if (speakingAs === 'narrator') return 'Narrator';
    return characters.find((c) => c.id === speakingAs)?.name || 'Character';
  }, [speakingAs, characters, rpgState]);

  const handleSend = async () => {
    if (!messageDraft.trim()) return;
    try {
      await onSendMessage(messageDraft.trim(), speakingAs);
      setMessageDraft('');
      if (speakingAs === 'narrator') {
        setSpeakingAs('user');
      }
    } catch (error) {
      console.error('Send failed:', error);
    }
  };

  const handleAutoSpeak = async () => {
    if (speakingAs === 'user' || speakingAs === 'narrator') return;
    try {
      await onSendMessage('', speakingAs);
    } catch (error) {
      console.error('Auto speak failed:', error);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSend();
    }
  };

  const startEditing = useCallback((message: Message) => {
    setEditingMessageId(message.id);
    setEditingText(message.content);
  }, []);

  const saveEdit = () => {
    if (!editingMessageId) return;
    onEditMessage(editingMessageId, editingText);
    setEditingMessageId(null);
    setEditingText('');
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const textLocked = isSending || isContinuing;
  const mediaLocked = isGeneratingMedia || textLocked;
  const anythingRunning = textLocked || isGeneratingMedia;
  const storyCharacters = useMemo(() => characters.filter((character) => character.inStory ?? true), [characters]);
  const activeParty = useMemo(
    () => storyCharacters.filter((character) => activePartyIds.includes(character.id)),
    [storyCharacters, activePartyIds],
  );
  const speakingRoster = useMemo(
    () => (activeParty.length ? activeParty : storyCharacters),
    [activeParty, storyCharacters],
  );

  useEffect(() => {
    if (speakingAs === 'user' || speakingAs === 'narrator') return;
    const stillAvailable = speakingRoster.some((character) => character.id === speakingAs);
    if (!stillAvailable) {
      setSpeakingAs('user');
    }
  }, [speakingAs, speakingRoster]);
  const narratorActive = speakingAs === 'narrator';
  const narratorStatusLabel = narrationMode === 'progress' ? 'Narrator pushing plot forward…' : 'Continuing narration…';
  const textareaPlaceholder = useMemo(() => {
    if (textLocked) {
      return 'Previous response still streaming… you can type anyway.';
    }
    if (speakingAs === 'user') {
      return rpgState ? `Write ${rpgState.playerName}'s next move…` : 'Write your next message…';
    }
    if (speakingAs === 'narrator') {
      return 'Write narration to insert…';
    }
    return `Give private direction for ${activeCharacterName}. They will follow it silently.`;
  }, [textLocked, speakingAs, activeCharacterName]);

  const handleGroupChatClick = async () => {
    try {
      await onTriggerGroupChat();
    } catch (error) {
      console.error('Group chat failed:', error);
    }
  };

  const handleNarratorShortcut = () => {
    setSpeakingAs('narrator');
  };

  const handleResumeCharacter = () => {
    setSpeakingAs('user');
  };

  // Memoize character lookup map for faster access
  const characterMap = useMemo(() => {
    const map = new Map<string, Character>();
    characters.forEach(c => map.set(c.id, c));
    return map;
  }, [characters]);

  // Detect NPCs mentioned in narrator messages (format: **[NPC Name]:** "dialogue")
  const extractNpcsFromMessage = useCallback((content: string): Array<{ name: string; dialogue: string }> => {
    const npcPattern = /\*\*\[([^\]]+)\]:\*\*\s*"([^"]+)"/g;
    const npcs: Array<{ name: string; dialogue: string }> = [];
    let match;
    while ((match = npcPattern.exec(content)) !== null) {
      npcs.push({ name: match[1], dialogue: match[2] });
    }
    return npcs;
  }, []);

  const renderMessage = useCallback((message: Message) => {
    const isEditing = editingMessageId === message.id;
    const character = message.characterId ? characterMap.get(message.characterId) : null;
    const emotionEmoji = character?.currentEmotion ? getEmotionEmoji(character.currentEmotion.primary) : null;
    
    // Extract NPCs from narrator messages
    const npcsInMessage = message.role === Role.NARRATOR ? extractNpcsFromMessage(message.content) : [];
    const existingCharNames = characters.map(c => c.name.toLowerCase());
    const promotableNpcs = npcsInMessage.filter(npc => !existingCharNames.includes(npc.name.toLowerCase()));
    
    return (
      <div key={message.id} className={`rounded-3xl border px-5 py-4 shadow-lg transition ${roleStyles[message.role]}`}>
        <div className="mb-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-white/70">{message.characterName || roleLabels[message.role]}</span>
            {emotionEmoji && (
              <span 
                className="text-sm" 
                title={`Feeling ${character?.currentEmotion?.primary}`}
              >
                {emotionEmoji}
              </span>
            )}
            {message.videoUrl && message.videoUrl.startsWith('generating:') && <span className="text-[10px] text-white/50">Processing video…</span>}
          </div>
          <div className="flex gap-2 text-xs text-white/50">
            <button onClick={() => startEditing(message)} className="hover:text-white">Edit</button>
            {onRegenerateMessage && (message.role === Role.CHARACTER || message.role === Role.NARRATOR) && (
              <button onClick={() => onRegenerateMessage(message.id)} className="hover:text-yellow-300">Redo</button>
            )}
            <button onClick={() => onDeleteMessage(message.id)} className="hover:text-red-300">Delete</button>
            {/* Feedback buttons for AI responses */}
            {(message.role === Role.CHARACTER || message.role === Role.NARRATOR) && (
              <>
                <span className="text-white/30">|</span>
                <button 
                  onClick={() => handleFeedback(message.id, 'positive')}
                  className={`hover:text-green-400 ${message.feedback === 'positive' ? 'text-green-400' : ''}`}
                  title="Good response"
                >
                  👍
                </button>
                <button 
                  onClick={() => handleFeedback(message.id, 'negative')}
                  className={`hover:text-red-400 ${message.feedback === 'negative' ? 'text-red-400' : ''}`}
                  title="Bad response"
                >
                  👎
                </button>
              </>
            )}
          </div>
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              className="w-full rounded-xl border border-white/20 bg-black/30 p-2 text-sm text-white"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={saveEdit} className="rounded-lg bg-primary/70 px-3 py-1 text-sm text-white">Save</button>
              <button onClick={cancelEdit} className="rounded-lg border border-white/20 px-3 py-1 text-sm text-white/70">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-white">{message.content || '…'}</p>
        )}
        {/* Show "Add as Character" buttons for NPCs in narrator messages */}
        {promotableNpcs.length > 0 && onPromoteNpc && (
          <div className="mt-3 flex flex-wrap gap-2">
            {promotableNpcs.map((npc, idx) => (
              <button
                key={`${npc.name}-${idx}`}
                onClick={() => onPromoteNpc(npc.name, npc.dialogue)}
                className="flex items-center gap-1 rounded-full bg-emerald-600/30 border border-emerald-500/40 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-600/50 transition"
                title={`Add ${npc.name} as a full character`}
              >
                <span>+</span>
                <span>Add {npc.name}</span>
              </button>
            ))}
          </div>
        )}
        {message.imageUrl && !message.imageUrl.startsWith('generating') && (
          <img
            src={message.imageUrl}
            alt="Generated scene"
            className="mt-3 h-auto w-auto max-w-[640px] max-h-[960px] rounded-xl border border-white/10 object-contain"
            loading="lazy"
          />
        )}
        {message.videoUrl && !message.videoUrl.startsWith('generating:') && (
          <video controls className="mt-3 w-full rounded-xl border border-white/10">
            <source src={message.videoUrl} />
          </video>
        )}
      </div>
    );
  }, [characterMap, characters, editingMessageId, editingText, extractNpcsFromMessage, onDeleteMessage, onPromoteNpc, onRegenerateMessage, saveEdit, cancelEdit, startEditing]);

  return (
    <div className="flex h-full flex-1 flex-col bg-gradient-to-b from-[#05030a] via-[#0b0a19] to-[#07050d]">
      {showFullHeader ? (
        <header className="flex flex-col gap-2 border-b border-white/5 px-3 py-2 text-white md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
            <button onClick={onOpenSidebar} className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80 transition hover:bg-white/20 md:hidden">
              Menu
            </button>
            <div className="flex flex-col">
              <p className="text-[0.55rem] uppercase tracking-[0.25em] text-primary md:text-xs">Roleplay session</p>
              <h2 className="text-sm font-semibold md:text-lg">Advanced RP Chat</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 text-[11px]">
            {onEnterLibraryView && (
              <button
                onClick={onEnterLibraryView}
                className="rounded-full border border-white/20 px-3 py-1 text-white/80 transition hover:bg-white/10"
              >
                Character library
              </button>
            )}
            {(onEnterRpgView || onExitRpgView) && (
              <>
                {isInRpgView && onExitRpgView && (
                  <button
                    onClick={onExitRpgView}
                    className="rounded-full border border-white/20 px-3 py-1 text-white/80 transition hover:bg-white/10"
                  >
                    Standard chat
                  </button>
                )}
                {rpgState && onOpenRpgSheet && (
                  <button
                    onClick={onOpenRpgSheet}
                    className="rounded-full border border-primary/20 px-3 py-1 text-primary/80 transition hover:bg-primary/10"
                  >
                    Edit RPG sheet
                  </button>
                )}
              </>
            )}
          </div>
        </header>
      ) : (
        <div className="flex items-center justify-between border-b border-white/5 px-3 py-2 text-white">
          <button onClick={onOpenSidebar} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 transition hover:bg-white/20">
            Menu
          </button>
          <div className="flex gap-2 text-[11px]">
            {onEnterLibraryView && (
              <button onClick={onEnterLibraryView} className="rounded-full border border-white/15 px-3 py-1 text-white/70 transition hover:bg-white/10">
                Characters
              </button>
            )}
            {rpgState && onOpenRpgSheet && (
              <button onClick={onOpenRpgSheet} className="rounded-full border border-white/15 px-3 py-1 text-white/70 transition hover:bg-white/10">
                Edit sheet
              </button>
            )}
            {onEnterRpgView && (
              <button onClick={onEnterRpgView} className="rounded-full border border-primary/40 px-3 py-1 text-primary transition hover:bg-primary/10">
                RPG page
              </button>
            )}
          </div>
        </div>
      )}

      {rpgState && !isInRpgView && (
        <div className="px-3 pt-2 md:px-6">
          <button
            onClick={() => setIsRpgPeekOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/70 transition hover:border-primary/40"
          >
            <span>{isRpgPeekOpen ? 'Hide RPG panel' : 'Show RPG panel'}</span>
            <span className="text-primary">{rpgState.playerName || 'Hero'}</span>
          </button>
          {isRpgPeekOpen && (
            <div className="mt-2 space-y-3 rounded-3xl border border-white/10 bg-black/40 p-3 text-white">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-white/60">
                <span>Level {rpgState.level}</span>
                <span>XP {rpgState.xp}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="flex justify-between text-[0.6rem] uppercase tracking-[0.25em] text-white/50"><span>HP</span><span>{rpgState.hp}/{rpgState.maxHp}</span></div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.round((rpgState.hp / Math.max(1, rpgState.maxHp)) * 100))}%` }} />
                  </div>
                </div>
                {typeof rpgState.stamina === 'number' && typeof rpgState.maxStamina === 'number' && (
                  <div>
                    <div className="flex justify-between text-[0.6rem] uppercase tracking-[0.25em] text-white/50"><span>Stamina</span><span>{rpgState.stamina}/{rpgState.maxStamina}</span></div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, Math.round((rpgState.stamina / Math.max(1, rpgState.maxStamina)) * 100))}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80">
                <button onClick={() => onOpenRpgSheet?.()} disabled={!onOpenRpgSheet} className="rounded-2xl border border-white/20 px-3 py-2 text-left hover:border-primary/40 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30">
                  Edit RPG sheet
                </button>
                <button onClick={() => onEnterRpgView?.()} disabled={!onEnterRpgView} className="rounded-2xl border border-primary/30 px-3 py-2 text-left text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30">
                  Open RPG page
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {rpgState && showEmbeddedRpgCard !== false && (
        <div className="px-3 py-3 md:px-8">
          <RpgStatusCard
            state={rpgState}
            onEdit={() => onOpenRpgSheet?.()}
            onNarrate={handleNarratorShortcut}
            onResume={handleResumeCharacter}
            isNarrating={narratorActive}
          />
        </div>
      )}
      <div
        ref={listRef}
        className="flex-1 space-y-4 overflow-y-auto px-3 py-2 pb-32 md:px-8"
        style={{ scrollPaddingBottom: '9rem' }}
      >
        {chatHistory.map(renderMessage)}
        {(isSending || isContinuing) && (
          <div className="flex items-center gap-3 text-sm text-white/70">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary"></span>
            <p>{isSending ? 'Generating reply…' : narratorStatusLabel}</p>
          </div>
        )}
      </div>

      <div className="border-t border-white/5 bg-black/50 px-3 py-3 backdrop-blur">
        <div className="mb-2 flex flex-col gap-1 text-[0.65rem] uppercase tracking-widest text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Speaking as: <strong className="text-white">{activeCharacterName}</strong>
          </span>
          <div className="flex flex-col gap-1 text-[0.65rem] uppercase tracking-[0.3em] text-white/50 sm:text-[0.6rem]">
            {textLocked && (
              <span className="text-primary">
                {isContinuing ? narratorStatusLabel : 'Stream in progress…'}
              </span>
            )}
            {!textLocked && isGeneratingMedia && <span className="text-white/40">Media generation running…</span>}
            {!anythingRunning && (
              <span>
                Party ready: {activeParty.length ? activeParty.map((c) => c.name).join(', ') : 'Select characters in sidebar'}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white sm:w-48"
            value={speakingAs}
            onChange={(e) => setSpeakingAs(e.target.value)}
          >
            <option value="user">You</option>
            <option value="narrator">Narrator</option>
            {speakingRoster.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>
          <textarea
            className={`min-h-[110px] w-full flex-1 rounded-3xl border border-white/10 bg-black/15 p-3 text-sm leading-6 text-white shadow-inner md:text-base ${textLocked ? 'opacity-70' : ''}`}
            rows={3}
            placeholder={textareaPlaceholder}
            value={messageDraft}
            onChange={(e) => setMessageDraft(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            onClick={handleSend}
            disabled={!messageDraft.trim()}
            className="col-span-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:shadow-glow disabled:cursor-not-allowed disabled:bg-white/10 sm:col-span-1 sm:w-auto"
          >
            Send
          </button>
          {speakingAs !== 'user' && speakingAs !== 'narrator' && (
            <button
              onClick={handleAutoSpeak}
              disabled={textLocked}
              className="rounded-full border border-primary/40 px-5 py-3 text-sm text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed"
            >
              Let {activeCharacterName} speak
            </button>
          )}
          <button
            onClick={onContinue}
            disabled={textLocked}
            className="rounded-full border border-white/20 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed"
          >
            Continue narration
          </button>
          <button
            onClick={onProgressStory}
            disabled={textLocked}
            className="rounded-full border border-indigo-300/40 px-5 py-3 text-sm text-indigo-200 transition hover:bg-indigo-500/10 disabled:cursor-not-allowed"
          >
            Narrator: Progress story
            {isContinuing && narrationMode === 'progress' && <span className="ml-2 animate-pulse text-xs text-indigo-100">…</span>}
          </button>
          <button
            onClick={onStopGeneration}
            disabled={!anythingRunning}
            className="rounded-full border border-red-400/40 px-5 py-3 text-sm text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/20"
          >
            Stop
          </button>
          {textLocked && (
            <button
              onClick={onForceUnlock}
              className="rounded-full border border-white/20 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10"
            >
              Force unlock
            </button>
          )}
          <button
            onClick={onMakeImage}
            disabled={mediaLocked}
            className="rounded-full border border-white/20 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed"
          >
            Generate image
          </button>
          <button
            onClick={onTogglePromptStyle}
            className="rounded-full border border-purple-400/40 px-4 py-3 text-xs text-purple-200 transition hover:bg-purple-400/10"
          >
            Style: {promptStyle === 'anime' ? '🎨 Anime' : '📖 Light Novel'}
          </button>
          <button
            onClick={onCopyImagePrompt}
            disabled={chatHistory.length === 0 || isGeneratingPrompt}
            className="rounded-full border border-emerald-400/40 px-5 py-3 text-sm text-emerald-200 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
          >
            {isGeneratingPrompt ? '⏳ Generating...' : 'Copy AI prompt'}
          </button>
          <button
            onClick={onCopyFullMangaPrompt}
            disabled={chatHistory.length === 0 || isGeneratingPrompt}
            className="rounded-full border border-amber-400/40 px-5 py-3 text-sm text-amber-200 transition hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
          >
            {isGeneratingPrompt ? '⏳ Generating...' : 'Copy full manga pages'}
          </button>
          <button
            onClick={onMakeVideo}
            disabled={mediaLocked}
            className="rounded-full border border-white/20 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed"
          >
            Generate video
          </button>
          <button
            onClick={handleGroupChatClick}
            disabled={textLocked || activeParty.length === 0}
            className="rounded-full border border-primary/20 px-5 py-3 text-sm text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
          >
            Group chat burst
          </button>
        </div>
      </div>
    </div>
  );
};
