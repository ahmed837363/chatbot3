import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { CharacterModal } from './components/CharacterModal';
import { RpgSheetModal } from './components/RpgSheetModal';
import { RpgPage } from './components/RpgPage';
import { CharacterLibraryPage } from './components/CharacterLibraryPage';
import { getCharacterReplyStream, getNarrationStream, getEvolvedDescription, getChatSummary, generateImageFromScene, startVideoGeneration, getVideosOperation, extractSceneHints, detectPresenceChanges, PresenceInfo, shouldUpdateStoryMemory, updateStoryMemory, detectCharacterEmotion, generateImagePrompt, generateFullMangaPrompts, setRuntimeApiKey, setRuntimeGroqApiKey, setRuntimeLmStudioBaseUrl, setRuntimeLlmProvider, initializeRag, indexWorldInfoForRag, indexConversationForRag, setCurrentSessionId, setRagEnabled, isRagEnabled, getRagStats, getQueueLength, setMaxConcurrentJobs, extractSessionLoreUpdates, braveWebSearch } from './services/apiService';
import { evalHarness, createEvalSample, EvalSample } from './services/evalHarness';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Message, Character, Role, Settings, WorldInfo, SidebarTab, MessagePart, ChatSession, RpgState, PresenceStatus, StoryMemory, CharacterEmotion, Relationship } from './types';

interface ChatBackupPayload {
  version: number;
  timestamp: number;
  sessions: ChatSession[];
  characters: Character[];
  worldInfo: WorldInfo;
  settings: Settings;
  activeSessionId: string | null;
  activePartyIds: string[];
}

interface SendOptions {
  skipGroupChatter?: boolean;
  historyOverride?: Message[];
  directionNote?: string;
  partnerNames?: string[];
  groupChatContext?: string;
}

const SUPPORTED_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
];

const SUPPORTED_GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gpt-oss-120b',
  'gpt-oss-20b',
  'moonshotai/kimi-k2-instruct-0905',
  'qwen/qwen3-32b',
];

const DEFAULT_MODEL = SUPPORTED_GEMINI_MODELS[0];
const DEFAULT_GROQ_MODEL = SUPPORTED_GROQ_MODELS[0];

const defaultWorldInfo: WorldInfo = {
  scenario: '',
  storyTracker: '',
  currentLocation: '',
  currentTime: '',
  locationAuto: true,
  timeAuto: true,
};

const createDefaultRpgState = (playerName?: string): RpgState => ({
  playerName: (playerName || '').trim() || 'Protagonist',
  title: 'Adventurer',
  level: 1,
  xp: 0,
  hp: 10,
  maxHp: 10,
  stamina: 5,
  maxStamina: 5,
  resources: [
    { id: `res_${Date.now()}_${Math.random()}`, label: 'Gold', value: '0' },
  ],
  notes: 'Log discoveries, inventory, quest hooks…',
  narratorUnlocked: true,
});

const ensureSessionRpgState = (session: ChatSession): ChatSession => {
  if (session.rpgState) return session;
  return { ...session, rpgState: createDefaultRpgState() };
};

const ensureSessionWorldInfo = (session: ChatSession): ChatSession => {
  if (session.worldInfo) return session;
  return { ...session, worldInfo: { ...defaultWorldInfo } };
};

const ensureSessionRelationships = (session: ChatSession): ChatSession => {
  if (session.characterRelationships) return session;
  return { ...session, characterRelationships: {} };
};

const ensureSessionCharacterState = (session: ChatSession): ChatSession => {
  if (session.characterState) return session;
  return { ...session, characterState: {} };
};

const hydrateWorldInfo = (info?: WorldInfo): WorldInfo => ({
  ...defaultWorldInfo,
  ...(info ?? {}),
});

// Ensure a baseline relationship from character to player when implied or missing
const ensurePlayerRelationship = (character: Character): Character => {
  const existing = character.relationships?.find((r) => r.targetId === 'player');
  if (existing) return character;

  const text = `${character.description} ${character.lore ?? ''}`.toLowerCase();
  const romanticHints = ['girlfriend', 'boyfriend', 'wife', 'husband', 'fiance', 'fiancée', 'lover', 'partner'];
  const isRomantic = romanticHints.some((hint) => text.includes(hint));

  const baseRel: Relationship = {
    targetId: 'player',
    targetName: 'You',
    type: isRomantic ? 'lover' : 'acquaintance',
    trust: isRomantic ? 35 : 5,
    affection: isRomantic ? 65 : 10,
    respect: 20,
    familiarity: isRomantic ? 70 : 25,
    history: ['Auto-seeded from character profile'],
  };

  return { ...character, relationships: [...(character.relationships ?? []), baseRel] };
};

const createWelcomeMessage = (): Message => ({
  id: `sys_${Date.now()}`,
  role: Role.SYSTEM,
  content: 'Welcome to Gemini RP Chat! Create your first character and define the world in the sidebar to begin your story.',
});

function App() {
  const [chatSessions, setChatSessions] = useLocalStorage<ChatSession[]>('rpchat_sessions', []);
  const [activeSessionId, setActiveSessionId] = useLocalStorage<string | null>('rpchat_active_session', null);
  const [characters, setCharacters] = useLocalStorage<Character[]>('rpchat_characters', []);
  const [settings, setSettings] = useLocalStorage<Settings>('rpchat_settings', {
    modelName: DEFAULT_MODEL,
    llmProvider: 'lmstudio',
    autoNarration: true,
    enableSmarterMemory: true,
    userProfile: {
      name: 'Protagonist',
      details: '',
    },
    userPortraitUrl: '',
    enableGroupChatter: false,
    characterSentenceLimit: 10,
    enableWebSearch: false,
    braveApiKey: '',
    geminiApiKey: '',
    groqApiKey: '',
    lmStudioBaseUrl: 'http://127.0.0.1:1234/v1',
    localSdUrl: '',
    stabilityApiKey: '',
    tokenSaverMode: false,
    imageModelName: 'gemini-2.5-flash-image',
    enableRag: true,
    ragTopK: 8,
  });
  const [activePartyIds, setActivePartyIds] = useLocalStorage<string[]>('rpchat_active_party', []);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('chars');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [isRpgSheetOpen, setIsRpgSheetOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isGeneratingMedia, setIsGeneratingMedia] = useState(false);
  const [isVeoKeySelected, setIsVeoKeySelected] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeNarrationMode, setActiveNarrationMode] = useState<'continue' | 'progress' | null>(null);
  const [viewMode, setViewMode] = useState<'standard' | 'rpg' | 'library'>('standard');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [lastGeneratedPrompt, setLastGeneratedPrompt] = useState<string | null>(null);
  const [promptStyle, setPromptStyle] = useState<'anime' | 'light-novel'>('anime');
  const stopGenerationRef = useRef(false);
  const pendingTimeoutRef = useRef<number | null>(null);
  const sceneHintLockRef = useRef(false);
  const lastSceneHintIdRef = useRef<string | null>(null);
  const lastStreamActivityRef = useRef<number>(Date.now());
  const lastWebFactsRef = useRef<{ key: string; cue: Message | null } | null>(null);

  const markStreamActivity = () => {
    lastStreamActivityRef.current = Date.now();
  };

  const getLatestUserQuery = (history: Message[]) => {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const msg = history[i];
      if (msg.role === Role.USER) {
        const text = (msg.content || '').trim();
        if (text) return text;
      }
    }
    return '';
  };

  const shouldDoWebSearch = (query: string) => {
    const q = (query || '').trim();
    if (!q) return false;
    if (q.includes('?')) return true;
    const lower = q.toLowerCase();
    return /\b(latest|today|now|current|news|update|release|meaning|define|definition|slang|trend|who is|what is|when|where|why|how)\b/.test(lower);
  };

  const buildWebFactsCue = async (history: Message[]) => {
    if (!settings.enableWebSearch) return null;
    const query = getLatestUserQuery(history);
    if (!shouldDoWebSearch(query)) return null;

    const key = `${activeSession?.id ?? 'no_session'}::${query}`;
    if (lastWebFactsRef.current?.key === key) return lastWebFactsRef.current.cue;
    try {
      const relayUrl = (settings.imageRelayUrl || '').trim();
      const apiKey = (settings.braveApiKey || '').trim();
      const result = await braveWebSearch(query, { relayUrl: relayUrl || undefined, apiKey: apiKey || undefined, count: 5 });
      if (!result.results.length) {
        lastWebFactsRef.current = { key, cue: null };
        return null;
      }
      const lines: string[] = [];
      lines.push('[WEB FACTS — Brave Search]');
      lines.push(`Query: ${result.query}`);
      if (result.fetchedAt) lines.push(`FetchedAt: ${result.fetchedAt}`);
      lines.push('');
      for (const r of result.results.slice(0, 5)) {
        const snippet = (r.description || '').trim();
        lines.push(`- ${r.title} — ${r.url}`);
        if (snippet) lines.push(`  ${snippet}`);
      }
      lines.push('');
      lines.push('RULES:');
      lines.push('- Use these only for real-world factual questions (current events, definitions, slang).');
      lines.push('- Do NOT overwrite story canon or in-fiction facts using web results.');
      lines.push('- If you use a web fact, cite its URL inline in parentheses.');
      const cue: Message = { id: `sys_web_${Date.now()}`, role: Role.SYSTEM, content: lines.join('\n') };
      lastWebFactsRef.current = { key, cue };
      return cue;
    } catch (error) {
      console.warn('Web search failed; continuing without web facts.', error);
      lastWebFactsRef.current = { key, cue: null };
      return null;
    }
  };

  const injectWebFacts = async (history: Message[]) => {
    const cue = await buildWebFactsCue(history);
    return cue ? [cue, ...history] : history;
  };

  const applyBackupPayload = (payload: ChatBackupPayload) => {
    const restoredSessions = Array.isArray(payload.sessions) && payload.sessions.length ? payload.sessions : [
      {
        id: `session_${Date.now()}`,
        title: 'Restored chat',
        history: [createWelcomeMessage()],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    // Apply legacy worldInfo to sessions that don't have their own worldInfo
    const legacyWorldInfo = hydrateWorldInfo(payload.worldInfo);
    const hydratedSessions = restoredSessions.map((session) => {
      let hydrated = ensureSessionRpgState(session);
      hydrated = ensureSessionWorldInfo(hydrated);
      hydrated = ensureSessionRelationships(hydrated);
      // If session has no worldInfo and backup has legacy worldInfo, apply it
      if (!session.worldInfo && payload.worldInfo) {
        hydrated = { ...hydrated, worldInfo: legacyWorldInfo };
      }
      return hydrated;
    });
    const validActiveId = hydratedSessions.find((session) => session.id === payload.activeSessionId)
      ? payload.activeSessionId
      : hydratedSessions[0]?.id ?? null;
    setChatSessions(hydratedSessions);
    setActiveSessionId(validActiveId);
    setCharacters(Array.isArray(payload.characters) ? payload.characters : []);
    setSettings((prev) => ({ ...prev, ...(payload.settings ?? prev) }));
    setActivePartyIds(Array.isArray(payload.activePartyIds) ? payload.activePartyIds : []);
    window.alert('Backup imported. Your chats have been restored.');
  };

  const handleExportBackup = () => {
    const payload: ChatBackupPayload = {
      version: 2,
      timestamp: Date.now(),
      sessions: chatSessions,
      characters,
      worldInfo: defaultWorldInfo, // Legacy field, worldInfo is now per-session
      settings,
      activeSessionId,
      activePartyIds,
    };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `rpchat-backup-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export backup', error);
      window.alert('Could not export your chats. Check console for details.');
    }
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload || typeof payload !== 'object' || !Array.isArray(payload.sessions)) {
        throw new Error('Invalid backup file format.');
      }
      applyBackupPayload(payload as ChatBackupPayload);
    } catch (error) {
      console.error('Failed to import backup', error);
      window.alert('Import failed. Please make sure you selected a valid backup JSON file.');
    }
  };

  const activeSession = chatSessions.find((session) => session.id === activeSessionId) ?? chatSessions[0] ?? null;
  const chatHistory = activeSession?.history ?? [];
  const activeRpgState = activeSession?.rpgState ?? null;
  const worldInfo = activeSession?.worldInfo ?? defaultWorldInfo;
  const storyMemory = activeSession?.storyMemory;
  const sessionRelationships = activeSession?.characterRelationships ?? {};
  const sessionCharacterState = activeSession?.characterState;

  const protagonistName = (settings.userProfile?.name || activeRpgState?.playerName || 'You').trim() || 'You';

  const buildSessionLoreSystemCue = (chars: Character[], state?: ChatSession['characterState']): Message | null => {
    if (!state) return null;
    const lines: string[] = [];
    for (const ch of chars) {
      const entries = state[ch.id]?.sessionLore?.filter(Boolean) ?? [];
      if (!entries.length) continue;
      lines.push(`- ${ch.name}: ${entries.slice(-3).join(' | ')}`);
    }
    if (!lines.length) return null;
    return {
      id: `sys_session_lore_${Date.now()}`,
      role: Role.SYSTEM,
      content: [`[SESSION LORE]`, `Facts discovered in THIS chat only (do not apply to new chats):`, ...lines].join('\n'),
    };
  };

  const injectSessionLore = (history: Message[], chars: Character[], state?: ChatSession['characterState']) => {
    const cue = buildSessionLoreSystemCue(chars, state);
    return cue ? [cue, ...history] : history;
  };

  // Auto-extract session lore from the chat (chat-only canon updates)
  const sessionLoreLockRef = useRef<Record<string, boolean>>({});
  const lastSessionLoreMsgIdRef = useRef<Record<string, string>>({});
  const lastSessionLoreTimeRef = useRef<Record<string, number>>({});
  const lastLoreSeenLenBySessionRef = useRef<Record<string, number>>({});
  const SESSION_LORE_COOLDOWN_MS = 12000;

  // When switching chats, don't run analyzers for historical messages.
  useEffect(() => {
    if (!activeSession?.id) return;
    lastLoreSeenLenBySessionRef.current[activeSession.id] = chatHistory.length;
  }, [activeSession?.id]);

  useEffect(() => {
    if (!settings.enableSmarterMemory) return;
    if (!activeSession?.id) return;
    const sessionId = activeSession.id;
    const lastSeenLen = lastLoreSeenLenBySessionRef.current[sessionId] ?? chatHistory.length;
    if (chatHistory.length <= lastSeenLen) return;
    const latestMessage = chatHistory[chatHistory.length - 1];
    if (!latestMessage) return;
    if (latestMessage.role === Role.SYSTEM) return;
    if (lastSessionLoreMsgIdRef.current[sessionId] === latestMessage.id) return;
    if (sessionLoreLockRef.current[sessionId]) return;
    const now = Date.now();
    if (now - (lastSessionLoreTimeRef.current[sessionId] ?? 0) < SESSION_LORE_COOLDOWN_MS) return;

    // Mark as seen immediately so switching sessions doesn't trigger work.
    lastLoreSeenLenBySessionRef.current[sessionId] = chatHistory.length;

    sessionLoreLockRef.current[sessionId] = true;
    lastSessionLoreTimeRef.current[sessionId] = now;

    const chars = sessionCharactersRef.current;
    const historySlice = chatHistory.slice(-20);

    const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const nameToId = new Map<string, string>();
    for (const c of chars) nameToId.set(normKey(c.name), c.id);

    extractSessionLoreUpdates(settings.modelName, historySlice, chars)
      .then((updates) => {
        if (!updates.length) return;
        setChatSessions((prev) =>
          prev.map((session) => {
            if (session.id !== sessionId) return session;
            const nextState = { ...(session.characterState ?? {}) };
            let changed = false;
            for (const u of updates) {
              const id = nameToId.get(normKey(u.characterName));
              if (!id) continue;
              const existing = nextState[id]?.sessionLore ?? [];
              const entry = u.entry.trim();
              if (!entry) continue;
              if (existing.some((e) => e.toLowerCase() === entry.toLowerCase())) continue;
              const nextLore = [...existing, entry].slice(-10);
              nextState[id] = { ...(nextState[id] ?? {}), sessionLore: nextLore };
              changed = true;
            }
            return changed ? { ...session, characterState: nextState, updatedAt: Date.now() } : session;
          }),
        );
        lastSessionLoreMsgIdRef.current[sessionId] = latestMessage.id;
      })
      .catch((e) => console.warn('Session lore update failed:', e))
      .finally(() => {
        sessionLoreLockRef.current[sessionId] = false;
      });
  }, [chatHistory.length, settings.enableSmarterMemory, settings.modelName, activeSession?.id]);

  // Keep active session RPG playerName aligned with user profile name
  useEffect(() => {
    if (!activeSession?.id) return;
    const desired = (settings.userProfile?.name || '').trim();
    if (!desired) return;
    const current = activeSession.rpgState?.playerName;
    if (current === desired) return;
    setChatSessions((prev) =>
      prev.map((session) => {
        if (session.id !== activeSession.id) return session;
        const nextRpg = session.rpgState ? { ...session.rpgState, playerName: desired } : createDefaultRpgState(desired);
        return { ...session, rpgState: nextRpg, updatedAt: Date.now() };
      }),
    );
  }, [activeSession?.id, activeSession?.rpgState?.playerName, setChatSessions, settings.userProfile?.name]);

  // Attach session-scoped state to character (so new chats reset arc/traits/emotion)
  const withSessionData = useCallback((character: Character): Character => {
    const hasSessionState = !!sessionCharacterState;
    const state = sessionCharacterState?.[character.id];
    return {
      ...character,
      relationships: sessionRelationships[character.id] ?? character.relationships ?? [],
      currentEmotion: hasSessionState ? state?.currentEmotion : character.currentEmotion,
      development: hasSessionState ? state?.development : character.development,
    };
  }, [sessionRelationships, sessionCharacterState]);
  
  const sessionCharacterIds = activeSession?.characterIds ?? characters.map((c) => c.id);
  
  // Memoize expensive character computations
  const sessionCharacters = useMemo(() => 
    characters.filter((c) => sessionCharacterIds.includes(c.id)).map(withSessionData),
    [characters, sessionCharacterIds, withSessionData]
  );
  
  const storyCharacters = useMemo(() => 
    sessionCharacters.filter((c) => c.inStory ?? true),
    [sessionCharacters]
  );

  // Update worldInfo for the active session
  const setWorldInfo = (updater: WorldInfo | ((prev: WorldInfo) => WorldInfo)) => {
    const targetId = activeSession?.id ?? chatSessions[0]?.id;
    if (!targetId) return;
    setChatSessions((prev) =>
      prev.map((session) => {
        if (session.id !== targetId) return session;
        const currentWorld = session.worldInfo ?? defaultWorldInfo;
        const newWorld = typeof updater === 'function' ? updater(currentWorld) : updater;
        return { ...session, worldInfo: newWorld, updatedAt: Date.now() };
      })
    );
  };
  useEffect(() => {
    if (settings.llmProvider === 'groq') {
      if (!SUPPORTED_GROQ_MODELS.includes(settings.modelName)) {
        setSettings((prev) => ({ ...prev, modelName: DEFAULT_GROQ_MODEL }));
      }
    } else if (settings.llmProvider === 'gemini') {
      if (!SUPPORTED_GEMINI_MODELS.includes(settings.modelName)) {
        setSettings((prev) => ({ ...prev, modelName: DEFAULT_MODEL }));
      }
    }
  }, [settings.llmProvider, settings.modelName, setSettings]);

  useEffect(() => {
    setRuntimeApiKey(settings.geminiApiKey || null);
  }, [settings.geminiApiKey]);

  useEffect(() => {
    setRuntimeGroqApiKey(settings.groqApiKey || null);
  }, [settings.groqApiKey]);

  useEffect(() => {
    setRuntimeLmStudioBaseUrl(settings.lmStudioBaseUrl || null);
  }, [settings.lmStudioBaseUrl]);

  useEffect(() => {
    setRuntimeLlmProvider(settings.llmProvider || 'lmstudio');
  }, [settings.llmProvider]);

  // Hydrate new settings fields for existing localStorage users
  useEffect(() => {
    if (settings.userProfile) return;
    setSettings((prev) => ({
      ...prev,
      userProfile: {
        name: prev.userProfile?.name || 'Protagonist',
        details: prev.userProfile?.details || '',
      },
    }));
  }, [settings.userProfile, setSettings]);

  // Initialize RAG service
  const ragInitializedRef = useRef(false);
  useEffect(() => {
    if (ragInitializedRef.current) return;
    ragInitializedRef.current = true;
    
    const initRag = async () => {
      try {
        await initializeRag(settings.lmStudioBaseUrl);
        console.log('RAG service ready');
        
        // Index all characters
        for (const char of characters) {
          await indexCharacterForRag(char, activeSession?.id);
        }
        
        // Index world info
        if (worldInfo) {
          await indexWorldInfoForRag(worldInfo, activeSession?.id);
        }
        
        console.log('Initial RAG indexing complete');
      } catch (error) {
        console.warn('RAG initialization failed:', error);
      }
    };
    
    initRag();
  }, []);

  // Update RAG session ID when session changes
  useEffect(() => {
    setCurrentSessionId(activeSession?.id || null);
  }, [activeSession?.id]);

  // Re-index characters when they change
  const lastIndexedCharsRef = useRef<string>('');
  useEffect(() => {
    const charHash = characters.map(c => `${c.id}:${c.description?.slice(0, 50)}`).join('|');
    if (charHash === lastIndexedCharsRef.current) return;
    lastIndexedCharsRef.current = charHash;
    
    const reindexChars = async () => {
      for (const char of characters) {
        await indexCharacterForRag(char, activeSession?.id);
      }
    };
    
    // Debounce reindexing
    const timeoutId = setTimeout(reindexChars, 2000);
    return () => clearTimeout(timeoutId);
  }, [characters, activeSession?.id]);

  // Re-index world info when it changes
  const lastIndexedWorldRef = useRef<string>('');
  useEffect(() => {
    const worldHash = `${worldInfo.scenario}:${worldInfo.storyTracker}`.slice(0, 100);
    if (worldHash === lastIndexedWorldRef.current) return;
    lastIndexedWorldRef.current = worldHash;
    
    const reindexWorld = async () => {
      await indexWorldInfoForRag(worldInfo, activeSession?.id);
    };
    
    // Debounce reindexing
    const timeoutId = setTimeout(reindexWorld, 2000);
    return () => clearTimeout(timeoutId);
  }, [worldInfo, activeSession?.id]);

  // Index conversation periodically (every 10 messages)
  const lastIndexedHistoryLengthRef = useRef(0);
  useEffect(() => {
    if (chatHistory.length - lastIndexedHistoryLengthRef.current < 10) return;
    lastIndexedHistoryLengthRef.current = chatHistory.length;
    
    indexConversationForRag(chatHistory, activeSession?.id);
  }, [chatHistory.length, activeSession?.id]);

  // Sync RAG enabled setting
  useEffect(() => {
    setRagEnabled(settings.enableRag !== false);
  }, [settings.enableRag]);

  useEffect(() => {
    if (!activeSession || activeSession.rpgState) return;
    setChatSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id ? { ...session, rpgState: createDefaultRpgState() } : session,
      ),
    );
  }, [activeSession?.id, activeSession?.rpgState, setChatSessions]);

  // Ensure active session has worldInfo
  useEffect(() => {
    if (!activeSession || activeSession.worldInfo) return;
    setChatSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id ? { ...session, worldInfo: { ...defaultWorldInfo } } : session,
      ),
    );
  }, [activeSession?.id, activeSession?.worldInfo, setChatSessions]);

  // Ensure active session has relationship store
  useEffect(() => {
    if (!activeSession || activeSession.characterRelationships) return;
    const seededRelationships: Record<string, Relationship[]> = {};
    sessionCharacters.forEach((c) => {
      if (c.relationships && c.relationships.length) {
        seededRelationships[c.id] = c.relationships;
      }
    });
    setChatSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id ? { ...session, characterRelationships: seededRelationships } : session,
      ),
    );
  }, [activeSession?.id, activeSession?.characterRelationships, setChatSessions, sessionCharacters]);

  // Ensure active session has per-session character state store
  useEffect(() => {
    if (!activeSession || activeSession.characterState) return;
    setChatSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id ? ensureSessionCharacterState(session) : session,
      ),
    );
  }, [activeSession?.id, activeSession?.characterState, setChatSessions]);

  // Update story memory in the background
  const updateSessionStoryMemory = async (history: Message[]) => {
    const targetId = activeSession?.id;
    if (!targetId) return;
    if (!shouldUpdateStoryMemory(history, storyMemory)) return;
    
    try {
      const newMemory = await updateStoryMemory(
        settings.modelName,
        history,
        sessionCharacters,
        worldInfo,
        storyMemory
      );
      setChatSessions((prev) =>
        prev.map((session) =>
          session.id === targetId ? { ...session, storyMemory: newMemory } : session
        )
      );
    } catch (error) {
      console.warn('Failed to update story memory:', error);
    }
  };

  // Background analyzer scheduling (prevents analyzers from competing with chat generation)
  const pendingAnalyzerTimeoutsRef = useRef<Record<string, number>>({});
  const lastEmotionAtRef = useRef<Record<string, number>>({});
  const lastRelationshipAtRef = useRef<Record<string, number>>({});
  const lastDevelopmentAtRef = useRef<Record<string, number>>({});

  // Update character emotion, relationships, and development after they speak
  const updateCharacterEmotionAndRelationships = async (
    character: Character,
    messageContent: string,
    recentHistory: Message[],
    sessionId: string | null
  ) => {
    if (!sessionId) return;
    if (activeSessionId !== sessionId) return;
    // Skip if message content is empty or too short
    if (!messageContent || messageContent.trim().length < 5) {
      return;
    }

    const key = `${sessionId}:${character.id}`;
    const existingTimeout = pendingAnalyzerTimeoutsRef.current[key];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      delete pendingAnalyzerTimeoutsRef.current[key];
    }

    const EMOTION_COOLDOWN_MS = 3000;
    const RELATIONSHIP_COOLDOWN_MS = 20000;
    const DEVELOPMENT_COOLDOWN_MS = 30000;

    pendingAnalyzerTimeoutsRef.current[key] = window.setTimeout(async () => {
      delete pendingAnalyzerTimeoutsRef.current[key];
      if (activeSessionId !== sessionId) return;
      if (isSending || isContinuing) return;

      try {
        const now = Date.now();

        // Emotion
        const lastEmotionAt = lastEmotionAtRef.current[key] ?? 0;
        if (now - lastEmotionAt >= EMOTION_COOLDOWN_MS) {
          lastEmotionAtRef.current[key] = now;
          const newEmotion = await detectCharacterEmotion(
            settings.modelName,
            character,
            messageContent,
            recentHistory
          );
          setChatSessions((prev) =>
            prev.map((session) => {
              if (session.id !== sessionId) return session;
              const nextState = { ...(session.characterState ?? {}) };
              nextState[character.id] = { ...(nextState[character.id] ?? {}), currentEmotion: newEmotion };
              return { ...session, characterState: nextState };
            }),
          );
        }

        // Relationships/affection + character development temporarily disabled
        // (User requested removing the affection meter + development for now.)
        return;
      } catch (error) {
        console.warn('Failed to update character emotion/relationships:', error);
      }
    }, 900);
  };

  const updateActiveSessionData = (updater: (session: ChatSession) => ChatSession) => {
    const targetId = activeSession?.id ?? chatSessions[0]?.id;
    if (!targetId) return;
    setChatSessions((prev) =>
      prev.map((session) => {
        if (session.id !== targetId) return session;
        const next = updater(session);
        return { ...next, updatedAt: Date.now() };
      }),
    );
  };

  const updateActiveSessionHistory = (updater: (prev: Message[]) => Message[]) => {
    updateActiveSessionData((session) => ({
      ...session,
      history: updater(session.history),
    }));
  };

  const setChatHistory = (value: Message[] | ((prev: Message[]) => Message[])) => {
    updateActiveSessionHistory((prev) => (typeof value === 'function' ? (value as (prev: Message[]) => Message[])(prev) : value));
  };

  const setActiveRpgState = (
    value:
      | RpgState
      | null
      | undefined
      | ((prev: RpgState | null | undefined) => RpgState | null | undefined),
  ) => {
    updateActiveSessionData((session) => {
      const nextValue = typeof value === 'function' ? (value as (prev: RpgState | null | undefined) => RpgState | null | undefined)(session.rpgState) : value;
      return { ...session, rpgState: nextValue ?? null };
    });
  };

  const ensureActiveSessionHasRpgState = () => {
    if (activeSession?.rpgState) return;
    setActiveRpgState(createDefaultRpgState(settings.userProfile?.name));
  };

  const handleSelectSession = (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    releaseLocks();
    setActiveSessionId(sessionId);
  };

  const handleNewChat = () => {
    const now = Date.now();
    const seededRelationships: Record<string, Relationship[]> = {};
    const newSession: ChatSession = {
      id: `session_${now}`,
      title: `Chat ${chatSessions.length + 1}`,
      history: [createWelcomeMessage()],
      createdAt: now,
      updatedAt: now,
      rpgState: createDefaultRpgState(settings.userProfile?.name),
      worldInfo: { ...defaultWorldInfo },
      characterRelationships: seededRelationships,
      characterState: {},
      characterIds: [],
    };
    setChatSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    setActivePartyIds([]);
    releaseLocks();
  };
  const releaseLocks = () => {
    stopGenerationRef.current = false;
    setIsSending(false);
    setIsContinuing(false);
    setIsGeneratingMedia(false);
    setActiveNarrationMode(null);
  };

  const handleOpenRpgSheet = () => {
    ensureActiveSessionHasRpgState();
    setIsRpgSheetOpen(true);
  };

  const handleSaveRpgSheet = (next: RpgState) => {
    setActiveRpgState(next);
    setIsRpgSheetOpen(false);
  };

  const handleEnterRpgView = () => {
    ensureActiveSessionHasRpgState();
    setViewMode('rpg');
  };

  const handleExitRpgView = () => {
    setViewMode('standard');
  };

  const handleEnterLibraryView = () => {
    releaseLocks();
    setViewMode('library');
  };

  const handleExitLibraryView = () => {
    setViewMode('standard');
  };

  const getActiveParty = () => {
    if (!storyCharacters.length) return [] as Character[];
    const pool = storyCharacters.filter((c) => activePartyIds.includes(c.id));
    return pool.length ? pool : storyCharacters;
  };

  const getPresentParty = () => {
    return getActiveParty().filter((c) => (c.presence ?? 'present') === 'present');
  };

  const pickRoundSpeakers = (pool: Character[]) => {
    const presentPool = pool.filter((c) => (c.presence ?? 'present') === 'present');
    if (presentPool.length <= 1) return [...presentPool];
    const shuffled = [...presentPool].sort(() => Math.random() - 0.5);
    const minCount = Math.min(2, shuffled.length);
    const maxCount = Math.max(minCount, Math.ceil(shuffled.length * 0.75));
    const range = Math.max(1, maxCount - minCount + 1);
    const desiredCount = Math.min(shuffled.length, minCount + Math.floor(Math.random() * range));
    return shuffled.slice(0, desiredCount);
  };

  const handleTogglePartyMember = (id: string) => {
    setActivePartyIds((prev) => {
      const next = prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id];
      if (next.length === 0) {
        return [id];
      }
      return next;
    });
  };

  const handleSelectAllPartyMembers = () => {
    if (!storyCharacters.length) return;
    setActivePartyIds(storyCharacters.map((c) => c.id));
  };

  const handleAddCharacterToStory = (id: string) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, inStory: true, presence: c.presence ?? 'present' } : c)));
    updateActiveSessionData((session) => {
      const baseIds = session.characterIds ?? characters.map((c) => c.id);
      const nextIds = baseIds.includes(id) ? baseIds : [...baseIds, id];
      return { ...session, characterIds: nextIds };
    });
    setActivePartyIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleRemoveCharacterFromStory = (id: string) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, inStory: false } : c)));
    updateActiveSessionData((session) => {
      const baseIds = session.characterIds ?? characters.map((c) => c.id);
      const nextIds = baseIds.filter((cid) => cid !== id);
      return { ...session, characterIds: nextIds };
    });
    setActivePartyIds((prev) => prev.filter((pid) => pid !== id));
  };

  const annotateHungPlaceholders = (reason: string) => {
    setChatHistory(prev => prev.map(msg => {
      if (msg.content === '' && (msg.role === Role.CHARACTER || msg.role === Role.NARRATOR)) {
        return { ...msg, role: Role.SYSTEM, characterName: undefined, content: reason };
      }
      return msg;
    }));
  };

  const forceUnlock = (reason = 'Generation timed out. Ready for new input.') => {
    releaseLocks();
    annotateHungPlaceholders(reason);
  };

  useEffect(() => {
    if (chatSessions.length === 0) {
      let legacyHistory: Message[] = [];
      try {
        const raw = localStorage.getItem('rpchat_history');
        legacyHistory = raw ? JSON.parse(raw) : [];
      } catch {
        legacyHistory = [];
      }
      const baseHistory = legacyHistory.length ? legacyHistory : [createWelcomeMessage()];
      const firstSession: ChatSession = {
        id: `session_${Date.now()}`,
        title: 'Chat 1',
        history: baseHistory,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        rpgState: createDefaultRpgState(),
      };
      setChatSessions([firstSession]);
      setActiveSessionId(firstSession.id);
      localStorage.removeItem('rpchat_history');
    } else if (!activeSessionId) {
      setActiveSessionId(chatSessions[0].id);
    }
  }, [chatSessions, activeSessionId, setChatSessions, setActiveSessionId]);

  useEffect(() => {
    setWorldInfo((prev) => {
      if (!prev) {
        return defaultWorldInfo;
      }
      const needsHydration =
        prev.currentLocation === undefined ||
        prev.currentTime === undefined ||
        prev.locationAuto === undefined ||
        prev.timeAuto === undefined;
      return needsHydration ? hydrateWorldInfo(prev) : prev;
    });
  }, [setWorldInfo]);

  useEffect(() => {
    if (!chatSessions.length) return;
    let needsUpdate = false;
    const patched = chatSessions.map((session) => {
      if (session.rpgState) {
        return session;
      }
      needsUpdate = true;
      return ensureSessionRpgState(session);
    });
    if (needsUpdate) {
      setChatSessions(patched);
    }
  }, [chatSessions, setChatSessions]);

  useEffect(() => {
    const storyIds = storyCharacters.map((c) => c.id);
    if (storyIds.length === 0) {
      setActivePartyIds([]);
      return;
    }
    setActivePartyIds((prev) => {
      const trimmed = prev.filter((id) => storyIds.includes(id));
      if (trimmed.length === 0) {
        return storyIds;
      }
      if (trimmed.length === prev.length) {
        return prev;
      }
      return trimmed;
    });
  }, [storyCharacters, setActivePartyIds]);

  const lastSceneHintTimeRef = useRef<number>(0);
  const SCENE_HINT_COOLDOWN_MS = 8000; // 8 seconds between scene hint extractions

  useEffect(() => {
    const latestMessage = chatHistory[chatHistory.length - 1];
    if (!latestMessage) return;
    const wantsLocation = worldInfo.locationAuto ?? true;
    const wantsTime = worldInfo.timeAuto ?? true;
    if (!wantsLocation && !wantsTime) return;
    if (lastSceneHintIdRef.current === latestMessage.id) return;
    if (sceneHintLockRef.current) return;
    
    // Time-based debounce
    const now = Date.now();
    if (now - lastSceneHintTimeRef.current < SCENE_HINT_COOLDOWN_MS) {
      return;
    }
    
    sceneHintLockRef.current = true;
    lastSceneHintTimeRef.current = now;
    
    extractSceneHints(settings.modelName, chatHistory)
      .then((hints) => {
        if (!hints) return;
        setWorldInfo((prev) => {
          const next = { ...prev };
          let changed = false;
          if ((prev.locationAuto ?? true) && hints.location && hints.location !== prev.currentLocation) {
            next.currentLocation = hints.location;
            changed = true;
          }
          if ((prev.timeAuto ?? true) && hints.time && hints.time !== prev.currentTime) {
            next.currentTime = hints.time;
            changed = true;
          }
          return changed ? next : prev;
        });
        lastSceneHintIdRef.current = latestMessage.id;
      })
      .catch((error) => {
        console.warn('Scene hint extraction failed', error);
      })
      .finally(() => {
        sceneHintLockRef.current = false;
      });
  }, [chatHistory.length, settings.modelName, worldInfo.locationAuto, worldInfo.timeAuto]); // Use chatHistory.length instead of full array

  const presenceDetectionLockRef = useRef(false);
  const lastPresenceCheckIdRef = useRef<Record<string, string>>({});
  const lastPresenceCheckTimeRef = useRef<Record<string, number>>({});
  const lastPresenceSeenLenBySessionRef = useRef<Record<string, number>>({});
  const PRESENCE_CHECK_COOLDOWN_MS = 5000; // 5 seconds minimum between checks
  
  // Store refs to avoid stale closures and reduce re-renders
  const sessionCharactersRef = useRef(sessionCharacters);
  sessionCharactersRef.current = sessionCharacters;

  useEffect(() => {
    if (!activeSession?.id) return;
    lastPresenceSeenLenBySessionRef.current[activeSession.id] = chatHistory.length;
  }, [activeSession?.id]);

  useEffect(() => {
    if (!activeSession?.id) return;
    const sessionId = activeSession.id;
    const lastSeenLen = lastPresenceSeenLenBySessionRef.current[sessionId] ?? chatHistory.length;
    if (chatHistory.length <= lastSeenLen) return;
    const latestMessage = chatHistory[chatHistory.length - 1];
    if (!latestMessage || !sessionCharactersRef.current.length) return;
    
    // Run presence detection on any new message (not just narrator/character)
    if (lastPresenceCheckIdRef.current[sessionId] === latestMessage.id) return;
    if (presenceDetectionLockRef.current) return;
    
    // Skip system messages
    if (latestMessage.role === Role.SYSTEM) return;
    
    // Debounce by time
    const now = Date.now();
    if (now - (lastPresenceCheckTimeRef.current[sessionId] ?? 0) < PRESENCE_CHECK_COOLDOWN_MS) {
      return;
    }
    
    presenceDetectionLockRef.current = true;
    lastPresenceCheckTimeRef.current[sessionId] = now;
    lastPresenceSeenLenBySessionRef.current[sessionId] = chatHistory.length;
    
    // Use ref to get current characters
    const currentCharacters = sessionCharactersRef.current;

    const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

    // Fast heuristic: if narrator explicitly says someone is alone, they are not "with you".
    // This avoids the UI/prompt keeping stale presence when the model misses an update.
    const inferAloneOverrides = (msg: Message, chars: Character[]): Record<string, PresenceInfo> => {
      if (msg.role !== Role.NARRATOR) return {};
      const rawText = (msg.content || '').toLowerCase();
      const text = normName(rawText);
      if (!text) return {};
      if (!/(\balone\b|by herself|by himself|all alone)/i.test(rawText)) return {};
      // If narration explicitly says they're with the protagonist, don't override.
      if (/(with you|beside you|next to you|with the protagonist|together with you)/i.test(rawText)) return {};

      const overrides: Record<string, PresenceInfo> = {};
      for (const ch of chars) {
        const name = ch.name?.trim();
        if (!name) continue;
        if (text.includes(normName(name))) {
          overrides[name] = { status: 'away' };
        }
      }
      return overrides;
    };

    const aloneOverrides = inferAloneOverrides(latestMessage, currentCharacters);
    if (Object.keys(aloneOverrides).length) {
      setCharacters((prev) =>
        prev.map((c) => {
          const info = aloneOverrides[c.name];
          if (!info) return c;
          const currentPresence = c.presence ?? 'present';
          if (currentPresence !== info.status) {
            return { ...c, presence: info.status };
          }
          return c;
        })
      );
      lastPresenceCheckIdRef.current[sessionId] = latestMessage.id;
      presenceDetectionLockRef.current = false;
      return;
    }
    
    detectPresenceChanges(settings.modelName, chatHistory, currentCharacters)
      .then((changes) => {
        if (!Object.keys(changes).length) {
          return;
        }
        console.log('Applying presence changes:', changes);

        const normalizedChanges = new Map<string, PresenceInfo>();
        for (const [name, info] of Object.entries(changes)) {
          normalizedChanges.set(normName(name), info);
        }

        setCharacters((prev) =>
          prev.map((c) => {
            const info = changes[c.name] || normalizedChanges.get(normName(c.name));
            if (info) {
              const currentPresence = c.presence ?? 'present';
              const newPresence = info.status;
              const newLocation = info.location;
              if (newPresence !== currentPresence || newLocation !== c.location) {
                return { ...c, presence: newPresence, location: newLocation };
              }
            }
            return c;
          })
        );
        lastPresenceCheckIdRef.current[sessionId] = latestMessage.id;
      })
      .catch((error) => {
        console.warn('Presence detection failed', error);
      })
      .finally(() => {
        presenceDetectionLockRef.current = false;
      });
  }, [chatHistory.length, settings.modelName]); // Only depend on chatHistory.length

  const handleSetCharacterPresence = (id: string, status: PresenceStatus) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, presence: status } : c))
    );
  };

  useEffect(() => {
    const hasVisited = localStorage.getItem('rpchat_has_visited');
    if (!hasVisited) {
      setCharacters([]);
      setSettings((prev) => ({
        ...prev,
        userPortraitUrl: '',
      }));
      setWorldInfo(defaultWorldInfo);
      localStorage.setItem('rpchat_has_visited', 'true');
    }

    const checkVeoKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsVeoKeySelected(hasKey);
      }
    };
    checkVeoKey();
    setIsLoaded(true);
  }, [setCharacters, setSettings, setWorldInfo]);

  // Ensure all characters have presence status (default to 'present')
  useEffect(() => {
    setCharacters((prev) =>
      prev.map((c) => {
        const withPresence = { ...c, presence: c.presence ?? 'present' };
        return ensurePlayerRelationship(withPresence);
      })
    );
  }, []); // Run once on mount

  // Video Polling Effect - with proper cleanup and refs to avoid stale closures
  const chatHistoryRef = useRef(chatHistory);
  chatHistoryRef.current = chatHistory;
  
  useEffect(() => {
    const pendingVideos = chatHistory.filter(m => m.videoUrl?.startsWith('generating:'));
    if (pendingVideos.length === 0) return;
    
    let isActive = true; // Flag to prevent updates after cleanup

    const pollVideo = async (messageId: string, operationName: string) => {
        if (!isActive) return;
        try {
            let operation = await getVideosOperation({ name: operationName });
            
            if (!isActive) return; // Check again after async call
            
            if (operation.done) {
                if (operation.response) {
                    const downloadLink = operation.response.generatedVideos[0].video.uri;
                    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                    if (!isActive) return;
                    const videoBlob = await videoResponse.blob();
                    const videoUrl = URL.createObjectURL(videoBlob);
                    setChatHistory(prev => prev.map(m => m.id === messageId ? { ...m, videoUrl, content: 'Video generation complete.' } : m));
                } else {
                    throw new Error(operation.error?.message || "Video generation failed without a specific error.");
                }
                setIsGeneratingMedia(false);
            }
        } catch (error) {
            if (!isActive) return;
            console.error('Polling error:', error);
            setChatHistory(prev => prev.map(m => m.id === messageId ? { ...m, role: Role.SYSTEM, content: `Video failed: ${(error as Error).message}`, videoUrl: undefined } : m));
            setIsGeneratingMedia(false);
        }
    };

    const intervalId = setInterval(() => {
      // Use ref to get current history without re-creating interval
      const currentHistory = chatHistoryRef.current;
      currentHistory.forEach(m => {
        if (m.videoUrl?.startsWith('generating:')) {
          const operationName = m.videoUrl.split(':')[1];
          pollVideo(m.id, operationName);
        }
      });
    }, 10000);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [chatHistory.filter(m => m.videoUrl?.startsWith('generating:')).length]); // Only re-run when pending count changes

  const addMessage = (newMessage: Omit<Message, 'id'>, id?: string) => {
    setChatHistory(prev => [...prev, { ...newMessage, id: id || `msg_${Date.now()}_${Math.random()}` }]);
  };

  const isSummarizingRef = useRef(false);
  const lastSummarizeTimeRef = useRef(0);
  const SUMMARIZE_COOLDOWN_MS = 60000; // 1 minute between summarizations

  const checkAndSummarizeMemory = async () => {
    // Prevent multiple simultaneous summarizations
    if (isSummarizingRef.current) return;
    
    // Cooldown between summarizations
    const now = Date.now();
    if (now - lastSummarizeTimeRef.current < SUMMARIZE_COOLDOWN_MS) return;
    
    if (settings.enableSmarterMemory && chatHistory.length > 40) {
        const toSummarize = chatHistory.slice(0, 20);
        if (toSummarize.some(m => m.content?.includes("Story summary:"))) return;
        
        isSummarizingRef.current = true;
        lastSummarizeTimeRef.current = now;
        
        try {
          addMessage({ role: Role.SYSTEM, content: "🧠 Condensing older memories..." });
          const summary = await getChatSummary(settings.modelName, toSummarize);
          const summaryMessage: Message = {
              id: `sys_summary_${Date.now()}`,
              role: Role.SYSTEM,
              content: `Story summary: ${summary}`,
          };
          const remainingHistory = chatHistory.slice(20);
          setChatHistory([summaryMessage, ...remainingHistory]);
        } finally {
          isSummarizingRef.current = false;
        }
    }
  };

  const runNarrationStream = async (historyContext?: Message[]) => {
    const placeholderId = `msg_${Date.now()}_narrator`;
    addMessage({ role: Role.NARRATOR, content: '' }, placeholderId);
    markStreamActivity();
    
    const buildUserProfileSystemCue = (): Message | null => {
      const details = (settings.userProfile?.details || '').trim();
      const name = protagonistName;
      if (!name && !details) return null;
      const lines = [
        `[PROTAGONIST PROFILE]`,
        `Name: ${name}`,
        details ? `Details: ${details}` : '',
        `Treat this as canon for the protagonist. Do not invent new protagonist facts.`,
      ].filter(Boolean);
      return {
        id: `sys_profile_${Date.now()}`,
        role: Role.SYSTEM,
        content: lines.join('\n'),
      };
    };

    const injectUserProfile = (history: Message[]) => {
      const cue = buildUserProfileSystemCue();
      return cue ? [cue, ...history] : history;
    };

    let historyForPrompt = injectSessionLore(
      injectUserProfile(historyContext || chatHistory),
      sessionCharactersRef.current,
      activeSession?.characterState,
    );
    historyForPrompt = await injectWebFacts(historyForPrompt);
    const presentCast = getPresentParty().map((c) => c.name);
    const stream = getNarrationStream(settings.modelName, worldInfo, historyForPrompt, {
      storyMemory,
      lite: settings.tokenSaverMode,
      activeCast: Array.from(new Set([...presentCast, protagonistName])),
    });
    let fullNarration = '';
    for await (const chunk of stream) {
      if (stopGenerationRef.current) break;
      fullNarration += chunk;
      markStreamActivity();
      setChatHistory(prev => prev.map(msg => 
        msg.id === placeholderId ? { ...msg, content: fullNarration } : msg
      ));
    }
    
    // Update story memory in the background after narration
    updateSessionStoryMemory(historyForPrompt);
  };
  
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  const levenshtein = (a: string, b: string) => {
    if (a === b) return 0;
    const al = a.length;
    const bl = b.length;
    if (al === 0) return bl;
    if (bl === 0) return al;
    const dp = Array.from({ length: al + 1 }, (_, i) => [i]);
    for (let j = 1; j <= bl; j += 1) dp[0][j] = j;
    for (let i = 1; i <= al; i += 1) {
      for (let j = 1; j <= bl; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[al][bl];
  };

  const similarity = (a: string, b: string) => {
    if (!a || !b) return 0;
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 0;
    return 1 - dist / maxLen;
  };

  const buildNameVariants = (name: string) => {
    const variants = new Set<string>();
    const normalized = normalize(name);
    if (normalized) variants.add(normalized);
    const parts = normalized.split(' ').filter(Boolean);
    if (parts.length) {
      variants.add(parts[0]);
      if (parts.length >= 2) variants.add(parts.slice(0, 2).join(' '));
    }
    // Extract nickname inside parentheses or after quotes, e.g., "Emily (Em)" or "Jin \"Ace\" Park"
    const parenMatch = name.match(/\(([^)]+)\)/);
    if (parenMatch?.[1]) {
      const nick = normalize(parenMatch[1]);
      if (nick) variants.add(nick);
    }
    const quoteMatch = name.match(/"([^"]+)"|\'([^\']+)\'/);
    const quotedNick = quoteMatch?.[1] || quoteMatch?.[2];
    if (quotedNick) {
      const nick = normalize(quotedNick);
      if (nick) variants.add(nick);
    }
    return Array.from(variants).filter((v) => v.length >= 2);
  };

  // Detect which character(s) the user is talking to based on message content (fuzzy + nicknames)
  const detectTargetCharacters = (message: string): Character[] => {
    const presentParty = getPresentParty();
    if (!presentParty.length) return [];

    const normalizedMessage = normalize(message);
    const messageTokens = normalizedMessage.split(' ').filter(Boolean);

    const scored: { char: Character; score: number }[] = [];

    presentParty.forEach((char) => {
      const variants = buildNameVariants(char.name);
      let best = 0;
      variants.forEach((variant) => {
        if (normalizedMessage.includes(variant)) {
          best = Math.max(best, 1);
          return;
        }
        // Compare against each token and token pairs for mild misspellings
        for (let i = 0; i < messageTokens.length; i += 1) {
          best = Math.max(best, similarity(variant, messageTokens[i]));
          if (i < messageTokens.length - 1) {
            const pair = `${messageTokens[i]} ${messageTokens[i + 1]}`;
            best = Math.max(best, similarity(variant, pair));
          }
        }
      });
      if (best >= 0.68) {
        scored.push({ char, score: best });
      }
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.char);
  };

  const handleSendMessage = async (messageContent: string, as: string, options?: SendOptions): Promise<Message | void> => {
    stopGenerationRef.current = false;
    if (isSending || isContinuing) {
      forceUnlock('Previous generation cancelled to send a new message.');
    }
    const baseHistory = options?.historyOverride ?? chatHistory;
    if (as === 'user') {
      if (!messageContent.trim()) return;
      const userMessage: Message = { id: `msg_${Date.now()}_user`, role: Role.USER, content: messageContent };
      const newHistory = [...baseHistory, userMessage];
      setChatHistory(newHistory);
      
      // Smart detection: find who the user is talking to
      const targetChars = detectTargetCharacters(messageContent);
      
      if (targetChars.length > 0) {
        // User mentioned specific character(s) - have them reply
        stopGenerationRef.current = false;
        setIsSending(true);
        try {
          let rollingHistory = newHistory;
          for (const char of targetChars) {
            if (stopGenerationRef.current) break;
            const result = await handleSendMessage('', char.id, {
              skipGroupChatter: true,
              historyOverride: rollingHistory,
              partnerNames: targetChars.filter((c) => c.id !== char.id).map((c) => c.name),
            });
            if (result) {
              rollingHistory = [...rollingHistory, result];
            }
          }
        } catch (error) {
          if (!stopGenerationRef.current) { addMessage({ role: Role.SYSTEM, content: `Error: ${(error as Error).message}` }); }
          releaseLocks();
        } finally {
          const wasStopped = stopGenerationRef.current;
          setIsSending(false);
          if (!wasStopped) {
            checkAndSummarizeMemory();
          }
        }
      } else if (settings.autoNarration) {
        // No specific character mentioned - just narrate
        stopGenerationRef.current = false;
        setIsSending(true);
        try {
          await runNarrationStream(newHistory);
        } catch (error) {
          if (!stopGenerationRef.current) { addMessage({ role: Role.SYSTEM, content: `Error: ${(error as Error).message}` }); }
          releaseLocks();
        } finally {
          const wasStopped = stopGenerationRef.current;
          setIsSending(false);
          if (!wasStopped) {
            checkAndSummarizeMemory();
          }
        }
      }
      if ((settings.enableGroupChatter ?? false) && !options?.skipGroupChatter && targetChars.length === 0) {
        await triggerGroupChatter(newHistory);
      }
      return userMessage;
    }
    
    if (as === 'narrator') {
      if (!messageContent.trim()) return;
      const narrationMessage: Message = { id: `msg_${Date.now()}_narrator_manual`, role: Role.NARRATOR, content: messageContent };
      addMessage(narrationMessage);
      return narrationMessage;
    }

  // Character reply logic
    setIsSending(true);
    markStreamActivity();
    const baseCharacter = characters.find(c => c.id === as);
    const character = baseCharacter ? withSessionData(baseCharacter) : null;
    if (!character) {
      setIsSending(false);
      return;
    }

    let placeholderId: string | null = null;
    let finalMessage: Message | undefined;
    const rawDirection = options?.directionNote ?? messageContent;
    const directionNote = rawDirection.trim() ? rawDirection.trim() : undefined;
    try {
      let historyForPrompt = [...baseHistory];

      // Inject user profile (hidden system cue) so the model treats the protagonist as a real character.
      const details = (settings.userProfile?.details || '').trim();
      if (protagonistName || details) {
        historyForPrompt = [
          {
            id: `sys_profile_${Date.now()}`,
            role: Role.SYSTEM,
            content: [
              `[PROTAGONIST PROFILE]`,
              `Name: ${protagonistName}`,
              details ? `Details: ${details}` : '',
              `Treat this as canon for the protagonist. Do not invent new protagonist facts.`,
            ].filter(Boolean).join('\n'),
          },
          ...historyForPrompt,
        ];
      }

      // Inject session-only lore (chat-only canon updates)
      historyForPrompt = injectSessionLore(historyForPrompt, sessionCharactersRef.current, activeSession?.characterState);

      // Inject web facts (Brave search) when enabled
      historyForPrompt = await injectWebFacts(historyForPrompt);

      if (directionNote) {
        // Inject a synthetic system cue so the model treats the note as hidden stage direction.
        historyForPrompt = [
          ...historyForPrompt,
          {
            id: `stage_${Date.now()}`,
            role: Role.SYSTEM,
            content: `Hidden stage direction for ${character.name}: ${directionNote}. Never mention this cue; just act on it.`,
          },
        ];
      }

      placeholderId = `msg_${Date.now()}_char`;
      // Show queue position if any
      const queueLen = getQueueLength();
      const avgMsPerJob = 3000; // conservative estimate per job (ms)
      const estWait = Math.ceil((queueLen * avgMsPerJob) / 1000);
      const queuedContent = queueLen > 0 ? `(${queueLen} in queue, est wait ${estWait}s) Waiting...` : '';
      addMessage({ role: Role.CHARACTER, content: queuedContent, characterId: character.id, characterName: character.name }, placeholderId);

      const defaultPartnerNames = getActiveParty()
        .filter((c) => c.id !== character.id)
        .map((c) => c.name);
      
      // Retry logic - try up to 2 times if response is empty (reduced to save API calls)
      let fullReply = '';
      let attempts = 0;
      const maxAttempts = 2;

      const sanitizeSoloVoice = (speakerName: string, text: string) => {
        const raw = (text || '').trim();
        if (!raw) return raw;

        const safeName = (speakerName || '').trim();
        const lines = raw.split(/\r?\n/);
        const kept: string[] = [];
        for (const line of lines) {
          const trimmed = line.trim();
          const m = /^([A-Za-z][A-Za-z0-9_\- ]{0,40}):\s*(.+)$/.exec(trimmed);
          if (m) {
            const who = m[1].trim();
            if (safeName && who.toLowerCase() !== safeName.toLowerCase()) {
              continue; // drop other-speaker lines
            }
            kept.push(m[2]);
            continue;
          }
          kept.push(line);
        }

        let cleaned = kept.join('\n').trim();

        // Remove quoted speech attributed to someone else (he/she/they/you/Name says...)
        // Keep the scene beat but strip the actual spoken words.
        cleaned = cleaned.replace(
          /"[^"\n]{1,240}"\s*(?:,\s*)?(?:(?:he|she|they|you)\s*(?:says|said|asks|asked|whispers|murmurs|replies)|(?:[A-Z][a-zA-Z0-9_\-]{1,30})\s*(?:says|said|asks|asked|whispers|murmurs|replies))\b/g,
          (match) => {
            // If it's the character speaking ("..." I say / "..." Emily says), keep it.
            if (/\bI\s*(?:says|said|ask|asks|whisper|whispers|murmur|murmurs|reply|replies)\b/i.test(match)) return match;
            if (safeName && new RegExp(`\\b${safeName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*(?:says|said|asks|asked|whispers|murmurs|replies)\\b`, 'i').test(match)) {
              return match;
            }
            return 'They speak, but you don\'t catch the words.';
          }
        );

        // Remove standalone quoted lines that look like they might be other-speaker dialogue preceded by attribution.
        // (We avoid stripping all quotes because the character MUST speak in quotes.)
        cleaned = cleaned.replace(/\n\s*>\s*"[^"\n]{1,240}"\s*\n/g, '\n');

        return cleaned.trim();
      };
      
      while (attempts < maxAttempts && fullReply.trim() === '' && !stopGenerationRef.current) {
        attempts++;
        if (attempts > 1) {
          // Update placeholder to show retry attempt
          setChatHistory(prev => prev.map(msg => 
            msg.id === placeholderId ? { ...msg, content: `(Retrying...)` } : msg
          ));
          await new Promise(r => setTimeout(r, 500)); // Wait 0.5 second between retries
        }
        
        const presentCast = getPresentParty().map((c) => c.name);
        const stream = getCharacterReplyStream(settings.modelName, worldInfo, character, historyForPrompt, {
          partnerNames: options?.partnerNames ?? defaultPartnerNames,
          directionNote,
          storyMemory,
          lite: settings.tokenSaverMode,
          activeCast: Array.from(new Set([character.name, ...presentCast, protagonistName])),
          groupChatContext: options?.groupChatContext,
        });
        fullReply = '';
        for await (const chunk of stream) {
          if (stopGenerationRef.current) break;
          fullReply += chunk || '';
          markStreamActivity();
          const cleaned = sanitizeSoloVoice(character.name, fullReply);
          if (cleaned !== fullReply) fullReply = cleaned;
          setChatHistory(prev => prev.map(msg => msg.id === placeholderId ? { ...msg, content: fullReply } : msg));
        }

        fullReply = (fullReply || '').trim();
      }

      // Final sanitize pass (solo voice)
      fullReply = sanitizeSoloVoice(character.name, fullReply).trim();
      if (placeholderId) setChatHistory(prev => prev.map(msg => msg.id === placeholderId ? { ...msg, content: fullReply } : msg));

      if (fullReply.trim() === '' && !stopGenerationRef.current) {
        // Keep as CHARACTER message so Redo button appears
        const fallbackMessage: Message = {
          id: placeholderId,
          role: Role.CHARACTER,
          characterId: character.id,
          characterName: character.name,
          content: `*${character.name} seems distracted and doesn't respond. (Click Redo to try again)*`,
        };
        finalMessage = fallbackMessage;
        setChatHistory(prev => prev.map(msg =>
          msg.id === placeholderId ? { ...fallbackMessage } : msg
        ));
      } else if (!stopGenerationRef.current) {
        finalMessage = {
          id: placeholderId,
          role: Role.CHARACTER,
          content: fullReply,
          characterId: character.id,
          characterName: character.name,
        };
        
        // Update character emotion, relationships, and development in background
        updateCharacterEmotionAndRelationships(character, fullReply, historyForPrompt, activeSessionId);
        
        if (settings.autoNarration) {
          // Only trigger auto-narration if the character provided a response.
          const finalHistoryForNarration = [...historyForPrompt, finalMessage];
          await runNarrationStream(finalHistoryForNarration);
        } else {
          // Update story memory if no narration (narration already updates it)
          updateSessionStoryMemory([...historyForPrompt, finalMessage]);
        }
      }
    } catch (error) {
      if (!stopGenerationRef.current) {
        if (placeholderId) {
          // Keep as CHARACTER role with characterId so Redo button appears
          const errorMessage: Message = {
            id: placeholderId,
            role: Role.CHARACTER,
            characterId: character.id,
            characterName: character.name,
            content: `*${character.name} encounters an issue: ${(error as Error).message}* (Click Redo to try again)`,
          };
          finalMessage = errorMessage;
          setChatHistory(prev => prev.map(msg =>
            msg.id === placeholderId ? { ...errorMessage } : msg
          ));
        } else {
          addMessage({ role: Role.SYSTEM, content: `Error: ${(error as Error).message}` });
        }
        releaseLocks();
      } else {
        releaseLocks();
      }
  } finally {
    const wasStopped = stopGenerationRef.current;
    setIsSending(false);
    if (!wasStopped) {
      checkAndSummarizeMemory();
    }
  }
    return finalMessage;
  };

  const triggerGroupChatter = async (startingHistory: Message[] = chatHistory) => {
    const party = getPresentParty();
    if (!party.length) return;
    const speakers = pickRoundSpeakers(party);
    if (!speakers.length) return;
    stopGenerationRef.current = false;
    let rollingHistory = [...startingHistory];
    
    // Helper to add a natural delay between speakers (300-800ms)
    const naturalDelay = () => new Promise(resolve => 
      setTimeout(resolve, 300 + Math.random() * 500)
    );
    
    // Get the last few messages to provide context for who's being addressed
    const getRecentContext = (history: Message[]) => {
      const recent = history.slice(-3);
      const lastSpeaker = recent.length > 0 ? recent[recent.length - 1].characterName : null;
      const lastContent = recent.length > 0 ? recent[recent.length - 1].content?.slice(0, 100) : '';
      return { lastSpeaker, lastContent };
    };
    
    for (let i = 0; i < speakers.length; i++) {
      if (stopGenerationRef.current) break;
      const character = speakers[i];
      
      // Add natural pause between speakers
      if (i > 0) {
        await naturalDelay();
      }
      
      // Build context about who spoke last so this character can respond to them
      const { lastSpeaker, lastContent } = getRecentContext(rollingHistory);
      const otherSpeakers = speakers.filter((c) => c.id !== character.id).map((c) => c.name);
      
      // Add context hint if someone just spoke
      let contextHint = '';
      if (lastSpeaker && lastSpeaker !== character.name && lastContent) {
        contextHint = `[${lastSpeaker} just said something - you may respond to them, interrupt, or continue your own thought]`;
      }
      
      const result = await handleSendMessage('', character.id, {
        skipGroupChatter: true,
        historyOverride: rollingHistory,
        partnerNames: otherSpeakers,
        groupChatContext: contextHint, // Pass context about who just spoke
      });
      
      if (result) {
        rollingHistory = [...rollingHistory, result];
        // Update the actual chat history after each message for real-time updates
        setChatHistory([...rollingHistory]);
      }
    }
  };

  const handleManualGroupChatter = async () => {
    const presentParty = getPresentParty();
    if (!presentParty.length) {
      const awayCount = getActiveParty().filter((c) => (c.presence ?? 'present') !== 'present').length;
      if (awayCount > 0) {
        window.alert(`All characters are away or inactive. Find them in the story first!`);
      } else {
        window.alert('Add at least one character to the group roster in the sidebar first.');
      }
      return;
    }
    if (isSending || isContinuing) {
      return;
    }
    await triggerGroupChatter(chatHistory);
  };
  
  const handleContinue = async () => {
    stopGenerationRef.current = false;
    setIsContinuing(true);
    setActiveNarrationMode('continue');
    try {
        await runNarrationStream();
    } catch (error) {
        if (!stopGenerationRef.current) {
          addMessage({ role: Role.SYSTEM, content: `Error: ${(error as Error).message}` });
        }
    releaseLocks();
    } finally {
        const wasStopped = stopGenerationRef.current;
        setIsContinuing(false);
        setActiveNarrationMode(null);
        if (!wasStopped) {
          checkAndSummarizeMemory();
        }
    }
  };

  const handleProgressStory = async () => {
    stopGenerationRef.current = false;
    setIsContinuing(true);
    setActiveNarrationMode('progress');
    const directiveDisplay = 'Narrator focus: advance the plot with concrete character actions and dialogue.';
    const directiveInstruction =
      'Narrator directive: advance the story through concrete character actions and dialogue. Skip scenic description and focus on what the cast literally does next (e.g., "Emiy grabs my wrist and drags me toward the forbidden forest"), including one meaningful development or new obstacle.';
    const directiveMessage: Message = {
      id: `dir_${Date.now()}`,
      role: Role.SYSTEM,
      content: directiveDisplay,
    };
    const historyWithDirective = [...chatHistory, directiveMessage];
    setChatHistory(historyWithDirective);
    const promptHistory = [...historyWithDirective, { id: `dir_hidden_${Date.now()}`, role: Role.SYSTEM, content: directiveInstruction }];
    try {
      await runNarrationStream(promptHistory);
    } catch (error) {
      if (!stopGenerationRef.current) {
        addMessage({ role: Role.SYSTEM, content: `Error: ${(error as Error).message}` });
      }
      releaseLocks();
    } finally {
      const wasStopped = stopGenerationRef.current;
      setIsContinuing(false);
      setActiveNarrationMode(null);
      if (!wasStopped) {
        checkAndSummarizeMemory();
      }
    }
  };
  
  const handleStopGeneration = () => {
    stopGenerationRef.current = true;
    setIsSending(false);
    setIsContinuing(false);
    setIsGeneratingMedia(false); // This unlocks the UI immediately.
    setActiveNarrationMode(null);

    // Clean up placeholders from the chat history.
    setChatHistory(prev => {
        const updatedHistory = prev
            // Remove initial placeholders that haven't transitioned to a polling state
            .filter(m => 
                m.content !== '🎨 Generating image...' && 
                m.content !== '🎬 Starting video generation...' &&
                m.content !== '' // Also remove empty text placeholders
            )
            // Update any messages that are already in the polling state to "cancelled"
            .map(m => {
                if (m.videoUrl?.startsWith('generating:')) {
                    return { ...m, videoUrl: undefined, content: 'Video generation cancelled by user.' };
                }
                return m;
            });
        return updatedHistory;
    });
  };
  
  const handleMakeImage = async () => {
    stopGenerationRef.current = false;
    setIsGeneratingMedia(true);
    const placeholderId = `msg_image_placeholder_${Date.now()}`;
    addMessage({ role: Role.SYSTEM, content: '🎨 Generating image...' }, placeholderId);
    try {
      const imageUrl = await generateImageFromScene(settings.modelName, chatHistory, sessionCharacters, {
        userPortraitUrl: settings.userPortraitUrl,
        localSdUrl: settings.localSdUrl,
        imageRelayUrl: settings.imageRelayUrl,
        stabilityApiKey: settings.stabilityApiKey,
        imageModelName: settings.imageModelName,
      });
      if (stopGenerationRef.current) {
        setChatHistory(prev => prev.filter(m => m.id !== placeholderId));
      } else {
        setChatHistory(prev => prev.map(m => m.id === placeholderId ? { ...m, imageUrl, content: '' } : m));
      }
    } catch (error) {
      if (!stopGenerationRef.current) {
        setChatHistory(prev => prev.map(m => m.id === placeholderId ? { ...m, content: `Image generation failed: ${(error as Error).message}` } : m));
      } else {
        setChatHistory(prev => prev.filter(m => m.id !== placeholderId));
      }
      releaseLocks();
    } finally {
      setIsGeneratingMedia(false);
    }
  };

  const handleCopyImagePrompt = async () => {
    if (lastGeneratedPrompt) {
      // Copy previously generated prompt
      try {
        await navigator.clipboard.writeText(lastGeneratedPrompt);
        alert('✅ Prompt copied to clipboard!');
      } catch {
        alert(`Copy this prompt:\n\n${lastGeneratedPrompt}`);
      }
      return;
    }
    
    // Generate new prompt with AI
    setIsGeneratingPrompt(true);
    try {
      const prompt = await generateImagePrompt(
        settings.modelName,
        chatHistory.slice(-12),
        sessionCharacters,
        worldInfo,
        promptStyle
      );
      
      setLastGeneratedPrompt(prompt);
      await navigator.clipboard.writeText(prompt);
      alert('✅ Perfect prompt generated and copied!');
    } catch (error) {
      alert(`Failed to generate prompt: ${(error as Error).message}`);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleTogglePromptStyle = () => {
    setPromptStyle(prev => prev === 'anime' ? 'light-novel' : 'anime');
    setLastGeneratedPrompt(null); // Clear cached prompt when style changes
  };

  const handleCopyFullMangaPrompts = async () => {
    setIsGeneratingPrompt(true);
    try {
      const prompt = await generateFullMangaPrompts(
        settings.modelName,
        chatHistory,
        sessionCharacters,
        worldInfo,
        'light-novel'
      );
      await navigator.clipboard.writeText(prompt);
      alert('✅ Full manga/page prompts copied!');
    } catch (error) {
      alert(`Failed to generate full manga prompts: ${(error as Error).message}`);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleSelectVeoKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsVeoKeySelected(true); // Optimistically assume success
    } else {
      alert("API Key selection is not available in this environment.");
    }
  };

  const handleMakeVideo = async () => {
    if (!isVeoKeySelected && window.aistudio) {
        await handleSelectVeoKey();
        return; // Ask user to click again after selecting a key.
    }
    stopGenerationRef.current = false;
    setIsGeneratingMedia(true);
    const placeholderId = `msg_video_placeholder_${Date.now()}`;
    addMessage({ role: Role.SYSTEM, content: '🎬 Starting video generation...' }, placeholderId);
    try {
        const operation = await startVideoGeneration(settings.modelName, chatHistory);
        if (stopGenerationRef.current) {
            setChatHistory(prev => prev.filter(m => m.id !== placeholderId));
            setIsGeneratingMedia(false);
            return;
        }
        setChatHistory(prev => prev.map(m => m.id === placeholderId ? { ...m, videoUrl: `generating:${operation.name}`, content: '' } : m));
    } catch (error) {
        if (stopGenerationRef.current) {
             setChatHistory(prev => prev.filter(m => m.id !== placeholderId));
        } else if ((error as Error).message.includes("Requested entity was not found")) {
            setIsVeoKeySelected(false);
            setChatHistory(prev => prev.map(m => m.id === placeholderId ? { ...m, content: "Video generation failed. Please select a valid VEO-enabled API Key in the AI Studio menu." } : m));
        } else {
            setChatHistory(prev => prev.map(m => m.id === placeholderId ? { ...m, content: `Video generation failed: ${(error as Error).message}` } : m));
        }
        releaseLocks();
    setIsGeneratingMedia(false);
  } finally {
    if (!stopGenerationRef.current) {
      setIsGeneratingMedia(false);
    }
    }
  };

  const handleEditMessage = (id: string, newContent: string, part: MessagePart = 'content') => {
    setChatHistory(prev => prev.map(msg => msg.id === id ? { ...msg, [part]: newContent } : msg));
  };

  const handleDeleteMessage = (id: string) => {
    setChatHistory(prev => prev.filter(msg => msg.id !== id));
  };

  // Handle user feedback on AI responses
  const handleFeedback = useCallback((id: string, feedback: 'positive' | 'negative' | null) => {
    setChatHistory(prev => prev.map(msg => 
      msg.id === id ? { ...msg, feedback } : msg
    ));
    
    // Log feedback for training data collection
    const message = chatHistory.find(m => m.id === id);
    if (message && feedback) {
      console.log('[Feedback]', {
        messageId: id,
        feedback,
        role: message.role,
        characterName: message.characterName,
        content: message.content.slice(0, 100),
        timestamp: Date.now(),
      });
      // TODO: Send to backend or store locally for later export
    }
  }, [chatHistory]);

  const handleRegenerateMessage = async (id: string) => {
    const messageIndex = chatHistory.findIndex((m) => m.id === id);
    if (messageIndex === -1) return;
    const message = chatHistory[messageIndex];
    
    // Only allow regenerating character or narrator messages
    if (message.role !== Role.CHARACTER && message.role !== Role.NARRATOR) {
      return;
    }
    
    // Get history up to (not including) this message
    const historyBefore = chatHistory.slice(0, messageIndex);
    
    // Delete this message and any messages after it
    setChatHistory(historyBefore);
    
    // Wait a tick for state to update
    await new Promise((r) => setTimeout(r, 50));
    
    if (message.role === Role.CHARACTER && message.characterId) {
      // Regenerate character response
      const character = characters.find((c) => c.id === message.characterId);
      if (character) {
        await handleSendMessage('', character.id, { historyOverride: historyBefore });
      }
    } else if (message.role === Role.NARRATOR) {
      // Regenerate narrator response
      stopGenerationRef.current = false;
      setIsContinuing(true);
      try {
        await runNarrationStream(historyBefore);
      } catch (error) {
        if (!stopGenerationRef.current) {
          addMessage({ role: Role.SYSTEM, content: `Error: ${(error as Error).message}` });
        }
      } finally {
        setIsContinuing(false);
      }
    }
  };
  
  const handleSaveCharacter = (character: Character) => {
    // Ensure presence defaults to 'present' if not set
    const characterWithPresence = {
      ...character,
      presence: character.presence ?? 'present',
      inStory: character.inStory ?? true,
    };
    const characterWithRel = ensurePlayerRelationship(characterWithPresence);
    const isInSession = sessionCharacterIds.includes(characterWithRel.id);
    setCharacters(prev => prev.some(c => c.id === characterWithRel.id) ? prev.map(c => c.id === characterWithRel.id ? characterWithRel : c) : [...prev, characterWithRel]);
    setActivePartyIds((prev) => {
      if (!isInSession || characterWithRel.inStory === false) {
        return prev.filter((id) => id !== characterWithRel.id);
      }
      return prev.includes(characterWithRel.id) ? prev : [...prev, characterWithRel.id];
    });
    setEditingCharacter(null);
  };
  const handleDeleteCharacter = (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
    setActivePartyIds(prev => prev.filter(pid => pid !== id));
    setEditingCharacter(null);
  };

  // Handler to promote an NPC from narrator to a full character
  const handlePromoteNpc = (name: string, dialogueSample: string) => {
    const newCharacter: Character = {
      id: `char_${Date.now()}`,
      name: name,
      description: `A character who was introduced in the story. They said: "${dialogueSample}"`,
      instructions: 'Stay true to how you were introduced. Build on that first impression.',
      presence: 'present',
      inStory: true,
    };
    const characterWithRel = ensurePlayerRelationship(newCharacter);
    setCharacters(prev => [...prev, characterWithRel]);
    setActivePartyIds(prev => [...prev, characterWithRel.id]);
    // Open the character modal for editing
    setEditingCharacter(characterWithRel);
  };
  
  const handleEvolveCharacter = async (character: Character) => {
    return await getEvolvedDescription(settings.modelName, character, chatHistory);
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the entire chat history? This cannot be undone.')) {
        setChatHistory([{
            id: `sys_${Date.now()}`,
            role: Role.SYSTEM,
            content: "Chat history cleared. A new story begins."
        }]);
    }
  };

  const handleUserPortraitChange = (dataUrl: string) => {
    setSettings(prev => ({ ...prev, userPortraitUrl: dataUrl }));
  };

  useEffect(() => {
    const hasActiveTextStream = chatHistory.some(msg => msg.content === '' && (msg.role === Role.CHARACTER || msg.role === Role.NARRATOR));
    if (!hasActiveTextStream) {
      setIsSending(false);
      setIsContinuing(false);
      setActiveNarrationMode(null);
    }
  }, [chatHistory]);

  useEffect(() => {
    if (!(isSending || isContinuing)) {
      if (pendingTimeoutRef.current) {
        window.clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
      return;
    }

    // Watch for stalled streams (no chunk activity) and cancel after 60s idle
    markStreamActivity();
    const checkForStall = () => {
      const idleFor = Date.now() - lastStreamActivityRef.current;
      if (!(isSending || isContinuing)) return;
      if (idleFor >= 60000) {
        forceUnlock('Generation stalled for 60s and was cancelled. Try again or switch to a faster model.');
        return;
      }
      pendingTimeoutRef.current = window.setTimeout(checkForStall, 5000);
    };

    pendingTimeoutRef.current = window.setTimeout(checkForStall, 15000);

    return () => {
      if (pendingTimeoutRef.current) {
        window.clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
    };
  }, [isSending, isContinuing]);

  if (!isLoaded) return null;

  const sidebarOverlay = sidebarOpen ? (
    <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-30 md:hidden" />
  ) : null;

  const sidebarComponent = (
    <Sidebar
      isOpen={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
      activeTab={activeSidebarTab}
      setActiveTab={setActiveSidebarTab}
      sessions={chatSessions}
      activeSessionId={activeSession?.id ?? null}
      onSelectSession={handleSelectSession}
      onNewChat={handleNewChat}
      characters={sessionCharacters}
      onNewCharacter={() =>
        setEditingCharacter({ id: '', name: '', description: '', instructions: '', portraitUrl: '', lore: '' })}
      onEditCharacter={(char) => setEditingCharacter(char)}
      worldInfo={worldInfo}
      setWorldInfo={setWorldInfo}
      settings={settings}
      setSettings={setSettings}
      onClearChat={handleClearChat}
      onExportBackup={handleExportBackup}
      onImportBackup={handleImportBackup}
      isVeoKeySelected={isVeoKeySelected}
      onSelectVeoKey={handleSelectVeoKey}
      onUserPortraitChange={handleUserPortraitChange}
      activePartyIds={activePartyIds}
      onTogglePartyMember={handleTogglePartyMember}
      onSelectAllParty={handleSelectAllPartyMembers}
      onStartRpgSession={handleEnterRpgView}
      canStartRpgSession={viewMode !== 'rpg'}
      onSetCharacterPresence={handleSetCharacterPresence}
      onAddCharacterToStory={handleAddCharacterToStory}
      onRemoveCharacterFromStory={handleRemoveCharacterFromStory}
    />
  );

  const sharedModals = (
    <>
      {editingCharacter && (
        <CharacterModal
          character={editingCharacter}
          onSave={handleSaveCharacter}
          onCancel={() => setEditingCharacter(null)}
          onEvolve={handleEvolveCharacter}
          onDelete={handleDeleteCharacter}
        />
      )}
      {isRpgSheetOpen && activeRpgState && (
        <RpgSheetModal
          state={activeRpgState}
          onCancel={() => setIsRpgSheetOpen(false)}
          onSave={handleSaveRpgSheet}
        />
      )}
    </>
  );

  if (viewMode === 'library') {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#04010c] text-gray-300">
        {sidebarOverlay}
        {sidebarComponent}
        <div className={`flex-1 ${sidebarOpen ? 'hidden md:flex' : 'flex'}`}>
          <CharacterLibraryPage
            characters={characters}
            inChatIds={sessionCharacterIds}
            onAddToChat={handleAddCharacterToStory}
            onEditCharacter={(char) => setEditingCharacter(char)}
            onNewCharacter={() => setEditingCharacter({ id: '', name: '', description: '', instructions: '', portraitUrl: '', lore: '' })}
            onBack={handleExitLibraryView}
          />
        </div>
        {sharedModals}
      </div>
    );
  }

  if (viewMode === 'rpg') {
    const activeParty = getActiveParty();
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#04010c] text-gray-300">
        {sidebarOverlay}
        {sidebarComponent}
        <RpgPage
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          onBackToChat={handleExitRpgView}
          onEditSheet={handleOpenRpgSheet}
          onContinue={handleContinue}
          onProgressStory={handleProgressStory}
          onMakeImage={handleMakeImage}
          onMakeVideo={handleMakeVideo}
          onCopyImagePrompt={handleCopyImagePrompt}
          onCopyFullMangaPrompt={handleCopyFullMangaPrompts}
          onTogglePromptStyle={handleTogglePromptStyle}
          isGeneratingPrompt={isGeneratingPrompt}
          promptStyle={promptStyle}
          onTriggerGroupChat={handleManualGroupChatter}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          onForceUnlock={forceUnlock}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onRegenerateMessage={handleRegenerateMessage}
          onFeedback={handleFeedback}
          isSending={isSending}
          isContinuing={isContinuing}
          narrationMode={activeNarrationMode}
          isGeneratingMedia={isGeneratingMedia}
          chatHistory={chatHistory}
          characters={sessionCharacters}
          activeParty={activeParty}
          rpgState={activeRpgState}
          worldInfo={worldInfo}
          onExitRpgView={handleExitRpgView}
        />
        {sharedModals}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen text-gray-300 font-sans antialiased overflow-hidden">
      {sidebarOverlay}
      {sidebarComponent}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${sidebarOpen ? 'hidden md:flex' : 'flex'}`}>
        <ChatWindow
          chatHistory={chatHistory}
          characters={sessionCharacters}
          onSendMessage={handleSendMessage}
          onContinue={handleContinue}
          onProgressStory={handleProgressStory}
          onStopGeneration={handleStopGeneration}
          onForceUnlock={forceUnlock}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onRegenerateMessage={handleRegenerateMessage}
          onFeedback={handleFeedback}
          onPromoteNpc={handlePromoteNpc}
          onOpenSidebar={() => setSidebarOpen(true)}
          isSending={isSending}
          isContinuing={isContinuing}
          narrationMode={activeNarrationMode}
          onMakeImage={handleMakeImage}
          onMakeVideo={handleMakeVideo}
          onCopyImagePrompt={handleCopyImagePrompt}
          onTogglePromptStyle={handleTogglePromptStyle}
          isGeneratingPrompt={isGeneratingPrompt}
          promptStyle={promptStyle}
          isGeneratingMedia={isGeneratingMedia}
          activePartyIds={activePartyIds}
          onTriggerGroupChat={handleManualGroupChatter}
          rpgState={activeRpgState}
          onOpenRpgSheet={handleOpenRpgSheet}
          onEnterRpgView={handleEnterRpgView}
          onEnterLibraryView={handleEnterLibraryView}
          showEmbeddedRpgCard={false}
        />
      </div>
      {sharedModals}
    </div>
  );
}

export default App;
